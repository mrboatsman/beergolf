import { error } from '@sveltejs/kit';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { db } from './db';
import { grossTotalComplete } from '$lib/scoring';
import {
	coasters,
	coasterPlayers,
	members,
	tournamentExpenses,
	tournamentMatches,
	tournamentParticipants,
	tournaments,
	type PrizeTier,
	type Tournament
} from './db/schema';
import { hasRole } from './guard';
import { newId } from './ids';
import type { SafeMember } from './auth';

export const GUEST_MAX_HCP = 54;

export async function getTournament(id: string): Promise<Tournament> {
	const t = await db.select().from(tournaments).where(eq(tournaments.id, id)).get();
	if (!t) throw error(404, 'Turneringen finns inte.');
	return t;
}

export async function getTournamentBySlug(slug: string): Promise<Tournament | undefined> {
	return db.select().from(tournaments).where(eq(tournaments.slug, slug)).get();
}

export function getParticipant(tournamentId: string, memberId: string) {
	return db
		.select()
		.from(tournamentParticipants)
		.where(
			and(
				eq(tournamentParticipants.tournamentId, tournamentId),
				eq(tournamentParticipants.memberId, memberId)
			)
		)
		.get();
}

/**
 * Synlighetsregler: draft ser bara captain+; open/public ser alla medlemmar;
 * closed ser inbjudna deltagare + captain+.
 */
export async function canSee(t: Tournament, member: SafeMember): Promise<boolean> {
	if (hasRole(member, 'captain')) return true;
	if (t.status === 'draft') return false;
	if (t.visibility === 'closed') return !!(await getParticipant(t.id, member.id));
	return true;
}

/** Krav för draft → open. Returnerar felmeddelande eller null om ok. */
export function validateOpen(t: Tournament): string | null {
	if (!t.startsAt) return 'Sätt ett startdatum innan turneringen öppnas.';
	if (!t.charityName) return 'Välj välgörenhet innan turneringen öppnas.';
	if (t.visibility === 'public' && !t.slug) {
		return 'Publika turneringar behöver en adress (slug).';
	}
	if (t.prizeMode === 'fixed') {
		if (!t.prizes.length) return 'Lägg till minst en prisnivå (fasta priser).';
		if (t.prizes.some((p) => !p.amountOre || p.amountOre <= 0)) {
			return 'Alla prisnivåer behöver ett belopp.';
		}
	}
	if (t.prizeMode === 'percent') {
		if (!t.prizes.length) return 'Lägg till minst en prisnivå (procentpriser).';
		if (t.prizes.some((p) => !p.percent || p.percent <= 0)) {
			return 'Alla prisnivåer behöver en procentsats.';
		}
		const total = t.prizes.reduce((a, p) => a + (p.percent ?? 0), 0);
		if (total > 100) return 'Prisnivåernas procentsatser överstiger 100 %.';
	}
	return null;
}

export function validSlug(slug: string): boolean {
	return /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(slug);
}

export type ParticipantRow = {
	id: string;
	memberId: string | null;
	name: string;
	isGuest: boolean;
	playingHcp: number;
	status: 'invited' | 'pending' | 'paid' | 'refunded';
	paidVia: 'stripe' | 'manual' | 'free' | null;
	paidAt: Date | null;
	createdAt: Date;
};

export function getParticipants(tournamentId: string): ParticipantRow[] {
	return db
		.select({
			id: tournamentParticipants.id,
			memberId: tournamentParticipants.memberId,
			name: sql<string>`coalesce(${members.name}, ${tournamentParticipants.guestName}, '?')`,
			isGuest: sql<boolean>`${tournamentParticipants.memberId} is null`,
			playingHcp: tournamentParticipants.playingHcp,
			status: tournamentParticipants.status,
			paidVia: tournamentParticipants.paidVia,
			paidAt: tournamentParticipants.paidAt,
			createdAt: tournamentParticipants.createdAt
		})
		.from(tournamentParticipants)
		.leftJoin(members, eq(tournamentParticipants.memberId, members.id))
		.where(eq(tournamentParticipants.tournamentId, tournamentId))
		.orderBy(asc(tournamentParticipants.createdAt))
		.all();
}

export type LeaderboardEntry = {
	participantId: string;
	name: string;
	isGuest: boolean;
	playingHcp: number;
	gross: number;
	net: number;
	toPar: number;
	coasterId: string;
	netRank: number;
	grossRank: number;
};

