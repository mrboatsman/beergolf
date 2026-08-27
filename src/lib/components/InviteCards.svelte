<script lang="ts">
	/**
	 * Utskriftsvänliga invalskort, 85 × 55 mm, fyra per A4.
	 * Sida 1 (per ark) = framsidor, sida 2 = baksidor speglade horisontellt så de
	 * hamnar rätt vid dubbelsidig utskrift med vändning längs långsidan.
	 *  - Framsida: crème bakgrund, grönt band med logga, kod i monospace
	 *  - Baksida: mörkgrön, vit QR-ruta 40 mm, text till höger
	 */
	import logo from '$lib/assets/logo.png';

	let {
		cards,
		joinUrl
	}: { cards: { code: string; url: string; qrSvg: string }[]; joinUrl: string } = $props();

	const PER_SHEET = 4;
	let sheets = $derived(
		Array.from({ length: Math.ceil(cards.length / PER_SHEET) }, (_, i) =>
			cards.slice(i * PER_SHEET, i * PER_SHEET + PER_SHEET)
		)
	);

	// Spegla 2×2-rutnätet: [0,1,2,3] → [1,0,3,2]
	function mirror<T>(arr: T[]): (T | null)[] {
		const padded: (T | null)[] = [...arr];
		while (padded.length < PER_SHEET) padded.push(null);
		return [padded[1], padded[0], padded[3], padded[2]];
	}
</script>

