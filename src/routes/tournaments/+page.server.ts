import { fail, redirect } from '@sveltejs/kit';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { tournaments, tournamentParticipants } from '$lib/server/db/schema';
import { requireMember } from '$lib/server/guard';
import { newId } from '$lib/server/ids';
import { isClubCaptain, pickClub, pickClubById, touchClub } from '$lib/server/clubs';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const me = requireMember(locals.member);
	// Klubb via flik (?club=slug), annars hemmaklubben. Bara hemmaklubbsmedlemmar får delta.
	const { club, clubs } = pickClub(me, url);
	const staff = isClubCaptain(me, club.id);

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
		.where(eq(tournaments.clubId, club.id))
		.orderBy(desc(tournaments.createdAt))
		.all();

	const visible = staff
		? list
		: list.filter((t) => t.status !== 'draft' && (t.visibility !== 'closed' || t.mine > 0));

	return {
		tournaments: visible,
		isStaff: staff,
		clubName: club.name,
		clubId: club.id,
		clubs,
		isHomeClub: me.homeClubId === club.id
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const me = requireMember(locals.member);
		const form = await request.formData();
		// Klubben väljs i formuläret (fliken) — captain där krävs
		const { club } = pickClubById(me, String(form.get('clubId') ?? ''));
		const clubId = club.id;
		if (!isClubCaptain(me, clubId)) return fail(403, { error: 'Bara klubbens captain.' });
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
			clubId,
			name,
			visibility: visibility as 'open' | 'closed' | 'public',
			format: format as 'stroke' | 'match',
			createdBy: me.id
		});
		touchClub(clubId);
		throw redirect(302, `/tournaments/${id}`);
	}
};
