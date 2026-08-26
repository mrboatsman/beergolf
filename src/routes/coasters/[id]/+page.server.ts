import { error, fail } from '@sveltejs/kit';
import { and, asc, eq, isNotNull, isNull, notInArray, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	coasters,
	coasterPlayers,
	members,
	rounds,
	tournaments,
	tournamentParticipants,
	MAX_COASTER_PLAYERS,
	MIN_COASTER_PLAYERS
} from '$lib/server/db/schema';
import { requireMember } from '$lib/server/guard';
import { newId } from '$lib/server/ids';
import { nextHcp, netScore } from '$lib/handicap';
import { maybeDecideMatch } from '$lib/server/tournaments';
import { notifyCoaster } from '$lib/server/live';
import { fillMissingWithX, grossTotal, grossTotalComplete, parseScore } from '$lib/scoring';
import type { Actions, PageServerLoad } from './$types';

async function getCoaster(id: string) {
	const coaster = await db.select().from(coasters).where(eq(coasters.id, id)).get();
	if (!coaster) throw error(404, 'Coastern finns inte.');
	return coaster;
}

function getMyRow(coasterId: string, memberId: string) {
	return db
		.select()
		.from(coasterPlayers)
		.where(and(eq(coasterPlayers.coasterId, coasterId), eq(coasterPlayers.memberId, memberId)))
		.get();
}

// leftJoin: gästrader (turneringar) har memberId = null — namnet kommer då
// från turneringsdeltagaren.
function getPlayers(coasterId: string) {
	return db
		.select({
			id: coasterPlayers.id,
			memberId: coasterPlayers.memberId,
			participantId: coasterPlayers.participantId,
			position: coasterPlayers.position,
			scores: coasterPlayers.scores,
			signedAt: coasterPlayers.signedAt,
			name: sql<string>`coalesce(${members.name}, ${tournamentParticipants.guestName}, '?')`,
			hcp: members.hcp,
			roundNet: rounds.netTotal,
			playingHcp: tournamentParticipants.playingHcp
		})
		.from(coasterPlayers)
		.leftJoin(members, eq(coasterPlayers.memberId, members.id))
		.leftJoin(tournamentParticipants, eq(coasterPlayers.participantId, tournamentParticipants.id))
		.leftJoin(rounds, eq(coasterPlayers.roundId, rounds.id))
		.where(eq(coasterPlayers.coasterId, coasterId))
		.orderBy(asc(coasterPlayers.position))
		.all();
}

// Netto vid signering: medlem = rundans netTotal, gäst = brutto (x = 2×par) − spelhcp
function withNet<
	T extends {
		scores: (number | null)[];
		signedAt: Date | null;
		roundNet: number | null;
		playingHcp: number | null;
	}
>(players: T[], par: number[]) {
	return players.map((p) => ({
		...p,
		net:
			p.roundNet !== null
				? p.roundNet
				: p.signedAt && p.playingHcp !== null
					? (grossTotal(p.scores, par) ?? 0) - p.playingHcp
					: null
	}));
}

export const load: PageServerLoad = async ({ locals, params, depends }) => {
	const me = requireMember(locals.member);
	depends(`coaster:${params.id}`);
	const coaster = await getCoaster(params.id);
	const players = withNet(await getPlayers(coaster.id), coaster.par);

	let addable: { id: string; name: string; isGuest?: boolean }[];
	let tournament: { id: string; name: string } | null = null;
	if (coaster.tournamentId) {
		// Turneringscoaster: bara betalda deltagare utan coaster-rad kan läggas
		// till (medlemmar och gäster) — id här är participantId. Matchspel:
		// raderna är låsta till matchens två spelare, inget läggs till.
		const t = await db
			.select({ id: tournaments.id, name: tournaments.name, format: tournaments.format })
			.from(tournaments)
			.where(eq(tournaments.id, coaster.tournamentId))
			.get();
		tournament = t ?? null;
		addable =
			t?.format === 'match'
				? []
				: db
						.select({
							id: tournamentParticipants.id,
							name: sql<string>`coalesce(${members.name}, ${tournamentParticipants.guestName}, '?')`,
							isGuest: sql<boolean>`${tournamentParticipants.memberId} is null`
						})
						.from(tournamentParticipants)
						.leftJoin(members, eq(tournamentParticipants.memberId, members.id))
						.leftJoin(coasterPlayers, eq(coasterPlayers.participantId, tournamentParticipants.id))
						.where(
							and(
								eq(tournamentParticipants.tournamentId, coaster.tournamentId),
								eq(tournamentParticipants.status, 'paid'),
								isNull(coasterPlayers.id)
							)
						)
						.orderBy(asc(tournamentParticipants.createdAt))
						.all();
	} else {
		// Bara spelare med grönt kort kan läggas till (och inte redan på coastern)
		const taken = players.map((p) => p.memberId).filter((x): x is string => !!x);
		addable = await db
			.select({ id: members.id, name: members.name })
			.from(members)
			.where(
				taken.length
					? and(isNotNull(members.greenCardIssuedAt), notInArray(members.id, taken))
					: isNotNull(members.greenCardIssuedAt)
			)
			.orderBy(asc(members.name))
			.all();
	}

	return {
		coaster,
		tournament,
		players,
		addable,
		meId: me.id,
		maxPlayers: MAX_COASTER_PLAYERS,
		minPlayers: MIN_COASTER_PLAYERS
	};
};

