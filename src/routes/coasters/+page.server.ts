import { fail, redirect } from '@sveltejs/kit';
import { desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { clubs, coasters, coasterPlayers, members, DEFAULT_PAR } from '$lib/server/db/schema';
import { requireMember } from '$lib/server/guard';
import { newId } from '$lib/server/ids';
import { pickClubById, myClubs, touchClub } from '$lib/server/clubs';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const me = requireMember(locals.member);
	// Alla coasters i mina klubbar (hemma + dubbel), nyast först, med klubbnamn.
	const mine = myClubs(me).filter((c) => c.status === 'active' && c.clubStatus === 'active');
	const clubIds = mine.map((c) => c.id);
	const list = await db
		.select({
			id: coasters.id,
			name: coasters.name,
			createdAt: coasters.createdAt,
			creatorName: members.name,
			clubId: coasters.clubId,
			clubName: clubs.name,
			playerCount: sql<number>`(
				select count(*) from ${coasterPlayers} where ${coasterPlayers.coasterId} = ${coasters.id}
			)`,
			signedCount: sql<number>`(
				select count(*) from ${coasterPlayers}
				where ${coasterPlayers.coasterId} = ${coasters.id} and ${coasterPlayers.signedAt} is not null
			)`,
			// Min egen rad: 0 = inte med, 1 = med (ej signerad), 2 = med och signerad
			myState: sql<number>`coalesce((
				select case when ${coasterPlayers.signedAt} is null then 1 else 2 end
				from ${coasterPlayers}
				where ${coasterPlayers.coasterId} = ${coasters.id} and ${coasterPlayers.memberId} = ${me.id}
			), 0)`
		})
		.from(coasters)
		.innerJoin(members, eq(coasters.createdBy, members.id))
		.innerJoin(clubs, eq(coasters.clubId, clubs.id))
		.where(clubIds.length ? inArray(coasters.clubId, clubIds) : sql`0`)
		.orderBy(desc(coasters.createdAt))
		.all();
	return {
		coasters: list,
		defaultPar: DEFAULT_PAR,
		// Klubbval i formuläret (bara om >1), hemmaklubb först
		clubs: mine,
		homeClubId: me.homeClubId
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const me = requireMember(locals.member);
		// Skaparen blir spelare 1 — grönt kort krävs för att spela.
		if (!me.greenCardIssuedAt) {
			return fail(403, { error: 'Grönt kort krävs för att skapa en Score Coaster.' });
		}
		const form = await request.formData();
		// Klubben väljs i formuläret (default hemmaklubb) — måste vara en av mina
		const picked = pickClubById(me, String(form.get('clubId') ?? ''));
		if (picked.role === null && me.role !== 'admin') {
			return fail(403, { error: 'Du är inte medlem i den valda klubben.' });
		}
		const clubId = picked.club.id;
		const name = String(form.get('name') ?? '').trim() || null;

		const par: number[] = [];
		for (let i = 0; i < 9; i++) {
			const v = Number(form.get(`par${i}`) ?? DEFAULT_PAR[i]);
			if (!Number.isInteger(v) || v < 1 || v > 9) {
				return fail(400, { error: `Ogiltigt par på hål ${i + 1}.` });
			}
			par.push(v);
		}

		const id = newId();
		// Skaparen blir automatiskt spelare 1 på coastern.
		db.transaction((tx) => {
			tx.insert(coasters).values({ id, name, par, clubId, createdBy: me.id }).run();
			tx.insert(coasterPlayers)
				.values({
					id: newId(),
					coasterId: id,
					memberId: me.id,
					position: 1,
					scores: Array(9).fill(null)
				})
				.run();
		});
		touchClub(clubId);

		throw redirect(302, `/coasters/${id}`);
	}
};
