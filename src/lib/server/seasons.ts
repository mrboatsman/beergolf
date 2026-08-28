// Säsongsinställning (club_settings) + arkiv med statistik per avslutad säsong.
import { and, asc, eq, gte, isNotNull, lt, sql } from 'drizzle-orm';
import { db } from './db';
import {
	certifications,
	clubSettings,
	coasterPlayers,
	coasters,
	members,
	rounds,
	seasonArchives
} from './db/schema';
import {
	DEFAULT_SEASON,
	endedSeasons,
	seasonAt,
	seasonFromLabel,
	type Season,
	type SeasonConfig
} from '$lib/season';

const KEY_MONTH = 'season.startMonth';
const KEY_DAY = 'season.startDay';

export function getSeasonConfig(): SeasonConfig {
	const rows = db.select().from(clubSettings).all();
	const get = (k: string) => rows.find((r) => r.key === k)?.value;
	const m = Number(get(KEY_MONTH) ?? DEFAULT_SEASON.startMonth);
	const d = Number(get(KEY_DAY) ?? DEFAULT_SEASON.startDay);
	return {
		startMonth: Number.isInteger(m) && m >= 1 && m <= 12 ? m : 1,
		startDay: Number.isInteger(d) && d >= 1 && d <= 31 ? d : 1
	};
}

export function setSeasonConfig(cfg: SeasonConfig) {
	db.transaction((tx) => {
		for (const [key, value] of [
			[KEY_MONTH, String(cfg.startMonth)],
			[KEY_DAY, String(cfg.startDay)]
		]) {
			tx.insert(clubSettings)
				.values({ key, value })
				.onConflictDoUpdate({ target: clubSettings.key, set: { value } })
				.run();
		}
	});
	// Byts säsongsgränserna ändras historiken — kasta cachade arkiv
	db.delete(seasonArchives).run();
}

export function currentSeason(now = new Date()): Season {
	return seasonAt(now, getSeasonConfig());
}

/** Avslutade säsonger från klubbens första runda/medlem till nu. */
export function listEndedSeasons(now = new Date()): Season[] {
	const cfg = getSeasonConfig();
	const firstRound = db
		.select({ at: sql<number | null>`min(${rounds.playedAt})` })
		.from(rounds)
		.get()?.at;
	const firstMember = db
		.select({ at: sql<number | null>`min(${members.createdAt})` })
		.from(members)
		.get()?.at;
	const first = Math.min(firstRound ?? Infinity, firstMember ?? Infinity);
	if (!Number.isFinite(first)) return [];
	return endedSeasons(new Date(first * 1000), now, cfg);
}

// --- Statistik för en säsong -----------------------------------------------
export type SeasonStanding = {
	memberId: string;
	name: string;
	rank: number;
	hcpStart: number;
	hcpEnd: number;
	rounds: number;
	bestGross: number | null;
	avgNet: number | null;
	wins: number;
};
export type SeasonStats = {
	label: string;
	startsAt: string;
	endsAt: string;
	standings: SeasonStanding[];
	winners: { memberId: string; name: string; hcpEnd: number }[];
	totals: {
		rounds: number;
		coasters: number;
		players: number;
		newMembers: number;
		newAccounts: number;
	};
	mostRounds: { name: string; memberId: string; value: number }[];
	mostWins: { name: string; memberId: string; value: number }[];
	mostImproved: { name: string; memberId: string; value: number }[]; // hcp-sänkning
	bestGross: { name: string; memberId: string; value: number } | null;
	bestNet: { name: string; memberId: string; value: number } | null;
	bestFadder: { name: string; memberId: string; value: number }[];
	newMembers: { memberId: string; name: string; memberNumber: number | null }[];
};