export type Leaderboard = {
	entries: LeaderboardEntry[]; // sorterade på netto
	unfinished: { participantId: string; name: string; isGuest: boolean; started: boolean }[];
};

/**
 * Leaderboard räknas i JS (låg volym): betalda deltagare, deras (enda)
 * coaster-rad, signerade rader ger gross/net. Netto = brutto − playingHcp.
 */
export function getLeaderboard(tournamentId: string): Leaderboard {
	const rows = db
		.select({
			participantId: tournamentParticipants.id,
			name: sql<string>`coalesce(${members.name}, ${tournamentParticipants.guestName}, '?')`,
			isGuest: sql<boolean>`${tournamentParticipants.memberId} is null`,
			playingHcp: tournamentParticipants.playingHcp,
			scores: coasterPlayers.scores,
			signedAt: coasterPlayers.signedAt,
			coasterId: coasterPlayers.coasterId,
			par: coasters.par
		})
		.from(tournamentParticipants)
		.leftJoin(members, eq(tournamentParticipants.memberId, members.id))
		.leftJoin(coasterPlayers, eq(coasterPlayers.participantId, tournamentParticipants.id))
		.leftJoin(coasters, eq(coasterPlayers.coasterId, coasters.id))
		.where(
			and(
				eq(tournamentParticipants.tournamentId, tournamentId),
				eq(tournamentParticipants.status, 'paid')
			)
		)
		.all();

	const entries: LeaderboardEntry[] = [];
	const unfinished: Leaderboard['unfinished'] = [];
	for (const r of rows) {
		if (r.signedAt && r.scores && r.par && r.coasterId) {
			const gross = grossTotalComplete(r.scores, r.par);
			const parTotal = r.par.reduce((a, b) => a + b, 0);
			entries.push({
				participantId: r.participantId,
				name: r.name,
				isGuest: !!r.isGuest,
				playingHcp: r.playingHcp,
				gross,
				net: Math.round((gross - r.playingHcp) * 10) / 10,
				toPar: gross - parTotal,
				coasterId: r.coasterId,
				netRank: 0,
				grossRank: 0
			});
		} else {
			unfinished.push({
				participantId: r.participantId,
				name: r.name,
				isGuest: !!r.isGuest,
				started: !!r.coasterId
			});
		}
	}

	// Delad placering: samma resultat → samma rank (som /members-leaderboarden)
	const byNet = [...entries].sort((a, b) => a.net - b.net);
	byNet.forEach((e, i) => {
		e.netRank = i > 0 && byNet[i - 1].net === e.net ? byNet[i - 1].netRank : i + 1;
	});
	const byGross = [...entries].sort((a, b) => a.gross - b.gross);
	byGross.forEach((e, i) => {
		e.grossRank = i > 0 && byGross[i - 1].gross === e.gross ? byGross[i - 1].grossRank : i + 1;
	});

	return { entries: byNet, unfinished };
}

// --- Matchspel (cup) --------------------------------------------------------

export type BracketMatch = {
	id: string;
	round: number;
	slot: number;
	participant1: { id: string; name: string; isGuest: boolean } | null;
	participant2: { id: string; name: string; isGuest: boolean } | null;
	winnerId: string | null;
	coasterId: string | null;
	bye: boolean;
	// Signerade nettoresultat från matchcoastern (för visning)
	net1: number | null;
	net2: number | null;
};

export type Bracket = { rounds: BracketMatch[][] }; // rounds[0] = första omgången

/**
 * Slumpad lottning: betalda deltagare paras ihop, udda antal ger frilottningar
 * (byes) som avancerar direkt. Hela stegen skapas på en gång; vinnaren i
 * (round, slot) går till (round + 1, floor(slot / 2)).
 */
