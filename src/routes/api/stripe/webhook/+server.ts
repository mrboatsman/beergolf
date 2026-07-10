import { error, json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { stripe, settleCheckoutSession } from '$lib/server/stripe';
import type { RequestHandler } from './$types';
import type Stripe from 'stripe';

// Stripe-webhook: bokför slutförda Checkout-betalningar. Autentisering sker
// via signaturverifiering (ingen session). Idempotent — dubbla leveranser
// är ofarliga (settleCheckoutSession rör inte redan betalda deltagare).
export const POST: RequestHandler = async ({ request }) => {
	if (!env.STRIPE_WEBHOOK_SECRET) throw error(500, 'STRIPE_WEBHOOK_SECRET saknas.');

	const signature = request.headers.get('stripe-signature');
	if (!signature) throw error(400, 'Signatur saknas.');

	const raw = await request.text();
	let event: Stripe.Event;
	try {
		event = await stripe().webhooks.constructEventAsync(raw, signature, env.STRIPE_WEBHOOK_SECRET);
	} catch {
		throw error(400, 'Ogiltig signatur.');
	}

	if (event.type === 'checkout.session.completed') {
		await settleCheckoutSession(event.data.object);
	}

	return json({ received: true });
};
