import type { Handle } from '@sveltejs/kit';
import {
	SESSION_COOKIE,
	validateSessionToken,
	setSessionCookie,
	deleteSessionCookie,
	toSafeMember
} from '$lib/server/auth';

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

	return resolve(event);
};
