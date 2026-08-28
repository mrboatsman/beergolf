import { error, json } from '@sveltejs/kit';
import { requireMember } from '$lib/server/guard';
import { removeSubscription } from '$lib/server/push';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request }) => {
	const me = requireMember(locals.member);
	const body = await request.json().catch(() => null);
	if (!body?.endpoint) throw error(400, 'Saknar endpoint.');
	removeSubscription(me.id, String(body.endpoint));
	return json({ ok: true });
};
