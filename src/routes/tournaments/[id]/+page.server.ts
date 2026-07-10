import { error, fail, redirect } from '@sveltejs/kit';
import { and, asc, desc, eq, isNull, like, notInArray, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	coasters,
	coasterPlayers,
	members,
	tournamentExpenses,
	tournamentParticipants,
	tournaments,
	DEFAULT_PAR,
	type PrizeTier
} from '$lib/server/db/schema';
import { hasRole, requireMember, requireRole } from '$lib/server/guard';
import { newId } from '$lib/server/ids';
import { parseKr } from '$lib/money';
import { storage } from '$lib/server/storage';
import { stripe, settleSessionById } from '$lib/server/stripe';
import {
	canSee,
	drawBracket,
	getBracket,
	getLeaderboard,
	getParticipant,
	getParticipants,
	getReport,
	getTournament,
	setMatchWinner,
	validateOpen,
	validSlug
} from '$lib/server/tournaments';
import { tournamentMatches } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

const MAX_RECEIPT_SIZE = 20 * 1024 * 1024; // 20 MB — kvittobilder/pdf:er

function extFor(f: File): string {
	const dot = f.name.lastIndexOf('.');
	return dot > 0 ? f.name.slice(dot).toLowerCase() : '';
}

function receiptFrom(form: FormData): { file: File | null; error: string | null } {
	const f = form.get('receipt');
	if (!(f instanceof File) || f.size === 0 || f.name === '') return { file: null, error: null };
	if (!f.type.startsWith('image/') && f.type !== 'application/pdf') {
		return { file: null, error: 'Kvitto: endast bild eller PDF.' };
	}
	if (f.size > MAX_RECEIPT_SIZE) {
		return { file: null, error: `Kvitto: max ${MAX_RECEIPT_SIZE / 1024 / 1024} MB.` };
	}
	return { file: f, error: null };
}

function tournamentCoasters(tournamentId: string) {
	return db
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
		.where(eq(coasters.tournamentId, tournamentId))
		.orderBy(desc(coasters.createdAt))
		.all();
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const me = requireMember(locals.member);
	const t = await getTournament(params.id);
	if (!(await canSee(t, me))) throw error(404, 'Turneringen finns inte.');

	const myParticipant = getParticipant(t.id, me.id) ?? null;

	// Success-fallback: webhooken är primär, men tappas den bokför vi
	// betalningen direkt när spelaren landar på success-URL:en.
	const sessionId = url.searchParams.get('session_id');
	if (sessionId && myParticipant && myParticipant.status === 'pending') {
		try {
			await settleSessionById(sessionId);
		} catch {
			// Stripe onåbar — webhooken får ta det.
		}
		throw redirect(303, `/tournaments/${t.id}`);
	}

	const staff = hasRole(me, 'captain');
	const participants = getParticipants(t.id);
	const leaderboard = t.status === 'draft' || t.format === 'match' ? null : getLeaderboard(t.id);
	const bracket = t.format === 'match' && t.status !== 'draft' ? getBracket(t.id) : null;
	const report = t.status === 'finished' ? getReport(t) : null;

	// Captain: kostnadsbok + inbjudningssök (stängd turnering)
	const expenses = staff
		? db
				.select()
				.from(tournamentExpenses)
				.where(eq(tournamentExpenses.tournamentId, t.id))
				.orderBy(desc(tournamentExpenses.createdAt))
				.all()
		: [];

	let invitable: { id: string; name: string }[] = [];
	const q = url.searchParams.get('q')?.trim() ?? '';
	if (staff && t.visibility === 'closed' && q) {
		const taken = participants.map((p) => p.memberId).filter((x): x is string => !!x);
		invitable = db
			.select({ id: members.id, name: members.name })
			.from(members)
			.where(
				and(
					sql`${members.greenCardIssuedAt} is not null`,
					like(members.name, `%${q}%`),
					taken.length ? notInArray(members.id, taken) : undefined
				)
			)
			.orderBy(asc(members.name))
			.limit(20)
			.all();
	}

	return {
		tournament: t,
		participants,
		leaderboard,
		bracket,
		report,
		expenses,
		invitable,
		inviteQuery: q,
		myParticipant,
		coasters: tournamentCoasters(t.id),
		isStaff: staff,
		canPlay: !!me.greenCardIssuedAt
	};
};

