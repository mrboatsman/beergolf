<script lang="ts">
	import { shortName } from '$lib/names';
	import Avatar from '$lib/components/Avatar.svelte';
	let { data } = $props();

	const roleLabel: Record<string, string> = {
		aspirant: 'Aspirant',
		member: 'Medlem',
		fadder: 'Fadder',
		captain: 'Klubbmästare',
		admin: 'Admin'
	};

	function pageUrl(p: number) {
		const params = new URLSearchParams();
		if (data.q) params.set('q', data.q);
		if (p > 1) params.set('page', String(p));
		const s = params.toString();
		return s ? `/members?${s}` : '/members';
	}

	function rankClass(rank: number | null) {
		if (rank === null) return 'text-club-900/30';
		if (rank === 1) return 'text-gold-500';
		if (rank <= 3) return 'text-gold-600';
		return 'text-club-900/60';
	}
</script>

<div class="flex flex-wrap items-end justify-between gap-3">
	<div>
		<p class="text-xs font-semibold tracking-[0.2em] text-gold-600 uppercase">
			Klubben · Säsong {data.seasonLabel}
		</p>
		<h1 class="font-display mt-1 text-4xl font-semibold">Leaderboard</h1>
		<p class="mt-1 text-sm text-club-900/60">
			{data.total} medlemmar. Rankade på handikapp bland dem som spelat i säsongen — ny säsong, ny leaderboard.
			<a href="/history" class="underline">Tidigare säsonger</a>.
		</p>
	</div>
	<form method="GET" class="flex gap-2">
		<input
			type="search"
			name="q"
			value={data.q}
			placeholder="Sök namn eller e-post…"
			class="w-64 rounded-lg border-cream-300 bg-white text-sm"
		/>
		<button
			class="rounded-lg bg-club-700 px-4 py-2 text-sm font-semibold text-cream-200 hover:bg-club-800"
			>Sök</button
		>
	</form>
</div>

{#if data.members.length === 0}
	<p class="mt-6 text-sm text-club-900/60">Ingen medlem matchar ”{data.q}”.</p>
{:else}
	<div class="mt-6 overflow-x-auto rounded-2xl bg-parchment shadow-sm">
		<table class="w-full text-left text-sm">
			<thead class="bg-club-800 text-cream-200">
				<tr>
					<th class="px-2 py-2.5 text-right sm:px-4">#</th>
					<th class="px-2 py-2.5 sm:px-3">Medlem</th>
					<th class="hidden px-3 py-2.5 sm:table-cell">Grönt Kort</th>
					<th class="px-2 py-2.5 text-right sm:px-3"
						>Rundor<span class="hidden sm:inline"> i år</span></th
					>
					<th class="hidden px-3 py-2.5 text-right sm:table-cell">Bästa brutto</th>
					<th class="px-2 py-2.5 text-right sm:px-4">HCP</th>
				</tr>
			</thead>
			<tbody>
				{#each data.members as m (m.id)}
					<tr class="border-t border-cream-300 hover:bg-white/60 {m.active ? '' : 'opacity-60'}">
						<td class="px-2 py-2.5 text-right sm:px-4">
							<span
								class="font-display text-lg font-semibold whitespace-nowrap {rankClass(m.rank)}"
							>
								{#if m.rank === null}–{:else}{m.rank}{#if m.rank === 1}<span class="ml-1">🏆</span
										>{/if}{/if}
							</span>
						</td>
						<td class="px-2 py-2.5 sm:px-3">
							<a href={`/members/${m.id}`} class="group flex items-center gap-2 sm:gap-3">
								<Avatar name={m.name} src={m.avatarUrl} class="h-9 w-9 text-sm" />
								<span class="min-w-0">
									<span class="block truncate font-semibold group-hover:underline sm:hidden"
										>{shortName(m.name)}</span
									>
									<span class="hidden truncate font-semibold group-hover:underline sm:block"
										>{m.name}</span
									>
									<span class="block text-xs text-club-900/50">{roleLabel[m.role] ?? m.role}</span>
								</span>
								{#if m.status === 'aspirant'}
									<span
										class="rounded-full bg-gold-400/20 px-2 py-0.5 text-[10px] font-semibold text-gold-600"
										>aspirant</span
									>
								{/if}
							</a>
						</td>
						<td class="hidden px-3 py-2.5 text-club-900/60 sm:table-cell">
							{#if m.memberNumber}Nr {m.memberNumber}{:else}—{/if}
						</td>
						<td class="px-2 py-2.5 text-right sm:px-3">{m.roundsSeason}</td>
						<td class="hidden px-3 py-2.5 text-right sm:table-cell">{m.bestGross ?? '—'}</td>
						<td class="px-2 py-2.5 text-right sm:px-4">
							<span class="font-display text-lg font-semibold text-club-700">{m.hcp}</span>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

{#if data.pages > 1}
	<nav class="mt-6 flex items-center justify-center gap-3 text-sm" aria-label="Sidnavigering">
		{#if data.page > 1}
			<a href={pageUrl(data.page - 1)} class="font-semibold text-club-700 hover:underline"
				>← Föregående</a
			>
		{/if}
		<span class="text-club-900/60">Sida {data.page} av {data.pages}</span>
		{#if data.page < data.pages}
			<a href={pageUrl(data.page + 1)} class="font-semibold text-club-700 hover:underline"
				>Nästa →</a
			>
		{/if}
	</nav>
{/if}
