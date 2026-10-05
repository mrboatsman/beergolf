import { fail, redirect } from '@sveltejs/kit';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { certifications, invites, members } from '$lib/server/db/schema';
import {
	hashPassword,
	generateSessionToken,
	createSession,
	setSessionCookie
} from '$lib/server/auth';
import { newId } from '$lib/server/ids';
import { sendPush } from '$lib/server/push';
import { PRIMARY_CLUB_ID, ensureMembership, getClub } from '$lib/server/clubs';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.member) throw redirect(302, '/');
	const code = (url.searchParams.get('code') ?? '').trim().toUpperCase();
	return { code, clubName: code ? inviteClubName(code) : null };
};

// Klubbnamn för en giltig (oanvänd, ej utgången) kod — annars null så att
// ogiltiga koder inte avslöjar något.
function inviteClubName(code: string): string | null {
	const inv = db
		.select({ clubId: invites.clubId, expiresAt: invites.expiresAt })
		.from(invites)
		.where(and(eq(invites.code, code), isNull(invites.usedBy)))
		.get();
	if (!inv || (inv.expiresAt && inv.expiresAt.getTime() < Date.now())) return null;
	const club = getClub(inv.clubId);
	return (club?.status === 'active' ? club : getClub(PRIMARY_CLUB_ID))?.name ?? null;
}

export const actions: Actions = {
	default: async (event) => {
		const form = await event.request.formData();
		const code = String(form.get('code') ?? '')
			.trim()
			.toUpperCase();
		const name = String(form.get('name') ?? '').trim();
		const email = String(form.get('email') ?? '')
			.trim()
			.toLowerCase();
		const password = String(form.get('password') ?? '');

		const back = { code, name, email };
		if (!code || !name || !email || !password) {
			return fail(400, { ...back, error: 'Alla fält krävs.' });
		}
		if (password.length < 8) {
			return fail(400, { ...back, error: 'Lösenordet måste vara minst 8 tecken.' });
		}

		const invite = await db
			.select()
			.from(invites)
			.where(and(eq(invites.code, code), isNull(invites.usedBy)))
			.get();

		if (!invite) return fail(400, { ...back, error: 'Ogiltig eller redan använd kod.' });
		if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
			return fail(400, { ...back, error: 'Koden har gått ut.' });
		}

		const existing = await db.select().from(members).where(eq(members.email, email)).get();
		if (existing) return fail(400, { ...back, error: 'E-posten är redan registrerad.' });

		// Kodens klubb blir hemmaklubb (arkiverad klubb ⇒ huvudklubben)
		const inviteClub = getClub(invite.clubId);
		const homeClubId = inviteClub?.status === 'active' ? inviteClub.id : PRIMARY_CLUB_ID;

		const id = newId();
		const passwordHash = await hashPassword(password);

		// better-sqlite3 är synkront: transaction-callback får ej vara async.
		db.transaction((tx) => {
			tx.insert(members)
				.values({
					id,
					name,
					email,
					passwordHash,
					role: invite.role,
					status: 'aspirant',
					homeClubId
				})
				.run();
			// Medlemskap i hemmaklubben + huvudklubben (alla är med i Tablers)
			ensureMembership(tx, homeClubId, id);
			if (homeClubId !== PRIMARY_CLUB_ID) ensureMembership(tx, PRIMARY_CLUB_ID, id);
			tx.update(invites)
				.set({ usedBy: id, usedAt: new Date() })
				.where(eq(invites.id, invite.id))
				.run();

			// Inbjudaren blir aspirantens fadder (syns i fadderträdet direkt) och
			// uppgraderas member→fadder. Koder skapade av captain/admin ger dem
			// också fadderskapet men rollen behålls.
			if (invite.createdBy) {
				const inviter = tx
					.select({ id: members.id, role: members.role, status: members.status })
					.from(members)
					.where(eq(members.id, invite.createdBy))
					.get();
				if (inviter && inviter.status === 'active') {
					tx.insert(certifications)
						.values({ id: newId(), memberId: id, fadderId: inviter.id })
						.run();
					if (inviter.role === 'member') {
						tx.update(members).set({ role: 'fadder' }).where(eq(members.id, inviter.id)).run();
					}
				}
			}
		});

		// Notis till faddern: ny aspirant att examinera (fire-and-forget)
		if (invite.createdBy) {
			void sendPush(invite.createdBy, {
				title: 'Ny aspirant',
				body: `${name} har skapat konto med din invalskod. Dags för provslingan!`,
				url: `/certification?aspirant=${id}`,
				tag: `aspirant-${id}`
			});
		}

		const token = generateSessionToken();
		const session = await createSession(token, id);
		setSessionCookie(event, token, session.expiresAt);

		throw redirect(302, '/');
	}
};