export function drawBracket(tournamentId: string): string | null {
	const paid = db
		.select({ id: tournamentParticipants.id })
		.from(tournamentParticipants)
		.where(
			and(
				eq(tournamentParticipants.tournamentId, tournamentId),
				eq(tournamentParticipants.status, 'paid')
			)
		)
		.all();
	if (paid.length < 2) return 'Minst två betalda deltagare krävs för lottning.';

	const shuffled = paid.map((p) => p.id);
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}

	const totalRounds = Math.ceil(Math.log2(shuffled.length));
	const bracketSize = 2 ** totalRounds;
	// Frilottade fördelas genom att fylla stegen med null-motståndare
	const seeds: (string | null)[] = [...shuffled];
	while (seeds.length < bracketSize) seeds.push(null);

	db.transaction((tx) => {
		tx.delete(tournamentMatches).where(eq(tournamentMatches.tournamentId, tournamentId)).run();
		// Skapa alla omgångar; omgång 1 fylls med lottningen.
		for (let round = 1; round <= totalRounds; round++) {
			const matches = bracketSize / 2 ** round;
			for (let slot = 0; slot < matches; slot++) {
				const p1 = round === 1 ? seeds[slot * 2] : null;
				const p2 = round === 1 ? seeds[slot * 2 + 1] : null;
				// Bye avgörs direkt — men propagering görs efter att alla rader finns
				tx.insert(tournamentMatches)
					.values({
						id: newId(),
						tournamentId,
						round,
						slot,
						participant1Id: p1,
						participant2Id: p2,
						winnerId: round === 1 && p1 && !p2 ? p1 : null,
						decidedAt: round === 1 && p1 && !p2 ? new Date() : null
					})
					.run();
			}
		}
		// Propagera byes till omgång 2
		const byes = tx
			.select()
			.from(tournamentMatches)
			.where(and(eq(tournamentMatches.tournamentId, tournamentId), eq(tournamentMatches.round, 1)))
			.all()
			.filter((m) => m.winnerId);
		for (const m of byes) {
			advanceWinnerTx(tx, tournamentId, m.round, m.slot, m.winnerId!);
		}
	});
	return null;
}

// Sätter vinnaren i nästa omgångs slot (jämn slot → participant1, udda → participant2).
function advanceWinnerTx(
	tx: Pick<typeof db, 'select' | 'update'>,
	tournamentId: string,
	round: number,
	slot: number,
	winnerId: string
) {
	const next = tx
		.select()
		.from(tournamentMatches)
		.where(
			and(
				eq(tournamentMatches.tournamentId, tournamentId),
				eq(tournamentMatches.round, round + 1),
				eq(tournamentMatches.slot, Math.floor(slot / 2))
			)
		)
		.get();
	if (!next) return; // finalen — ingen nästa omgång
	tx.update(tournamentMatches)
		.set(slot % 2 === 0 ? { participant1Id: winnerId } : { participant2Id: winnerId })
		.where(eq(tournamentMatches.id, next.id))
		.run();
}

/** Captain sätter vinnare manuellt (walkover, lika, override). */
export function setMatchWinner(matchId: string, winnerId: string): string | null {
	const match = db.select().from(tournamentMatches).where(eq(tournamentMatches.id, matchId)).get();
	if (!match) return 'Matchen finns inte.';
	if (winnerId !== match.participant1Id && winnerId !== match.participant2Id) {
		return 'Vinnaren måste vara en av matchens spelare.';
	}
	// Låst om vinnaren redan spelat vidare i nästa omgång
	const next = db
		.select()
		.from(tournamentMatches)
		.where(
			and(
				eq(tournamentMatches.tournamentId, match.tournamentId),
				eq(tournamentMatches.round, match.round + 1),
				eq(tournamentMatches.slot, Math.floor(match.slot / 2))
			)
		)
		.get();
	if (next?.decidedAt) return 'Nästa omgångs match är redan avgjord — vinnaren kan inte ändras.';

	db.transaction((tx) => {
		// Byt ut ev. tidigare vinnare i nästa omgång
		if (next && match.winnerId && match.winnerId !== winnerId) {
			tx.update(tournamentMatches)
				.set(match.slot % 2 === 0 ? { participant1Id: winnerId } : { participant2Id: winnerId })
				.where(eq(tournamentMatches.id, next.id))
				.run();
		}
		tx.update(tournamentMatches)
			.set({ winnerId, decidedAt: new Date() })
			.where(eq(tournamentMatches.id, matchId))
			.run();
		if (!match.winnerId || match.winnerId === winnerId) {
			advanceWinnerTx(tx, match.tournamentId, match.round, match.slot, winnerId);
		}
	});
	return null;
}

/**
 * Avgör en match automatiskt när båda raderna på matchcoastern är signerade:
 * lägst netto (brutto − playingHcp) vinner. Lika → oavgjort, captain avgör.
 * Anropas från signeringsflödena (medlem + gäst).
 */
