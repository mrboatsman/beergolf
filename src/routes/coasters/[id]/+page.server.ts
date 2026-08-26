import { error, fail } from '@sveltejs/kit';
import { and, asc, eq, isNotNull, isNull, notInArray, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	coasters,
	coasterBackImages,
	coasterPlayers,
	members,
	rounds,
	tournaments,
	tournamentParticipants,
	MAX_COASTER_PLAYERS,
	MIN_COASTER_PLAYERS
} from '$lib/server/db/schema';
import { requireMember } from '$lib/server/guard';
import { newId } from '$lib/server/ids';
import { nextHcp, netScore } from '$lib/handicap';
import { maybeDecideMatch } from '$lib/server/tournaments';
import { notifyCoaster } from '$lib/server/live';
import { storage } from '$lib/server/storage';
import { BACK_W, BACK_H } from '$lib/back-editor.svelte';
import { fillMissingWithX, grossTotal, grossTotalComplete, parseScore } from '$lib/scoring';
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

// leftJoin: gästrader (turneringar) har memberId = null — namnet kommer då
// från turneringsdeltagaren.
function getPlayers(coasterId: string) {
	return db
		.select({
			id: coasterPlayers.id,
			memberId: coasterPlayers.memberId,
			participantId: coasterPlayers.participantId,
			position: coasterPlayers.position,
			scores: coasterPlayers.scores,
			signedAt: coasterPlayers.signedAt,
			name: sql<string>`coalesce(${members.name}, ${tournamentParticipants.guestName}, '?')`,
			hcp: members.hcp,
			roundNet: rounds.netTotal,
			playingHcp: tournamentParticipants.playingHcp
		})
		.from(coasterPlayers)
		.leftJoin(members, eq(coasterPlayers.memberId, members.id))
		.leftJoin(tournamentParticipants, eq(coasterPlayers.participantId, tournamentParticipants.id))
		.leftJoin(rounds, eq(coasterPlayers.roundId, rounds.id))
		.where(eq(coasterPlayers.coasterId, coasterId))
		.orderBy(asc(coasterPlayers.position))
		.all();
}

// Netto vid signering: medlem = rundans netTotal, gäst = brutto (x = 2×par) − spelhcp
function withNet<
	T extends {
		scores: (number | null)[];
		signedAt: Date | null;
		roundNet: number | null;
		playingHcp: number | null;
	}
>(players: T[], par: number[]) {
	return players.map((p) => ({
		...p,
		net:
			p.roundNet !== null
				? p.roundNet
				: p.signedAt && p.playingHcp !== null
					? (grossTotal(p.scores, par) ?? 0) - p.playingHcp
					: null
	}));
}

const MAX_BACK_IMAGE = 10 * 1024 * 1024;
const MAX_BACK_IMAGES = 12;

// Baksidan får bara redigeras av deltagare, och bara när alla (≥2) signerat.
function backEditGuard(coasterId: string, memberId: string) {
	const rows = db
		.select({ memberId: coasterPlayers.memberId, signedAt: coasterPlayers.signedAt })
		.from(coasterPlayers)
		.where(eq(coasterPlayers.coasterId, coasterId))
		.all();
	if (!rows.some((r) => r.memberId === memberId)) {
		return fail(403, { error: 'Bara deltagare kan rita på baksidan.' });
	}
	if (rows.length < 2 || rows.some((r) => !r.signedAt)) {
		return fail(400, { error: 'Baksidan låses upp när alla har signerat.' });
	}
	return null;
}

