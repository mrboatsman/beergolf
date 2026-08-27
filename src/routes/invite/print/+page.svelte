<script lang="ts">
	import InviteCards from '$lib/components/InviteCards.svelte';
	let { data } = $props();
</script>

<svelte:head><title>Invalskort — utskrift</title></svelte:head>

<div class="no-print mx-auto mb-4 max-w-[210mm]">
	<a href="/invite" class="text-sm text-club-900/60 hover:underline">← Bjud in</a>
	<div
		class="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-club-800 px-5 py-3 text-cream-200"
	>
		<div class="text-sm">
			<strong>{data.cards.length} kort</strong> · {Math.ceil(data.cards.length / 4)} ark A4
		</div>
		<button
			type="button"
			onclick={() => window.print()}
			class="rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-club-900 hover:bg-gold-400"
			>Skriv ut / spara som PDF</button
		>
	</div>

	<details class="mt-3 rounded-2xl bg-parchment px-5 py-3 text-sm shadow-sm">
		<summary class="cursor-pointer font-semibold">Så skriver du ut</summary>
		<ol class="mt-2 list-decimal space-y-1 pl-5">
			<li>
				Klicka <em>Skriv ut</em> (eller Ctrl/Cmd + P). Välj "Spara som PDF" om du vill ha en fil.
			</li>
			<li>
				Papper: <strong>A4</strong>, stående. Skala: <strong>100 %</strong> (inte "anpassa till sida").
			</li>
			<li>Marginaler: <strong>Inga</strong>.</li>
			<li>
				Slå på <strong>Bakgrundsgrafik</strong> (Chrome: Fler inställningar) så att det gröna skrivs ut.
			</li>
			<li>
				Dubbelsidigt: <strong>vänd längs långsidan</strong>. Baksidorna är speglade så QR-koden
				hamnar bakom rätt kod.
			</li>
			<li>
				Skär längs skärmärkena — korten är 85 × 55 mm (visitkort). 200–300 g papper rekommenderas.
			</li>
		</ol>
		<p class="mt-2 text-xs text-club-900/60">
			Ingen duplex? Skriv ut sida 1, lägg tillbaka arket med tryckt sida uppåt och överkanten först,
			skriv sedan ut sida 2. Provkör med ett vanligt ark.
		</p>
	</details>
</div>

{#if data.cards.length === 0}
	<p class="no-print mx-auto max-w-[210mm] text-sm text-club-900/60">
		Inga öppna koder att skriva ut. <a href="/invite" class="underline">Skapa en kod</a> först.
	</p>
{:else}
	<div class="sheets">
		<InviteCards cards={data.cards} joinUrl={data.joinUrl} />
	</div>
{/if}

<style>
	/* Arken är 210 mm breda — låt dem skrollas i sidled på smala skärmar */
	.sheets {
		overflow-x: auto;
	}
	@media print {
		.no-print {
			display: none !important;
		}
		/* Dölj app-skalet: sidebar, topbar, bottennav, footer, menyer */
		:global(aside),
		:global(header),
		:global(footer),
		:global(nav) {
			display: none !important;
		}
		:global(main) {
			padding: 0 !important;
			max-width: none !important;
			margin: 0 !important;
		}
		:global(body) {
			background: #fff !important;
		}
		.sheets {
			overflow: visible;
		}
	}
</style>
