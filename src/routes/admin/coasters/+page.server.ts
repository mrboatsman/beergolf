import { asc, desc, eq, exists, like, or, sql, and } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	coasters,
	coasterPlayers,
	members,
	tournaments,
	tournamentParticipants
} from '$lib/server/db/schema';
import { requireRole } from '$lib/server/guard';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 25;

// Admin: sök bland alla coasters på coasternamn, spelarnamn (medlem/gäst)
// eller turneringsnamn. Paginerad (q/page).
export const load: PageServerLoad = async ({ locals, url }) => {
	requireRole(locals.member, 'admin');
	const q = url.searchParams.get('q')?.trim() ?? '';
	const pageReq = Math.max(1, Number(url.searchParams.get('page') ?? 1) || 1);

	const pattern = `%${q}%`;
	const where = q
		? or(
				like(coasters.name, pattern),
				like(tournaments.name, pattern),
				exists(
					db
						.select({ one: sql`1` })
						.from(coasterPlayers)
						.leftJoin(members, eq(coasterPlayers.memberId, members.id))
						.leftJoin(
							tournamentParticipants,
							eq(coasterPlayers.participantId, tournamentParticipants.id)
						)
						.where(
							and(
								eq(coasterPlayers.coasterId, coasters.id),
								or(like(members.name, pattern), like(tournamentParticipants.guestName, pattern))
							)
						)
				)
			)
		: undefined;

	const total =
		(
			await db
				.select({ n: sql<number>`count(*)` })
				.from(coasters)
				.leftJoin(tournaments, eq(coasters.tournamentId, tournaments.id))
				.where(where)
				.get()
		)?.n ?? 0;
	const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const page = Math.min(pageReq, pages);

	const list = await db
		.select({
			id: coasters.id,
			name: coasters.name,
			createdAt: coasters.createdAt,
			tournamentName: tournaments.name,
			creatorName: members.name,
			playerCount: sql<number>`(select count(*) from coaster_players cp where cp.coaster_id = coasters.id)`,
			signedCount: sql<number>`(select count(*) from coaster_players cp where cp.coaster_id = coasters.id and cp.signed_at is not null)`,
			playerNames: sql<string>`(select group_concat(coalesce(m.name, tp.guest_name, '?'), ', ') from coaster_players cp left join members m on m.id = cp.member_id left join tournament_participants tp on tp.id = cp.participant_id where cp.coaster_id = coasters.id order by cp.position)`
		})
		.from(coasters)
		.leftJoin(tournaments, eq(coasters.tournamentId, tournaments.id))
		.leftJoin(members, eq(coasters.createdBy, members.id))
		.where(where)
		.orderBy(desc(coasters.createdAt), asc(coasters.id))
		.limit(PAGE_SIZE)
		.offset((page - 1) * PAGE_SIZE)
		.all();

	return { q, page, pages, total, list };
};
