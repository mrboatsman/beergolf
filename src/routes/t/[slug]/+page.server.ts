import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { tournamentParticipants } from '$lib/server/db/schema';
import { newId } from '$lib/server/ids';
import { stripe } from '$lib/server/stripe';
import {
	getBracket,
	getLeaderboard,
	getParticipants,
	getReport,
	getTournamentBySlug,
	GUEST_MAX_HCP
} from '$lib/server/tournaments';
import type { Actions, PageServerLoad } from './$types';

// Publik sida — ingen inloggning. Bara publika, öppnade turneringar.
async function getPublicTournament(slug: string) {
	const t = await getTournamentBySlug(slug);
	if (!t || t.visibility !== 'public' || t.status === 'draft') {
		throw error(404, 'Turneringen finns inte.');
	}
	return t;
}

export const load: PageServerLoad = async ({ params }) => {
	const t = await getPublicTournament(params.slug);
	return {
		tournament: t,
		// Bara betalda deltagare, namn utan e-post — publik sida.
		participants: getParticipants(t.id)
			.filter((p) => p.status === 'paid')
			.map((p) => ({ id: p.id, name: p.name, isGuest: p.isGuest })),
		leaderboard: t.format === 'match' ? null : getLeaderboard(t.id),
		bracket: t.format === 'match' ? getBracket(t.id) : null,
		report: t.status === 'finished' ? getReport(t) : null
	};
};

export const actions: Actions = {
	registerGuest: async ({ request, params, url }) => {
		const t = await getPublicTournament(params.slug);
		if (t.status !== 'open') return fail(400, { error: 'Anmälan är stängd.' });

		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const email = String(form.get('email') ?? '').trim();
		if (!name) return fail(400, { error: 'Namn krävs.' });
		if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
			return fail(400, { error: 'Giltig e-postadress krävs.' });
		}

		// Självdeklarerat Beer Golf-HCP — hederssystemet gäller även gäster.
		const hcpRaw = String(form.get('hcp') ?? '')
			.trim()
			.replace(',', '.');
		let playingHcp = 36;
		if (hcpRaw !== '') {
			const v = Number(hcpRaw);
			if (!Number.isFinite(v)) return fail(400, { error: 'Ogiltigt handikapp.' });
			playingHcp = Math.min(GUEST_MAX_HCP, Math.max(0, v));
		}

		const participantId = newId();
		const guestToken = newId();
		await db.insert(tournamentParticipants).values({
			id: participantId,
			tournamentId: t.id,
			guestName: name,
			guestEmail: email,
			guestToken,
			playingHcp,
			status: 'pending'
		});

		const guestUrl = `${url.origin}/t/${t.slug}/gast/${guestToken}`;

		if (t.entryFeeOre === 0) {
			await db
				.update(tournamentParticipants)
				.set({ status: 'paid', paidVia: 'free', amountPaidOre: 0, paidAt: new Date() })
				.where(eq(tournamentParticipants.id, participantId));
			throw redirect(303, guestUrl);
		}

		const session = await stripe().checkout.sessions.create({
			mode: 'payment',
			currency: 'sek',
			customer_email: email,
			line_items: [
				{
					price_data: {
						currency: 'sek',
						unit_amount: t.entryFeeOre,
						product_data: { name: `${t.name} — anmälningsavgift (gäst)` }
					},
					quantity: 1
				}
			],
			metadata: { participantId, tournamentId: t.id },
			success_url: `${guestUrl}?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${url.origin}/t/${t.slug}`
		});
		await db
			.update(tournamentParticipants)
			.set({ stripeSessionId: session.id })
			.where(eq(tournamentParticipants.id, participantId));
		throw redirect(303, session.url!);
	}
};
