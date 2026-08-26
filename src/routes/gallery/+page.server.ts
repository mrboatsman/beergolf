import { asc, desc, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	coasters,
	coasterBackImages,
	coasterPlayers,
	members,
	rounds,
	tournamentParticipants
} from '$lib/server/db/schema';
import { requireMember } from '$lib/server/guard';
import { grossTotalComplete } from '$lib/scoring';
import type { PageServerLoad } from './$types';

const LIMIT = 200;

// Galleri: alla färdigspelade coasters (≥2 spelare, alla signerade), nyast först,
// med baksida (bilder + ritning) och framsida (spelare, brutto/netto, vinnare).
export const load: PageServerLoad = async ({ locals }) => {
	requireMember(locals.member);

	const finished = db
		.select({
			id: coasters.id,
			name: coasters.name,
			par: coasters.par,
			createdAt: coasters.createdAt,
			drawingKey: coasters.backDrawingKey,
			creatorName: members.name
		})
		.from(coasters)
		.innerJoin(members, eq(coasters.createdBy, members.id))
		.where(
			sql`(select count(*) from coaster_players cp where cp.coaster_id = ${coasters.id}) >= 2
				and not exists (select 1 from coaster_players cp where cp.coaster_id = ${coasters.id} and cp.signed_at is null)`
		)
		.orderBy(desc(coasters.createdAt))
		.limit(LIMIT)
		.all();

	const ids = finished.map((c) => c.id);
	const imagesBy = new Map<string, (typeof coasterBackImages.$inferSelect)[]>();
	const playersBy = new Map<
		string,
		{
			id: string;
			position: number;
			memberId: string | null;
			scores: (number | null)[];
			signedAt: Date | null;
			name: string;
			gross: number;
			net: number | null;
			isGuest: boolean;
		}[]
	>();
	if (ids.length) {
		for (const img of db
			.select()
			.from(coasterBackImages)
			.where(sql`${coasterBackImages.coasterId} in ${ids}`)
			.orderBy(asc(coasterBackImages.z), asc(coasterBackImages.createdAt))
			.all()) {
			(imagesBy.get(img.coasterId) ?? imagesBy.set(img.coasterId, []).get(img.coasterId)!).push(
				img
			);
		}
		const rows = db
			.select({
				id: coasterPlayers.id,
				coasterId: coasterPlayers.coasterId,
				memberId: coasterPlayers.memberId,
				position: coasterPlayers.position,
				scores: coasterPlayers.scores,
				signedAt: coasterPlayers.signedAt,
				name: sql<string>`coalesce(${members.name}, ${tournamentParticipants.guestName}, '?')`,
				isGuest: sql<boolean>`${coasterPlayers.memberId} is null`,
				roundNet: rounds.netTotal,
				playingHcp: tournamentParticipants.playingHcp
			})
			.from(coasterPlayers)
			.leftJoin(members, eq(coasterPlayers.memberId, members.id))
			.leftJoin(tournamentParticipants, eq(coasterPlayers.participantId, tournamentParticipants.id))
			.leftJoin(rounds, eq(coasterPlayers.roundId, rounds.id))
			.where(sql`${coasterPlayers.coasterId} in ${ids}`)
			.orderBy(asc(coasterPlayers.position))
			.all();
		const parBy = new Map(finished.map((c) => [c.id, c.par]));
		for (const r of rows) {
			const par = parBy.get(r.coasterId) ?? [];
			const gross = grossTotalComplete(r.scores, par);
			const net = r.roundNet ?? (r.playingHcp !== null ? gross - r.playingHcp : null);
			(playersBy.get(r.coasterId) ?? playersBy.set(r.coasterId, []).get(r.coasterId)!).push({
				id: r.id,
				position: r.position,
				memberId: r.memberId,
				scores: r.scores,
				signedAt: r.signedAt,
				name: r.name,
				gross,
				net,
				isGuest: !!r.isGuest
			});
		}
	}

	return {
		coasters: finished.map((c) => {
			const players = playersBy.get(c.id) ?? [];
			const nets = players.filter((p) => p.net !== null).map((p) => p.net as number);
			const best = nets.length ? Math.min(...nets) : null;
			return {
				...c,
				parTotal: c.par.reduce((a, b) => a + b, 0),
				images: imagesBy.get(c.id) ?? [],
				players,
				winners:
					best === null
						? []
						: players.filter((p) => p.net === best).map((p) => ({ name: p.name, net: p.net })),
				bestNet: best
			};
		})
	};
};