function top<T extends { value: number }>(xs: T[], desc = true, n = 3): T[] {
	const sorted = [...xs].sort((a, b) => (desc ? b.value - a.value : a.value - b.value));
	if (!sorted.length) return [];
	// Ta med delade platser upp till n
	const cut = sorted[Math.min(n, sorted.length) - 1].value;
	return sorted.filter((x) => (desc ? x.value >= cut : x.value <= cut));
}

export function computeSeasonStats(season: Season): SeasonStats {
	const start = season.start;
	const end = season.end;
	const rs = db
		.select({
			id: rounds.id,
			memberId: rounds.memberId,
			name: members.name,
			gross: rounds.grossTotal,
			net: rounds.netTotal,
			hcpBefore: rounds.hcpBefore,
			hcpAfter: rounds.hcpAfter,
			playedAt: rounds.playedAt,
			coasterId: coasterPlayers.coasterId
		})
		.from(rounds)
		.innerJoin(members, eq(rounds.memberId, members.id))
		.leftJoin(coasterPlayers, eq(coasterPlayers.roundId, rounds.id))
		.where(and(gte(rounds.playedAt, start), lt(rounds.playedAt, end)))
		.orderBy(asc(rounds.playedAt), asc(rounds.id))
		.all();

	// Per medlem
	const per = new Map<string, { name: string; rounds: typeof rs }>();
	for (const r of rs)
		(
			per.get(r.memberId) ?? per.set(r.memberId, { name: r.name, rounds: [] }).get(r.memberId)!
		).rounds.push(r);

	// Vinster: coasters vars sista signatur föll i säsongen, ≥2 spelare, alla signerade → lägst netto
	const finished = db
		.select({
			coasterId: coasterPlayers.coasterId,
			memberId: coasterPlayers.memberId,
			net: rounds.netTotal,
			lastSigned: sql<number>`(select max(cp2.signed_at) from coaster_players cp2 where cp2.coaster_id = ${coasterPlayers.coasterId})`,
			total: sql<number>`(select count(*) from coaster_players cp2 where cp2.coaster_id = ${coasterPlayers.coasterId})`,
			unsigned: sql<number>`(select count(*) from coaster_players cp2 where cp2.coaster_id = ${coasterPlayers.coasterId} and cp2.signed_at is null)`
		})
		.from(coasterPlayers)
		.leftJoin(rounds, eq(coasterPlayers.roundId, rounds.id))
		.innerJoin(coasters, eq(coasterPlayers.coasterId, coasters.id))
		.where(isNotNull(coasterPlayers.signedAt))
		.all()
		.filter(
			(r) =>
				r.total >= 2 &&
				r.unsigned === 0 &&
				r.lastSigned * 1000 >= start.getTime() &&
				r.lastSigned * 1000 < end.getTime()
		);
	const byCoaster = new Map<string, typeof finished>();
	for (const f of finished)
		(byCoaster.get(f.coasterId) ?? byCoaster.set(f.coasterId, []).get(f.coasterId)!).push(f);
	const wins = new Map<string, number>();
	for (const rows of byCoaster.values()) {
		const nets = rows.filter((r) => r.net !== null && r.memberId);
		if (!nets.length) continue;
		const best = Math.min(...nets.map((r) => r.net as number));
		for (const r of nets)
			if (r.net === best) wins.set(r.memberId!, (wins.get(r.memberId!) ?? 0) + 1);
	}

	const standingsRaw = [...per.entries()].map(([memberId, m]) => {
		const first = m.rounds[0];
		const last = m.rounds[m.rounds.length - 1];
		return {
			memberId,
			name: m.name,
			hcpStart: first.hcpBefore,
			hcpEnd: last.hcpAfter,
			rounds: m.rounds.length,
			bestGross: Math.min(...m.rounds.map((r) => r.gross)),
			avgNet: Math.round((m.rounds.reduce((a, r) => a + r.net, 0) / m.rounds.length) * 10) / 10,
			wins: wins.get(memberId) ?? 0
		};
	});
	standingsRaw.sort((a, b) => a.hcpEnd - b.hcpEnd || a.name.localeCompare(b.name, 'sv'));
	const standings: SeasonStanding[] = standingsRaw.map((s) => ({
		...s,
		rank: standingsRaw.filter((o) => o.hcpEnd < s.hcpEnd).length + 1
	}));
	const winners = standings
		.filter((s) => s.rank === 1)
		.map((s) => ({ memberId: s.memberId, name: s.name, hcpEnd: s.hcpEnd }));

	// Faddrar: certifieringar klara i säsongen
	const certs = db
		.select({ fadderId: certifications.fadderId, name: members.name })
		.from(certifications)
		.leftJoin(members, eq(certifications.fadderId, members.id))
		.where(
			and(
				gte(certifications.certifiedAt, start),
				lt(certifications.certifiedAt, end),
				isNotNull(certifications.fadderId)
			)
		)
		.all();
	const fadderCount = new Map<string, { name: string; value: number }>();
	for (const c of certs) {
		if (!c.fadderId) continue;
		const e = fadderCount.get(c.fadderId) ?? { name: c.name ?? '?', value: 0 };
		e.value++;
		fadderCount.set(c.fadderId, e);
	}

	const newMembers = db
		.select({ memberId: members.id, name: members.name, memberNumber: members.memberNumber })
		.from(members)
		.where(and(gte(members.greenCardIssuedAt, start), lt(members.greenCardIssuedAt, end)))
		.orderBy(asc(members.memberNumber))
		.all();
	const newAccounts =
		db
			.select({ n: sql<number>`count(*)` })
			.from(members)
			.where(and(gte(members.createdAt, start), lt(members.createdAt, end)))
			.get()?.n ?? 0;

	const bestGrossRound = rs.length ? rs.reduce((b, r) => (r.gross < b.gross ? r : b), rs[0]) : null;
	const bestNetRound = rs.length ? rs.reduce((b, r) => (r.net < b.net ? r : b), rs[0]) : null;

	return {
		label: season.label,
		startsAt: start.toISOString(),
		endsAt: end.toISOString(),
		standings,
		winners,
		totals: {
			rounds: rs.length,
			coasters: byCoaster.size,
			players: per.size,
			newMembers: newMembers.length,
			newAccounts
		},
		mostRounds: top(
			standings.map((s) => ({ name: s.name, memberId: s.memberId, value: s.rounds }))
		),
		mostWins: top(
			standings
				.filter((s) => s.wins > 0)
				.map((s) => ({ name: s.name, memberId: s.memberId, value: s.wins }))
		),
		mostImproved: top(
			standings
				.map((s) => ({
					name: s.name,
					memberId: s.memberId,
					value: Math.round((s.hcpStart - s.hcpEnd) * 10) / 10
				}))
				.filter((x) => x.value > 0)
		),
		bestGross: bestGrossRound
			? {
					name: bestGrossRound.name,
					memberId: bestGrossRound.memberId,
					value: bestGrossRound.gross
				}
			: null,
		bestNet: bestNetRound
			? { name: bestNetRound.name, memberId: bestNetRound.memberId, value: bestNetRound.net }
			: null,
		bestFadder: top([...fadderCount.entries()].map(([memberId, e]) => ({ memberId, ...e }))),
		newMembers
	};
}

/** Arkiv för en avslutad säsong — beräknas och cachas första gången. */
export function getSeasonArchive(label: string, now = new Date()): SeasonStats | null {
	const cfg = getSeasonConfig();
	const season = seasonFromLabel(label, cfg);
	if (!season || season.end > now) return null;
	const cached = db.select().from(seasonArchives).where(eq(seasonArchives.label, label)).get();
	if (cached) return cached.data as SeasonStats;
	const stats = computeSeasonStats(season);
	db.insert(seasonArchives)
		.values({ label, startsAt: season.start, endsAt: season.end, data: stats })
		.onConflictDoNothing()
		.run();
	return stats;
}
