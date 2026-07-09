import { fail } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { certifications, members } from '$lib/server/db/schema';
import { requireMember } from '$lib/server/guard';
import { getCertStatus, maybeIssueGreenCard } from '$lib/server/certification';
import { newId } from '$lib/server/ids';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const me = requireMember(locals.member);
	const status = await getCertStatus(me.id);

	// Certifierade medlemmar agerar fadder: se och godkänn aspiranter.
	let aspirants: Array<{
		id: string;
		name: string;
		theory: boolean;
		practical: boolean;
		etiquette: boolean;
	}> = [];
	if (me.status !== 'aspirant') {
		const rows = await db
			.select({
				id: members.id,
				name: members.name,
				theory: certifications.theoryPassed,
				practical: certifications.practicalPassed,
				etiquette: certifications.etiquettePassed
			})
			.from(members)
			.leftJoin(certifications, eq(certifications.memberId, members.id))
			.where(eq(members.status, 'aspirant'))
			.orderBy(asc(members.name))
			.all();
		aspirants = rows.map((r) => ({
			id: r.id,
			name: r.name,
			theory: r.theory ?? false,
			practical: r.practical ?? false,
			etiquette: r.etiquette ?? false
		}));
	}

	return {
		status,
		aspirants,
		me: {
			isAspirant: me.status === 'aspirant',
			memberNumber: me.memberNumber,
			greenCardIssuedAt: me.greenCardIssuedAt,
			name: me.name
		}
	};
};

async function approve(locals: App.Locals, request: Request, part: 'practical' | 'etiquette') {
	const me = requireMember(locals.member);
	if (me.status === 'aspirant') {
		return fail(403, { error: 'Bara certifierade medlemmar kan examinera.' });
	}

	const form = await request.formData();
	const memberId = String(form.get('memberId') ?? '');
	if (memberId === me.id) return fail(400, { error: 'Du kan inte examinera dig själv.' });

	const target = await db.select().from(members).where(eq(members.id, memberId)).get();
	if (!target || target.status !== 'aspirant') {
		return fail(400, { error: 'Ogiltig aspirant.' });
	}

	const now = new Date();
	const cert = await db
		.select()
		.from(certifications)
		.where(eq(certifications.memberId, memberId))
		.get();

	if (part === 'practical') {
		const proofUrl = String(form.get('proofUrl') ?? '').trim() || null;
		if (cert?.practicalPassed) return fail(400, { error: 'Praktiska provet är redan godkänt.' });
		if (!cert) {
			await db.insert(certifications).values({
				id: newId(),
				memberId,
				fadderId: me.id,
				practicalPassed: true,
				practicalAt: now,
				practicalProofUrl: proofUrl
			});
		} else {
			await db
				.update(certifications)
				.set({
					practicalPassed: true,
					practicalAt: now,
					practicalProofUrl: proofUrl,
					fadderId: me.id
				})
				.where(eq(certifications.id, cert.id));
		}
	} else {
		if (cert?.etiquettePassed) return fail(400, { error: 'Etikett är redan godkänd.' });
		if (!cert) {
			await db.insert(certifications).values({
				id: newId(),
				memberId,
				fadderId: me.id,
				etiquettePassed: true
			});
		} else {
			await db
				.update(certifications)
				.set({ etiquettePassed: true, fadderId: cert.fadderId ?? me.id })
				.where(eq(certifications.id, cert.id));
		}
	}

	const issued = await maybeIssueGreenCard(memberId);
	return { approved: part, aspirantName: target.name, issued };
}

export const actions: Actions = {
	approvePractical: async ({ locals, request }) => approve(locals, request, 'practical'),
	approveEtiquette: async ({ locals, request }) => approve(locals, request, 'etiquette')
};
