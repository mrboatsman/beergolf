<script lang="ts">
	import { enhance } from '$app/forms';
	import CoasterRules from '$lib/components/CoasterRules.svelte';
	import { shortName } from '$lib/names';
	import { scoreInput } from '$lib/score-input';
	import { fmtScore, grossTotal, parseScore } from '$lib/scoring';
	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { createAutosave, subscribeLive, type SaveState } from '$lib/live-coaster';
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

	// Min rad: lokalt state för inmatning, autosparas (debounce) via ?/saveScores.
	// Sign-knappen och totalen läser härifrån så de reagerar direkt vid inmatning.
	let myScores = $state<(number | null)[]>([]);
	// dirty = osparade lokala ändringar; då får servern (live-uppdatering efter
	// egen sparning) inte skriva över det jag håller på att skriva.
	let dirty = false;
	$effect(() => {
		const server = myRow ? [...myRow.scores] : [];
		if (!dirty) myScores = server;
	});
	let saveState = $state<SaveState>('idle');
	let saveMsg = $state('');
	const autosave = createAutosave(
		'?/saveScores',
		() => {
			dirty = false; // allt fram till nu skickas; nya inmatningar sätter dirty igen
			const fd = new FormData();
			myScores.forEach((v, i) => fd.set(`s${i}`, v === null ? '' : String(v)));
			return fd;
		},
		(st, msg) => {
			saveState = st;
			saveMsg = msg ?? '';
			if (st === 'error') dirty = true;
		}
	);
	function onScoreInput(i: number, e: Event) {
		myScores[i] = parseScore((e.currentTarget as HTMLInputElement).value);
		dirty = true;
		autosave.schedule();
	}
	// Blur kommer från auto-hoppet innan Svelte-handlern hunnit uppdatera state —
	// vänta ett tick så flush skickar rätt värden.
	const flushSoon = () => setTimeout(() => autosave.flush(), 0);

	// Live: uppdatera sidan när någon annan ändrar coastern
	onMount(() =>
		subscribeLive(`/coasters/${coaster.id}/events`, () => invalidate(`coaster:${coaster.id}`))
	);

	// Klick var som helst på pappen (inte på knappar/länkar/fält) → första tomma hålet
	function focusFirstEmpty(e: MouseEvent) {
		if (!myRow || myRow.signedAt) return;
		const t = e.target as HTMLElement;
		if (t.closest('input, button, a, form, select, textarea')) return;
		const inputs = [...document.querySelectorAll<HTMLInputElement>('input[data-score-input]')];
		const target = inputs.find((i) => i.value === '') ?? inputs[0];
		target?.focus();
	}

	// Vinnare när alla (minst två) signerat: lägst netto. Delad seger möjlig.
	let finished = $derived(players.length >= 2 && players.every((p) => p.signedAt));
	let winners = $derived.by(() => {
		if (!finished) return [];
		const nets = players.filter((p) => p.net !== null);
		if (!nets.length) return [];
		const best = Math.min(...nets.map((p) => p.net as number));
		return nets.filter((p) => p.net === best);
	});

	const rowTotal = (scores: (number | null)[]) => grossTotal(scores, coaster.par);
	// Tomma hål vid signering räknas som x (dubbelt par)
	let emptyCount = $derived(myScores.filter((s) => s === null).length);

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

<!-- ====== Papp-coastern ====== -->
<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
<div
	onclick={focusFirstEmpty}
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
										name={`s${i}`}
										use:scoreInput
										value={fmtScore(s)}
										oninput={(e) => onScoreInput(i, e)}
										onblur={flushSoon}
										class="h-11 w-full min-w-6 border-0 bg-transparent p-0 text-center font-hand text-lg text-ink sm:text-xl [appearance:textfield] focus:ring-1 focus:ring-print/50 [&::-webkit-inner-spin-button]:appearance-none"
									/>
								{:else}
									<span class="font-hand text-xl text-ink">{fmtScore(s)}</span>
								{/if}
							</td>
						{/each}
						<td class="border-l border-print/60 px-0 text-center sm:px-1">
							<span class="font-hand text-lg font-bold text-ink sm:text-xl"
								>{rowTotal(mine ? myScores : p.scores) ?? ''}</span
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
	<div class="mx-auto mt-6 flex max-w-2xl flex-wrap items-center gap-3">
		<form
			method="POST"
			action="?/sign"
			use:enhance={async ({ cancel }) => {
				// Se till att sista inmatningen är sparad innan signering
				await autosave.flush();
				if (saveState === 'error') return cancel();
				if (
					emptyCount > 0 &&
					!confirm(
						`${emptyCount} hål är tomma och räknas som x (dubbelt par) när du signerar. Signera ändå?`
					)
				)
					cancel();
			}}
		>
			<button
				class="rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-club-900 hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-50"
				disabled={myScores.length < 9 ||
					myScores.every((s) => s === null) ||
					players.length < data.minPlayers ||
					saveState === 'saving'}
				title={players.length < data.minPlayers
					? 'Man kan inte spela ensam — lägg till minst en medspelare först'
					: myScores.every((s) => s === null)
						? 'Fyll i minst ett hål först'
						: emptyCount > 0
							? `${emptyCount} tomma hål räknas som x`
							: ''}>Signera rundan</button
			>
		</form>
		<span class="text-xs text-club-900/60" aria-live="polite">
			{#if saveState === 'saving'}Sparar…{:else if saveState === 'saved'}Sparat ✓{:else if saveState === 'error'}<span
					class="text-red-700">{saveMsg}</span
				>{:else}Poängen sparas automatiskt. 0 eller bokstav = x (dubbelt par).{/if}
		</span>
	</div>
{/if}

<div class="mx-auto mt-4 max-w-2xl">
	<a href="/coasters" class="text-sm text-club-900/60 hover:underline">← Alla coasters</a>
</div>
