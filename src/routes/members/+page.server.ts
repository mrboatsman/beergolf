import { asc, like, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { members } from '$lib/server/db/schema';
import { requireMember } from '$lib/server/guard';
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

	const seasonStart = Math.floor(new Date(new Date().getFullYear(), 0, 1).getTime() / 1000);

	// Leaderboard: rankad på handikapp (lägst = bäst). Ranken är global
	// (hela klubben) även när listan är filtrerad eller paginerad.
	const list = await db
		.select({
			id: members.id,
			name: members.name,
			role: members.role,
			status: members.status,
			hcp: members.hcp,
			memberNumber: members.memberNumber,
			rank: sql<number>`(select count(*) + 1 from members m2 where m2.hcp < members.hcp)`,
			roundsSeason: sql<number>`(
				select count(*) from rounds r
				where r.member_id = members.id and r.played_at >= ${seasonStart}
			)`,
			bestGross: sql<number | null>`(
				select min(r.gross_total) from rounds r
				where r.member_id = members.id and r.played_at >= ${seasonStart}
			)`
		})
		.from(members)
		.where(where)
		.orderBy(asc(members.hcp), asc(members.name))
		.limit(PAGE_SIZE)
		.offset((current - 1) * PAGE_SIZE)
		.all();

	return { members: list, q, page: current, pages, total, seasonYear: new Date().getFullYear() };
};
