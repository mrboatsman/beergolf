<script lang="ts">
	// Själva papp-coastern (framsidan). Används på /coasters/[id] (redigerbar via
	// snippets) och i galleriet (read-only). Layout efter det fysiska underlägget.
	import type { Snippet } from 'svelte';
	import { shortName } from '$lib/names';
	import { fmtScore, grossTotal, type HoleScore } from '$lib/scoring';

	export type PaperPlayer = {
		id: string;
		position: number;
		name: string;
		memberId: string | null;
		scores: HoleScore[];
		signedAt: Date | null;
	};

	let {
		coaster,
		players,
		winners = [],
		maxPlayers = 6,
		editableId = null,
		liveScores = null,
		cell,
		remove,
		class: cls = ''
	}: {
		coaster: { name: string | null; createdAt: Date; par: number[] };
		players: PaperPlayer[];
		winners?: { name: string; net: number | null }[];
		maxPlayers?: number;
		/** Spelare vars rad är redigerbar (renderas via `cell`) */
		editableId?: string | null;
		/** Lokala (osparade) poäng för den redigerbara raden — för totalen */
		liveScores?: HoleScore[] | null;
		cell?: Snippet<[PaperPlayer, number, HoleScore]>;
		remove?: Snippet<[PaperPlayer]>;
		class?: string;
	} = $props();

	let parTotal = $derived(coaster.par.reduce((a, b) => a + b, 0));
	let signed = $derived(players.filter((p) => p.signedAt));
	const rowTotal = (scores: HoleScore[]) => grossTotal(scores, coaster.par);
	const fmtDate = (d: Date | string) => new Date(d).toLocaleDateString('sv-SE');
</script>

<div
	class="rounded-[28px] border border-black/5 bg-card px-3 py-6 font-coaster text-print shadow-[0_10px_30px_-8px_rgba(60,50,30,0.35),0_2px_6px_rgba(60,50,30,0.15)] sm:px-10 sm:py-9 {cls}"
