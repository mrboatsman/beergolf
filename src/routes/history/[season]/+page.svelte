<script lang="ts">
	let { data } = $props();
	let s = $derived(data.stats);
	const names = (xs: { name: string; memberId: string }[]) => xs.map((x) => x.name).join(' & ');
</script>

<svelte:head><title>Säsongen {s.label} — Beer Golf</title></svelte:head>

<a href="/history" class="text-sm text-club-900/60 hover:underline">← Historik</a>
<p class="mt-2 text-xs font-semibold tracking-[0.2em] text-gold-600 uppercase">
	Arkiv · {data.range}
</p>
<h1 class="font-display mt-1 text-4xl font-semibold text-club-900">Säsongen {s.label}</h1>

<!-- Hyllning -->
<section class="mt-6 rounded-2xl bg-club-800 p-6 text-cream-200 shadow-md sm:p-8">
	{#if s.winners.length}
		<p class="text-xs font-semibold tracking-[0.2em] text-gold-400 uppercase">
			{s.winners.length > 1 ? 'Delad seger' : 'Säsongens vinnare'}
		</p>
		<h2 class="font-display mt-2 text-4xl font-semibold text-gold-300 sm:text-5xl">
			🏆 {names(s.winners)}
		</h2>
		<p class="mt-2 text-sm text-cream-200/70">
			Lägst handikapp när säsongen stängde: <strong class="text-cream-200"
				>{s.winners[0].hcpEnd}</strong
			>. Grattis — färre slag, fler skål.
		</p>
	{:else}
		<p class="text-sm text-cream-200/70">Inga rundor signerades under säsongen.</p>
	{/if}
	<div class="mt-5 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
		{#each [['Rundor', s.totals.rounds], ['Coasters', s.totals.coasters], ['Spelare', s.totals.players], ['Nya gröna kort', s.totals.newMembers]] as [label, value] (label)}
			<div class="rounded-xl bg-club-700/50 px-3 py-3">
				<div class="font-display text-3xl font-semibold text-gold-300">{value}</div>
				<div class="text-[11px] tracking-[0.15em] text-cream-200/60 uppercase">{label}</div>
			</div>
		{/each}
	</div>
</section>

<!-- Utmärkelser -->
<section class="mt-6 grid gap-3 sm:grid-cols-2">
	{#each [{ t: 'Bästa fadder', d: 'Flest aspiranter certifierade', xs: s.bestFadder, unit: 'st' }, { t: 'Flest matcher', d: 'Signerade rundor under säsongen', xs: s.mostRounds, unit: 'rundor' }, { t: 'Flest vinster', d: 'Lägst netto på färdigspelade coasters', xs: s.mostWins, unit: 'vinster' }, { t: 'Störst förbättring', d: 'Sänkt handikapp under säsongen', xs: s.mostImproved, unit: 'HCP' }] as card (card.t)}
		<div class="rounded-2xl bg-parchment p-5 shadow-sm">
			<h3 class="font-display text-xl font-semibold text-club-900">{card.t}</h3>
			<p class="text-xs text-club-900/60">{card.d}</p>
			{#if card.xs.length}
				<ul class="mt-2 space-y-1 text-sm">
					{#each card.xs as x (x.memberId)}
						<li class="flex justify-between">
							<a href="/members/{x.memberId}" class="font-semibold hover:underline">{x.name}</a>
							<span class="text-club-900/70">{x.value} {card.unit}</span>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="mt-2 text-sm text-club-900/40">—</p>
			{/if}
		</div>
	{/each}
	<div class="rounded-2xl bg-parchment p-5 shadow-sm">
		<h3 class="font-display text-xl font-semibold text-club-900">Säsongens rundor</h3>
		<ul class="mt-2 space-y-1 text-sm">
			<li class="flex justify-between">
				<span>Bästa brutto</span><span class="text-club-900/70"
					>{#if s.bestGross}{s.bestGross.value} ·
						<a href="/members/{s.bestGross.memberId}" class="hover:underline">{s.bestGross.name}</a
						>{:else}—{/if}</span
				>
			</li>
			<li class="flex justify-between">
				<span>Lägsta netto</span><span class="text-club-900/70"
					>{#if s.bestNet}{s.bestNet.value} ·
						<a href="/members/{s.bestNet.memberId}" class="hover:underline">{s.bestNet.name}</a
						>{:else}—{/if}</span
				>
			</li>
			<li class="flex justify-between">
				<span>Nya konton</span><span class="text-club-900/70">{s.totals.newAccounts}</span>
			</li>
		</ul>
	</div>
	<div class="rounded-2xl bg-parchment p-5 shadow-sm">
		<h3 class="font-display text-xl font-semibold text-club-900">Nya gröna kort</h3>
		{#if s.newMembers.length}
			<ul class="mt-2 space-y-1 text-sm">
				{#each s.newMembers as m (m.memberId)}
					<li class="flex justify-between">
						<a href="/members/{m.memberId}" class="font-semibold hover:underline">{m.name}</a><span
							class="text-club-900/70">Nr {m.memberNumber ?? '–'}</span
						>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="mt-2 text-sm text-club-900/40">Inga nya kort denna säsong.</p>
		{/if}
	</div>
</section>

<!-- Slutställning -->
<section class="mt-8">
	<h2 class="font-display text-2xl font-semibold text-club-900">Slutställning</h2>
	<div class="mt-3 overflow-x-auto rounded-2xl bg-parchment shadow-sm">
		<table class="w-full text-left text-sm">
			<thead class="bg-club-800 text-cream-200">
				<tr>
					<th class="px-3 py-2.5 text-right">#</th>
					<th class="px-3 py-2.5">Medlem</th>
					<th class="px-3 py-2.5 text-right">HCP</th>
					<th class="hidden px-3 py-2.5 text-right sm:table-cell">Start</th>
					<th class="px-3 py-2.5 text-right">Rundor</th>
					<th class="hidden px-3 py-2.5 text-right sm:table-cell">Bästa brutto</th>
					<th class="hidden px-3 py-2.5 text-right sm:table-cell">Snitt netto</th>
					<th class="px-3 py-2.5 text-right">Vinster</th>
				</tr>
			</thead>
			<tbody>
				{#each s.standings as r (r.memberId)}
					<tr class="border-t border-cream-300">
						<td
							class="px-3 py-2 text-right font-display text-lg font-semibold {r.rank === 1
								? 'text-gold-500'
								: ''}"
							>{r.rank}{#if r.rank === 1}
								🏆{/if}</td
						>
						<td class="px-3 py-2"
							><a href="/members/{r.memberId}" class="font-semibold hover:underline">{r.name}</a
							></td
						>
						<td class="px-3 py-2 text-right font-display text-lg font-semibold text-club-700"
							>{r.hcpEnd}</td
						>
						<td class="hidden px-3 py-2 text-right text-club-900/60 sm:table-cell">{r.hcpStart}</td>
						<td class="px-3 py-2 text-right">{r.rounds}</td>
						<td class="hidden px-3 py-2 text-right sm:table-cell">{r.bestGross ?? '—'}</td>
						<td class="hidden px-3 py-2 text-right sm:table-cell">{r.avgNet ?? '—'}</td>
						<td class="px-3 py-2 text-right">{r.wins}</td>
					</tr>
				{:else}
					<tr><td colspan="8" class="px-3 py-4 text-club-900/50">Inga spelare.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>
