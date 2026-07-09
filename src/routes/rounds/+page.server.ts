import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { rounds } from '$lib/server/db/schema';
import { requireMember } from '$lib/server/guard';
import type { PageServerLoad } from './$types';

// Ren historik — rundor skapas enbart genom att signera en Score Coaster.
export const load: PageServerLoad = async ({ locals }) => {
	const me = requireMember(locals.member);
	const list = await db
		.select()
		.from(rounds)
		.where(eq(rounds.memberId, me.id))
		.orderBy(desc(rounds.playedAt))
		.all();
	return { rounds: list, hcp: me.hcp };
};