>
	<!-- Huvud: titel + vimpel -->
	<div class="flex items-start justify-between gap-4">
		<div class="pt-2">
			<h1 class="text-4xl font-bold tracking-tight sm:text-5xl">Score Coaster</h1>
			<p class="mt-3 text-sm font-bold sm:text-base">
				You don't have to play nine at one time. Drink responsibly.
			</p>
			{#if coaster.name}
				<p class="mt-1 text-xs text-print/70">{coaster.name} · {fmtDate(coaster.createdAt)}</p>
			{/if}
			{#if winners.length}
				<p class="mt-2 text-sm font-bold text-print">
					🏆 {winners.length > 1 ? 'Delad seger' : 'Vinnare'}: {winners
						.map((w) => w.name)
						.join(' & ')}
					<span class="font-normal text-print/70">(netto {winners[0].net})</span>
				</p>
			{/if}
		</div>
		<div class="relative shrink-0">
			{#if winners.length}
				<!-- Guldmärke: klistras över vimpeln när alla signerat -->
				<div
					class="absolute -top-8 -right-3 z-10 flex h-[7.5rem] w-[7.5rem] rotate-[8deg] sm:h-[8rem] sm:w-[8rem] flex-col items-center justify-center rounded-full text-center text-club-900 drop-shadow-[0_4px_8px_rgba(60,50,30,0.45)]"
					style="background: radial-gradient(circle at 35% 30%, #fff3c4 0%, #e8c04a 45%, #b8892a 100%); clip-path: polygon(50% 0%, 58% 8%, 68% 4%, 73% 14%, 84% 13%, 85% 24%, 96% 27%, 92% 37%, 100% 45%, 93% 53%, 97% 64%, 87% 68%, 87% 79%, 76% 78%, 71% 89%, 61% 85%, 54% 95%, 46% 95%, 39% 85%, 29% 89%, 24% 78%, 13% 79%, 13% 68%, 3% 64%, 7% 53%, 0% 45%, 8% 37%, 4% 27%, 15% 24%, 16% 13%, 27% 14%, 32% 4%, 42% 8%)"
					title={`Vinnare: ${winners.map((w) => w.name).join(' & ')} (netto ${winners[0].net})`}
				>
					<span class="text-[10px] font-bold tracking-[0.2em] uppercase">Vinnare</span>
					<span class="text-2xl leading-none">🏆</span>
					<span class="font-hand mt-0.5 max-w-[6rem] truncate px-1 text-base leading-tight"
						>{winners.length === 1 ? shortName(winners[0].name) : 'Delad seger'}</span
					>
					<span class="text-[11px] leading-none">netto {winners[0].net}</span>
				</div>
			{/if}
			<!-- Beer Golf-vimpel med glas och korsade klubbor -->
			<svg
				viewBox="0 0 64 86"
				class="h-24 w-[4.5rem] shrink-0 {winners.length ? 'opacity-70' : ''}"
				aria-label="Beer Golf"
			>
				<path
					d="M4 3h56v66L32 83 4 69Z"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linejoin="round"
				/>
				<!-- korsade klubbor -->
				<path
					d="M20 30 40 12M44 30 24 12"
					fill="none"
					stroke="currentColor"
					stroke-width="1.6"
					stroke-linecap="round"
				/>
				<circle cx="20.5" cy="30" r="2" fill="currentColor" />
				<circle cx="43.5" cy="30" r="2" fill="currentColor" />
				<!-- ölglas -->
				<path
					d="M27 13.5h10l-1.6 12h-6.8Z"
					fill="var(--color-card)"
					stroke="currentColor"
					stroke-width="1.6"
				/>
				<path d="M28.4 17h7.4" stroke="currentColor" stroke-width="1" />
				<text
					x="17"
					y="20"
					text-anchor="middle"
					font-size="7"
					font-weight="bold"
					fill="currentColor">B</text
				>
				<text
					x="47"
					y="20"
					text-anchor="middle"
					font-size="7"
					font-weight="bold"
					fill="currentColor">G</text
				>
				<text
					x="32"
					y="49"
					text-anchor="middle"
					font-size="14"
					font-weight="bold"
					fill="currentColor">Beer</text
				>
				<text
					x="32"
					y="63"
					text-anchor="middle"
					font-size="14"
					font-weight="bold"
					fill="currentColor">Golf</text
				>
			</svg>
		</div>
	</div>

	<!-- Poängtabell -->
	<div class="mt-6 overflow-x-auto">
		<table class="w-full border-collapse">
			<thead>
				<tr class="border-t-[4px] border-b border-double border-t-print border-b-print/80">
					<th
						class="w-[20%] max-w-16 min-w-14 py-2 pr-1 text-left text-lg font-bold sm:w-[30%] sm:max-w-none sm:min-w-28 sm:text-xl"
						>Hole</th
					>
					{#each coaster.par as _, i (i)}
						<th
							class="w-9 min-w-6 border-l border-print/60 px-0 py-2 text-center text-base font-bold sm:px-1 sm:text-lg"
							>{i + 1}</th
						>
					{/each}
					<th
						class="w-12 border-l border-print/60 px-0 py-2 text-center text-base font-bold sm:w-16 sm:px-1 sm:text-lg"
						>Total</th
					>
				</tr>
			</thead>
			<tbody>
				<!-- Par-rad (tryckt) -->
				<tr class="border-b border-print/80">
					<td class="py-2 pr-1 text-lg font-bold sm:text-xl">Par</td>
					{#each coaster.par as p, i (i)}
						<td
							class="border-l border-print/60 px-0 py-2 text-center text-base font-semibold sm:px-1 sm:text-lg"
							>{p}</td
						>
					{/each}
					<td
						class="border-l border-print/60 px-0 py-2 text-center text-base font-semibold sm:px-1 sm:text-lg"
						>{parTotal}</td
					>
				</tr>
				<!-- Spelarrader (handskrivna) -->
				{#each players as p (p.id)}
					{@const mine = p.id === editableId && !p.signedAt}
					<tr class="border-b border-print/80">
						<td class="h-12 max-w-16 py-1 pr-1 align-top sm:max-w-none">
							<span class="block text-[9px] leading-none text-print/80">Player {p.position}</span>
							<span class="font-hand text-lg leading-tight text-ink sm:hidden"
								>{shortName(p.name)}</span
							>
							<span class="hidden font-hand text-xl leading-tight text-ink sm:inline">{p.name}</span
							>
							{#if !p.memberId}<span
									class="ml-1 rounded-full bg-print/10 px-1.5 align-middle text-[10px] font-bold text-print/70"
									>GÄST</span
								>{/if}
							{#if p.signedAt}<span class="ml-1 align-middle text-xs text-print/70" title="Signerad"
									>✓</span
								>{:else if remove}
								{@render remove(p)}
							{/if}
						</td>
						{#each p.scores as s, i (i)}
							<td class="border-l border-print/60 p-0 text-center align-middle">
								{#if mine && cell}
									{@render cell(p, i, s)}
								{:else}
									<span class="font-hand text-xl text-ink">{fmtScore(s)}</span>
								{/if}
							</td>
						{/each}
						<td class="border-l border-print/60 px-0 text-center sm:px-1">
							<span class="font-hand text-lg font-bold text-ink sm:text-xl"
								>{rowTotal(mine && liveScores ? liveScores : p.scores) ?? ''}</span
							>
						</td>
					</tr>
				{/each}
				<!-- Tomma rader upp till sex, som på det tryckta underlägget -->
				{#each Array(Math.max(0, maxPlayers - players.length)) as _, i (i)}
					<tr class="border-b border-print/80">
						<td class="h-12 py-1 pr-1 align-top">
							<span class="block text-[9px] leading-none text-print/80"
								>Player {players.length + i + 1}</span
							>
						</td>
						{#each coaster.par as _p, j (j)}
							<td class="border-l border-print/60"></td>
						{/each}
						<td class="border-l border-print/60"></td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- Player Signature -->
	<div class="mt-10">
		<div class="flex flex-wrap items-end gap-x-6 border-b border-print/80 pb-1">
			<span class="text-xl font-bold">Player Signature:</span>
			{#each signed as p (p.id)}
				<span class="font-hand text-2xl text-ink">{p.name}</span>
			{/each}
		</div>
		<div class="mt-8 border-b border-print/80"></div>
	</div>
</div>
