import { fail } from '@sveltejs/kit';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { invites, members } from '$lib/server/db/schema';
import { requireRole } from '$lib/server/guard';
import { newId, newInviteCode } from '$lib/server/ids';
import { myClubs, pickClubById } from '$lib/server/clubs';
import type { Actions, PageServerLoad } from './$types';

const INVITE_DAYS = 30;
const MAX_OPEN_INVITES = 10;

// Bjud in: varje medlem (member+) kan skapa invalskoder. Den som löser in koden
// får inbjudaren som fadder (sätts i /join), och inbjudaren blir fadder.
// Koden hör till den AKTIVA klubben — inlösaren får den som hemmaklubb.
export const load: PageServerLoad = async ({ locals, url }) => {
	const me = requireRole(locals.member, 'member');
	const mine = await db
		.select({
			id: invites.id,
			code: invites.code,
			clubId: invites.clubId,
			clubName: sql<string | null>`(select c.name from clubs c where c.id = invites.club_id)`,
			createdAt: invites.createdAt,
			expiresAt: invites.expiresAt,
			usedAt: invites.usedAt,
			usedById: invites.usedBy,
			usedByName: members.name,
			usedByStatus: members.status
		})
		.from(invites)
		.leftJoin(members, eq(invites.usedBy, members.id))
		.where(eq(invites.createdBy, me.id))
		.orderBy(desc(invites.createdAt))
		.all();
	const clubs = myClubs(me).filter((c) => c.status === 'active' && c.clubStatus === 'active');
	// Förval: hemmaklubben, eller ?club=<slug> (t.ex. från klubbsidan) om jag är med där
	const wanted = url.searchParams.get('club');
	const home = clubs.find((c) => c.isHome) ?? clubs[0];
	const preselected = (wanted && clubs.find((c) => c.slug === wanted)) || home;
	return {
		invites: mine,
		origin: url.origin,
		inviteDays: INVITE_DAYS,
		clubs,
		homeClubId: me.homeClubId,
		selectedClubId: preselected?.id ?? me.homeClubId
	};
};

export const actions: Actions = {
	create: async ({ locals, request }) => {
		const me = requireRole(locals.member, 'member');
		const form = await request.formData();
		// Klubben väljs i formuläret (default hemmaklubb) — koden ger den som hemmaklubb
		const picked = pickClubById(me, String(form.get('clubId') ?? ''));
		if (picked.role === null && me.role !== 'admin') {
			return fail(403, { error: 'Du är inte medlem i den valda klubben.' });
		}
		const now = Date.now();
		const open = db
			.select({ id: invites.id, usedBy: invites.usedBy, expiresAt: invites.expiresAt })
			.from(invites)
			.where(eq(invites.createdBy, me.id))
			.all()
			.filter((i) => !i.usedBy && (!i.expiresAt || i.expiresAt.getTime() > now));
		if (open.length >= MAX_OPEN_INVITES) {
			return fail(400, {
				error: `Du har redan ${MAX_OPEN_INVITES} oanvända koder. Vänta tills någon används eller går ut.`
			});
		}
		const code = newInviteCode();
		await db.insert(invites).values({
			id: newId(),
			code,
			role: 'aspirant',
			clubId: picked.club.id,
			createdBy: me.id,
			expiresAt: new Date(now + INVITE_DAYS * 24 * 60 * 60 * 1000)
		});
		return { created: code, createdClubName: picked.club.name, createdClubId: picked.club.id };
	},

	// Ta bort en egen oanvänd kod
	revoke: async ({ locals, request }) => {
		const me = requireRole(locals.member, 'member');
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const inv = await db.select().from(invites).where(eq(invites.id, id)).get();
		if (!inv || inv.createdBy !== me.id) return fail(404, { error: 'Koden finns inte.' });
		if (inv.usedBy) return fail(400, { error: 'Koden är redan använd.' });
		await db.delete(invites).where(eq(invites.id, id));
		return { revoked: true };
	}
};
