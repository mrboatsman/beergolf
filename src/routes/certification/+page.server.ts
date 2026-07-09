import { fail } from '@sveltejs/kit';
import { asc, eq, sql } from 'drizzle-orm';
import { extname } from 'node:path';
import { db } from '$lib/server/db';
import { certificationProofs, certifications, members, quizAttempts } from '$lib/server/db/schema';
import { requireMember } from '$lib/server/guard';
import { getCertStatus, maybeIssueGreenCard } from '$lib/server/certification';
import { storage } from '$lib/server/storage';
import { newId } from '$lib/server/ids';
import type { Actions, PageServerLoad } from './$types';

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200 MB — video från provslingan

function extFor(f: File): string {
	const e = extname(f.name).toLowerCase();
	if (/^\.[a-z0-9]{1,5}$/.test(e)) return e;
	// fallback från mime-typen
	const sub = f.type.split('/')[1] ?? 'bin';
	return `.${sub.replace(/[^a-z0-9]/gi, '').slice(0, 5) || 'bin'}`;
}

export const load: PageServerLoad = async ({ locals }) => {
	const me = requireMember(locals.member);
	const status = await getCertStatus(me.id);

	// Etikett-kriterierna visas för aspiranten när teoriprovet är inlämnat.
	const theorySubmitted =
		status.theory.passed ||
		((await db
			.select({ n: sql<number>`count(*)` })
			.from(quizAttempts)
			.where(eq(quizAttempts.memberId, me.id))
			.get()?.n) ?? 0) > 0;

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
		theorySubmitted,
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
		if (cert?.practicalPassed) return fail(400, { error: 'Praktiska provet är redan godkänt.' });

		const comment = String(form.get('comment') ?? '').trim() || null;
		const files = form
			.getAll('files')
			.filter((f): f is File => f instanceof File && f.size > 0 && f.name !== '');

		// Inget bevis, inget godkännande — missade ni att dokumentera får
		// situationen rekonstrueras.
		if (files.length === 0) {
			return fail(400, {
				error:
					'Bevis krävs: ladda upp minst en bild eller film. Missade ni att ta bevis? Rekonstruera situationen.'
			});
		}

		for (const f of files) {
			if (!f.type.startsWith('image/') && !f.type.startsWith('video/')) {
				return fail(400, { error: `${f.name}: endast bilder och video tillåts.` });
			}
			if (f.size > MAX_FILE_SIZE) {
				return fail(400, { error: `${f.name}: max ${MAX_FILE_SIZE / 1024 / 1024} MB per fil.` });
			}
		}

		// Se till att cert-raden finns innan filerna knyts till den.
		let certId = cert?.id;
		if (!cert) {
			certId = newId();
			await db.insert(certifications).values({
				id: certId,
				memberId,
				fadderId: me.id,
				practicalPassed: true,
				practicalAt: now,
				practicalComment: comment
			});
		} else {
			await db
				.update(certifications)
				.set({
					practicalPassed: true,
					practicalAt: now,
					practicalComment: comment,
					fadderId: me.id
				})
				.where(eq(certifications.id, cert.id));
		}

		for (const f of files) {
			const ext = extFor(f);
			const key = `proofs/${certId}/${newId()}${ext}`;
			await storage.put(key, new Uint8Array(await f.arrayBuffer()), f.type);
			await db.insert(certificationProofs).values({
				id: newId(),
				certificationId: certId!,
				storageKey: key,
				filename: f.name,
				contentType: f.type,
				size: f.size,
				uploadedBy: me.id
			});
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
