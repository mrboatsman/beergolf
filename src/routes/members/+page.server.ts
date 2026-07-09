import { asc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { members } from '$lib/server/db/schema';
import { requireMember } from '$lib/server/guard';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireMember(locals.member);
	const list = await db
		.select({
			id: members.id,
			name: members.name,
			role: members.role,
			status: members.status,
			hcp: members.hcp,
			memberNumber: members.memberNumber
		})
		.from(members)
		.orderBy(asc(members.name))
		.all();
	return { members: list };
};
