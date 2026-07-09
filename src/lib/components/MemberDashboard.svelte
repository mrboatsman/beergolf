<script lang="ts">
	import HcpTrend from './HcpTrend.svelte';
	import type { Dashboard } from '$lib/server/dashboard';

	let { dashboard, isSelf = false }: { dashboard: Dashboard; isSelf?: boolean } = $props();

	let d = $derived(dashboard);

	let greeting = $derived.by(() => {
		if (!isSelf) return d.member.name;
		const h = new Date().getHours();
		const g = h < 10 ? 'God morgon' : h < 18 ? 'God eftermiddag' : 'God kväll';
		return `${g}, ${d.member.name.split(' ')[0]}`;
	});

	let ongoing = $derived(d.matches.filter((m) => !m.finished));
	let finished = $derived(d.matches.filter((m) => m.finished));

	function fmtDate(dt: Date | string) {
		return new Date(dt).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
	}
	function toPar(n: number) {
		return n > 0 ? `+${n}` : n === 0 ? '±0' : `${n}`;
	}
</script>

<!-- Rubrikrad -->
<div class="flex flex-wrap items-end justify-between gap-2">
	<div>
		<p class="text-xs font-semibold tracking-[0.2em] text-gold-600 uppercase">
			{isSelf ? "Members' lounge" : 'Medlemsprofil'}
		</p>
		<h1 class="font-display mt-1 text-4xl font-semibold sm:text-5xl">{greeting}</h1>
	</div>
	<div class="text-right text-sm text-club-900/60">
		<div>Säsong {d.seasonYear}</div>
		{#if d.member.memberNumber}<div>Grönt Kort nr {d.member.memberNumber}</div>{/if}
	</div>
</div>

<!-- Hero: HCP + statkort -->
<div class="mt-6 grid gap-4 lg:grid-cols-[3fr_2fr]">
	<div class="rounded-2xl bg-club-800 p-6 text-cream-200 shadow-md sm:p-7">
		<div class="flex items-start justify-between">
			<span class="text-xs font-semibold tracking-[0.2em] text-gold-400 uppercase"> Handicap </span>
			<span class="text-xs tracking-widest text-cream-200/50 uppercase">Beer Golf · Heder</span>
		</div>
		<div class="mt-2 flex items-center gap-4">
			<span class="font-display text-7xl leading-none font-semibold">{d.member.hcp}</span>
			{#if d.stats.roundsSeason > 0 && d.stats.hcpChange !== 0}
				<span
					class="rounded-full bg-club-950/60 px-3 py-1 text-sm font-semibold {d.stats.hcpChange < 0
						? 'text-gold-300'
						: 'text-cream-200/70'}"
				>
					{d.stats.hcpChange < 0 ? '▾' : '▴'}
					{Math.abs(d.stats.hcpChange)} denna säsong
				</span>
			{/if}
		</div>
		<div class="mt-5 border-t border-cream-200/15 pt-3 text-sm text-cream-200/70">
			{#if d.stats.lowestHcp !== null}
				Lägst i år <strong class="text-cream-200">{d.stats.lowestHcp}</strong>
				· {d.stats.roundsSeason}
				{d.stats.roundsSeason === 1 ? 'runda' : 'rundor'} spelade
			{:else}
				Ingångshandicap — inga rundor spelade i år
			{/if}
		</div>
	</div>

	<div class="grid gap-4">
		<div class="flex items-center justify-between rounded-2xl bg-parchment px-6 py-4 shadow-sm">
			<span class="text-xs font-semibold tracking-[0.18em] text-club-900/60 uppercase"
				>Rundor denna säsong</span
			>
			<span class="font-display text-4xl font-semibold">{d.stats.roundsSeason}</span>
		</div>
		<div class="flex items-center justify-between rounded-2xl bg-parchment px-6 py-4 shadow-sm">
			<span class="text-xs font-semibold tracking-[0.18em] text-club-900/60 uppercase"
				>Bästa brutto</span
			>
			<span class="font-display text-4xl font-semibold">{d.stats.bestGross ?? '—'}</span>
		</div>
		<div class="flex items-center justify-between rounded-2xl bg-parchment px-6 py-4 shadow-sm">
			<span class="text-xs font-semibold tracking-[0.18em] text-club-900/60 uppercase"
				>Snitt mot par</span
			>
			<span class="font-display text-4xl font-semibold"
				>{d.stats.avgToPar !== null ? toPar(d.stats.avgToPar) : '—'}</span
			>
		</div>
	</div>
</div>

<!-- Handicap-trend -->
<div class="mt-6 rounded-2xl bg-parchment p-6 shadow-sm">
	<div class="flex items-baseline justify-between">
		<h2 class="font-display text-2xl font-semibold">Handicap-trend</h2>
		<span class="text-xs text-club-900/50">Senaste {Math.min(d.trend.length, 12)} rundorna</span>
	</div>
	{#if d.trend.length >= 2}
		<div class="mt-4 text-club-900">
			<HcpTrend points={d.trend} />
		</div>
	{:else}
		<p class="mt-4 text-sm text-club-900/60">Trend visas efter minst två signerade rundor.</p>
	{/if}
</div>

<!-- Matcher -->
<div class="mt-8">
	<div class="flex items-baseline justify-between">
		<h2 class="font-display text-2xl font-semibold">Matcher</h2>
		<a
			href="/coasters"
			class="text-xs font-semibold tracking-widest text-gold-600 uppercase hover:underline"
			>Alla coasters</a
		>
	</div>
	{#if d.matches.length === 0}
		<p class="mt-3 text-sm text-club-900/60">
			Inga matcher än{#if isSelf}
				— <a class="underline" href="/coasters">skapa en Score Coaster</a>{/if}.
		</p>
	{:else}
		<div class="mt-3 grid gap-4 md:grid-cols-2">
			<div>
				<h3 class="text-xs font-semibold tracking-[0.18em] text-club-900/60 uppercase">
					Pågående ({ongoing.length})
				</h3>
				<ul class="mt-2 space-y-2">
					{#each ongoing as m (m.id)}
						<li>
							<a
								href={`/coasters/${m.id}`}
								class="flex items-center justify-between rounded-xl bg-parchment px-4 py-3 shadow-sm hover:shadow"
							>
								<div>
									<div class="font-semibold">{m.name ?? 'Score Coaster'}</div>
									<div class="text-xs text-club-900/60">
										{fmtDate(m.createdAt)} · {m.playerCount} spelare · {m.signedCount} signerade
									</div>
								</div>
								<span
									class="rounded-full bg-gold-400/20 px-2.5 py-0.5 text-xs font-semibold text-gold-600"
									>Pågående</span
								>
							</a>
						</li>
					{:else}
						<li class="text-sm text-club-900/50">Inga pågående.</li>
					{/each}
				</ul>
			</div>
			<div>
				<h3 class="text-xs font-semibold tracking-[0.18em] text-club-900/60 uppercase">
					Avslutade ({finished.length})
				</h3>
				<ul class="mt-2 space-y-2">
					{#each finished as m (m.id)}
						<li>
							<a
								href={`/coasters/${m.id}`}
								class="flex items-center justify-between rounded-xl bg-parchment px-4 py-3 shadow-sm hover:shadow"
							>
								<div>
									<div class="font-semibold">{m.name ?? 'Score Coaster'}</div>
									<div class="text-xs text-club-900/60">
										{fmtDate(m.createdAt)} · {m.playerCount} spelare
										{#if m.myGross !== null}· brutto {m.myGross}{/if}
									</div>
								</div>
								<span
									class="rounded-full bg-club-700/10 px-2.5 py-0.5 text-xs font-semibold text-club-700"
									>Avslutad</span
								>
							</a>
						</li>
					{:else}
						<li class="text-sm text-club-900/50">Inga avslutade.</li>
					{/each}
				</ul>
			</div>
		</div>
	{/if}
</div>

<!-- Teoriprov: status + försökshistorik (misslyckanden visas öppet) -->
<div class="mt-8">
	<h2 class="font-display text-2xl font-semibold">Teoriprov</h2>
	<div class="mt-3 rounded-2xl bg-parchment p-5 shadow-sm">
		{#if d.theory.passed}
			<p class="text-sm text-club-700">
				<span class="font-semibold">✓ Godkänt</span>
				{#if d.theory.autoPassed}
					<span
						class="ml-1 rounded-full bg-gold-400/25 px-2.5 py-0.5 text-xs font-semibold text-gold-600"
						>Autorättat på heder</span
					>
				{/if}
				{#if d.theory.at}<span class="text-club-900/60"> · {fmtDate(d.theory.at)}</span>{/if}
			</p>
		{:else}
			<p class="text-sm text-club-900/60">Teoriprovet är inte godkänt ännu.</p>
		{/if}
		{#if d.theory.attempts.length > 0}
			<ul class="mt-3 space-y-1 border-t border-cream-300 pt-3 text-sm">
				{#each d.theory.attempts as a (a.id)}
					<li class="flex items-center justify-between">
						<span class="text-club-900/60">{fmtDate(a.takenAt)}</span>
						<span class="font-semibold">{Math.round(a.score * 100)} %</span>
						{#if a.passed}
							<span class="font-semibold text-club-700">Godkänt</span>
						{:else}
							<span class="text-red-700/70">Underkänt</span>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>

<!-- Senaste rundor -->
<div class="mt-8">
	<div class="flex items-baseline justify-between">
		<h2 class="font-display text-2xl font-semibold">Senaste rundor</h2>
		{#if isSelf}
			<a
				href="/rounds"
				class="text-xs font-semibold tracking-widest text-gold-600 uppercase hover:underline"
				>Visa alla</a
			>
		{/if}
	</div>
	{#if d.recent.length === 0}
		<p class="mt-3 text-sm text-club-900/60">Inga signerade rundor än.</p>
	{:else}
		<div class="mt-3 divide-y divide-cream-300 overflow-hidden rounded-2xl bg-parchment shadow-sm">
			{#each d.recent as r (r.id)}
				<div class="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
					<div>
						<div class="font-semibold">
							{#if r.coasterId}
								<a class="hover:underline" href={`/coasters/${r.coasterId}`}
									>{r.coasterName ?? 'Score Coaster'}</a
								>
							{:else}
								Score Coaster
							{/if}
						</div>
						<div class="text-xs text-club-900/60">{fmtDate(r.playedAt)} · {r.holes} hål</div>
					</div>
					<div class="flex items-center gap-6 text-sm">
						<span>Brutto <strong class="text-base">{r.grossTotal}</strong></span>
						<span>Netto <strong class="text-base">{r.netTotal}</strong></span>
						<span class="w-10 text-right font-semibold">{toPar(r.toPar)}</span>
						{#if r.id === d.bestNetRoundId}
							<span
								class="rounded-full bg-gold-400/25 px-2.5 py-0.5 text-xs font-semibold text-gold-600"
								>Bästa netto</span
							>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
