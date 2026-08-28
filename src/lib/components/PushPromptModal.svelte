<script lang="ts">
	// Engångsfråga om notiser — bara i installerad PWA, en gång per enhet.
	// I vanlig webbläsare frågar vi aldrig (man hittar det under Inställningar).
	import { onMount } from 'svelte';
	import { enablePush, markPushPromptAsked, shouldShowPushPrompt } from '$lib/push-client';

	let open = $state(false);
	let busy = $state(false);
	let msg = $state<string | null>(null);
	onMount(() => {
		shouldShowPushPrompt().then((v) => (open = v));
	});
	function later() {
		markPushPromptAsked();
		open = false;
	}
	async function yes() {
		busy = true;
		const r = await enablePush();
		markPushPromptAsked();
		msg = r.message;
		busy = false;
		if (r.ok) setTimeout(() => (open = false), 1200);
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-[66] flex items-end justify-center bg-club-950/60 p-0 sm:items-center sm:p-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby="push-title"
	>
		<div class="w-full max-w-md rounded-t-3xl bg-parchment p-6 shadow-2xl sm:rounded-3xl">
			<h2 id="push-title" class="font-display text-2xl font-semibold text-club-900">
				🔔 Vill du få notiser?
			</h2>
			<p class="mt-2 text-sm text-club-900/80">
				Vi säger till när någon du bjudit in skapar konto eller när du läggs till på en Score
				Coaster. Inget spam. Går att ändra under Inställningar → Notiser.
			</p>
			{#if msg}<p class="mt-3 text-sm text-club-700">{msg}</p>{/if}
			<div class="mt-5 flex gap-2">
				<button
					type="button"
					onclick={later}
					class="flex-1 rounded-xl px-4 py-2.5 text-sm text-club-900/70 hover:bg-cream-300"
					>Inte nu</button
				>
				<button
					type="button"
					onclick={yes}
					disabled={busy}
					class="flex-1 rounded-xl bg-club-700 px-4 py-2.5 text-sm font-semibold text-cream-200 hover:bg-club-800 disabled:opacity-50"
					>{busy ? 'Väntar…' : 'Ja, slå på'}</button
				>
			</div>
		</div>
	</div>
{/if}
