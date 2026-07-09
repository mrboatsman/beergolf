import { redirect, type Handle } from '@sveltejs/kit';
import {
	SESSION_COOKIE,
	validateSessionToken,
	setSessionCookie,
	deleteSessionCookie,
	toSafeMember
} from '$lib/server/auth';

// Ocertifierade (aspiranter) har bara tillgång till certifieringsflödet.
// Grönt kort (teori + praktik + etikett) är obligatoriskt innan resten
// av klubbhuset låses upp.
const ASPIRANT_ALLOWED = ['/certification', '/quiz', '/logout', '/files'];
const ALWAYS_ALLOWED = ['/_app', '/@', '/favicon', '/.well-known'];

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE);
	if (!token) {
		event.locals.member = null;
		event.locals.session = null;
		return resolve(event);
	}

	const { session, member } = await validateSessionToken(token);
	if (session && member) {
		setSessionCookie(event, token, session.expiresAt);
		event.locals.member = toSafeMember(member);
		event.locals.session = session;
	} else {
		deleteSessionCookie(event);
		event.locals.member = null;
		event.locals.session = null;
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
