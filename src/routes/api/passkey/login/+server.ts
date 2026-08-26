import { error, json } from '@sveltejs/kit';
import { createSession, generateSessionToken, setSessionCookie } from '$lib/server/auth';
import { authenticationOptions, verifyAuthentication } from '$lib/server/passkeys';
import type { RequestHandler } from './$types';

// GET → inloggningsoptions; POST → verifiera passkey och skapa session.
export const GET: RequestHandler = async (event) => json(await authenticationOptions(event));

export const POST: RequestHandler = async (event) => {
	const body = await event.request.json().catch(() => null);
	if (!body?.response) throw error(400, 'Ogiltig begäran.');
	let member;
	try {
		member = await verifyAuthentication(event, body.response);
	} catch (e) {
		throw error(400, e instanceof Error ? e.message : 'Inloggningen misslyckades.');
	}
	if (member.status === 'inactive')
		throw error(403, 'Kontot är inaktiverat — kontakta klubbmästaren.');
	const token = generateSessionToken();
	const session = await createSession(token, member.id);
	setSessionCookie(event, token, session.expiresAt);
	return json({ ok: true });
};
