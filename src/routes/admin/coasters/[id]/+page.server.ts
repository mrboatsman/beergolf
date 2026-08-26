import { error, fail, redirect } from '@sveltejs/kit';
import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	coasters,
	coasterPlayers,
	members,
	rounds,
	tournaments,
	tournamentParticipants
} from '$lib/server/db/schema';
import { requireRole } from '$lib/server/guard';
import {
	adminDeleteCoaster,
	adminRemoveRow,
	adminSetScores,
	adminUnsign
} from '$lib/server/coaster-admin';
import { notifyCoaster } from '$lib/server/live';
import type { Actions, PageServerLoad } from './$types';

function getCoaster(id: string) {
	const c = db.select().from(coasters).where(eq(coasters.id, id)).get();
	if (!c) throw error(404, 'Coastern finns inte.');
	return c;
}

function getRows(coasterId: string) {
	return db
		.select({
			id: coasterPlayers.id,
			memberId: coasterPlayers.memberId,
			position: coasterPlayers.position,
			scores: coasterPlayers.scores,
			signedAt: coasterPlayers.signedAt,
			roundId: coasterPlayers.roundId,
			name: sql<string>`coalesce(${members.name}, ${tournamentParticipants.guestName}, '?')`,
			isGuest: sql<boolean>`${coasterPlayers.memberId} is null`,
			memberHcp: members.hcp,
			hcpBefore: rounds.hcpBefore,
			hcpAfter: rounds.hcpAfter
		})
		.from(coasterPlayers)
		.leftJoin(members, eq(coasterPlayers.memberId, members.id))
		.leftJoin(tournamentParticipants, eq(coasterPlayers.participantId, tournamentParticipants.id))
		.leftJoin(rounds, eq(coasterPlayers.roundId, rounds.id))
		.where(eq(coasterPlayers.coasterId, coasterId))
		.orderBy(asc(coasterPlayers.position))
		.all();
}

export const load: PageServerLoad = async ({ locals, params }) => {
	requireRole(locals.member, 'admin');
	const coaster = getCoaster(params.id);
	const tournament = coaster.tournamentId
		? db
				.select({ id: tournaments.id, name: tournaments.name, format: tournaments.format })
				.from(tournaments)
				.where(eq(tournaments.id, coaster.tournamentId))
				.get()
		: null;
	return { coaster, tournament: tournament ?? null, rows: getRows(coaster.id) };
};

function parseScores(form: FormData): (number | null)[] | string {
	const scores: (number | null)[] = [];
	for (let i = 0; i < 9; i++) {
		const raw = String(form.get(`s${i}`) ?? '').trim();
		if (raw === '') {
			scores.push(null);
			continue;
		}
		const v = Number(raw);
		if (!Number.isInteger(v) || v < 1 || v > 30) return `Ogiltig poäng på hål ${i + 1}.`;
		scores.push(v);
	}
	return scores;
}

// Raden måste höra till den här coastern (skydd mot manipulerade id:n)
function ownRow(coasterId: string, rowId: string) {
	const row = db
		.select({ id: coasterPlayers.id })
		.from(coasterPlayers)
		.where(and(eq(coasterPlayers.id, rowId), eq(coasterPlayers.coasterId, coasterId)))
		.get();
	return row?.id ?? null;
}

function run(fn: () => void) {
	try {
		fn();
		return null;
	} catch (e) {
		return fail(400, { error: e instanceof Error ? e.message : 'Något gick fel.' });
	}
}

export const actions: Actions = {
	rename: async ({ locals, params, request }) => {
		requireRole(locals.member, 'admin');
		getCoaster(params.id);
		const form = await request.formData();
		const name =
			String(form.get('name') ?? '')
				.trim()
				.slice(0, 80) || null;
		db.update(coasters).set({ name }).where(eq(coasters.id, params.id)).run();
		notifyCoaster(params.id);
		return { renamed: true };
	},

	setScores: async ({ locals, params, request }) => {
		requireRole(locals.member, 'admin');
		getCoaster(params.id);
		const form = await request.formData();
		const rowId = ownRow(params.id, String(form.get('rowId') ?? ''));
		if (!rowId) return fail(400, { error: 'Ogiltig rad.' });
		const scores = parseScores(form);
		if (typeof scores === 'string') return fail(400, { error: scores });
		const r = run(() => adminSetScores(rowId, scores));
		notifyCoaster(params.id);
		return r ?? { saved: rowId };
	},

	unsign: async ({ locals, params, request }) => {
		requireRole(locals.member, 'admin');
		getCoaster(params.id);
		const form = await request.formData();
		const rowId = ownRow(params.id, String(form.get('rowId') ?? ''));
		if (!rowId) return fail(400, { error: 'Ogiltig rad.' });
		const r = run(() => adminUnsign(rowId));
		notifyCoaster(params.id);
		return r ?? { unsigned: rowId };
	},

	removeRow: async ({ locals, params, request }) => {
		requireRole(locals.member, 'admin');
		getCoaster(params.id);
		const form = await request.formData();
		const rowId = ownRow(params.id, String(form.get('rowId') ?? ''));
		if (!rowId) return fail(400, { error: 'Ogiltig rad.' });
		const r = run(() => adminRemoveRow(rowId));
		notifyCoaster(params.id);
		return r ?? { removed: rowId };
	},

	deleteCoaster: async ({ locals, params }) => {
		requireRole(locals.member, 'admin');
		getCoaster(params.id);
		const res = run(() => adminDeleteCoaster(params.id));
		if (res) return res;
		notifyCoaster(params.id);
		throw redirect(303, '/admin/coasters?deleted=1');
	}
};
