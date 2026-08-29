<script lang="ts">
	// "Installera som app": native prompt (Chromium/Android) där den finns,
	// annars en instruktionsruta per plattform (iOS Safari: Dela → Lägg till på hemskärmen).
	import { onMount } from 'svelte';
	import { pwaInstall } from '$lib/pwa-install.svelte';

	let { class: cls = '' }: { class?: string } = $props();
	let showHelp = $state(false);
	let busy = $state(false);
	onMount(() => pwaInstall.init());

	async function click() {
		if (pwaInstall.canPrompt) {
			busy = true;
			const ok = await pwaInstall.prompt();
			busy = false;
			if (!ok) showHelp = true;
		} else showHelp = true;
	}
</script>

{#if pwaInstall.installed}
	<span
		class="inline-flex items-center gap-2 rounded-lg bg-club-800/10 px-3 py-1.5 text-xs font-semibold text-club-800 {cls}"
		>✓ Installerad som app</span
	>
{:else}
	<button
		type="button"
		onclick={click}
		disabled={busy}
		class="rounded-lg bg-club-700 px-3 py-1.5 text-xs font-semibold text-cream-200 hover:bg-club-800 disabled:opacity-50 {cls}"
		>{busy ? 'Väntar…' : 'Installera som app'}</button
	>
{/if}

{#if showHelp}
	<div
		class="fixed inset-0 z-[80] flex items-end justify-center bg-club-950/60 p-0 sm:items-center sm:p-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby="install-title"
	>
		<div class="w-full max-w-md rounded-t-3xl bg-parchment p-6 shadow-2xl sm:rounded-3xl">
			<h2 id="install-title" class="font-display text-2xl font-semibold text-club-900">
				Lägg till Beer Golf på hemskärmen
			</h2>
			<div class="mt-3 space-y-2 text-sm text-club-900/85">
				{#if pwaInstall.platform === 'ios-safari'}
					<ol class="list-decimal space-y-1.5 pl-5">
						<li>
							Tryck på <strong>Dela</strong>-knappen i Safari (rutan med pilen uppåt, längst ner).
						</li>
						<li>Skrolla och välj <strong>Lägg till på hemskärmen</strong>.</li>
						<li>
							Tryck <strong>Lägg till</strong>. Öppna sedan Beer Golf från hemskärmen — då kan du
							också slå på notiser.
						</li>
					</ol>
				{:else if pwaInstall.platform === 'ios-other'}
					<p>På iPhone/iPad kan bara <strong>Safari</strong> lägga till appar på hemskärmen.</p>
					<ol class="list-decimal space-y-1.5 pl-5">
						<li>Öppna den här sidan i Safari.</li>
						<li>
							Tryck på <strong>Dela</strong> → <strong>Lägg till på hemskärmen</strong> →
							<strong>Lägg till</strong>.
						</li>
					</ol>
				{:else if pwaInstall.platform === 'android'}
					<p>Din webbläsare visade ingen installationsruta. Så här gör du manuellt:</p>
					<ul class="list-disc space-y-1.5 pl-5">
						<li>
							<strong>Chrome / Edge / Samsung Internet:</strong> menyn (⋮) →
							<strong>Installera app</strong>
							eller <strong>Lägg till på startskärmen</strong>.
						</li>
						<li><strong>Firefox:</strong> menyn (⋮) → <strong>Installera</strong>.</li>
					</ul>
				{:else}
					<p>På datorn:</p>
					<ul class="list-disc space-y-1.5 pl-5">
						<li>
							<strong>Chrome / Edge:</strong> installationsikonen i adressfältet, eller menyn →
							<strong>Installera Beer Golf</strong>.
						</li>
						<li><strong>Safari (macOS):</strong> Arkiv → <strong>Lägg till i Dock</strong>.</li>
						<li>
							<strong>Firefox:</strong> stöder tyvärr inte installation av webbappar på datorn.
						</li>
					</ul>
				{/if}
			</div>
			<button
				type="button"
				onclick={() => (showHelp = false)}
				class="mt-5 w-full rounded-xl bg-club-700 px-4 py-2.5 text-sm font-semibold text-cream-200 hover:bg-club-800"
				>Stäng</button
			>
		</div>
	</div>
{/if}
