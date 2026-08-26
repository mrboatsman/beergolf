<script lang="ts">
	import { enhance } from '$app/forms';
	import { scoreInput } from '$lib/score-input';
	let { data, form } = $props();

	let t = $derived(data.tournament);
	let rows = $derived(data.rows);

	function rowTotal(scores: (number | null)[]) {
		const filled = scores.filter((s): s is number => s !== null);
		return filled.length ? filled.reduce((a, b) => a + b, 0) : null;
	}
</script>

<svelte:head>
	<title>Din score — {t.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<a href={`/t/${t.slug}`} class="text-sm text-club-900/60 hover:text-club-900"
	>← Till turneringssidan</a
>

<p class="mt-2 text-xs font-semibold tracking-[0.2em] text-gold-600 uppercase">
	Gästspelare · {t.name}
</p>
<h1 class="font-display mt-1 text-4xl font-semibold">Hej {data.participant.name}!</h1>
<p class="mt-1 text-sm text-club-900/60">
	Ditt spelhandikapp: {data.participant.playingHcp}. Den här sidan är personlig — spara länken.
</p>

{#if form?.error}
	<p class="mt-4 rounded bg-red-100 px-3 py-2 text-sm text-red-700">{form.error}</p>
{/if}
{#if form?.saved}
	<p class="mt-4 rounded bg-club-100 px-3 py-2 text-sm text-club-700">Poäng sparade.</p>
{/if}
{#if form?.signed}
	<p class="mt-4 rounded bg-gold-400/20 px-3 py-2 text-sm text-gold-600">
		Signerat! Ditt resultat räknas nu på leaderboarden. 🍻
	</p>
{/if}

{#if data.participant.status === 'pending'}
	<section class="mt-6 rounded-2xl bg-parchment p-6 shadow-sm">
		<h2 class="font-display text-2xl font-semibold">Betalning behandlas…</h2>
		<p class="mt-2 text-sm text-club-900/60">
			Din betalning är inte bekräftad än. Ladda om sidan om en stund — eller anmäl dig igen från
			turneringssidan om du avbröt betalningen.
		</p>
	</section>
{:else if data.participant.status === 'refunded'}
	<section class="mt-6 rounded-2xl bg-parchment p-6 shadow-sm">
		<p class="text-sm text-club-900/60">Din anmälan är återbetald.</p>
	</section>
{:else if rows.length === 0}
	<section class="mt-6 rounded-2xl bg-parchment p-6 shadow-sm">
		<h2 class="font-display text-2xl font-semibold">✅ Du är anmäld!</h2>
		<p class="mt-2 text-sm text-club-900/60">
			{#if t.format === 'match'}
				När din match lottats och matchcoastern skapats fyller du i din score här.
			{:else}
				På plats: be någon av medlemmarna lägga till dig på en Score Coaster — sen fyller du i din
				score här.
			{/if}
		</p>
	</section>
{:else}
	{#each rows as row (row.id)}
		{@const parTotal = row.par.reduce((a, b) => a + b, 0)}
		<section class="mt-6 rounded-2xl bg-parchment p-6 shadow-sm">
			<h2 class="font-display text-2xl font-semibold">
				{row.coasterName ?? 'Score Coaster'} — din rad
			</h2>
			{#if row.signedAt}
				<p class="mt-2 text-sm">
					Signerad ✓ — brutto {rowTotal(row.scores)}. Kolla
					<a href={`/t/${t.slug}`} class="text-gold-600 underline">turneringssidan</a>.
				</p>
			{/if}
			<form method="POST" action="?/saveScores" use:enhance class="mt-4">
				<input type="hidden" name="rowId" value={row.id} />
				<div class="overflow-x-auto">
					<table class="w-full border-collapse text-sm">
						<thead>
							<tr class="border-b border-club-900/30">
								<th class="py-1 pr-2 text-left">Hål</th>
								{#each row.par as _, i (i)}
									<th class="w-10 px-1 py-1 text-center">{i + 1}</th>
								{/each}
								<th class="w-14 px-1 py-1 text-center">Tot</th>
							</tr>
						</thead>
						<tbody>
							<tr class="border-b border-club-900/20 text-club-900/60">
								<td class="py-1 pr-2">Par</td>
								{#each row.par as p, i (i)}
									<td class="px-1 py-1 text-center">{p}</td>
								{/each}
								<td class="px-1 py-1 text-center">{parTotal}</td>
							</tr>
							<tr>
								<td class="py-1 pr-2 font-semibold">Du</td>
								{#each row.scores as s, i (i)}
									<td class="p-0.5 text-center">
										{#if row.signedAt}
											<span class="font-semibold">{s ?? ''}</span>
										{:else}
											<input
												name={`s${i}`}
												use:scoreInput
												value={s ?? ''}
												class="h-10 w-full min-w-8 rounded border-cream-300 bg-white/70 p-0 text-center [appearance:textfield] focus:border-gold-400 focus:ring-gold-400 [&::-webkit-inner-spin-button]:appearance-none"
											/>
										{/if}
									</td>
								{/each}
								<td class="px-1 text-center font-bold">{rowTotal(row.scores) ?? ''}</td>
							</tr>
						</tbody>
					</table>
				</div>
				{#if !row.signedAt}
					<div class="mt-4 flex gap-2">
						<button
							class="rounded-lg bg-club-800 px-4 py-2 text-sm font-semibold text-cream-200 hover:bg-club-700"
							>Spara poäng</button
						>
					</div>
				{/if}
			</form>
			{#if !row.signedAt}
				<form method="POST" action="?/sign" use:enhance class="mt-2">
					<input type="hidden" name="rowId" value={row.id} />
					<button
						class="rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-club-900 hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-50"
						disabled={row.scores.some((s) => s === null) || row.playerCount < data.minPlayers}
						title={row.playerCount < data.minPlayers
							? 'Man kan inte spela ensam — coastern behöver minst en medspelare'
							: row.scores.some((s) => s === null)
								? 'Fyll i alla nio hål först'
								: ''}>Signera rundan</button
					>
				</form>
				<p class="mt-2 text-xs text-club-900/50">
					Signaturen låser raden och räknar in resultatet. Som gäst påverkas inget klubbhandikapp.
				</p>
			{/if}
		</section>
	{/each}
{/if}
