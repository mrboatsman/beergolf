import { error, fail } from '@sveltejs/kit';
import { and, asc, eq, ne, notInArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	coasters,
	coasterPlayers,
	members,
	rounds,
	MAX_COASTER_PLAYERS
} from '$lib/server/db/schema';
import { requireMember } from '$lib/server/guard';
import { newId } from '$lib/server/ids';
import { nextHcp, netScore } from '$lib/handicap';
import type { Actions, PageServerLoad } from './$types';

async function getCoaster(id: string) {
	const coaster = await db.select().from(coasters).where(eq(coasters.id, id)).get();
	if (!coaster) throw error(404, 'Coastern finns inte.');
	return coaster;
}

function getMyRow(coasterId: string, memberId: string) {
	return db
		.select()
		.from(coasterPlayers)
		.where(and(eq(coasterPlayers.coasterId, coasterId), eq(coasterPlayers.memberId, memberId)))
		.get();
}

function getPlayers(coasterId: string) {
	return db
		.select({
			id: coasterPlayers.id,
			memberId: coasterPlayers.memberId,
			position: coasterPlayers.position,
			scores: coasterPlayers.scores,
			signedAt: coasterPlayers.signedAt,
			name: members.name,
			hcp: members.hcp
		})
		.from(coasterPlayers)
		.innerJoin(members, eq(coasterPlayers.memberId, members.id))
		.where(eq(coasterPlayers.coasterId, coasterId))
		.orderBy(asc(coasterPlayers.position))
		.all();
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const me = requireMember(locals.member);
	const coaster = await getCoaster(params.id);
	const players = await getPlayers(coaster.id);

	// Certifierade medlemmar som kan läggas till (ej redan på coastern,
	// aspiranter spelar inte officiella rundor)
	const taken = players.map((p) => p.memberId);
	const addable = await db
		.select({ id: members.id, name: members.name })
		.from(members)
		.where(
			taken.length
				? and(ne(members.status, 'aspirant'), notInArray(members.id, taken))
				: ne(members.status, 'aspirant')
		)
		.orderBy(asc(members.name))
		.all();

	return { coaster, players, addable, meId: me.id, maxPlayers: MAX_COASTER_PLAYERS };
};

export const actions: Actions = {
	// Vem som helst på coastern (eller skaparen) kan bjuda in fler — coastern
	// skickas runt bordet precis som den fysiska.
	addPlayer: async ({ request, locals, params }) => {
		const me = requireMember(locals.member);
		const coaster = await getCoaster(params.id);
		const players = await getPlayers(coaster.id);

		const amInvolved = coaster.createdBy === me.id || players.some((p) => p.memberId === me.id);
		if (!amInvolved) return fail(403, { error: 'Bara spelare på coastern kan lägga till fler.' });
		if (players.length >= MAX_COASTER_PLAYERS) {
			return fail(400, { error: `Max ${MAX_COASTER_PLAYERS} spelare per coaster.` });
		}

		const form = await request.formData();
		const memberId = String(form.get('memberId') ?? '');
		const target = await db.select().from(members).where(eq(members.id, memberId)).get();
		if (!target) return fail(400, { error: 'Ogiltig medlem.' });
		if (players.some((p) => p.memberId === memberId)) {
			return fail(400, { error: `${target.name} är redan med på coastern.` });
		}

		await db.insert(coasterPlayers).values({
			id: newId(),
			coasterId: coaster.id,
			memberId,
			position: Math.max(0, ...players.map((p) => p.position)) + 1,
			scores: Array(9).fill(null)
		});
		return { added: target.name };
	},

	// Spara egna poäng (tomma hål tillåtna — man behöver inte spela nio på en gång)
	saveScores: async ({ request, locals, params }) => {
		const me = requireMember(locals.member);
		const coaster = await getCoaster(params.id);
		const row = getMyRow(coaster.id, me.id);

		if (!row) return fail(403, { error: 'Du är inte spelare på denna coaster.' });
		if (row.signedAt) return fail(400, { error: 'Raden är signerad och låst.' });

		const form = await request.formData();
		const scores: (number | null)[] = [];
		for (let i = 0; i < 9; i++) {
			const raw = String(form.get(`s${i}`) ?? '').trim();
			if (raw === '') {
				scores.push(null);
				continue;
			}
			const v = Number(raw);
			if (!Number.isInteger(v) || v < 1 || v > 30) {
				return fail(400, { error: `Ogiltig poäng på hål ${i + 1}.` });
			}
			scores.push(v);
		}

		await db.update(coasterPlayers).set({ scores }).where(eq(coasterPlayers.id, row.id));
		return { saved: true };
	},

	// Signera egen rad: låser den, skapar runda och justerar handikapp.
	sign: async ({ locals, params }) => {
		const me = requireMember(locals.member);
		const coaster = await getCoaster(params.id);
		const row = getMyRow(coaster.id, me.id);

		if (!row) return fail(403, { error: 'Du är inte spelare på denna coaster.' });
		if (row.signedAt) return fail(400, { error: 'Redan signerad.' });
		if (row.scores.some((s) => s === null)) {
			return fail(400, { error: 'Fyll i alla nio hål innan du signerar.' });
		}

		const scores = row.scores as number[];
		const grossTotal = scores.reduce((a, b) => a + b, 0);
		const parTotal = coaster.par.reduce((a, b) => a + b, 0);
		const current = await db.select().from(members).where(eq(members.id, me.id)).get();
		const hcpBefore = current?.hcp ?? me.hcp;
		const hcpAfter = nextHcp(hcpBefore, grossTotal, parTotal);
		const netTotal = netScore(grossTotal, hcpBefore);
		const roundId = newId();

		db.transaction((tx) => {
			tx.insert(rounds)
				.values({
					id: roundId,
					memberId: me.id,
					holes: 9,
					scores,
					grossTotal,
					hcpBefore,
					hcpAfter,
					netTotal
				})
				.run();
			tx.update(members).set({ hcp: hcpAfter }).where(eq(members.id, me.id)).run();
			tx.update(coasterPlayers)
				.set({ signedAt: new Date(), roundId })
				.where(eq(coasterPlayers.id, row.id))
				.run();
		});

		return { signed: true, hcpBefore, hcpAfter };
	}
};
