import { error, json } from '@sveltejs/kit';
import { requireMember } from '$lib/server/guard';
import { isPushEnabled, saveSubscription } from '$lib/server/push';
import type { RequestHandler } from './$types';

// Sparar webbläsarens PushSubscription för den inloggade medlemmen.
export const POST: RequestHandler = async ({ locals, request }) => {
	const me = requireMember(locals.member);
	if (!isPushEnabled()) throw error(503, 'Push är inte konfigurerat på servern.');
	const sub = await request.json().catch(() => null);
	if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth)
		throw error(400, 'Ogiltig prenumeration.');
	const id = saveSubscription(me.id, sub, request.headers.get('user-agent'));
	return json({ ok: true, id });
};
