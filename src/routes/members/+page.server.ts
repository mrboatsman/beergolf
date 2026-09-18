import { and, asc, eq, like, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { clubMembers, members } from '$lib/server/db/schema';
import { requireMember } from '$lib/server/guard';
import { avatarUrl } from '$lib/server/avatar';
import { currentSeason } from '$lib/server/seasons';
import { pickClub } from '$lib/server/clubs';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 25;

export const load: PageServerLoad = async ({ locals, url }) => {
	const me = requireMember(locals.member);
	// Klubb via ?club=slug (flikar), annars hemmaklubben. Hemmaklubbsmedlemmar
	// rankas; dubbelmedlemmar listas orankade (de rankas i sin hemmaklubb).
	const { club, clubs } = pickClub(me, url);
	const clubId = club.id;

	const q = url.searchParams.get('q')?.trim() ?? '';
	const page = Math.max(1, Number(url.searchParams.get('page') ?? 1) || 1);

	// Filtrera på namn eller e-post, inom klubbens aktiva medlemmar
	const inClub = and(eq(clubMembers.clubId, clubId), eq(clubMembers.status, 'active'));
	const where = q
		? and(inClub, or(like(members.name, `%${q}%`), like(members.email, `%${q}%`)))
		: inClub;

	const total =
		(
			await db
				.select({ n: sql<number>`count(*)` })
				.from(members)
				.innerJoin(clubMembers, eq(clubMembers.memberId, members.id))
				.where(where)
				.get()
		)?.n ?? 0;
	const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const current = Math.min(page, pages);

	const season = currentSeason(clubId);
	const seasonStart = Math.floor(season.start.getTime() / 1000);
	const seasonEnd = Math.floor(season.end.getTime() / 1000);

	// Säsongens leaderboard: bara medlemmar som spelat (signerat) minst en runda
	// under säsongen rankas — på handikapp, lägst bäst. Övriga listas orankade
	// efteråt. Ranken är global (hela klubben) även vid filter/paginering.
	const list = await db
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
			isHome: sql<number>`members.home_club_id = ${clubId}`,
			// Aktiv i säsongen = hemmamedlem med minst en runda i klubben mellan start och slut
			active: sql<number>`members.home_club_id = ${clubId} and exists(
				select 1 from rounds r
				where r.member_id = members.id and r.club_id = ${clubId} and r.played_at >= ${seasonStart} and r.played_at < ${seasonEnd}
			)`,
			rank: sql<number>`(
				select count(*) + 1 from members m2
				where m2.hcp < members.hcp and m2.home_club_id = ${clubId} and exists(
					select 1 from rounds r where r.member_id = m2.id and r.club_id = ${clubId} and r.played_at >= ${seasonStart} and r.played_at < ${seasonEnd}
				)
			)`,
			roundsSeason: sql<number>`(
				select count(*) from rounds r
				where r.member_id = members.id and r.club_id = ${clubId} and r.played_at >= ${seasonStart} and r.played_at < ${seasonEnd}
			)`,
			bestGross: sql<number | null>`(
				select min(r.gross_total) from rounds r
				where r.member_id = members.id and r.club_id = ${clubId} and r.played_at >= ${seasonStart} and r.played_at < ${seasonEnd}
			)`
		})
		.from(members)
		.innerJoin(clubMembers, eq(clubMembers.memberId, members.id))
		.where(where)
		.orderBy(
			sql`(members.home_club_id = ${clubId} and exists(select 1 from rounds r where r.member_id = members.id and r.club_id = ${clubId} and r.played_at >= ${seasonStart} and r.played_at < ${seasonEnd})) desc`,
			sql`(members.home_club_id = ${clubId}) desc`,
			asc(members.hcp),
			asc(members.name)
		)
		.limit(PAGE_SIZE)
		.offset((current - 1) * PAGE_SIZE)
		.all();

	// Skicka aldrig e-post/nycklar till klienten — bara färdig avatar-URL
	const rows = list.map(({ email, avatarKey, gravatar, active, isHome, ...m }) => ({
		...m,
		active: !!active,
		isHome: !!isHome,
		rank: active ? m.rank : null,
		avatarUrl: avatarUrl({ email, avatarKey, gravatar })
	}));
	return {
		members: rows,
		q,
		page: current,
		pages,
		total,
		seasonLabel: season.label,
		clubName: club.name,
		clubSlug: club.slug,
		clubId: club.id,
		clubs
	};
};
