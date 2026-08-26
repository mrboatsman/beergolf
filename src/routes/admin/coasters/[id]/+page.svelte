<script lang="ts">
	import { enhance } from '$app/forms';
	let { data, form } = $props();

	let coaster = $derived(data.coaster);
	let parTotal = $derived(coaster.par.reduce((a, b) => a + b, 0));
	const fmt = (d: Date) => new Date(d).toLocaleString('sv-SE');
	const total = (s: (number | null)[]) => s.reduce<number>((a, b) => a + (b ?? 0), 0);
</script>

<svelte:head><title>Redigera coaster — Admin</title></svelte:head>

<a href="/admin/coasters" class="text-sm text-club-900/60 hover:underline">← Alla coasters</a>
<div class="mt-2 flex flex-wrap items-end justify-between gap-3">
	<div>
		<h1 class="font-display text-3xl font-semibold text-club-900">
			{coaster.name || 'Namnlös coaster'}
		</h1>
		<p class="text-sm text-club-900/60">
			Skapad {fmt(coaster.createdAt)} · par {coaster.par.join('-')} = {parTotal}
			{#if data.tournament}
				· 🏆 {data.tournament.name} ({data.tournament.format === 'match'
					? 'matchspel'
					: 'slagspel'})
			{/if}
		</p>
	</div>
	<a href="/coasters/{coaster.id}" class="text-sm text-club-900/60 hover:underline"
		>Visa som spelare →</a
	>
</div>

{#if form?.error}
	<p class="mt-4 rounded bg-red-100 px-3 py-2 text-sm text-red-800">{form.error}</p>
{/if}
{#if form?.saved}
	<p class="mt-4 rounded bg-club-100 px-3 py-2 text-sm text-club-700">
		Poäng rättade. Berörd medlems HCP-kedja har räknats om.
	</p>
{/if}
{#if form?.unsigned}
	<p class="mt-4 rounded bg-club-100 px-3 py-2 text-sm text-club-700">
		Signatur hävd — raden är öppen igen, rundan borttagen och HCP omräknat.
	</p>
{/if}
{#if form?.removed}
	<p class="mt-4 rounded bg-club-100 px-3 py-2 text-sm text-club-700">
		Spelaren borttagen från coastern.
	</p>
{/if}
{#if form?.renamed}
	<p class="mt-4 rounded bg-club-100 px-3 py-2 text-sm text-club-700">Namn sparat.</p>
{/if}

<div
	class="mt-6 rounded-lg border border-gold-400/50 bg-gold-500/10 px-3 py-2 text-xs text-club-900/80"
>
	Adminrättning: ändringar på signerade medlemsrader uppdaterar rundan och spelar om medlemmens hela
	HCP-kedja från ingångshandikappet. Gästrader påverkar aldrig HCP.
	{#if data.tournament?.format === 'match'}
		Matchresultatet avgörs inte om automatiskt — sätt vinnare manuellt på turneringssidan vid behov.
	{/if}
</div>

<section class="mt-6 rounded-2xl bg-parchment p-5 shadow-sm">
	<h2 class="font-semibold text-club-900">Namn</h2>
	<form method="POST" action="?/rename" use:enhance class="mt-2 flex gap-2">
		<input
			name="name"
			value={coaster.name ?? ''}
			maxlength="80"
			placeholder="Namnlös coaster"
			class="w-72 rounded-lg border-cream-300 bg-white text-sm"
		/>
		<button
			class="rounded-lg bg-club-700 px-3 py-2 text-sm font-semibold text-cream-200 hover:bg-club-800"
			>Spara</button
		>
	</form>
</section>

<section class="mt-6">
	<h2 class="font-semibold text-club-900">Spelare ({data.rows.length})</h2>
	<div class="mt-3 space-y-4">
		{#each data.rows as row (row.id)}
			<div class="rounded-2xl bg-parchment p-5 shadow-sm">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<div>
						<span class="font-semibold text-club-900">{row.position}. {row.name}</span>
						{#if row.isGuest}<span class="ml-2 rounded bg-cream-300 px-1.5 py-0.5 text-xs"
								>gäst</span
							>{/if}
						{#if row.signedAt}
							<span class="ml-2 rounded bg-club-800 px-1.5 py-0.5 text-xs text-cream-200"
								>Signerad {fmt(row.signedAt)}</span
							>
						{:else}
							<span class="ml-2 rounded bg-cream-300 px-1.5 py-0.5 text-xs">ej signerad</span>
						{/if}
					</div>
					<div class="text-xs text-club-900/60">
						{#if row.roundId && row.hcpBefore != null}
							Runda: HCP {row.hcpBefore} → {row.hcpAfter}
						{/if}
						{#if !row.isGuest && row.memberHcp != null}
							· Nuvarande HCP {row.memberHcp}
						{/if}
					</div>
				</div>

				<form method="POST" action="?/setScores" use:enhance class="mt-3">
					<input type="hidden" name="rowId" value={row.id} />
					<div class="flex flex-wrap items-end gap-1.5">
						{#each coaster.par as par, i (i)}
							<label class="flex flex-col items-center text-xs text-club-900/60">
								<span>H{i + 1} <span class="text-club-900/40">p{par}</span></span>
								<input
									name="s{i}"
									type="number"
									min="1"
									max="30"
									inputmode="numeric"
									value={row.scores[i] ?? ''}
									class="w-12 rounded border-cream-300 bg-white text-center text-sm"
								/>
							</label>
						{/each}
						<span class="ml-2 pb-2 text-sm text-club-900/70">= {total(row.scores)}</span>
						<button
							class="ml-auto rounded-lg bg-club-700 px-3 py-2 text-sm font-semibold text-cream-200 hover:bg-club-800"
							>Spara poäng</button
						>
					</div>
				</form>

				<div class="mt-3 flex flex-wrap gap-2">
					{#if row.signedAt}
						<form
							method="POST"
							action="?/unsign"
							use:enhance={({ cancel }) => {
								if (!confirm(`Häva ${row.name}s signatur? Rundan tas bort och HCP räknas om.`))
									cancel();
							}}
						>
							<input type="hidden" name="rowId" value={row.id} />
							<button
								class="rounded-lg border border-club-700 px-3 py-1.5 text-xs font-semibold text-club-800 hover:bg-club-100"
								>Häv signatur</button
							>
						</form>
					{/if}
					<form
						method="POST"
						action="?/removeRow"
						use:enhance={({ cancel }) => {
							if (
								!confirm(
									`Ta bort ${row.name} från coastern?${row.roundId ? ' Rundan tas bort och HCP räknas om.' : ''}`
								)
							)
								cancel();
						}}
					>
						<input type="hidden" name="rowId" value={row.id} />
						<button
							class="rounded-lg border border-red-700 px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-50"
							>Ta bort spelare</button
						>
					</form>
				</div>
			</div>
		{:else}
			<p class="text-sm text-club-900/50">Inga spelare på coastern.</p>
		{/each}
	</div>
</section>

<section class="mt-8 rounded-2xl border border-red-300 bg-red-50 p-5">
	<h2 class="font-semibold text-red-900">Ta bort coastern</h2>
	<p class="mt-1 text-sm text-red-900/80">
		Raderar coastern, alla spelarrader och deras rundor. Berörda medlemmars HCP räknas om. Går inte
		att ångra.
	</p>
	<form
		method="POST"
		action="?/deleteCoaster"
		use:enhance={({ cancel }) => {
			if (!confirm('Ta bort hela coastern med alla rader och rundor? Detta går inte att ångra.'))
				cancel();
		}}
		class="mt-3"
	>
		<button
			class="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
			>Ta bort coastern</button
		>
	</form>
</section>
