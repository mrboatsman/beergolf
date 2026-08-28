import { asc, like, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { members } from '$lib/server/db/schema';
import { requireMember } from '$lib/server/guard';
import { avatarUrl } from '$lib/server/avatar';
import { currentSeason } from '$lib/server/seasons';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 25;

export const load: PageServerLoad = async ({ locals, url }) => {
	requireMember(locals.member);

	const q = url.searchParams.get('q')?.trim() ?? '';
	const page = Math.max(1, Number(url.searchParams.get('page') ?? 1) || 1);

	// Filtrera på namn eller e-post
	const where = q ? or(like(members.name, `%${q}%`), like(members.email, `%${q}%`)) : undefined;

	const total =
		(
			await db
				.select({ n: sql<number>`count(*)` })
				.from(members)
				.where(where)
				.get()
		)?.n ?? 0;
	const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const current = Math.min(page, pages);

	const season = currentSeason();
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
			// Aktiv i säsongen = minst en runda mellan start och slut
			active: sql<number>`exists(
				select 1 from rounds r
				where r.member_id = members.id and r.played_at >= ${seasonStart} and r.played_at < ${seasonEnd}
			)`,
			rank: sql<number>`(
				select count(*) + 1 from members m2
				where m2.hcp < members.hcp and exists(
					select 1 from rounds r where r.member_id = m2.id and r.played_at >= ${seasonStart} and r.played_at < ${seasonEnd}
				)
			)`,
			roundsSeason: sql<number>`(
				select count(*) from rounds r
				where r.member_id = members.id and r.played_at >= ${seasonStart} and r.played_at < ${seasonEnd}
			)`,
			bestGross: sql<number | null>`(
				select min(r.gross_total) from rounds r
				where r.member_id = members.id and r.played_at >= ${seasonStart} and r.played_at < ${seasonEnd}
			)`
		})
		.from(members)
		.where(where)
		.orderBy(
			sql`exists(select 1 from rounds r where r.member_id = members.id and r.played_at >= ${seasonStart} and r.played_at < ${seasonEnd}) desc`,
			asc(members.hcp),
			asc(members.name)
		)
		.limit(PAGE_SIZE)
		.offset((current - 1) * PAGE_SIZE)
		.all();

	// Skicka aldrig e-post/nycklar till klienten — bara färdig avatar-URL
	const rows = list.map(({ email, avatarKey, gravatar, active, ...m }) => ({
		...m,
		active: !!active,
		rank: active ? m.rank : null,
		avatarUrl: avatarUrl({ email, avatarKey, gravatar })
	}));
	return { members: rows, q, page: current, pages, total, seasonLabel: season.label };
};
