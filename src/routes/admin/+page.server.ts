import { fail } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { invites, members, type Role } from '$lib/server/db/schema';
import { hashPassword } from '$lib/server/auth';
import { newId, newInviteCode } from '$lib/server/ids';
import { requireRole } from '$lib/server/guard';
import type { Actions, PageServerLoad } from './$types';

const ROLES: Role[] = ['aspirant', 'member', 'fadder', 'captain', 'admin'];

export const load: PageServerLoad = async () => {
	const [memberList, inviteList] = await Promise.all([
		db.select().from(members).orderBy(desc(members.createdAt)).all(),
		db.select().from(invites).orderBy(desc(invites.createdAt)).all()
	]);
	return {
		members: memberList.map(({ passwordHash: _drop, ...m }) => m),
		invites: inviteList
	};
};

export const actions: Actions = {
	// Skapa engångskod
	createInvite: async ({ request, locals }) => {
		const me = requireRole(locals.member, 'captain');
		const form = await request.formData();
		const role = String(form.get('role') ?? 'aspirant') as Role;
		if (!ROLES.includes(role)) return fail(400, { error: 'Ogiltig roll.' });

		const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 dagar
		const code = newInviteCode();
		await db.insert(invites).values({
			id: newId(),
			code,
			role,
			createdBy: me.id,
			expiresAt
		});
		return { created: code };
	},

	// Skapa medlem direkt (admin skapar konto med temporärt lösenord)
	createMember: async ({ request, locals }) => {
		requireRole(locals.member, 'captain');
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const email = String(form.get('email') ?? '')
			.trim()
			.toLowerCase();
		const role = String(form.get('role') ?? 'aspirant') as Role;
		const password = String(form.get('password') ?? '');

		if (!name || !email || !password)
			return fail(400, { error: 'Namn, e-post och lösenord krävs.' });
		if (password.length < 8) return fail(400, { error: 'Lösenord minst 8 tecken.' });
		if (!ROLES.includes(role)) return fail(400, { error: 'Ogiltig roll.' });

		const existing = await db.select().from(members).where(eq(members.email, email)).get();
		if (existing) return fail(400, { error: 'E-posten finns redan.' });

		await db.insert(members).values({
			id: newId(),
			name,
			email,
			role,
			status: role === 'aspirant' ? 'aspirant' : 'active',
			passwordHash: await hashPassword(password)
		});
		return { memberCreated: true };
	}
};
