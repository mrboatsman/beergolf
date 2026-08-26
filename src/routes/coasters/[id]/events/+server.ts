import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { coasters } from '$lib/server/db/schema';
import { requireMember } from '$lib/server/guard';
import { coasterEventStream } from '$lib/server/live';
import type { RequestHandler } from './$types';

// SSE: "change"-händelse när coastern ändras (poäng, signering, spelare).
export const GET: RequestHandler = async ({ locals, params, request }) => {
	requireMember(locals.member);
	const c = db.select({ id: coasters.id }).from(coasters).where(eq(coasters.id, params.id)).get();
	if (!c) throw error(404, 'Coastern finns inte.');
	return coasterEventStream([c.id], request.signal);
};
