// Klienthjälpare för coastern: autospar via form action + live-prenumeration (SSE).
import { deserialize } from '$app/forms';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Debounced autospar mot en SvelteKit form action (t.ex. "?/saveScores").
 * `build` returnerar FormData:t som ska skickas. Senaste anropet vinner;
 * om ett nytt värde kommer under pågående sparning sparas igen efteråt.
 */
export function createAutosave(
	action: string,
	build: () => FormData,
	onState: (s: SaveState, msg?: string) => void,
	delay = 400
) {
	let timer: ReturnType<typeof setTimeout> | null = null;
	let inflight = false;
	let again = false;

	async function run() {
		if (inflight) {
			again = true;
			return;
		}
		inflight = true;
		onState('saving');
		try {
			const res = await fetch(action, {
				method: 'POST',
				body: build(),
				headers: { 'x-sveltekit-action': 'true', accept: 'application/json' }
			});
			const result = deserialize(await res.text());
			if (result.type === 'failure') {
				onState(
					'error',
					String((result.data as { error?: string } | undefined)?.error ?? 'Kunde inte spara.')
				);
			} else if (result.type === 'error') {
				onState('error', 'Kunde inte spara.');
			} else onState('saved');
		} catch {
			onState('error', 'Ingen kontakt med servern.');
		} finally {
			inflight = false;
			if (again) {
				again = false;
				run();
			}
		}
	}

	return {
		schedule() {
			if (timer) clearTimeout(timer);
			timer = setTimeout(run, delay);
		},
		flush() {
			if (timer) clearTimeout(timer);
			timer = null;
			return run();
		}
	};
}

/** Prenumerera på ändringar; `onChange` körs per händelse. Returnerar stängfunktion. */
export function subscribeLive(url: string, onChange: () => void) {
	if (typeof EventSource === 'undefined') return () => {};
	const es = new EventSource(url);
	es.addEventListener('change', onChange);
	return () => es.close();
}
