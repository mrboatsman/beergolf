import { error, json } from '@sveltejs/kit';
import { requireMember } from '$lib/server/guard';
import { registrationOptions, verifyRegistration } from '$lib/server/passkeys';
import type { RequestHandler } from './$types';

// GET → registreringsoptions; POST → verifiera och spara passkeyn.
export const GET: RequestHandler = async (event) => {
	const me = requireMember(event.locals.member);
	return json(await registrationOptions(event, me));
};

export const POST: RequestHandler = async (event) => {
	const me = requireMember(event.locals.member);
	const body = await event.request.json().catch(() => null);
	if (!body?.response) throw error(400, 'Ogiltig begäran.');
	try {
		const id = await verifyRegistration(event, me.id, body.response, String(body.name ?? ''));
		return json({ ok: true, id });
	} catch (e) {
		throw error(400, e instanceof Error ? e.message : 'Registreringen misslyckades.');
	}
};
