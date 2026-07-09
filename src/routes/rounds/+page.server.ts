import { fail } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { members, rounds } from '$lib/server/db/schema';
import { requireMember } from '$lib/server/guard';
import { newId } from '$lib/server/ids';
import { nextHcp, netScore } from '$lib/handicap';
import type { Actions, PageServerLoad } from './$types';

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

export const actions: Actions = {
	add: async ({ request, locals }) => {
		const me = requireMember(locals.member);
		const form = await request.formData();
		const holes = Number(form.get('holes') ?? 18);
		const raw = String(form.get('scores') ?? '');

		const scores = raw
			.split(/[\s,]+/)
			.filter(Boolean)
			.map(Number);

		if (![9, 18].includes(holes)) return fail(400, { error: 'Antal hål måste vara 9 eller 18.' });
		if (scores.length !== holes || scores.some((n) => !Number.isFinite(n) || n < 0)) {
			return fail(400, {
				error: `Ange ${holes} giltiga poäng, separerade med mellanslag eller komma.`
			});
		}

		const grossTotal = scores.reduce((a, b) => a + b, 0);
		// Hämta färskt hcp från db (locals kan vara inaktuellt).
		const current = await db.select().from(members).where(eq(members.id, me.id)).get();
		const hcpBefore = current?.hcp ?? me.hcp;
		const hcpAfter = nextHcp(hcpBefore, grossTotal, holes);
		const netTotal = netScore(grossTotal, hcpBefore);

		// better-sqlite3 är synkront: transaction-callback får ej vara async.
		db.transaction((tx) => {
			tx.insert(rounds)
				.values({
					id: newId(),
					memberId: me.id,
					holes,
					scores,
					grossTotal,
					hcpBefore,
					hcpAfter,
					netTotal
				})
				.run();
			tx.update(members).set({ hcp: hcpAfter }).where(eq(members.id, me.id)).run();
		});

		return { added: true, hcpBefore, hcpAfter };
	}
};