export const actions: Actions = {
	// Vem som helst på coastern (eller skaparen) kan bjuda in fler — coastern
	// skickas runt bordet precis som den fysiska.
	addPlayer: async ({ request, locals, params }) => {
		const me = requireMember(locals.member);
		const coaster = await getCoaster(params.id);
		const players = await getPlayers(coaster.id);

		const amInvolved = coaster.createdBy === me.id || players.some((p) => p.memberId === me.id);
		if (!amInvolved) return fail(403, { error: 'Bara spelare på coastern kan lägga till fler.' });
		if (players.length >= MAX_COASTER_PLAYERS) {
			return fail(400, { error: `Max ${MAX_COASTER_PLAYERS} spelare per coaster.` });
		}

		const form = await request.formData();
		const targetId = String(form.get('memberId') ?? '');

		// Turneringscoaster: targetId är participantId — betalda deltagare
		// (medlem eller gäst) läggs till; gäster är undantagna grönt kort-kravet.
		if (coaster.tournamentId) {
			const t = await db
				.select({ format: tournaments.format })
				.from(tournaments)
				.where(eq(tournaments.id, coaster.tournamentId))
				.get();
			if (t?.format === 'match') {
				return fail(400, { error: 'Matchcoasterns spelare är låsta till matchen.' });
			}
			const participant = await db
				.select()
				.from(tournamentParticipants)
				.where(
					and(
						eq(tournamentParticipants.id, targetId),
						eq(tournamentParticipants.tournamentId, coaster.tournamentId)
					)
				)
				.get();
			if (!participant) return fail(400, { error: 'Ogiltig turneringsdeltagare.' });
			if (participant.status !== 'paid') {
				return fail(400, { error: 'Deltagaren har inte betalat anmälningsavgiften.' });
			}
			const existing = await db
				.select({ id: coasterPlayers.id })
				.from(coasterPlayers)
				.where(eq(coasterPlayers.participantId, participant.id))
				.get();
			if (existing) {
				return fail(400, { error: 'Deltagaren har redan en rad i turneringen.' });
			}
			const name =
				participant.guestName ??
				(participant.memberId
					? ((
							await db
								.select({ name: members.name })
								.from(members)
								.where(eq(members.id, participant.memberId))
								.get()
						)?.name ?? 'Deltagaren')
					: 'Deltagaren');
			await db.insert(coasterPlayers).values({
				id: newId(),
				coasterId: coaster.id,
				memberId: participant.memberId,
				participantId: participant.id,
				position: Math.max(0, ...players.map((p) => p.position)) + 1,
				scores: Array(9).fill(null)
			});
			notifyCoaster(coaster.id);
			return { added: name || 'Deltagaren' };
		}

		const target = await db.select().from(members).where(eq(members.id, targetId)).get();
		if (!target) return fail(400, { error: 'Ogiltig medlem.' });
		if (!target.greenCardIssuedAt) {
			return fail(400, { error: `${target.name} har inget grönt kort ännu.` });
		}
		if (players.some((p) => p.memberId === targetId)) {
			return fail(400, { error: `${target.name} är redan med på coastern.` });
		}

		await db.insert(coasterPlayers).values({
			id: newId(),
			coasterId: coaster.id,
			memberId: targetId,
			position: Math.max(0, ...players.map((p) => p.position)) + 1,
			scores: Array(9).fill(null)
		});
		notifyCoaster(coaster.id);
		return { added: target.name };
	},

	// Ta bort en spelare under pågående spel — alla som lagts till på
	// coastern (eller skaparen) kan göra det. Signerade rader är låsta.
	removePlayer: async ({ request, locals, params }) => {
		const me = requireMember(locals.member);
		const coaster = await getCoaster(params.id);
		const players = await getPlayers(coaster.id);

		const amInvolved = coaster.createdBy === me.id || players.some((p) => p.memberId === me.id);
		if (!amInvolved) return fail(403, { error: 'Bara spelare på coastern kan ta bort spelare.' });

		const form = await request.formData();
		const rowId = String(form.get('rowId') ?? '');
		// Bakåtkompatibelt: äldre formulär skickar memberId
		const memberId = String(form.get('memberId') ?? '');
		const row = players.find((p) => (rowId ? p.id === rowId : p.memberId === memberId));
		if (!row) return fail(400, { error: 'Spelaren finns inte på coastern.' });
		if (row.signedAt) {
			return fail(400, { error: `${row.name} har signerat — raden är låst.` });
		}
		if (coaster.tournamentId) {
			const t = await db
				.select({ format: tournaments.format })
				.from(tournaments)
				.where(eq(tournaments.id, coaster.tournamentId))
				.get();
			if (t?.format === 'match') {
				return fail(400, { error: 'Matchcoasterns spelare är låsta till matchen.' });
			}
		}

		await db.delete(coasterPlayers).where(eq(coasterPlayers.id, row.id));
		notifyCoaster(coaster.id);
		return { removed: row.name };
	},

	// Spara egna poäng (tomma hål tillåtna — man behöver inte spela nio på en gång)
	saveScores: async ({ request, locals, params }) => {
		const me = requireMember(locals.member);
		const coaster = await getCoaster(params.id);
		const row = getMyRow(coaster.id, me.id);

		if (!row) return fail(403, { error: 'Du är inte spelare på denna coaster.' });
		if (row.signedAt) return fail(400, { error: 'Raden är signerad och låst.' });

		const form = await request.formData();
		const scores: (number | null)[] = [];
		for (let i = 0; i < 9; i++) {
			scores.push(parseScore(String(form.get(`s${i}`) ?? '')));
		}

		await db.update(coasterPlayers).set({ scores }).where(eq(coasterPlayers.id, row.id));
		notifyCoaster(coaster.id);
		return { saved: true };
	},

	// Signera egen rad: låser den, skapar runda och justerar handikapp.
	sign: async ({ locals, params }) => {
		const me = requireMember(locals.member);
		const coaster = await getCoaster(params.id);
		const row = getMyRow(coaster.id, me.id);

		if (!row) return fail(403, { error: 'Du är inte spelare på denna coaster.' });
		if (row.signedAt) return fail(400, { error: 'Redan signerad.' });
		if (row.scores.every((s) => s === null)) {
			return fail(400, { error: 'Fyll i minst ett hål innan du signerar.' });
		}
		const playerCount =
			db
				.select({ n: sql<number>`count(*)` })
				.from(coasterPlayers)
				.where(eq(coasterPlayers.coasterId, coaster.id))
				.get()?.n ?? 0;
		if (playerCount < MIN_COASTER_PLAYERS) {
			return fail(400, {
				error: `Man kan inte spela ensam — lägg till minst ${MIN_COASTER_PLAYERS - 1} medspelare innan du signerar.`
			});
		}

		// Tomma hål = x (dubbelt par); x lagras som 0 så brutto räknas mot par
		const scores = fillMissingWithX(row.scores, coaster.par.length);
		const grossTotal = grossTotalComplete(scores, coaster.par);
		const parTotal = coaster.par.reduce((a, b) => a + b, 0);
		const current = await db.select().from(members).where(eq(members.id, me.id)).get();
		const hcpBefore = current?.hcp ?? me.hcp;
		const hcpAfter = nextHcp(hcpBefore, grossTotal, parTotal);
		const netTotal = netScore(grossTotal, hcpBefore);
		const roundId = newId();

		db.transaction((tx) => {
			tx.insert(rounds)
				.values({
					id: roundId,
					memberId: me.id,
					tournamentId: coaster.tournamentId,
					holes: 9,
					scores,
					grossTotal,
					hcpBefore,
					hcpAfter,
					netTotal
				})
				.run();
			tx.update(members).set({ hcp: hcpAfter }).where(eq(members.id, me.id)).run();
			tx.update(coasterPlayers)
				.set({ scores, signedAt: new Date(), roundId })
				.where(eq(coasterPlayers.id, row.id))
				.run();
		});

		// Matchspel: avgör matchen om båda spelarna nu signerat (lägst netto vinner)
		if (coaster.tournamentId) maybeDecideMatch(coaster.id);

		notifyCoaster(coaster.id);
		return { signed: true, hcpBefore, hcpAfter };
	}
};
