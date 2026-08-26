<script lang="ts">
	import { enhance } from '$app/forms';
	import CoasterRules from '$lib/components/CoasterRules.svelte';
	import CoasterBack from '$lib/components/CoasterBack.svelte';
	import CoasterPaper, { type PaperPlayer } from '$lib/components/CoasterPaper.svelte';
	import type { HoleScore } from '$lib/scoring';
	import CoasterBackToolbar from '$lib/components/CoasterBackToolbar.svelte';
	import { BackEditor } from '$lib/back-editor.svelte';
	import { scoreInput } from '$lib/score-input';
	import { fmtScore, parseScore } from '$lib/scoring';
	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { createAutosave, subscribeLive, type SaveState } from '$lib/live-coaster';
	let { data, form } = $props();

	let coaster = $derived(data.coaster);
	let players = $derived(data.players);
	let myRow = $derived(players.find((p) => p.memberId === data.meId));
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

	// Påskägg: färdigspelad coaster flippas vid klick → baksida med foto/ritning
	let flipped = $state(false);
	const editor = new BackEditor();

	// Klick på pappen (inte på knappar/länkar/fält): färdig ⇒ vänd, annars ⇒ första tomma hålet
	function focusFirstEmpty(e: MouseEvent) {
		const t = e.target as HTMLElement;
		if (t.closest('input, button, a, form, select, textarea, canvas, [data-no-flip]')) return;
		if (finished) {
			flipped = !flipped;
			return;
		}
		if (!myRow || myRow.signedAt) return;
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

	// Tomma hål vid signering räknas som x (dubbelt par)
	let emptyCount = $derived(myScores.filter((s) => s === null).length);
</script>

{#if !finished}
	<div class="mx-auto mb-4 max-w-2xl">
		<CoasterRules />
	</div>
{/if}

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
{#if !finished && players.length < data.maxPlayers && data.addable.length > 0}
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

{#snippet scoreCell(p: PaperPlayer, i: number, s: HoleScore)}
	<input
		name={`s${i}`}
		use:scoreInput
		value={fmtScore(s)}
		oninput={(e) => onScoreInput(i, e)}
		onblur={flushSoon}
		class="h-11 w-full min-w-6 border-0 bg-transparent p-0 text-center font-hand text-lg text-ink sm:text-xl [appearance:textfield] focus:ring-1 focus:ring-print/50 [&::-webkit-inner-spin-button]:appearance-none"
	/>
{/snippet}
{#snippet removeButton(p: PaperPlayer)}
	<form method="POST" action="?/removePlayer" use:enhance class="inline">
		<input type="hidden" name="rowId" value={p.id} />
		<button
			class="ml-1 align-middle text-xs text-print/50 hover:text-red-700"
			title={`Ta bort ${p.name} från coastern`}
			aria-label={`Ta bort ${p.name}`}>✕</button
		>
	</form>
{/snippet}

<!-- ====== Papp-coastern ====== -->
{#if finished}
	<p class="mx-auto mb-2 max-w-2xl text-center text-xs text-club-900/50">
		Rundan är klar — tryck på coastern för att vända på den.
	</p>
{/if}
<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
<div
	onclick={focusFirstEmpty}
	class="mx-auto max-w-2xl [perspective:1800px] {finished ? 'cursor-pointer' : ''}"
>
	<div
		class="relative transition-transform duration-700 [transform-style:preserve-3d] {flipped
			? '[transform:rotateY(180deg)]'
			: ''}"
	>
		<!-- Framsida -->
		<CoasterPaper
			{coaster}
			{players}
			{winners}
			maxPlayers={data.maxPlayers}
			editableId={myRow && !myRow.signedAt ? myRow.id : null}
			liveScores={myScores}
			cell={scoreCell}
			remove={amInvolved ? removeButton : undefined}
			class="-rotate-[0.6deg] [backface-visibility:hidden]"
		/>
		{#if finished}
			<!-- Baksida (roterad 180°, visas när kortet vänts) -->
			<div
				class="absolute inset-0 -rotate-[0.6deg] overflow-hidden rounded-[28px] border border-black/5 bg-card font-coaster text-print shadow-[0_10px_30px_-8px_rgba(60,50,30,0.35),0_2px_6px_rgba(60,50,30,0.15)] [backface-visibility:hidden] [transform:rotateY(180deg)]"
			>
				{#if flipped}
					<CoasterBack
						coasterId={coaster.id}
						drawingKey={coaster.backDrawingKey}
						images={data.backImages}
						canEdit={!!myRow}
						{editor}
					/>
				{/if}
			</div>
		{/if}
	</div>
</div>

{#if finished && flipped}
	<CoasterBackToolbar {editor} canEdit={!!myRow} onflip={() => (flipped = false)} />
{/if}

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
