import { desc, eq, sql } from 'drizzle-orm';
import { db } from './db';
import {
	certifications,
	coasters,
	coasterPlayers,
	members,
	quizAttempts,
	rounds
} from './db/schema';

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
			role: members.role,
			status: members.status,
			hcp: members.hcp,
			memberNumber: members.memberNumber,
			createdAt: members.createdAt
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
			const filled = m.myScores.filter((s): s is number => s !== null);
			return {
				id: m.id,
				name: m.name,
				createdAt: m.createdAt,
				playerCount: m.playerCount,
				signedCount: m.signedCount,
				finished: m.playerCount > 0 && m.signedCount === m.playerCount,
				myGross: filled.length ? filled.reduce((a, b) => a + b, 0) : null,
				mySigned: m.mySignedAt !== null
			};
		});

	// Teoriprov: status + hela försökshistoriken. Misslyckanden visas öppet
	// i profilen även efter godkänt — hederssystemet.
	const cert = await db
		.select({
			passed: certifications.theoryPassed,
			autoPassed: certifications.theoryAutoPassed,
			at: certifications.theoryAt
		})
		.from(certifications)
		.where(eq(certifications.memberId, memberId))
		.get();
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
		member,
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
		theory: {
			passed: cert?.passed ?? false,
			autoPassed: cert?.autoPassed ?? false,
			at: cert?.at ?? null,
			attempts: theoryAttempts
		}
	};
}

export type Dashboard = NonNullable<Awaited<ReturnType<typeof getDashboard>>>;