export const actions: Actions = {
	// Redigera grunduppgifter — endast i utkastläge; allt är låst efter öppning.
	update: async ({ request, locals, params }) => {
		requireRole(locals.member, 'captain');
		const t = await getTournament(params.id);
		if (t.status !== 'draft') {
			return fail(400, { error: 'Turneringen kan bara redigeras som utkast.' });
		}

		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		if (!name) return fail(400, { error: 'Turneringen behöver ett namn.' });
		const description = String(form.get('description') ?? '').trim() || null;
		const visibility = String(form.get('visibility') ?? t.visibility);
		if (!['open', 'closed', 'public'].includes(visibility)) {
			return fail(400, { error: 'Ogiltig synlighet.' });
		}
		const format = String(form.get('format') ?? t.format);
		if (!['stroke', 'match'].includes(format)) {
			return fail(400, { error: 'Ogiltigt spelformat.' });
		}

		let slug =
			String(form.get('slug') ?? '')
				.trim()
				.toLowerCase() || null;
		if (visibility === 'public') {
			if (!slug || !validSlug(slug)) {
				return fail(400, {
					error: 'Publik adress krävs: 3–64 tecken, a–z, 0–9 och bindestreck.'
				});
			}
			const clash = await db
				.select({ id: tournaments.id })
				.from(tournaments)
				.where(eq(tournaments.slug, slug))
				.get();
			if (clash && clash.id !== t.id) return fail(400, { error: 'Adressen är upptagen.' });
		} else {
			slug = null;
		}

		const startsAtRaw = String(form.get('startsAt') ?? '').trim();
		const startsAt = startsAtRaw ? new Date(startsAtRaw) : null;
		if (startsAtRaw && Number.isNaN(startsAt?.getTime())) {
			return fail(400, { error: 'Ogiltigt startdatum.' });
		}

		const charityName = String(form.get('charityName') ?? '').trim() || null;
		const charityDescription = String(form.get('charityDescription') ?? '').trim() || null;
		const charityUrl = String(form.get('charityUrl') ?? '').trim() || null;
		if (charityUrl && !/^https?:\/\//.test(charityUrl)) {
			return fail(400, { error: 'Välgörenhetslänken måste börja med http(s)://.' });
		}

		const entryFeeOre = parseKr(String(form.get('entryFee') ?? '0'));
		if (entryFeeOre === null) return fail(400, { error: 'Ogiltig anmälningsavgift.' });

		const prizeMode = String(form.get('prizeMode') ?? 'none');
		if (!['none', 'fixed', 'percent'].includes(prizeMode)) {
			return fail(400, { error: 'Ogiltigt prisupplägg.' });
		}
		const prizes: PrizeTier[] = [];
		if (prizeMode !== 'none') {
			for (let place = 1; place <= 3; place++) {
				const raw = String(form.get(`prize${place}`) ?? '').trim();
				if (!raw) continue;
				if (prizeMode === 'fixed') {
					const amountOre = parseKr(raw);
					if (amountOre === null || amountOre <= 0) {
						return fail(400, { error: `Ogiltigt belopp för plats ${place}.` });
					}
					prizes.push({ place, amountOre });
				} else {
					const percent = Number(raw.replace(',', '.'));
					if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
						return fail(400, { error: `Ogiltig procentsats för plats ${place}.` });
					}
					prizes.push({ place, percent });
				}
			}
		}

		await db
			.update(tournaments)
			.set({
				name,
				description,
				visibility: visibility as 'open' | 'closed' | 'public',
				format: format as 'stroke' | 'match',
				slug,
				startsAt,
				charityName,
				charityDescription,
				charityUrl,
				entryFeeOre,
				prizeMode: prizeMode as 'none' | 'fixed' | 'percent',
				prizes
			})
			.where(eq(tournaments.id, t.id));
		return { updated: true };
	},

	openTournament: async ({ locals, params }) => {
		requireRole(locals.member, 'captain');
		const t = await getTournament(params.id);
		if (t.status !== 'draft') return fail(400, { error: 'Bara utkast kan öppnas.' });
		const problem = validateOpen(t);
		if (problem) return fail(400, { error: problem });
		await db
			.update(tournaments)
			.set({ status: 'open', openedAt: new Date() })
			.where(eq(tournaments.id, t.id));
		return { opened: true };
	},

	finish: async ({ locals, params }) => {
		requireRole(locals.member, 'captain');
		const t = await getTournament(params.id);
		if (t.status !== 'open') return fail(400, { error: 'Bara öppna turneringar kan avslutas.' });
		await db
			.update(tournaments)
			.set({ status: 'finished', finishedAt: new Date() })
			.where(eq(tournaments.id, t.id));
		return { finished: true };
	},

	cancel: async ({ locals, params }) => {
		requireRole(locals.member, 'captain');
		const t = await getTournament(params.id);
		if (t.status !== 'draft' && t.status !== 'open') {
			return fail(400, { error: 'Turneringen kan inte ställas in.' });
		}
		await db.update(tournaments).set({ status: 'cancelled' }).where(eq(tournaments.id, t.id));
		return { cancelled: true };
	},

	// Anmälan (medlem): gratis → betald direkt; avgift → Stripe Checkout.
	register: async ({ locals, params, url }) => {
		const me = requireMember(locals.member);
		if (!me.greenCardIssuedAt) {
			return fail(403, { error: 'Grönt kort krävs för att spela turnering.' });
		}
		const t = await getTournament(params.id);
		if (t.status !== 'open') return fail(400, { error: 'Anmälan är inte öppen.' });

		let participant = getParticipant(t.id, me.id);
		if (participant && participant.status !== 'invited' && participant.status !== 'pending') {
			return fail(400, { error: 'Du är redan anmäld.' });
		}
		if (t.visibility === 'closed' && !participant) {
			return fail(403, { error: 'Turneringen är stängd — bara inbjudna kan anmäla sig.' });
		}

		if (!participant) {
			participant = {
				...(await db
					.insert(tournamentParticipants)
					.values({
						id: newId(),
						tournamentId: t.id,
						memberId: me.id,
						playingHcp: me.hcp,
						status: 'pending'
					})
					.returning()
					.get())
			};
		}

		if (t.entryFeeOre === 0) {
			await db
				.update(tournamentParticipants)
				.set({ status: 'paid', paidVia: 'free', amountPaidOre: 0, paidAt: new Date() })
				.where(eq(tournamentParticipants.id, participant.id));
			return { registered: true };
		}

		const session = await stripe().checkout.sessions.create({
			mode: 'payment',
			currency: 'sek',
			line_items: [
				{
					price_data: {
						currency: 'sek',
						unit_amount: t.entryFeeOre,
						product_data: { name: `${t.name} — anmälningsavgift` }
					},
					quantity: 1
				}
			],
			metadata: { participantId: participant.id, tournamentId: t.id },
			success_url: `${url.origin}/tournaments/${t.id}?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${url.origin}/tournaments/${t.id}`
		});
		await db
			.update(tournamentParticipants)
			.set({ status: 'pending', stripeSessionId: session.id })
			.where(eq(tournamentParticipants.id, participant.id));
		throw redirect(303, session.url!);
	},

	// Captain bjuder in medlem till stängd turnering.
	invite: async ({ request, locals, params }) => {
		requireRole(locals.member, 'captain');
		const t = await getTournament(params.id);
		if (t.visibility !== 'closed') {
			return fail(400, { error: 'Inbjudningar gäller bara stängda turneringar.' });
		}
		if (t.status === 'finished' || t.status === 'cancelled') {
			return fail(400, { error: 'Turneringen tar inte emot fler deltagare.' });
		}

		const form = await request.formData();
		const memberId = String(form.get('memberId') ?? '');
		const target = await db.select().from(members).where(eq(members.id, memberId)).get();
		if (!target || !target.greenCardIssuedAt) {
			return fail(400, { error: 'Bara medlemmar med grönt kort kan bjudas in.' });
		}
		if (getParticipant(t.id, memberId)) {
			return fail(400, { error: `${target.name} är redan inbjuden.` });
		}

		await db.insert(tournamentParticipants).values({
			id: newId(),
			tournamentId: t.id,
			memberId,
			playingHcp: target.hcp,
			status: 'invited'
		});
		return { invited: target.name };
	},

	// Captain markerar deltagare som betald utanför Stripe (kontant/comp).
	markPaid: async ({ request, locals, params }) => {
		requireRole(locals.member, 'captain');
		const t = await getTournament(params.id);
		const form = await request.formData();
		const participantId = String(form.get('participantId') ?? '');
		const p = await db
			.select()
			.from(tournamentParticipants)
			.where(
				and(
					eq(tournamentParticipants.id, participantId),
					eq(tournamentParticipants.tournamentId, t.id)
				)
			)
			.get();
		if (!p) return fail(400, { error: 'Deltagaren finns inte.' });
		if (p.status === 'paid') return fail(400, { error: 'Redan betald.' });

		await db
			.update(tournamentParticipants)
			.set({
				status: 'paid',
				paidVia: 'manual',
				amountPaidOre: t.entryFeeOre,
				stripeFeeOre: 0,
				paidAt: new Date()
			})
			.where(eq(tournamentParticipants.id, p.id));
		return { markedPaid: true };
	},

	// Captain markerar återbetald (själva återbetalningen görs i Stripe-dashboarden).
	refund: async ({ request, locals, params }) => {
		requireRole(locals.member, 'captain');
		const t = await getTournament(params.id);
		const form = await request.formData();
		const participantId = String(form.get('participantId') ?? '');
		const result = await db
			.update(tournamentParticipants)
			.set({ status: 'refunded' })
			.where(
				and(
					eq(tournamentParticipants.id, participantId),
					eq(tournamentParticipants.tournamentId, t.id),
					eq(tournamentParticipants.status, 'paid')
				)
			);
		if (result.changes === 0)
			return fail(400, { error: 'Bara betalda deltagare kan återbetalas.' });
		return { refunded: true };
	},

	// Captain tar bort ej betald deltagare (betalda går via refund).
	removeParticipant: async ({ request, locals, params }) => {
		requireRole(locals.member, 'captain');
		const t = await getTournament(params.id);
		const form = await request.formData();
		const participantId = String(form.get('participantId') ?? '');
		const p = await db
			.select()
			.from(tournamentParticipants)
			.where(
				and(
					eq(tournamentParticipants.id, participantId),
					eq(tournamentParticipants.tournamentId, t.id)
				)
			)
			.get();
		if (!p) return fail(400, { error: 'Deltagaren finns inte.' });
		if (p.status === 'paid') {
			return fail(400, { error: 'Betalda deltagare kan inte tas bort — markera återbetald.' });
		}
		await db.delete(tournamentParticipants).where(eq(tournamentParticipants.id, p.id));
		return { removedParticipant: true };
	},

	// --- Matchspel -----------------------------------------------------------
	// Slumpad lottning av betalda deltagare. Kan göras om tills första matchen
	// har en coaster eller ett resultat.
	drawBracket: async ({ locals, params }) => {
		requireRole(locals.member, 'captain');
		const t = await getTournament(params.id);
		if (t.format !== 'match') return fail(400, { error: 'Lottning gäller bara matchspel.' });
		if (t.status !== 'open') return fail(400, { error: 'Öppna turneringen först.' });
		const existing = getBracket(t.id);
		if (existing && existing.rounds.flat().some((m) => m.coasterId || (m.winnerId && !m.bye))) {
			return fail(400, { error: 'Spelet har startat — lottningen kan inte göras om.' });
		}
		const problem = drawBracket(t.id);
		if (problem) return fail(400, { error: problem });
		return { drawn: true };
	},

	setWinner: async ({ request, locals, params }) => {
		requireRole(locals.member, 'captain');
		await getTournament(params.id);
		const form = await request.formData();
		const problem = setMatchWinner(
			String(form.get('matchId') ?? ''),
			String(form.get('winnerId') ?? '')
		);
		if (problem) return fail(400, { error: problem });
		return { winnerSet: true };
	},

	// Matchcoaster: coaster + två rader (matchens spelare), länkad till matchen.
	createMatchCoaster: async ({ request, locals, params }) => {
		const me = requireMember(locals.member);
		const t = await getTournament(params.id);
		if (t.status !== 'open') return fail(400, { error: 'Turneringen är inte öppen.' });

		const form = await request.formData();
		const matchId = String(form.get('matchId') ?? '');
		const match = await db
			.select()
			.from(tournamentMatches)
			.where(and(eq(tournamentMatches.id, matchId), eq(tournamentMatches.tournamentId, t.id)))
			.get();
		if (!match) return fail(400, { error: 'Matchen finns inte.' });
		if (match.coasterId) return fail(400, { error: 'Matchen har redan en coaster.' });
		if (!match.participant1Id || !match.participant2Id) {
			return fail(400, { error: 'Matchen har inte två spelare än.' });
		}
		if (match.decidedAt) return fail(400, { error: 'Matchen är redan avgjord.' });

		// Captain eller någon av matchens spelare
		const myParticipant = getParticipant(t.id, me.id);
		const isPlayer =
			myParticipant &&
			(myParticipant.id === match.participant1Id || myParticipant.id === match.participant2Id);
		if (!isPlayer && !hasRole(me, 'captain')) {
			return fail(403, { error: 'Bara matchens spelare (eller captain) kan skapa coastern.' });
		}

		const pair = await db
			.select()
			.from(tournamentParticipants)
			.where(eq(tournamentParticipants.tournamentId, t.id))
			.all();
		const p1 = pair.find((p) => p.id === match.participant1Id)!;
		const p2 = pair.find((p) => p.id === match.participant2Id)!;

		const coasterId = newId();
		db.transaction((tx) => {
			tx.insert(coasters)
				.values({
					id: coasterId,
					name: `${t.name} — omgång ${match.round}`,
					par: DEFAULT_PAR,
					tournamentId: t.id,
					createdBy: me.id
				})
				.run();
			[p1, p2].forEach((p, i) => {
				tx.insert(coasterPlayers)
					.values({
						id: newId(),
						coasterId,
						memberId: p.memberId,
						participantId: p.id,
						position: i + 1,
						scores: Array(9).fill(null)
					})
					.run();
			});
			tx.update(tournamentMatches)
				.set({ coasterId })
				.where(eq(tournamentMatches.id, match.id))
				.run();
		});
		throw redirect(302, `/coasters/${coasterId}`);
	},

	// Turneringscoaster (slagspel) — skapas av captain eller betald deltagare.
	// Alla turneringscoasters delar standardpar så att brutto blir jämförbart.
	createCoaster: async ({ request, locals, params }) => {
		const me = requireMember(locals.member);
		const t = await getTournament(params.id);
		if (t.format === 'match') {
			return fail(400, { error: 'Matchspel: coasters skapas per match i stegen.' });
		}
		if (t.status !== 'open') {
			return fail(400, { error: 'Coasters kan bara skapas när turneringen är öppen.' });
		}
		const myParticipant = getParticipant(t.id, me.id);
		const isPaid = myParticipant?.status === 'paid';
		if (!isPaid && !hasRole(me, 'captain')) {
			return fail(403, { error: 'Bara betalda deltagare (eller captain) kan skapa coasters.' });
		}

		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim() || null;
		const id = newId();
		db.transaction((tx) => {
			tx.insert(coasters)
				.values({ id, name, par: DEFAULT_PAR, tournamentId: t.id, createdBy: me.id })
				.run();
			// Betald deltagare får sin egen rad direkt (en rad per deltagare —
			// unikt index vaktar dubbletter).
			if (isPaid && myParticipant) {
				const existing = tx
					.select({ id: coasterPlayers.id })
					.from(coasterPlayers)
					.where(eq(coasterPlayers.participantId, myParticipant.id))
					.get();
				if (!existing) {
					tx.insert(coasterPlayers)
						.values({
							id: newId(),
							coasterId: id,
							memberId: me.id,
							participantId: myParticipant.id,
							position: 1,
							scores: Array(9).fill(null)
						})
						.run();
				}
			}
		});
		throw redirect(302, `/coasters/${id}`);
	},

	// --- Kostnadsbok & välgörenhetsutbetalning (transparensen) --------------
	addExpense: async ({ request, locals, params }) => {
		const me = requireRole(locals.member, 'captain');
		const t = await getTournament(params.id);
		const form = await request.formData();
		const description = String(form.get('description') ?? '').trim();
		if (!description) return fail(400, { error: 'Kostnaden behöver en beskrivning.' });
		const amountOre = parseKr(String(form.get('amount') ?? ''));
		if (amountOre === null || amountOre <= 0) return fail(400, { error: 'Ogiltigt belopp.' });

		const { file, error: fileError } = receiptFrom(form);
		if (fileError) return fail(400, { error: fileError });

		let receiptKey: string | null = null;
		let receiptType: string | null = null;
		let receiptName: string | null = null;
		if (file) {
			receiptKey = `tournaments/${t.id}/receipts/${newId()}${extFor(file)}`;
			await storage.put(receiptKey, new Uint8Array(await file.arrayBuffer()), file.type);
			receiptType = file.type;
			receiptName = file.name;
		}

		await db.insert(tournamentExpenses).values({
			id: newId(),
			tournamentId: t.id,
			description,
			amountOre,
			receiptKey,
			receiptType,
			receiptName,
			createdBy: me.id
		});
		return { expenseAdded: true };
	},

	removeExpense: async ({ request, locals, params }) => {
		requireRole(locals.member, 'captain');
		const t = await getTournament(params.id);
		const form = await request.formData();
		const expenseId = String(form.get('expenseId') ?? '');
		const expense = await db
			.select()
			.from(tournamentExpenses)
			.where(and(eq(tournamentExpenses.id, expenseId), eq(tournamentExpenses.tournamentId, t.id)))
			.get();
		if (!expense) return fail(400, { error: 'Kostnaden finns inte.' });
		if (expense.receiptKey) await storage.remove(expense.receiptKey);
		await db.delete(tournamentExpenses).where(eq(tournamentExpenses.id, expense.id));
		return { expenseRemoved: true };
	},

	markCharityPaid: async ({ request, locals, params }) => {
		requireRole(locals.member, 'captain');
		const t = await getTournament(params.id);
		if (t.status !== 'finished') {
			return fail(400, { error: 'Utbetalningen markeras efter att turneringen avslutats.' });
		}
		const form = await request.formData();
		const amountOre = parseKr(String(form.get('amount') ?? ''));
		if (amountOre === null || amountOre <= 0) return fail(400, { error: 'Ogiltigt belopp.' });

		const { file, error: fileError } = receiptFrom(form);
		if (fileError) return fail(400, { error: fileError });

		let receiptKey = t.charityReceiptKey;
		let receiptType = t.charityReceiptType;
		let receiptName = t.charityReceiptName;
		if (file) {
			if (receiptKey) await storage.remove(receiptKey);
			receiptKey = `tournaments/${t.id}/receipts/${newId()}${extFor(file)}`;
			await storage.put(receiptKey, new Uint8Array(await file.arrayBuffer()), file.type);
			receiptType = file.type;
			receiptName = file.name;
		}

		await db
			.update(tournaments)
			.set({
				charityPaidOre: amountOre,
				charityPaidAt: new Date(),
				charityReceiptKey: receiptKey,
				charityReceiptType: receiptType,
				charityReceiptName: receiptName
			})
			.where(eq(tournaments.id, t.id));
		return { charityMarked: true };
	}
};
