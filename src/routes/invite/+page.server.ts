import { fail } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { invites, members } from '$lib/server/db/schema';
import { requireRole } from '$lib/server/guard';
import { newId, newInviteCode } from '$lib/server/ids';
import type { Actions, PageServerLoad } from './$types';

const INVITE_DAYS = 30;
const MAX_OPEN_INVITES = 10;

// Bjud in: varje medlem (member+) kan skapa invalskoder. Den som löser in koden
// får inbjudaren som fadder (sätts i /join), och inbjudaren blir fadder.
export const load: PageServerLoad = async ({ locals, url }) => {
	const me = requireRole(locals.member, 'member');
	const mine = await db
		.select({
			id: invites.id,
			code: invites.code,
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
	return { invites: mine, origin: url.origin, inviteDays: INVITE_DAYS };
};

export const actions: Actions = {
	create: async ({ locals }) => {
		const me = requireRole(locals.member, 'member');
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
			createdBy: me.id,
			expiresAt: new Date(now + INVITE_DAYS * 24 * 60 * 60 * 1000)
		});
		return { created: code };
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