{#each sheets as sheet, si (si)}
	<!-- Framsidor -->
	<section class="page">
		<div class="grid">
			{#each sheet as card (card.code)}
				<div class="card front">
					<div class="band">
						<img src={logo} alt="Tablers Beer Golf Society" />
						<span class="brand">Tablers Beer Golf Society</span>
					</div>
					<div class="accent"></div>
					<div class="label">DIN INVALSKOD</div>
					<div class="code">{card.code}</div>
					<div class="url">{joinUrl}</div>
					<div class="tagline">Färre slag. Fler skål.</div>
					<span class="mark tl"></span><span class="mark tr"></span>
					<span class="mark bl"></span><span class="mark br"></span>
				</div>
			{/each}
		</div>
		<div class="note">
			Ark {si + 1} · Framsida · 85 × 55 mm · skriv ut dubbelsidigt (vänd längs långsidan)
		</div>
	</section>

	<!-- Baksidor, speglade -->
	<section class="page">
		<div class="grid">
			{#each mirror(sheet) as card, ci (ci)}
				{#if card}
					<div class="card back">
						<div class="qr">{@html card.qrSvg}</div>
						<div class="side">
							<div class="scan">Skanna för att<br />gå med</div>
							<div class="rule"></div>
							<div class="alt">eller gå till<br />{joinUrl}<br />och ange koden</div>
							<div class="backcode">{card.code}</div>
							<div class="society">Tablers Beer Golf Society</div>
						</div>
						<span class="mark tl"></span><span class="mark tr"></span>
						<span class="mark bl"></span><span class="mark br"></span>
					</div>
				{:else}
					<div class="card empty"></div>
				{/if}
			{/each}
		</div>
		<div class="note">Ark {si + 1} · Baksida · speglad för dubbelsidig utskrift</div>
	</section>
{/each}

<style>
	@page {
		size: A4 portrait;
		margin: 0;
	}

	.page {
		--card-dark: #17382b;
		--card-mid: #2f6b4f;
		--card-light: #e6f0ea;
		--card-cream: #f5f1e6;
		position: relative;
		width: 210mm;
		height: 297mm;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #fff;
		page-break-after: always;
		break-after: page;
		-webkit-print-color-adjust: exact;
		print-color-adjust: exact;
		font-family: Helvetica, Arial, sans-serif;
	}

	.grid {
		display: grid;
		grid-template-columns: 85mm 85mm;
		grid-auto-rows: 55mm;
		gap: 8mm;
	}

	.card {
		position: relative;
		width: 85mm;
		height: 55mm;
		border-radius: 3mm;
		overflow: visible;
		box-sizing: border-box;
	}

	/* ---------- Framsida ---------- */
	.front {
		background: var(--card-cream);
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}
	.band {
		width: 100%;
		height: 20mm;
		background: var(--card-dark);
		border-radius: 3mm 3mm 0 0;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 3mm;
		padding: 2mm 6mm;
		box-sizing: border-box;
	}
	.band img {
		height: 14mm;
		width: 14mm;
		border-radius: 50%;
		object-fit: cover;
	}
	.brand {
		color: #fff;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 11pt;
		font-weight: 600;
		letter-spacing: 0.02em;
	}
	.accent {
		width: calc(100% - 16mm);
		height: 0;
		border-top: 0.8pt solid var(--card-mid);
		margin-top: 1.5mm;
	}
	.label {
		margin-top: 5mm;
		font-size: 7pt;
		color: var(--card-mid);
		letter-spacing: 0.2em;
	}
	.code {
		margin-top: 2mm;
		font-family: 'Courier New', Courier, monospace;
		font-weight: 700;
		font-size: 20pt;
		letter-spacing: 0.6em;
		padding-left: 0.6em; /* kompensera sista bokstavens spacing */
		color: var(--card-dark);
		line-height: 1;
	}
	.url {
		margin-top: 4.5mm;
		font-size: 7pt;
		color: var(--card-mid);
	}
	.tagline {
		margin-top: 1mm;
		font-size: 6pt;
		font-style: italic;
		color: var(--card-mid);
	}

	/* ---------- Baksida ---------- */
	.back {
		background: var(--card-dark);
		color: #fff;
		display: flex;
		align-items: center;
		padding: 0 6mm 0 7mm;
	}
	.qr {
		width: 40mm;
		height: 40mm;
		padding: 1.5mm;
		background: #fff;
		border-radius: 2mm;
		box-sizing: content-box;
		flex: none;
	}
	.qr :global(svg) {
		width: 40mm;
		height: 40mm;
		display: block;
	}
	.side {
		margin-left: 6mm;
		flex: 1;
		display: flex;
		flex-direction: column;
		height: 100%;
		padding: 9mm 0 5mm;
		box-sizing: border-box;
	}
	.scan {
		font-weight: 700;
		font-size: 9pt;
		line-height: 1.25;
	}
	.rule {
		border-top: 0.5pt solid var(--card-light);
		margin: 2mm 0 2.5mm;
	}
	.alt {
		font-size: 6.5pt;
		line-height: 1.5;
		color: var(--card-light);
	}
	.backcode {
		margin-top: 2mm;
		font-family: 'Courier New', Courier, monospace;
		font-weight: 700;
		font-size: 9pt;
	}
	.society {
		margin-top: auto;
		font-size: 6pt;
		font-style: italic;
		color: var(--card-light);
	}

	/* ---------- Skärmärken ---------- */
	.mark {
		position: absolute;
		width: 3mm;
		height: 3mm;
		border-color: #999;
		border-style: solid;
		border-width: 0;
	}
	.mark.tl {
		top: -3mm;
		left: -3mm;
		border-right-width: 0.3pt;
		border-bottom-width: 0.3pt;
	}
	.mark.tr {
		top: -3mm;
		right: -3mm;
		border-left-width: 0.3pt;
		border-bottom-width: 0.3pt;
	}
	.mark.bl {
		bottom: -3mm;
		left: -3mm;
		border-right-width: 0.3pt;
		border-top-width: 0.3pt;
	}
	.mark.br {
		bottom: -3mm;
		right: -3mm;
		border-left-width: 0.3pt;
		border-top-width: 0.3pt;
	}

	.note {
		position: absolute;
		bottom: 12mm;
		left: 0;
		right: 0;
		text-align: center;
		font-size: 7pt;
		color: #888;
	}

	/* Skärmvisning: arken som papper på grå yta; utskrift: exakt A4 */
	@media screen {
		.page {
			margin: 8mm auto;
			box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
			transform-origin: top center;
		}
	}
	@media print {
		.page {
			margin: 0;
			box-shadow: none;
		}
		/* Ingen tom sida efter sista arket */
		.page:last-of-type {
			page-break-after: auto;
			break-after: auto;
		}
	}
</style>
