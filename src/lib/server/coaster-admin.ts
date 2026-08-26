// Admin-verktyg för Score Coasters: rätta poäng i efterhand, häva signatur,
// ta bort spelare eller hela coastern. Allt som rör signerade medlemsrader
// spelar om medlemmens HCP-kedja från ingångshandikappet så att
// hcpBefore/hcpAfter/netTotal och members.hcp blir konsistenta.
//
// Gästrader (memberId null) rör aldrig rounds eller members.hcp.
import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { coasters, coasterPlayers, members, rounds, DEFAULT_PAR } from '$lib/server/db/schema';
import { ENTRY_HCP, netScore, nextHcp } from '$lib/handicap';
import { grossTotalComplete } from '$lib/scoring';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Spela om alla rundor för en medlem i kronologisk ordning från ENTRY_HCP.
 * Par tas från coastern raden hör till (DEFAULT_PAR om rundan saknar coaster).
 */
export function recomputeMemberHcp(tx: Tx, memberId: string): number {
	const rs = tx
		.select({
			id: rounds.id,
			grossTotal: rounds.grossTotal,
			par: coasters.par
		})
		.from(rounds)
		.leftJoin(coasterPlayers, eq(coasterPlayers.roundId, rounds.id))
		.leftJoin(coasters, eq(coasterPlayers.coasterId, coasters.id))
		.where(eq(rounds.memberId, memberId))
		.orderBy(asc(rounds.playedAt), asc(rounds.id))
		.all();

	let hcp = ENTRY_HCP;
	for (const r of rs) {
		const parTotal = (r.par ?? DEFAULT_PAR).reduce((a, b) => a + b, 0);
		const hcpBefore = hcp;
		const hcpAfter = nextHcp(hcpBefore, r.grossTotal, parTotal);
		tx.update(rounds)
			.set({ hcpBefore, hcpAfter, netTotal: netScore(r.grossTotal, hcpBefore) })
			.where(eq(rounds.id, r.id))
			.run();
		hcp = hcpAfter;
	}
	tx.update(members).set({ hcp }).where(eq(members.id, memberId)).run();
	return hcp;
}

function getRow(rowId: string) {
	return db.select().from(coasterPlayers).where(eq(coasterPlayers.id, rowId)).get();
}

/** Rätta poäng på en rad. Signerad medlemsrad ⇒ rundan uppdateras + HCP-kedjan spelas om. */
export function adminSetScores(rowId: string, scores: (number | null)[]): void {
	const row = getRow(rowId);
	if (!row) throw new Error('Raden finns inte.');
	if (row.signedAt && scores.some((s) => s === null)) {
		throw new Error('En signerad rad måste ha alla nio hål ifyllda.');
	}
	db.transaction((tx) => {
		tx.update(coasterPlayers).set({ scores }).where(eq(coasterPlayers.id, row.id)).run();
		if (row.roundId && row.memberId) {
			const full = scores as number[];
			const par =
				tx.select({ par: coasters.par }).from(coasters).where(eq(coasters.id, row.coasterId)).get()
					?.par ?? DEFAULT_PAR;
			tx.update(rounds)
				.set({ scores: full, grossTotal: grossTotalComplete(full, par) })
				.where(eq(rounds.id, row.roundId))
				.run();
			recomputeMemberHcp(tx, row.memberId);
		}
	});
}

/** Häv signatur: raden blir redigerbar igen, rundan tas bort och HCP spelas om. */
export function adminUnsign(rowId: string): void {
	const row = getRow(rowId);
	if (!row) throw new Error('Raden finns inte.');
	db.transaction((tx) => {
		tx.update(coasterPlayers)
			.set({ signedAt: null, roundId: null })
			.where(eq(coasterPlayers.id, row.id))
			.run();
		if (row.roundId) {
			tx.delete(rounds).where(eq(rounds.id, row.roundId)).run();
			if (row.memberId) recomputeMemberHcp(tx, row.memberId);
		}
	});
}

/** Ta bort en spelare från coastern (även signerad — rundan följer med). */
export function adminRemoveRow(rowId: string): void {
	const row = getRow(rowId);
	if (!row) throw new Error('Raden finns inte.');
	db.transaction((tx) => {
		tx.delete(coasterPlayers).where(eq(coasterPlayers.id, row.id)).run();
		if (row.roundId) {
			tx.delete(rounds).where(eq(rounds.id, row.roundId)).run();
			if (row.memberId) recomputeMemberHcp(tx, row.memberId);
		}
	});
}

/** Ta bort hela coastern inkl. rader och rundor; berörda medlemmars HCP spelas om. */
export function adminDeleteCoaster(coasterId: string): void {
	const rows = db
		.select()
		.from(coasterPlayers)
		.where(eq(coasterPlayers.coasterId, coasterId))
		.all();
	db.transaction((tx) => {
		const affected = new Set<string>();
		for (const row of rows) {
			// Ta bort raden före rundan — FK coaster_players.round_id → rounds
			tx.delete(coasterPlayers).where(eq(coasterPlayers.id, row.id)).run();
			if (row.roundId) {
				tx.delete(rounds).where(eq(rounds.id, row.roundId)).run();
				if (row.memberId) affected.add(row.memberId);
			}
		}
		tx.delete(coasters).where(eq(coasters.id, coasterId)).run();
		for (const m of affected) recomputeMemberHcp(tx, m);
	});
}