export function maybeDecideMatch(coasterId: string): void {
	const match = db
		.select()
		.from(tournamentMatches)
		.where(eq(tournamentMatches.coasterId, coasterId))
		.get();
	if (!match || match.decidedAt || !match.participant1Id || !match.participant2Id) return;

	const rows = db
		.select({
			participantId: coasterPlayers.participantId,
			scores: coasterPlayers.scores,
			signedAt: coasterPlayers.signedAt,
			playingHcp: tournamentParticipants.playingHcp,
			par: coasters.par
		})
		.from(coasterPlayers)
		.innerJoin(tournamentParticipants, eq(coasterPlayers.participantId, tournamentParticipants.id))
		.innerJoin(coasters, eq(coasterPlayers.coasterId, coasters.id))
		.where(eq(coasterPlayers.coasterId, coasterId))
		.all();

	const r1 = rows.find((r) => r.participantId === match.participant1Id);
	const r2 = rows.find((r) => r.participantId === match.participant2Id);
	if (!r1?.signedAt || !r2?.signedAt) return;

	const net = (r: typeof r1) => grossTotalComplete(r!.scores, r!.par) - r!.playingHcp;
	const net1 = net(r1);
	const net2 = net(r2);
	if (net1 === net2) return; // lika — captain avgör manuellt

	const winnerId = net1 < net2 ? match.participant1Id : match.participant2Id;
	db.transaction((tx) => {
		tx.update(tournamentMatches)
			.set({ winnerId, decidedAt: new Date() })
			.where(eq(tournamentMatches.id, match.id))
			.run();
		advanceWinnerTx(tx, match.tournamentId, match.round, match.slot, winnerId);
	});
}

export function getBracket(tournamentId: string): Bracket | null {
	const matches = db
		.select()
		.from(tournamentMatches)
		.where(eq(tournamentMatches.tournamentId, tournamentId))
		.orderBy(asc(tournamentMatches.round), asc(tournamentMatches.slot))
		.all();
	if (!matches.length) return null;

	const participants = new Map(
		getParticipants(tournamentId).map((p) => [
			p.id,
			{ id: p.id, name: p.name, isGuest: p.isGuest, playingHcp: p.playingHcp }
		])
	);

	// Signerade nettoresultat per (coaster, deltagare) för visning i stegen
	const coasterIds = matches.map((m) => m.coasterId).filter((x): x is string => !!x);
	const netByCoasterParticipant = new Map<string, number>();
	if (coasterIds.length) {
		const rows = db
			.select({
				coasterId: coasterPlayers.coasterId,
				participantId: coasterPlayers.participantId,
				scores: coasterPlayers.scores,
				signedAt: coasterPlayers.signedAt,
				playingHcp: tournamentParticipants.playingHcp,
				par: coasters.par
			})
			.from(coasterPlayers)
			.innerJoin(
				tournamentParticipants,
				eq(coasterPlayers.participantId, tournamentParticipants.id)
			)
			.innerJoin(coasters, eq(coasterPlayers.coasterId, coasters.id))
			.where(eq(tournamentParticipants.tournamentId, tournamentId))
			.all();
		for (const r of rows) {
			if (!r.signedAt || !r.participantId) continue;
			const gross = grossTotalComplete(r.scores, r.par);
			netByCoasterParticipant.set(
				`${r.coasterId}:${r.participantId}`,
				Math.round((gross - r.playingHcp) * 10) / 10
			);
		}
	}

	const rounds: BracketMatch[][] = [];
	for (const m of matches) {
		const lookup = (id: string | null) => (id ? (participants.get(id) ?? null) : null);
		const netFor = (pid: string | null) =>
			m.coasterId && pid ? (netByCoasterParticipant.get(`${m.coasterId}:${pid}`) ?? null) : null;
		(rounds[m.round - 1] ??= []).push({
			id: m.id,
			round: m.round,
			slot: m.slot,
			participant1: lookup(m.participant1Id),
			participant2: lookup(m.participant2Id),
			winnerId: m.winnerId,
			coasterId: m.coasterId,
			bye: m.round === 1 && !!m.participant1Id && !m.participant2Id,
			net1: netFor(m.participant1Id),
			net2: netFor(m.participant2Id)
		});
	}
	return { rounds };
}

/** Cupens slutplaceringar: 1 = mästare, 2 = finalförlorare. */
export function bracketStandings(bracket: Bracket): Map<number, string> {
	const standings = new Map<number, string>();
	const final = bracket.rounds.at(-1)?.[0];
	if (final?.winnerId) {
		standings.set(1, final.winnerId);
		const runnerUp =
			final.participant1?.id === final.winnerId ? final.participant2?.id : final.participant1?.id;
		if (runnerUp) standings.set(2, runnerUp);
	}
	return standings;
}

