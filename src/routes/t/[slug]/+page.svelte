<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatKr } from '$lib/money';
	import TournamentReport from '$lib/components/TournamentReport.svelte';
	import MatchBracket from '$lib/components/MatchBracket.svelte';
	let { data, form } = $props();

	let t = $derived(data.tournament);
	let lb = $derived(data.leaderboard);
	let scoreTab: 'net' | 'gross' = $state('net');

	function fmtDate(d: Date | string | null) {
		return d ? new Date(d).toLocaleDateString('sv-SE') : null;
	}
</script>

<svelte:head>
	<title>{t.name} — Tablers Beer Golf Society</title>
	<meta
		name="description"
		content={`Beer Golf-turnering till förmån för ${t.charityName ?? 'välgörenhet'}.`}
	/>
</svelte:head>

<p class="text-xs font-semibold tracking-[0.2em] text-gold-600 uppercase">
	Välgörenhetsturnering · {fmtDate(t.startsAt) ?? 'datum meddelas'}
</p>
<h1 class="font-display mt-1 text-4xl font-semibold">{t.name}</h1>
{#if t.description}
	<p class="mt-3 max-w-2xl text-sm">{t.description}</p>
{/if}

{#if form?.error}
	<p class="mt-4 rounded bg-red-100 px-3 py-2 text-sm text-red-700">{form.error}</p>
{/if}

{#if t.charityName}
	<section class="mt-6 rounded-2xl bg-club-800 p-6 text-cream-200 shadow-md">
		<p class="text-xs font-semibold tracking-[0.2em] text-gold-400 uppercase">Till förmån för</p>
		<h2 class="font-display mt-1 text-3xl font-semibold">{t.charityName}</h2>
		{#if t.charityDescription}
			<p class="mt-2 max-w-2xl text-sm text-cream-200/80">{t.charityDescription}</p>
		{/if}
		{#if t.charityUrl}
			<a
				href={t.charityUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="mt-2 inline-block text-sm text-gold-400 underline hover:text-gold-300"
				>Läs mer om {t.charityName} →</a
			>
		{/if}
		{#if t.prizeMode !== 'none' && t.prizes.length}
			<p class="mt-3 text-sm text-cream-200/70">
				Priser: {t.prizes
					.map((p) =>
						t.prizeMode === 'fixed'
							? `plats ${p.place} — ${formatKr(p.amountOre ?? 0)}`
							: `plats ${p.place} — ${p.percent} % av potten`
					)
					.join(' · ')}. Resten går till välgörenheten.
			</p>
		{:else}
			<p class="mt-3 text-sm text-cream-200/70">
				Inga pengapriser — hela behållningen går till välgörenheten.
			</p>
		{/if}
	</section>
{/if}

{#if t.status === 'open'}
	<section class="mt-6 rounded-2xl bg-parchment p-6 shadow-sm">
		<h2 class="font-display text-2xl font-semibold">Anmäl dig som gäst</h2>
		<p class="mt-1 text-sm text-club-900/60">
			Du behöver inte vara medlem.
			{#if t.entryFeeOre > 0}
				Anmälningsavgift {formatKr(t.entryFeeOre)} — betalas säkert via Stripe. Överskottet går till {t.charityName}.
			{:else}
				Anmälan är gratis.
			{/if}
		</p>
		<form
			method="POST"
			action="?/registerGuest"
			use:enhance
			class="mt-4 grid max-w-lg gap-3 sm:grid-cols-2"
		>
			<label class="block text-sm">
				<span class="text-xs font-semibold text-club-900/50 uppercase">Namn</span>
				<input
					name="name"
					required
					class="mt-1 w-full rounded-lg border-cream-300 bg-white/70 focus:border-gold-400 focus:ring-gold-400"
				/>
			</label>
			<label class="block text-sm">
				<span class="text-xs font-semibold text-club-900/50 uppercase">E-post</span>
				<input
					name="email"
					type="email"
					required
					class="mt-1 w-full rounded-lg border-cream-300 bg-white/70 focus:border-gold-400 focus:ring-gold-400"
				/>
			</label>
			<label class="block text-sm">
				<span class="text-xs font-semibold text-club-900/50 uppercase"
					>Beer Golf-HCP (valfritt)</span
				>
				<input
					name="hcp"
					inputmode="decimal"
					placeholder="36 om du är osäker"
					class="mt-1 w-full rounded-lg border-cream-300 bg-white/70 focus:border-gold-400 focus:ring-gold-400"
				/>
			</label>
			<div class="flex items-end">
				<button
					class="rounded-lg bg-gold-500 px-5 py-2 font-semibold text-club-900 hover:bg-gold-400"
				>
					{t.entryFeeOre > 0 ? `Anmäl & betala ${formatKr(t.entryFeeOre)}` : 'Anmäl dig'}
				</button>
			</div>
		</form>
		<p class="mt-2 text-xs text-club-900/50">
			Efter anmälan får du en personlig länk där du fyller i din score — spara den! Ditt handikapp
			är självdeklarerat, i klubbens hedersanda.
		</p>
	</section>
{/if}

{#if data.report}
	<section class="mt-8">
		<h2 class="font-display text-2xl font-semibold">Transparensrapport</h2>
		<p class="mt-1 text-sm text-club-900/60">Varje krona redovisas öppet — det är hela poängen.</p>
		<TournamentReport report={data.report} charityName={t.charityName} />
	</section>
{/if}

{#if data.bracket}
	<section class="mt-8">
		<h2 class="font-display text-2xl font-semibold">Cupstege</h2>
		<div class="mt-3">
			<MatchBracket bracket={data.bracket} />
		</div>
	</section>
{/if}

{#if lb && (lb.entries.length || lb.unfinished.length)}
	<section class="mt-8">
		<div class="flex items-center justify-between">
			<h2 class="font-display text-2xl font-semibold">Leaderboard</h2>
			<div class="flex gap-1 rounded-full bg-club-700/10 p-1 text-xs font-semibold">
				<button
					class={`rounded-full px-3 py-1 ${scoreTab === 'net' ? 'bg-club-800 text-cream-200' : 'text-club-700'}`}
					onclick={() => (scoreTab = 'net')}>Netto</button
				>
				<button
					class={`rounded-full px-3 py-1 ${scoreTab === 'gross' ? 'bg-club-800 text-cream-200' : 'text-club-700'}`}
					onclick={() => (scoreTab = 'gross')}>Brutto</button
				>
			</div>
		</div>
		<div class="mt-3 overflow-x-auto rounded-2xl bg-parchment shadow-sm">
			<table class="w-full text-sm">
				<thead class="bg-club-800 text-cream-200">
					<tr>
						<th class="px-4 py-2 text-left">Plac.</th>
						<th class="px-4 py-2 text-left">Spelare</th>
						<th class="px-4 py-2 text-right">HCP</th>
						<th class="px-4 py-2 text-right">Brutto</th>
						<th class="px-4 py-2 text-right">Netto</th>
					</tr>
				</thead>
				<tbody>
					{#each scoreTab === 'net' ? lb.entries : [...lb.entries].sort((a, b) => a.gross - b.gross) as e (e.participantId)}
						{@const rank = scoreTab === 'net' ? e.netRank : e.grossRank}
						<tr class="border-t border-cream-300">
							<td class="font-display px-4 py-2 text-lg font-semibold"
								>{rank}{rank === 1 ? ' 🏆' : ''}</td
							>
							<td class="px-4 py-2">
								{e.name}
								{#if e.isGuest}
									<span
										class="ml-1 rounded-full bg-club-700/10 px-2 py-0.5 text-xs font-semibold text-club-700"
										>gäst</span
									>
								{/if}
							</td>
							<td class="px-4 py-2 text-right">{e.playingHcp}</td>
							<td class="px-4 py-2 text-right">{e.gross}</td>
							<td class="font-display px-4 py-2 text-right text-lg font-semibold">{e.net}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		{#if lb.unfinished.length}
			<p class="mt-2 text-sm text-club-900/60">
				Ej färdigspelat: {lb.unfinished.map((u) => u.name).join(', ')}
			</p>
		{/if}
	</section>
{/if}

<section class="mt-8">
	<h2 class="font-display text-2xl font-semibold">Anmälda ({data.participants.length})</h2>
	{#if data.participants.length === 0}
		<p class="mt-2 text-sm text-club-900/60">Bli först att anmäla dig!</p>
	{:else}
		<ul class="mt-3 flex flex-wrap gap-2">
			{#each data.participants as p (p.id)}
				<li class="rounded-full bg-parchment px-3 py-1 text-sm shadow-sm">
					{p.name}{p.isGuest ? ' (gäst)' : ''}
				</li>
			{/each}
		</ul>
	{/if}
</section>
