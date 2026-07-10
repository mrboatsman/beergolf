import { fail, redirect } from '@sveltejs/kit';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { tournaments, tournamentParticipants } from '$lib/server/db/schema';
import { hasRole, requireMember, requireRole } from '$lib/server/guard';
import { newId } from '$lib/server/ids';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const me = requireMember(locals.member);
	const staff = hasRole(me, 'captain');

	const list = await db
		.select({
			id: tournaments.id,
			name: tournaments.name,
			visibility: tournaments.visibility,
			status: tournaments.status,
			startsAt: tournaments.startsAt,
			charityName: tournaments.charityName,
			entryFeeOre: tournaments.entryFeeOre,
			paidCount: sql<number>`(
				select count(*) from ${tournamentParticipants}
				where ${tournamentParticipants.tournamentId} = ${tournaments.id}
					and ${tournamentParticipants.status} = 'paid'
			)`,
			// Är jag deltagare? (styr synlighet för closed)
			mine: sql<number>`(
				select count(*) from ${tournamentParticipants}
				where ${tournamentParticipants.tournamentId} = ${tournaments.id}
					and ${tournamentParticipants.memberId} = ${me.id}
			)`
		})
		.from(tournaments)
		.orderBy(desc(tournaments.createdAt))
		.all();

	const visible = staff
		? list
		: list.filter((t) => t.status !== 'draft' && (t.visibility !== 'closed' || t.mine > 0));

	return { tournaments: visible, isStaff: staff };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const me = requireRole(locals.member, 'captain');
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const visibility = String(form.get('visibility') ?? 'open');
		const format = String(form.get('format') ?? 'stroke');
		if (!name) return fail(400, { error: 'Turneringen behöver ett namn.' });
		if (!['open', 'closed', 'public'].includes(visibility)) {
			return fail(400, { error: 'Ogiltig synlighet.' });
		}
		if (!['stroke', 'match'].includes(format)) {
			return fail(400, { error: 'Ogiltigt spelformat.' });
		}

		const id = newId();
		await db.insert(tournaments).values({
			id,
			name,
			visibility: visibility as 'open' | 'closed' | 'public',
			format: format as 'stroke' | 'match',
			createdBy: me.id
		});
		throw redirect(302, `/tournaments/${id}`);
	}
};
