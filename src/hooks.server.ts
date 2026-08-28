import { redirect, type Handle } from '@sveltejs/kit';
import {
	SESSION_COOKIE,
	validateSessionToken,
	invalidateSession,
	setSessionCookie,
	deleteSessionCookie,
	toSafeMember
} from '$lib/server/auth';

// Ocertifierade (aspiranter) har bara tillgång till certifieringsflödet.
// Grönt kort (teori + praktik + etikett) är obligatoriskt innan resten
// av klubbhuset låses upp.
const ASPIRANT_ALLOWED = [
	'/certification',
	'/quiz',
	'/logout',
	'/files',
	'/password',
	'/settings',
	'/api/passkey',
	'/api/push',
	'/t'
];
// /t = publika turneringssidor, /api/stripe = webhook — öppna även för
// inloggade aspiranter/lösenordsbytare (oinloggade passerar redan).
const ALWAYS_ALLOWED = ['/_app', '/@', '/favicon', '/.well-known', '/t/', '/api/stripe'];

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE);
	if (!token) {
		event.locals.member = null;
		event.locals.session = null;
		return resolve(event);
	}

	const { session, member } = await validateSessionToken(token);
	if (session && member && member.status !== 'inactive') {
		setSessionCookie(event, token, session.expiresAt);
		event.locals.member = toSafeMember(member);
		event.locals.session = session;
	} else {
		// Inaktiverade konton loggas ut direkt
		if (session) await invalidateSession(session.id);
		deleteSessionCookie(event);
		event.locals.member = null;
		event.locals.session = null;
	}

	// Engångslösenord från admin måste bytas innan något annat
	if (event.locals.member?.mustChangePassword) {
		const p = event.url.pathname;
		const allowed =
			ALWAYS_ALLOWED.some((a) => p.startsWith(a)) ||
			p === '/password' ||
			p === '/settings' ||
			p.startsWith('/api/passkey') ||
			p.startsWith('/api/push') ||
			p === '/logout';
		if (!allowed) throw redirect(303, '/settings');
	}

	if (event.locals.member?.status === 'aspirant') {
		const p = event.url.pathname;
		const allowed =
			ALWAYS_ALLOWED.some((a) => p.startsWith(a)) ||
			ASPIRANT_ALLOWED.some((a) => p === a || p.startsWith(a + '/'));
		if (!allowed) throw redirect(303, '/certification');
	}

	return resolve(event);
};
