import { fail } from '@sveltejs/kit';
import { and, eq, ne } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { members, sessions } from '$lib/server/db/schema';
import { hashPassword } from '$lib/server/auth';
import { requireMember } from '$lib/server/guard';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const me = requireMember(locals.member);
	return { forced: me.mustChangePassword };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const me = requireMember(locals.member);
		const form = await request.formData();
		const password = String(form.get('password') ?? '');
		const confirm = String(form.get('confirm') ?? '');

		if (password.length < 8) return fail(400, { error: 'Minst 8 tecken.' });
		if (password !== confirm) return fail(400, { error: 'Lösenorden matchar inte.' });

		await db
			.update(members)
			.set({ passwordHash: await hashPassword(password), mustChangePassword: false })
			.where(eq(members.id, me.id));

		// Logga ut alla andra sessioner (engångslösenordet kan vara spritt)
		if (locals.session) {
			await db
				.delete(sessions)
				.where(and(eq(sessions.memberId, me.id), ne(sessions.id, locals.session.id)));
		}

		return { changed: true };
	}
};
