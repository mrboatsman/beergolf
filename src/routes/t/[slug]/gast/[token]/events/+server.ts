import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { coasterPlayers, tournamentParticipants, tournaments } from '$lib/server/db/schema';
import { coasterEventStream } from '$lib/server/live';
import type { RequestHandler } from './$types';

// SSE för gästen: händelser på alla coasters där gästen har en rad.
export const GET: RequestHandler = async ({ params, request }) => {
	const participant = db
		.select({ id: tournamentParticipants.id })
		.from(tournamentParticipants)
		.innerJoin(tournaments, eq(tournamentParticipants.tournamentId, tournaments.id))
		.where(
			and(eq(tournaments.slug, params.slug), eq(tournamentParticipants.guestToken, params.token))
		)
		.get();
	if (!participant) throw error(404, 'Ogiltig länk.');
	const ids = db
		.select({ coasterId: coasterPlayers.coasterId })
		.from(coasterPlayers)
		.where(eq(coasterPlayers.participantId, participant.id))
		.all()
		.map((r) => r.coasterId);
	return coasterEventStream(ids, request.signal);
};