export const load: PageServerLoad = async ({ locals, params, depends }) => {
	const me = requireMember(locals.member);
	depends(`coaster:${params.id}`);
	const coaster = await getCoaster(params.id);
	const players = withNet(await getPlayers(coaster.id), coaster.par);

	let addable: { id: string; name: string; isGuest?: boolean }[];
	let tournament: { id: string; name: string } | null = null;
	if (coaster.tournamentId) {
		// Turneringscoaster: bara betalda deltagare utan coaster-rad kan läggas
		// till (medlemmar och gäster) — id här är participantId. Matchspel:
		// raderna är låsta till matchens två spelare, inget läggs till.
		const t = await db
			.select({ id: tournaments.id, name: tournaments.name, format: tournaments.format })
			.from(tournaments)
			.where(eq(tournaments.id, coaster.tournamentId))
			.get();
		tournament = t ?? null;
		addable =
			t?.format === 'match'
				? []
				: db
						.select({
							id: tournamentParticipants.id,
							name: sql<string>`coalesce(${members.name}, ${tournamentParticipants.guestName}, '?')`,
							isGuest: sql<boolean>`${tournamentParticipants.memberId} is null`
						})
						.from(tournamentParticipants)
						.leftJoin(members, eq(tournamentParticipants.memberId, members.id))
						.leftJoin(coasterPlayers, eq(coasterPlayers.participantId, tournamentParticipants.id))
						.where(
							and(
								eq(tournamentParticipants.tournamentId, coaster.tournamentId),
								eq(tournamentParticipants.status, 'paid'),
								isNull(coasterPlayers.id)
							)
						)
						.orderBy(asc(tournamentParticipants.createdAt))
						.all();
	} else {
		// Bara spelare med grönt kort kan läggas till (och inte redan på coastern)
		const taken = players.map((p) => p.memberId).filter((x): x is string => !!x);
		addable = await db
			.select({ id: members.id, name: members.name })
			.from(members)
			.where(
				taken.length
					? and(isNotNull(members.greenCardIssuedAt), notInArray(members.id, taken))
					: isNotNull(members.greenCardIssuedAt)
			)
			.orderBy(asc(members.name))
			.all();
	}

	const backImages = db
		.select()
		.from(coasterBackImages)
		.where(eq(coasterBackImages.coasterId, coaster.id))
		.orderBy(asc(coasterBackImages.z), asc(coasterBackImages.createdAt))
		.all();

	return {
		coaster,
		tournament,
		players,
		backImages,
		addable,
		meId: me.id,
		maxPlayers: MAX_COASTER_PLAYERS,
		minPlayers: MIN_COASTER_PLAYERS
	};
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
		const targetId = String(form.get('memberId') ?? '');

		// Turneringscoaster: targetId är participantId — betalda deltagare
		// (medlem eller gäst) läggs till; gäster är undantagna grönt kort-kravet.
		if (coaster.tournamentId) {
			const t = await db
				.select({ format: tournaments.format })
				.from(tournaments)
				.where(eq(tournaments.id, coaster.tournamentId))
				.get();
			if (t?.format === 'match') {
				return fail(400, { error: 'Matchcoasterns spelare är låsta till matchen.' });
			}
			const participant = await db
				.select()
				.from(tournamentParticipants)
				.where(
					and(
						eq(tournamentParticipants.id, targetId),
						eq(tournamentParticipants.tournamentId, coaster.tournamentId)
					)
				)
				.get();
			if (!participant) return fail(400, { error: 'Ogiltig turneringsdeltagare.' });
			if (participant.status !== 'paid') {
				return fail(400, { error: 'Deltagaren har inte betalat anmälningsavgiften.' });
			}
			const existing = await db
				.select({ id: coasterPlayers.id })
				.from(coasterPlayers)
				.where(eq(coasterPlayers.participantId, participant.id))
				.get();
			if (existing) {
				return fail(400, { error: 'Deltagaren har redan en rad i turneringen.' });
			}
			const name =
				participant.guestName ??
				(participant.memberId
					? ((
							await db
								.select({ name: members.name })
								.from(members)
								.where(eq(members.id, participant.memberId))
								.get()
						)?.name ?? 'Deltagaren')
					: 'Deltagaren');
			await db.insert(coasterPlayers).values({
				id: newId(),
				coasterId: coaster.id,
				memberId: participant.memberId,
				participantId: participant.id,
				position: Math.max(0, ...players.map((p) => p.position)) + 1,
				scores: Array(9).fill(null)
			});
			notifyCoaster(coaster.id);
			return { added: name || 'Deltagaren' };
		}

		const target = await db.select().from(members).where(eq(members.id, targetId)).get();
		if (!target) return fail(400, { error: 'Ogiltig medlem.' });
		if (!target.greenCardIssuedAt) {
			return fail(400, { error: `${target.name} har inget grönt kort ännu.` });
		}
		if (players.some((p) => p.memberId === targetId)) {
			return fail(400, { error: `${target.name} är redan med på coastern.` });
		}

		await db.insert(coasterPlayers).values({
			id: newId(),
			coasterId: coaster.id,
			memberId: targetId,
			position: Math.max(0, ...players.map((p) => p.position)) + 1,
			scores: Array(9).fill(null)
		});
		notifyCoaster(coaster.id);
		return { added: target.name };
	},

	// Ta bort en spelare under pågående spel — alla som lagts till på
	// coastern (eller skaparen) kan göra det. Signerade rader är låsta.
	removePlayer: async ({ request, locals, params }) => {
		const me = requireMember(locals.member);
		const coaster = await getCoaster(params.id);
		const players = await getPlayers(coaster.id);

		const amInvolved = coaster.createdBy === me.id || players.some((p) => p.memberId === me.id);
		if (!amInvolved) return fail(403, { error: 'Bara spelare på coastern kan ta bort spelare.' });

		const form = await request.formData();
		const rowId = String(form.get('rowId') ?? '');
		// Bakåtkompatibelt: äldre formulär skickar memberId
		const memberId = String(form.get('memberId') ?? '');
		const row = players.find((p) => (rowId ? p.id === rowId : p.memberId === memberId));
		if (!row) return fail(400, { error: 'Spelaren finns inte på coastern.' });
		if (row.signedAt) {
			return fail(400, { error: `${row.name} har signerat — raden är låst.` });
		}
		if (coaster.tournamentId) {
			const t = await db
				.select({ format: tournaments.format })
				.from(tournaments)
				.where(eq(tournaments.id, coaster.tournamentId))
				.get();
			if (t?.format === 'match') {
				return fail(400, { error: 'Matchcoasterns spelare är låsta till matchen.' });
			}
		}

		await db.delete(coasterPlayers).where(eq(coasterPlayers.id, row.id));
		notifyCoaster(coaster.id);
		return { removed: row.name };
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
			scores.push(parseScore(String(form.get(`s${i}`) ?? '')));
		}

		await db.update(coasterPlayers).set({ scores }).where(eq(coasterPlayers.id, row.id));
		notifyCoaster(coaster.id);
		return { saved: true };
	},

	// --- Baksidan (påskägg): bara deltagare, bara när alla signerat ---------
	// Ladda upp en eller flera bilder. Klienten skickar naturlig bredd/höjd
	// (w{i}/h{i}) — bara för aspect ratio, ofarligt om fel.
	uploadBack: async ({ request, locals, params }) => {
		const me = requireMember(locals.member);
		const coaster = await getCoaster(params.id);
		const err = backEditGuard(coaster.id, me.id);
		if (err) return err;
		const form = await request.formData();
		const files = form.getAll('image').filter((f): f is File => f instanceof File && f.size > 0);
		if (!files.length) return fail(400, { error: 'Välj minst en bild.' });
		const count =
			db
				.select({ n: sql<number>`count(*)` })
				.from(coasterBackImages)
				.where(eq(coasterBackImages.coasterId, coaster.id))
				.get()?.n ?? 0;
		if (count + files.length > MAX_BACK_IMAGES) {
			return fail(400, { error: `Max ${MAX_BACK_IMAGES} bilder på baksidan.` });
		}
		let z = count;
		for (const [i, file] of files.entries()) {
			if (!file.type.startsWith('image/')) return fail(400, { error: 'Endast bilder.' });
			if (file.size > MAX_BACK_IMAGE) return fail(400, { error: 'Max 10 MB per bild.' });
			const w = Math.max(1, Number(form.get(`w${i}`) ?? 0) || 4);
			const h = Math.max(1, Number(form.get(`h${i}`) ?? 0) || 3);
			const key = `coasters/${coaster.id}/img-${newId()}`;
			await storage.put(key, new Uint8Array(await file.arrayBuffer()), file.type);
			await db.insert(coasterBackImages).values({
				id: newId(),
				coasterId: coaster.id,
				storageKey: key,
				contentType: file.type,
				width: w,
				height: h,
				// Startposition: mitt på kortet, lite förskjuten per bild
				x: BACK_W / 2 + (z % 5) * 30,
				y: BACK_H / 2 + (z % 5) * 30,
				scale: 1,
				rotation: 0,
				z: z++,
				createdBy: me.id
			});
		}
		notifyCoaster(coaster.id);
		return { backUploaded: files.length };
	},

	// Flytta/skala/rotera en bild (anropas efter drag/pinch)
	updateBackImage: async ({ request, locals, params }) => {
		const me = requireMember(locals.member);
		const coaster = await getCoaster(params.id);
		const err = backEditGuard(coaster.id, me.id);
		if (err) return err;
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const num = (k: string) => Number(form.get(k));
		const x = num('x');
		const y = num('y');
		const scale = num('scale');
		const rotation = num('rotation');
		if (![x, y, scale, rotation].every(Number.isFinite))
			return fail(400, { error: 'Ogiltig position.' });
		const img = await db.select().from(coasterBackImages).where(eq(coasterBackImages.id, id)).get();
		if (!img || img.coasterId !== coaster.id) return fail(404, { error: 'Bilden finns inte.' });
		const bring = form.get('front') === '1';
		const maxZ = bring
			? (db
					.select({ m: sql<number | null>`max(${coasterBackImages.z})` })
					.from(coasterBackImages)
					.where(eq(coasterBackImages.coasterId, coaster.id))
					.get()?.m ?? 0)
			: img.z;
		await db
			.update(coasterBackImages)
			.set({
				x: Math.max(-BACK_W, Math.min(2 * BACK_W, x)),
				y: Math.max(-BACK_H, Math.min(2 * BACK_H, y)),
				scale: Math.max(0.05, Math.min(10, scale)),
				rotation: ((rotation % 360) + 360) % 360,
				z: bring ? maxZ + 1 : img.z
			})
			.where(eq(coasterBackImages.id, id));
		notifyCoaster(coaster.id);
		return { imageUpdated: id };
	},

	removeBackImage: async ({ request, locals, params }) => {
		const me = requireMember(locals.member);
		const coaster = await getCoaster(params.id);
		const err = backEditGuard(coaster.id, me.id);
		if (err) return err;
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const img = await db.select().from(coasterBackImages).where(eq(coasterBackImages.id, id)).get();
		if (!img || img.coasterId !== coaster.id) return fail(404, { error: 'Bilden finns inte.' });
		await db.delete(coasterBackImages).where(eq(coasterBackImages.id, id));
		await storage.remove(img.storageKey).catch(() => {});
		notifyCoaster(coaster.id);
		return { imageRemoved: id };
	},

	saveDrawing: async ({ request, locals, params }) => {
		const me = requireMember(locals.member);
		const coaster = await getCoaster(params.id);
		const err = backEditGuard(coaster.id, me.id);
		if (err) return err;
		const form = await request.formData();
		const dataUrl = String(form.get('png') ?? '');
		const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
		if (!m) return fail(400, { error: 'Ogiltig ritning.' });
		const bytes = Buffer.from(m[1], 'base64');
		if (bytes.byteLength > MAX_BACK_IMAGE) return fail(400, { error: 'Ritningen är för stor.' });
		const key = `coasters/${coaster.id}/drawing-${newId()}.png`;
		await storage.put(key, new Uint8Array(bytes), 'image/png');
		await db.update(coasters).set({ backDrawingKey: key }).where(eq(coasters.id, coaster.id));
		if (coaster.backDrawingKey) await storage.remove(coaster.backDrawingKey).catch(() => {});
		notifyCoaster(coaster.id);
		return { drawingSaved: true };
	},

	// Signera egen rad: låser den, skapar runda och justerar handikapp.
	sign: async ({ locals, params }) => {
		const me = requireMember(locals.member);
		const coaster = await getCoaster(params.id);
		const row = getMyRow(coaster.id, me.id);

		if (!row) return fail(403, { error: 'Du är inte spelare på denna coaster.' });
		if (row.signedAt) return fail(400, { error: 'Redan signerad.' });
		if (row.scores.every((s) => s === null)) {
			return fail(400, { error: 'Fyll i minst ett hål innan du signerar.' });
		}
		const playerCount =
			db
				.select({ n: sql<number>`count(*)` })
				.from(coasterPlayers)
				.where(eq(coasterPlayers.coasterId, coaster.id))
				.get()?.n ?? 0;
		if (playerCount < MIN_COASTER_PLAYERS) {
			return fail(400, {
				error: `Man kan inte spela ensam — lägg till minst ${MIN_COASTER_PLAYERS - 1} medspelare innan du signerar.`
			});
		}

		// Tomma hål = x (dubbelt par); x lagras som 0 så brutto räknas mot par
		const scores = fillMissingWithX(row.scores, coaster.par.length);
		const grossTotal = grossTotalComplete(scores, coaster.par);
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
					tournamentId: coaster.tournamentId,
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
				.set({ scores, signedAt: new Date(), roundId })
				.where(eq(coasterPlayers.id, row.id))
				.run();
		});

		// Matchspel: avgör matchen om båda spelarna nu signerat (lägst netto vinner)
		if (coaster.tournamentId) maybeDecideMatch(coaster.id);

		notifyCoaster(coaster.id);
		return { signed: true, hcpBefore, hcpAfter };
	}
};
