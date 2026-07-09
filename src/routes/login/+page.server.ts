import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { members } from '$lib/server/db/schema';
import {
	verifyPassword,
	generateSessionToken,
	createSession,
	setSessionCookie
} from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.member) throw redirect(302, '/');
};

export const actions: Actions = {
	default: async (event) => {
		const form = await event.request.formData();
		const email = String(form.get('email') ?? '')
			.trim()
			.toLowerCase();
		const password = String(form.get('password') ?? '');

		if (!email || !password) return fail(400, { email, error: 'Fyll i e-post och lösenord.' });

		const member = await db.select().from(members).where(eq(members.email, email)).get();
		// Kör alltid en verify för att undvika timing-läckage om användaren finns.
		const ok = member?.passwordHash && (await verifyPassword(member.passwordHash, password));
		if (!member || !ok) return fail(400, { email, error: 'Fel e-post eller lösenord.' });
		if (member.status === 'inactive') {
			return fail(403, { email, error: 'Kontot är inaktiverat — kontakta klubbmästaren.' });
		}

		const token = generateSessionToken();
		const session = await createSession(token, member.id);
		setSessionCookie(event, token, session.expiresAt);

		throw redirect(302, '/');
	}
};
