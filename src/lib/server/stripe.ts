import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db } from './db';
import { tournamentParticipants } from './db/schema';

// Lazy init så bygge/dev utan Stripe-nyckel fungerar tills betalning används.
let client: Stripe | null = null;

export function stripe(): Stripe {
	if (!env.STRIPE_SECRET_KEY) {
		throw new Error('STRIPE_SECRET_KEY saknas i miljön.');
	}
	if (!client) client = new Stripe(env.STRIPE_SECRET_KEY);
	return client;
}

/**
 * Bokför en slutförd Checkout-session på deltagaren. Delas av webhooken och
 * success-fallbacken (?session_id) — idempotent: redan betald deltagare rörs ej.
 */
export async function settleCheckoutSession(session: Stripe.Checkout.Session): Promise<void> {
	const participantId = session.metadata?.participantId;
	if (!participantId || session.payment_status !== 'paid') return;

	const participant = await db
		.select()
		.from(tournamentParticipants)
		.where(eq(tournamentParticipants.id, participantId))
		.get();
	if (!participant || participant.status === 'paid') return; // idempotens

	// Faktisk Stripe-avgift via balance transaction — chargen finns när
	// checkout.session.completed levereras.
	let feeOre = 0;
	const piId =
		typeof session.payment_intent === 'string'
			? session.payment_intent
			: session.payment_intent?.id;
	if (piId) {
		const pi = await stripe().paymentIntents.retrieve(piId, {
			expand: ['latest_charge.balance_transaction']
		});
		const charge = pi.latest_charge;
		if (charge && typeof charge !== 'string') {
			const bt = charge.balance_transaction;
			if (bt && typeof bt !== 'string') feeOre = bt.fee;
		}
	}

	await db
		.update(tournamentParticipants)
		.set({
			status: 'paid',
			paidVia: 'stripe',
			amountPaidOre: session.amount_total ?? 0,
			stripePaymentIntentId: piId ?? null,
			stripeFeeOre: feeOre,
			paidAt: new Date()
		})
		.where(eq(tournamentParticipants.id, participantId));
}

/** Success-fallback: hämta sessionen från Stripe och bokför den. */
export async function settleSessionById(sessionId: string): Promise<void> {
	const session = await stripe().checkout.sessions.retrieve(sessionId);
	await settleCheckoutSession(session);
}
