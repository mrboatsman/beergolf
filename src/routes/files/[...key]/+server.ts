import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	certificationProofs,
	coasterBackImages,
	coasters,
	members,
	tournamentExpenses,
	tournaments
} from '$lib/server/db/schema';
import { requireMember } from '$lib/server/guard';
import { storage } from '$lib/server/storage';
import type { RequestHandler } from './$types';

// Nyckeln måste finnas i databasen (bevis, kvitton) — vi läser aldrig
// godtyckliga paths.
function lookupFile(key: string): { contentType: string; filename: string } | null {
	const proof = db
		.select()
		.from(certificationProofs)
		.where(eq(certificationProofs.storageKey, key))
		.get();
	if (proof) return { contentType: proof.contentType, filename: proof.filename };

	const expense = db
		.select()
		.from(tournamentExpenses)
		.where(eq(tournamentExpenses.receiptKey, key))
		.get();
	if (expense) {
		return {
			contentType: expense.receiptType ?? 'application/octet-stream',
			filename: expense.receiptName ?? 'kvitto'
		};
	}

	const tournament = db
		.select()
		.from(tournaments)
		.where(eq(tournaments.charityReceiptKey, key))
		.get();
	if (tournament) {
		return {
			contentType: tournament.charityReceiptType ?? 'application/octet-stream',
			filename: tournament.charityReceiptName ?? 'kvitto'
		};
	}
	// Coasterns baksida: ritning + bilder
	const drawing = db
		.select({ id: coasters.id })
		.from(coasters)
		.where(eq(coasters.backDrawingKey, key))
		.get();
	if (drawing) return { contentType: 'image/png', filename: 'ritning.png' };
	const img = db
		.select({ contentType: coasterBackImages.contentType })
		.from(coasterBackImages)
		.where(eq(coasterBackImages.storageKey, key))
		.get();
	if (img) return { contentType: img.contentType, filename: 'bild' };
	// Profilbilder (alltid JPEG från beskäraren)
	const avatar = db
		.select({ id: members.id })
		.from(members)
		.where(eq(members.avatarKey, key))
		.get();
	if (avatar) return { contentType: 'image/jpeg', filename: 'profilbild.jpg' };
	return null;
}

// Serverar uppladdade filer — endast för inloggade medlemmar
// (publika rapporten visar bara siffror, aldrig kvittofiler).
export const GET: RequestHandler = async ({ locals, params }) => {
	requireMember(locals.member);

	const file = lookupFile(params.key);
	if (!file) throw error(404, 'Filen finns inte.');

	const data = await storage.get(params.key);
	return new Response(new Uint8Array(data).buffer as ArrayBuffer, {
		headers: {
			'Content-Type': file.contentType,
			'Content-Length': String(data.byteLength),
			'Cache-Control': 'private, max-age=3600',
			'Content-Disposition': `inline; filename="${encodeURIComponent(file.filename)}"`
		}
	});
};
