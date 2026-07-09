import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { certificationProofs } from '$lib/server/db/schema';
import { requireMember } from '$lib/server/guard';
import { storage } from '$lib/server/storage';
import type { RequestHandler } from './$types';

// Serverar uppladdade bevisfiler — endast för inloggade medlemmar.
// Nyckeln måste finnas i databasen; vi läser aldrig godtyckliga paths.
export const GET: RequestHandler = async ({ locals, params }) => {
	requireMember(locals.member);

	const proof = await db
		.select()
		.from(certificationProofs)
		.where(eq(certificationProofs.storageKey, params.key))
		.get();
	if (!proof) throw error(404, 'Filen finns inte.');

	const data = await storage.get(proof.storageKey);
	return new Response(new Uint8Array(data).buffer as ArrayBuffer, {
		headers: {
			'Content-Type': proof.contentType,
			'Content-Length': String(data.byteLength),
			'Cache-Control': 'private, max-age=3600',
			'Content-Disposition': `inline; filename="${encodeURIComponent(proof.filename)}"`
		}
	});
};
