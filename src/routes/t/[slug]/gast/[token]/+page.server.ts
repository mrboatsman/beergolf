import { error, fail, redirect } from '@sveltejs/kit';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	coasters,
	coasterPlayers,
	tournamentParticipants,
	MIN_COASTER_PLAYERS
} from '$lib/server/db/schema';
import { settleSessionById } from '$lib/server/stripe';
import { getTournamentBySlug, maybeDecideMatch } from '$lib/server/tournaments';
import { notifyCoaster } from '$lib/server/live';
import { fillMissingWithX, parseScore } from '$lib/scoring';
import type { Actions, PageServerLoad } from './$types';

// Gästens spelsida — auktoriseras med bearer-token i URL:en (ingen inloggning).
// INVARIANT: gäster skapar aldrig rounds-poster och rör aldrig members.hcp —
// signering låser bara raden (signedAt), leaderboarden läser scores direkt.
async function getGuest(slug: string, token: string) {
	const t = await getTournamentBySlug(slug);
	if (!t || t.visibility !== 'public' || t.status === 'draft') {
		throw error(404, 'Turneringen finns inte.');
	}
	const participant = await db
		.select()
		.from(tournamentParticipants)
		.where(
			and(
				eq(tournamentParticipants.guestToken, token),
				eq(tournamentParticipants.tournamentId, t.id)
			)
		)
		.get();
	if (!participant) throw error(404, 'Ogiltig gästlänk.');
	return { tournament: t, participant };
}

// Slagspel: en rad. Matchspel: en rad per omgång — nyaste först.
function getGuestRows(participantId: string) {
	return db
		.select({
			id: coasterPlayers.id,
			coasterId: coasterPlayers.coasterId,
			scores: coasterPlayers.scores,
			signedAt: coasterPlayers.signedAt,
			position: coasterPlayers.position,
			coasterName: coasters.name,
			par: coasters.par,
			createdAt: coasters.createdAt,
			// Antal spelare på coastern — man får inte signera ensam
			playerCount: sql<number>`(select count(*) from coaster_players cp where cp.coaster_id = ${coasters.id})`
		})
		.from(coasterPlayers)
		.innerJoin(coasters, eq(coasterPlayers.coasterId, coasters.id))
		.where(eq(coasterPlayers.participantId, participantId))
		.orderBy(desc(coasters.createdAt))
		.all();
}

export const load: PageServerLoad = async ({ params, url, depends }) => {
	depends('guest:rows');
	const { tournament, participant } = await getGuest(params.slug, params.token);

	// Success-fallback om webhooken inte hunnit/tappats.
	const sessionId = url.searchParams.get('session_id');
	if (sessionId && participant.status === 'pending') {
		try {
			await settleSessionById(sessionId);
		} catch {
			// Stripe onåbar — webhooken får ta det.
		}
		throw redirect(303, `/t/${params.slug}/gast/${params.token}`);
	}

	return {
		tournament: {
			id: tournament.id,
			name: tournament.name,
			slug: tournament.slug,
			status: tournament.status,
			entryFeeOre: tournament.entryFeeOre,
			charityName: tournament.charityName,
			format: tournament.format
		},
		participant: {
			name: participant.guestName,
			playingHcp: participant.playingHcp,
			status: participant.status
		},
		rows: getGuestRows(participant.id),
		minPlayers: MIN_COASTER_PLAYERS
	};
};

export const actions: Actions = {
	saveScores: async ({ request, params }) => {
		const { participant } = await getGuest(params.slug, params.token);
		const form = await request.formData();
		const rowId = String(form.get('rowId') ?? '');
		const row = getGuestRows(participant.id).find((r) => r.id === rowId);
		if (!row) return fail(400, { error: 'Du har ingen rad på en coaster än.' });
		if (row.signedAt) return fail(400, { error: 'Raden är signerad och låst.' });

		const scores: (number | null)[] = [];
		for (let i = 0; i < 9; i++) {
			scores.push(parseScore(String(form.get(`s${i}`) ?? '')));
		}

		await db.update(coasterPlayers).set({ scores }).where(eq(coasterPlayers.id, row.id));
		notifyCoaster(row.coasterId);
		return { saved: true };
	},

	// Signering låser raden — ingen runda, ingen HCP-justering (gäst).
	sign: async ({ request, params }) => {
		const { participant } = await getGuest(params.slug, params.token);
		const form = await request.formData();
		const rowId = String(form.get('rowId') ?? '');
		const row = getGuestRows(participant.id).find((r) => r.id === rowId);
		if (!row) return fail(400, { error: 'Du har ingen rad på en coaster än.' });
		if (row.signedAt) return fail(400, { error: 'Redan signerad.' });
		if (row.scores.every((s) => s === null)) {
			return fail(400, { error: 'Fyll i minst ett hål innan du signerar.' });
		}
		if (row.playerCount < MIN_COASTER_PLAYERS) {
			return fail(400, {
				error: 'Man kan inte spela ensam — coastern behöver minst en medspelare.'
			});
		}

		// Tomma hål = x (dubbelt par)
		await db
			.update(coasterPlayers)
			.set({ scores: fillMissingWithX(row.scores, row.par.length), signedAt: new Date() })
			.where(eq(coasterPlayers.id, row.id));

		// Matchspel: avgör matchen om båda spelarna nu signerat
		maybeDecideMatch(row.coasterId);
		notifyCoaster(row.coasterId);

		return { signed: true };
	}
};
