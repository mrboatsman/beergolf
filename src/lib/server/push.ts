// Web Push (PWA-notiser) via web-push + VAPID. Nycklar i .env:
// VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT. Saknas de är push
// avstängt (isPushEnabled() = false) och alla send-anrop blir no-op.
import webpush from 'web-push';
import { eq, inArray } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { db } from './db';
import { pushSubscriptions } from './db/schema';
import { newId } from './ids';

export type PushPayload = {
	title: string;
	body: string;
	url?: string; // öppnas vid klick (relativ)
	tag?: string; // ersätter tidigare notis med samma tag
};

let configured = false;
function setup(): boolean {
	if (configured) return true;
	const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = env;
	if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false;
	webpush.setVapidDetails(
		VAPID_SUBJECT || 'mailto:admin@example.com',
		VAPID_PUBLIC_KEY,
		VAPID_PRIVATE_KEY
	);
	configured = true;
	return true;
}

export function isPushEnabled(): boolean {
	return !!env.VAPID_PUBLIC_KEY && !!env.VAPID_PRIVATE_KEY;
}
export function publicKey(): string | null {
	return env.VAPID_PUBLIC_KEY ?? null;
}

export function saveSubscription(
	memberId: string,
	sub: { endpoint: string; keys: { p256dh: string; auth: string } },
	userAgent: string | null
) {
	const existing = db
		.select({ id: pushSubscriptions.id })
		.from(pushSubscriptions)
		.where(eq(pushSubscriptions.endpoint, sub.endpoint))
		.get();
	if (existing) {
		db.update(pushSubscriptions)
			.set({ memberId, p256dh: sub.keys.p256dh, auth: sub.keys.auth, userAgent })
			.where(eq(pushSubscriptions.id, existing.id))
			.run();
		return existing.id;
	}
	const id = newId();
	db.insert(pushSubscriptions)
		.values({
			id,
			memberId,
			endpoint: sub.endpoint,
			p256dh: sub.keys.p256dh,
			auth: sub.keys.auth,
			userAgent
		})
		.run();
	return id;
}

export function removeSubscription(memberId: string, endpoint: string) {
	db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint)).run();
	void memberId;
}

export function listSubscriptions(memberId: string) {
	return db
		.select({
			id: pushSubscriptions.id,
			endpoint: pushSubscriptions.endpoint,
			userAgent: pushSubscriptions.userAgent,
			createdAt: pushSubscriptions.createdAt
		})
		.from(pushSubscriptions)
		.where(eq(pushSubscriptions.memberId, memberId))
		.all();
}

/**
 * Skicka till alla enheter för en eller flera medlemmar. Fire-and-forget:
 * anropa utan await i actions. Döda prenumerationer (404/410) rensas.
 */
export async function sendPush(memberIds: string | string[], payload: PushPayload): Promise<void> {
	if (!setup()) return;
	const ids = Array.isArray(memberIds) ? memberIds : [memberIds];
	if (!ids.length) return;
	const subs = db
		.select()
		.from(pushSubscriptions)
		.where(inArray(pushSubscriptions.memberId, ids))
		.all();
	const body = JSON.stringify(payload);
	await Promise.all(
		subs.map(async (s) => {
			try {
				await webpush.sendNotification(
					{ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
					body,
					{ TTL: 60 * 60 * 24 }
				);
				db.update(pushSubscriptions)
					.set({ lastUsedAt: new Date() })
					.where(eq(pushSubscriptions.id, s.id))
					.run();
			} catch (e) {
				const status = (e as { statusCode?: number }).statusCode;
				if (status === 404 || status === 410) {
					db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, s.id)).run();
				} else {
					console.warn('[push] misslyckades', s.endpoint.slice(0, 40), status ?? e);
				}
			}
		})
	);
}
