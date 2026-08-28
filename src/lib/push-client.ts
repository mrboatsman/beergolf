// Klientlogik för Web Push: stöd, standalone-läge, slå på/av. Delas av
// Inställningar, välkomstmodalen och PWA-notisfrågan.
export function isStandalone(): boolean {
	if (typeof window === 'undefined') return false;
	return (
		window.matchMedia('(display-mode: standalone)').matches ||
		(navigator as { standalone?: boolean }).standalone === true
	);
}
export const isIOS = () =>
	typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent);
export const pushSupported = () =>
	typeof window !== 'undefined' &&
	'serviceWorker' in navigator &&
	'PushManager' in window &&
	'Notification' in window;

export async function hasPushSubscription(): Promise<boolean> {
	if (!pushSupported()) return false;
	try {
		const reg = await navigator.serviceWorker.ready;
		return !!(await reg.pushManager.getSubscription());
	} catch {
		return false;
	}
}

function b64ToU8(b64: string) {
	const pad = '='.repeat((4 - (b64.length % 4)) % 4);
	const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
	return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Slå på notiser på den här enheten. Returnerar { ok, message }. */
export async function enablePush(): Promise<{ ok: boolean; message: string }> {
	if (!pushSupported()) return { ok: false, message: 'Din webbläsare stöder inte notiser här.' };
	if (isIOS() && !isStandalone()) {
		return {
			ok: false,
			message:
				'På iPhone: lägg först till Beer Golf på hemskärmen (Dela → Lägg till på hemskärmen) och öppna appen därifrån.'
		};
	}
	try {
		const { enabled, publicKey } = await fetch('/api/push/public-key').then((r) => r.json());
		if (!enabled) return { ok: false, message: 'Push är inte konfigurerat på servern.' };
		const perm = await Notification.requestPermission();
		if (perm !== 'granted')
			return {
				ok: false,
				message: 'Du nekade notiser. Ändra i webbläsarens inställningar om du ångrar dig.'
			};
		const reg = await navigator.serviceWorker.ready;
		const sub =
			(await reg.pushManager.getSubscription()) ??
			(await reg.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: b64ToU8(publicKey)
			}));
		const res = await fetch('/api/push/subscribe', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(sub.toJSON())
		});
		if (!res.ok) return { ok: false, message: 'Kunde inte spara prenumerationen.' };
		return { ok: true, message: 'Notiser påslagna på den här enheten.' };
	} catch (e) {
		return { ok: false, message: e instanceof Error ? e.message : 'Något gick fel.' };
	}
}

export async function disablePush(): Promise<void> {
	const reg = await navigator.serviceWorker.ready;
	const sub = await reg.pushManager.getSubscription();
	if (!sub) return;
	await fetch('/api/push/unsubscribe', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ endpoint: sub.endpoint })
	});
	await sub.unsubscribe();
}

// --- Engångsfråga om notiser i installerad PWA (per enhet, localStorage) ---
const ASKED_KEY = 'bg:push-asked';
export function pushPromptAlreadyAsked(): boolean {
	try {
		return localStorage.getItem(ASKED_KEY) === '1';
	} catch {
		return true;
	}
}
export function markPushPromptAsked() {
	try {
		localStorage.setItem(ASKED_KEY, '1');
	} catch {
		/* ignorera */
	}
}
/** Ska notisfrågan visas nu? Bara i standalone, aldrig frågad, tillstånd ej beslutat, ingen prenumeration. */
export async function shouldShowPushPrompt(): Promise<boolean> {
	if (!isStandalone() || !pushSupported() || pushPromptAlreadyAsked()) return false;
	if (Notification.permission !== 'default') return false;
	return !(await hasPushSubscription());
}
