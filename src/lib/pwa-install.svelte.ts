// PWA-installation: delat state. app.html fångar `beforeinstallprompt` tidigt i
// window.__bgInstallPrompt; här läses det och exponeras reaktivt.
import { isIOS, isStandalone } from '$lib/push-client';

type InstallPromptEvent = Event & {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};
declare global {
	interface Window {
		__bgInstallPrompt?: InstallPromptEvent | null;
	}
}

export type Platform = 'ios-safari' | 'ios-other' | 'android' | 'desktop' | 'unknown';

class PwaInstall {
	canPrompt = $state(false);
	installed = $state(false);
	platform = $state<Platform>('unknown');
	private inited = false;

	init() {
		if (this.inited || typeof window === 'undefined') return;
		this.inited = true;
		this.installed = isStandalone();
		this.canPrompt = !!window.__bgInstallPrompt;
		this.platform = detectPlatform();
		window.addEventListener('bg:installprompt', () => (this.canPrompt = true));
		window.addEventListener('bg:installed', () => {
			this.canPrompt = false;
			this.installed = true;
		});
	}

	/** Visa native prompten. Returnerar true om användaren accepterade. */
	async prompt(): Promise<boolean> {
		const e = window.__bgInstallPrompt;
		if (!e) return false;
		await e.prompt();
		const { outcome } = await e.userChoice;
		if (outcome === 'accepted') {
			window.__bgInstallPrompt = null;
			this.canPrompt = false;
		}
		return outcome === 'accepted';
	}
}

function detectPlatform(): Platform {
	const ua = navigator.userAgent;
	if (isIOS()) {
		// Alla iOS-webbläsare använder WebKit; bara Safari kan lägga till på hemskärmen
		const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/.test(ua);
		return isSafari ? 'ios-safari' : 'ios-other';
	}
	if (/Android/.test(ua)) return 'android';
	if (/Windows|Macintosh|Linux/.test(ua)) return 'desktop';
	return 'unknown';
}

export const pwaInstall = new PwaInstall();
