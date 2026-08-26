<script lang="ts">
	import { enhance } from '$app/forms';
	import CoasterRules from '$lib/components/CoasterRules.svelte';
	import { shortName } from '$lib/names';
	let { data, form } = $props();

	let coaster = $derived(data.coaster);
	let players = $derived(data.players);
	let myRow = $derived(players.find((p) => p.memberId === data.meId));
	let parTotal = $derived(coaster.par.reduce((a, b) => a + b, 0));
	let signed = $derived(players.filter((p) => p.signedAt));
	let amInvolved = $derived(coaster.createdBy === data.meId || !!myRow);

	// Sök bland medlemmar att lägga till — lista funkar inte med 1000 st
	let playerQuery = $state('');
	let playerSuggestions = $derived(
		playerQuery.trim().length === 0
			? []
			: data.addable
					.filter((m) => m.name.toLowerCase().includes(playerQuery.trim().toLowerCase()))
					.slice(0, 8)
	);

	function rowTotal(scores: (number | null)[]) {
		const filled = scores.filter((s): s is number => s !== null);
		return filled.length ? filled.reduce((a, b) => a + b, 0) : null;
	}

	function fmtDate(d: Date | string) {
		return new Date(d).toLocaleDateString('sv-SE');
	}
</script>

<div class="mx-auto mb-4 max-w-2xl">
	<CoasterRules />
</div>

