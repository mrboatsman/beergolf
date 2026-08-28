import { desc, eq, sql } from 'drizzle-orm';
import { db } from './db';
import { grossTotal } from '$lib/scoring';
import { coasters, coasterPlayers, members, quizAttempts, rounds } from './db/schema';
import { getCertStatus, getPendingAspirantsFor } from './certification';
import { avatarUrl } from './avatar';

const FALLBACK_PAR = 35; // äldre rundor utan coaster-koppling

export type DashboardRound = {
	id: string;
	playedAt: Date;
	holes: number;
	grossTotal: number;
	netTotal: number;
	hcpBefore: number;
	hcpAfter: number;
	coasterId: string | null;
	coasterName: string | null;
	toPar: number;
};

export type DashboardMatch = {
	id: string;
	name: string | null;
	createdAt: Date;
	playerCount: number;
	signedCount: number;
	finished: boolean;
	myGross: number | null;
	mySigned: boolean;
};

export async function getDashboard(memberId: string) {
	const member = await db
		.select({
			id: members.id,
			name: members.name,
			email: members.email,
			avatarKey: members.avatarKey,
			gravatar: members.gravatar,
			role: members.role,
			status: members.status,
			hcp: members.hcp,
			memberNumber: members.memberNumber,
			greenCardIssuedAt: members.greenCardIssuedAt,
			welcomeSeenAt: members.welcomeSeenAt,
			createdAt: members.createdAt,
			// Global leaderboard-placering (lägst hcp = bäst). OBS: literal
			// members.hcp — drizzle-interpolation binder fel i subqueries.
			rank: sql<number>`(select count(*) + 1 from members m2 where m2.hcp < members.hcp)`,
			memberCount: sql<number>`(select count(*) from members)`
		})
		.from(members)
		.where(eq(members.id, memberId))
		.get();
	if (!member) return null;

	// Alla rundor, nyast först, med coaster-namn/par via signeringen.
	const allRounds: DashboardRound[] = db
		.select({
			id: rounds.id,
			playedAt: rounds.playedAt,
			holes: rounds.holes,
			grossTotal: rounds.grossTotal,
			netTotal: rounds.netTotal,
			hcpBefore: rounds.hcpBefore,
			hcpAfter: rounds.hcpAfter,
			coasterId: coasters.id,
			coasterName: coasters.name,
			par: coasters.par
		})
		.from(rounds)
		.leftJoin(coasterPlayers, eq(coasterPlayers.roundId, rounds.id))
		.leftJoin(coasters, eq(coasterPlayers.coasterId, coasters.id))
		.where(eq(rounds.memberId, memberId))
		.orderBy(desc(rounds.playedAt))
		.all()
		.map(({ par, ...r }) => {
			const parTotal = par ? par.reduce((a, b) => a + b, 0) : FALLBACK_PAR;
			return { ...r, toPar: r.grossTotal - parTotal };
		});

	const seasonYear = new Date().getFullYear();
	const season = allRounds.filter((r) => new Date(r.playedAt).getFullYear() === seasonYear);

	// Säsongsstatistik
	const bestGross = season.length ? Math.min(...season.map((r) => r.grossTotal)) : null;
	const bestNetRoundId = season.length
		? season.reduce((best, r) => (r.netTotal < best.netTotal ? r : best), season[0]).id
		: null;
	const avgToPar = season.length
		? Math.round((season.reduce((a, r) => a + r.toPar, 0) / season.length) * 10) / 10
		: null;
	const lowestHcp = season.length ? Math.min(...season.map((r) => r.hcpAfter)) : null;
	// Förändring denna säsong: hcp vid säsongens start → nu (negativ = sänkt)
	const seasonStartHcp = season.length ? season[season.length - 1].hcpBefore : member.hcp;
	const hcpChange = Math.round((member.hcp - seasonStartHcp) * 10) / 10;

	// Trend: senaste 12 rundorna, äldst → nyast
	const trend = allRounds
		.slice(0, 12)
		.map((r) => r.hcpAfter)
		.reverse();

	// Matcher (coasters medlemmen deltar i): pågående + avslutade
	const matches: DashboardMatch[] = db
		.select({
			id: coasters.id,
			name: coasters.name,
			createdAt: coasters.createdAt,
			myScores: coasterPlayers.scores,
			mySignedAt: coasterPlayers.signedAt,
			par: coasters.par,
			playerCount: sql<number>`(
				select count(*) from coaster_players cp where cp.coaster_id = ${coasters.id}
			)`,
			signedCount: sql<number>`(
				select count(*) from coaster_players cp
				where cp.coaster_id = ${coasters.id} and cp.signed_at is not null
			)`
		})
		.from(coasterPlayers)
		.innerJoin(coasters, eq(coasterPlayers.coasterId, coasters.id))
		.where(eq(coasterPlayers.memberId, memberId))
		.orderBy(desc(coasters.createdAt))
		.all()
		.map((m) => {
			return {
				id: m.id,
				name: m.name,
				createdAt: m.createdAt,
				playerCount: m.playerCount,
				signedCount: m.signedCount,
				finished: m.playerCount > 0 && m.signedCount === m.playerCount,
				myGross: grossTotal(m.myScores, m.par),
				mySigned: m.mySignedAt !== null
			};
		});

	// Grönt kort: full certifieringsstatus (teori/praktik/etikett, bevis,
	// fadderns omdöme) + teoriprovets försökshistorik. Misslyckanden visas
	// öppet i profilen även efter godkänt — hederssystemet.
	const cert = await getCertStatus(memberId);
	const theoryAttempts = await db
		.select({
			id: quizAttempts.id,
			score: quizAttempts.score,
			passed: quizAttempts.passed,
			takenAt: quizAttempts.takenAt
		})
		.from(quizAttempts)
		.where(eq(quizAttempts.memberId, memberId))
		.orderBy(desc(quizAttempts.takenAt))
		.all();

	return {
		// Fadder-att-göra (bara meningsfullt för egen dashboard)
		pendingAspirants: member.status === 'aspirant' ? [] : getPendingAspirantsFor(member.id),
		member: (() => {
			// e-post/nycklar stannar på servern — bara avatar-URL går ut
			const { email, avatarKey, gravatar, ...rest } = member;
			return { ...rest, avatarUrl: avatarUrl({ email, avatarKey, gravatar }) };
		})(),
		seasonYear,
		stats: {
			roundsSeason: season.length,
			bestGross,
			avgToPar,
			lowestHcp,
			hcpChange
		},
		trend,
		recent: allRounds.slice(0, 4),
		bestNetRoundId,
		matches,
		cert,
		theoryAttempts
	};
}

export type Dashboard = NonNullable<Awaited<ReturnType<typeof getDashboard>>>;
