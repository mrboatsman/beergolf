import { fail, redirect } from '@sveltejs/kit';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { coasters, coasterPlayers, members, DEFAULT_PAR } from '$lib/server/db/schema';
import { requireMember } from '$lib/server/guard';
import { newId } from '$lib/server/ids';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireMember(locals.member);
	// Låga volymer + klubbtransparens: lista alla coasters, nyast först.
	const list = await db
		.select({
			id: coasters.id,
			name: coasters.name,
			createdAt: coasters.createdAt,
			creatorName: members.name,
			playerCount: sql<number>`(
				select count(*) from ${coasterPlayers} where ${coasterPlayers.coasterId} = ${coasters.id}
			)`,
			signedCount: sql<number>`(
				select count(*) from ${coasterPlayers}
				where ${coasterPlayers.coasterId} = ${coasters.id} and ${coasterPlayers.signedAt} is not null
			)`
		})
		.from(coasters)
		.innerJoin(members, eq(coasters.createdBy, members.id))
		.orderBy(desc(coasters.createdAt))
		.all();
	return { coasters: list, defaultPar: DEFAULT_PAR };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const me = requireMember(locals.member);
		// Skaparen blir spelare 1 — grönt kort krävs för att spela.
		if (!me.greenCardIssuedAt) {
			return fail(403, { error: 'Grönt kort krävs för att skapa en Score Coaster.' });
		}
		const form = await request.formData();
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
			tx.insert(coasters).values({ id, name, par, createdBy: me.id }).run();
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

		throw redirect(302, `/coasters/${id}`);
	}
};