{#if data.tournament}
	<div class="mx-auto mb-4 max-w-2xl">
		<a
			href={`/tournaments/${data.tournament.id}`}
			class="block rounded-xl bg-club-800 px-4 py-2 text-sm text-cream-200 shadow-sm hover:bg-club-700"
		>
			🏆 Turneringscoaster: <strong>{data.tournament.name}</strong> — signerade rundor räknas på turneringens
			leaderboard
		</a>
	</div>
{/if}

{#if form?.error}
	<p class="mb-4 rounded bg-red-100 px-3 py-2 text-sm text-red-700">{form.error}</p>
{/if}
{#if form?.signed}
	<p class="mb-4 rounded bg-club-100 px-3 py-2 text-sm text-club-700">
		Signerat! HCP {form.hcpBefore} → <strong>{form.hcpAfter}</strong>.
	</p>
{/if}
{#if form?.saved}
	<p class="mb-4 rounded bg-club-100 px-3 py-2 text-sm text-club-700">Poäng sparade.</p>
{/if}
{#if form?.added}
	<p class="mb-4 rounded bg-club-100 px-3 py-2 text-sm text-club-700">{form.added} tillagd.</p>
{/if}
{#if form?.removed}
	<p class="mb-4 rounded bg-club-100 px-3 py-2 text-sm text-club-700">
		{form.removed} borttagen från coastern.
	</p>
{/if}

<!-- Lägg till spelare: sök bland medlemmar (högst upp) -->
{#if players.length < data.maxPlayers && data.addable.length > 0}
	<div class="mx-auto mb-6 max-w-2xl">
		<label class="block text-sm font-semibold text-club-900" for="player-search"
			>Lägg till spelare</label
		>
		<div class="relative mt-1 max-w-sm">
			<input
				id="player-search"
				type="search"
				bind:value={playerQuery}
				placeholder="Sök medlem på namn…"
				autocomplete="off"
				class="w-full rounded-lg border-cream-300 bg-white text-sm"
			/>
			{#if playerSuggestions.length > 0}
				<ul
					class="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-cream-300 bg-white shadow-lg"
				>
					{#each playerSuggestions as m (m.id)}
						<li>
							<form
								method="POST"
								action="?/addPlayer"
								use:enhance={() => {
									playerQuery = '';
									return async ({ update }) => update();
								}}
							>
								<input type="hidden" name="memberId" value={m.id} />
								<button class="w-full px-3 py-2 text-left text-sm hover:bg-club-100"
									>{m.name}{'isGuest' in m && m.isGuest ? ' (gäst)' : ''}</button
								>
							</form>
						</li>
					{/each}
				</ul>
			{:else if playerQuery.trim().length > 0}
				<p
					class="absolute z-10 mt-1 w-full rounded-lg border border-cream-300 bg-white px-3 py-2 text-sm text-club-900/60 shadow-lg"
				>
					Ingen medlem matchar ”{playerQuery}”.
				</p>
			{/if}
		</div>
	</div>
{/if}

<!-- Formulär för egen rad — inputs i tabellen kopplas hit via form-attributet -->
{#if myRow && !myRow.signedAt}
	<form id="scoreform" method="POST" action="?/saveScores" use:enhance></form>
{/if}

<!-- ====== Papp-coastern ====== -->
<div
	class="mx-auto max-w-2xl -rotate-[0.6deg] rounded-[28px] border border-black/5 bg-card px-3 py-6 font-coaster text-print shadow-[0_10px_30px_-8px_rgba(60,50,30,0.35),0_2px_6px_rgba(60,50,30,0.15)] sm:px-10 sm:py-9"
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
		</div>
		<!-- Beer Golf-vimpel med glas och korsade klubbor -->
		<svg viewBox="0 0 64 86" class="h-24 w-[4.5rem] shrink-0" aria-label="Beer Golf">
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
			<text x="17" y="20" text-anchor="middle" font-size="7" font-weight="bold" fill="currentColor"
				>B</text
			>
			<text x="47" y="20" text-anchor="middle" font-size="7" font-weight="bold" fill="currentColor"
				>G</text
			>
			<text x="32" y="49" text-anchor="middle" font-size="14" font-weight="bold" fill="currentColor"
				>Beer</text
			>
			<text x="32" y="63" text-anchor="middle" font-size="14" font-weight="bold" fill="currentColor"
				>Golf</text
			>
		</svg>
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
					{@const mine = p.memberId === data.meId && !p.signedAt}
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
								>{:else if amInvolved}
								<form method="POST" action="?/removePlayer" use:enhance class="inline">
									<input type="hidden" name="rowId" value={p.id} />
									<button
										class="ml-1 align-middle text-xs text-print/50 hover:text-red-700"
										title={`Ta bort ${p.name} från coastern`}
										aria-label={`Ta bort ${p.name}`}>✕</button
									>
								</form>
							{/if}
						</td>
						{#each p.scores as s, i (i)}
							<td class="border-l border-print/60 p-0 text-center align-middle">
								{#if mine}
									<input
										form="scoreform"
										name={`s${i}`}
										type="number"
										min="1"
										max="30"
										value={s ?? ''}
										class="h-11 w-full min-w-6 border-0 bg-transparent p-0 text-center font-hand text-lg text-ink sm:text-xl [appearance:textfield] focus:ring-1 focus:ring-print/50 [&::-webkit-inner-spin-button]:appearance-none"
									/>
								{:else}
									<span class="font-hand text-xl text-ink">{s ?? ''}</span>
								{/if}
							</td>
						{/each}
						<td class="border-l border-print/60 px-0 text-center sm:px-1">
							<span class="font-hand text-lg font-bold text-ink sm:text-xl"
								>{rowTotal(p.scores) ?? ''}</span
							>
						</td>
					</tr>
				{/each}
				<!-- Tomma rader upp till sex, som på det tryckta underlägget -->
				{#each Array(Math.max(0, data.maxPlayers - players.length)) as _, i (i)}
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

<!-- ====== Kontroller (utanför pappen) ====== -->
{#if myRow && !myRow.signedAt}
	<div class="mx-auto mt-6 flex max-w-2xl flex-wrap gap-2">
		<button
			form="scoreform"
			class="rounded-lg bg-club-700 px-4 py-2 text-sm font-semibold text-cream-200 hover:bg-club-800"
			>Spara poäng</button
		>
		<form method="POST" action="?/sign" use:enhance>
			<button
				class="rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-club-900 hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-50"
				disabled={myRow.scores.some((s) => s === null) || players.length < data.minPlayers}
				title={players.length < data.minPlayers
					? 'Man kan inte spela ensam — lägg till minst en medspelare först'
					: myRow.scores.some((s) => s === null)
						? 'Fyll i alla nio hål först'
						: ''}>Signera rundan</button
			>
		</form>
	</div>
{/if}

<div class="mx-auto mt-4 max-w-2xl">
	<a href="/coasters" class="text-sm text-club-900/60 hover:underline">← Alla coasters</a>
</div>