export type PrizeRow = { tier: PrizeTier; amountOre: number; winnerName: string | null };

export type Report = {
	paidCount: number;
	byVia: { stripe: number; manual: number; free: number };
	grossIncomeOre: number;
	stripeFeesOre: number;
	netIncomeOre: number;
	expenses: {
		id: string;
		description: string;
		amountOre: number;
		receiptKey: string | null;
		createdAt: Date;
	}[];
	expensesOre: number;
	prizes: PrizeRow[];
	prizesOre: number;
	charityComputedOre: number;
	charityPaidOre: number | null;
	charityPaidAt: Date | null;
	charityReceiptKey: string | null;
	mismatch: boolean;
};

/** Priser i ören per nivå. Procent räknas på (netto − kostnader), hela kronor. */
export function computePrizes(t: Tournament, prizePoolBaseOre: number): PrizeRow[] {
	if (t.prizeMode === 'none') return [];
	return t.prizes.map((tier) => ({
		tier,
		amountOre:
			t.prizeMode === 'fixed'
				? (tier.amountOre ?? 0)
				: Math.round((((tier.percent ?? 0) / 100) * prizePoolBaseOre) / 100) * 100,
		winnerName: null
	}));
}

export function getReport(t: Tournament): Report {
	const income = db
		.select({
			paidVia: tournamentParticipants.paidVia,
			count: sql<number>`count(*)`,
			amountOre: sql<number>`coalesce(sum(${tournamentParticipants.amountPaidOre}), 0)`,
			feesOre: sql<number>`coalesce(sum(${tournamentParticipants.stripeFeeOre}), 0)`
		})
		.from(tournamentParticipants)
		.where(
			and(eq(tournamentParticipants.tournamentId, t.id), eq(tournamentParticipants.status, 'paid'))
		)
		.groupBy(tournamentParticipants.paidVia)
		.all();

	const byVia = { stripe: 0, manual: 0, free: 0 };
	let grossIncomeOre = 0;
	let stripeFeesOre = 0;
	let paidCount = 0;
	for (const r of income) {
		if (r.paidVia) byVia[r.paidVia] = r.count;
		paidCount += r.count;
		grossIncomeOre += r.amountOre;
		stripeFeesOre += r.feesOre;
	}
	const netIncomeOre = grossIncomeOre - stripeFeesOre;

	const expenses = db
		.select({
			id: tournamentExpenses.id,
			description: tournamentExpenses.description,
			amountOre: tournamentExpenses.amountOre,
			receiptKey: tournamentExpenses.receiptKey,
			createdAt: tournamentExpenses.createdAt
		})
		.from(tournamentExpenses)
		.where(eq(tournamentExpenses.tournamentId, t.id))
		.orderBy(desc(tournamentExpenses.createdAt))
		.all();
	const expensesOre = expenses.reduce((a, e) => a + e.amountOre, 0);

	const prizes = computePrizes(t, netIncomeOre - expensesOre);
	// Vinnarnamn: slagspel från netto-leaderboarden, matchspel från cupens
	// slutplaceringar (1 = mästare, 2 = finalförlorare).
	if (prizes.length) {
		if (t.format === 'match') {
			const bracket = getBracket(t.id);
			const standings = bracket ? bracketStandings(bracket) : new Map<number, string>();
			const names = new Map(getParticipants(t.id).map((p) => [p.id, p.name]));
			for (const p of prizes) {
				const pid = standings.get(p.tier.place);
				p.winnerName = pid ? (names.get(pid) ?? null) : null;
			}
		} else {
			const { entries } = getLeaderboard(t.id);
			for (const p of prizes) {
				p.winnerName = entries.find((e) => e.netRank === p.tier.place)?.name ?? null;
			}
		}
	}
	const prizesOre = prizes.reduce((a, p) => a + p.amountOre, 0);

	const charityComputedOre = netIncomeOre - expensesOre - prizesOre;
	return {
		paidCount,
		byVia,
		grossIncomeOre,
		stripeFeesOre,
		netIncomeOre,
		expenses,
		expensesOre,
		prizes,
		prizesOre,
		charityComputedOre,
		charityPaidOre: t.charityPaidOre,
		charityPaidAt: t.charityPaidAt,
		charityReceiptKey: t.charityReceiptKey,
		mismatch: t.charityPaidOre !== null && t.charityPaidOre !== charityComputedOre
	};
}
