<script lang="ts">
	import { page } from '$app/state';
	let { data } = $props();
	const fmt = (d: Date) => new Date(d).toLocaleDateString('sv-SE');
	function pageUrl(p: number) {
		const params = new URLSearchParams();
		if (data.q) params.set('q', data.q);
		if (p > 1) params.set('page', String(p));
		const s = params.toString();
		return s ? `?${s}` : '?';
	}
</script>

<svelte:head><title>Score Coasters — Admin</title></svelte:head>

<a href="/admin" class="text-sm text-club-900/60 hover:underline">← Admin</a>
<h1 class="mt-2 font-display text-3xl font-semibold text-club-900">Score Coasters</h1>
<p class="mt-1 text-sm text-club-900/70">
	Alla coasters i klubben. Öppna en coaster för att rätta poäng, häva signaturer eller ta bort den —
	HCP räknas om automatiskt.
</p>

{#if page.url.searchParams.get('deleted')}
	<p class="mt-4 rounded bg-club-100 px-3 py-2 text-sm text-club-700">Coastern är borttagen.</p>
{/if}

<section class="mt-6">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h2 class="font-semibold text-club-900">Coasters ({data.total})</h2>
		<form method="GET" class="flex gap-2">
			<input
				type="search"
				name="q"
				value={data.q}
				placeholder="Sök coaster, spelare eller turnering…"
				class="w-72 rounded-lg border-cream-300 bg-white text-sm"
			/>
			<button
				class="rounded-lg bg-club-700 px-3 py-2 text-sm font-semibold text-cream-200 hover:bg-club-800"
				>Sök</button
			>
		</form>
	</div>
	<div class="mt-3 overflow-x-auto rounded-2xl bg-parchment shadow-sm">
		<table class="w-full text-left text-sm">
			<thead class="bg-club-800 text-cream-200">
				<tr>
					<th class="px-3 py-2">Coaster</th>
					<th class="px-3 py-2">Spelare</th>
					<th class="px-3 py-2">Signerade</th>
					<th class="px-3 py-2">Turnering</th>
					<th class="px-3 py-2">Skapad</th>
					<th class="px-3 py-2"></th>
				</tr>
			</thead>
			<tbody>
				{#each data.list as c (c.id)}
					<tr class="border-t border-cream-300/60">
						<td class="px-3 py-2">
							<a href="/admin/coasters/{c.id}" class="font-medium text-club-900 hover:underline"
								>{c.name || 'Namnlös coaster'}</a
							>
							<div class="text-xs text-club-900/50">av {c.creatorName ?? '?'}</div>
						</td>
						<td class="px-3 py-2 text-club-900/80">{c.playerNames ?? '—'}</td>
						<td class="px-3 py-2">{c.signedCount}/{c.playerCount}</td>
						<td class="px-3 py-2">{c.tournamentName ?? '—'}</td>
						<td class="px-3 py-2 whitespace-nowrap">{fmt(c.createdAt)}</td>
						<td class="px-3 py-2 text-right whitespace-nowrap">
							<a href="/coasters/{c.id}" class="text-xs text-club-900/60 hover:underline">Visa</a>
							·
							<a
								href="/admin/coasters/{c.id}"
								class="text-xs font-semibold text-club-800 hover:underline">Redigera</a
							>
						</td>
					</tr>
				{:else}
					<tr><td colspan="6" class="px-3 py-6 text-center text-club-900/50">Inga coasters.</td></tr
					>
				{/each}
			</tbody>
		</table>
	</div>
	{#if data.pages > 1}
		<div class="mt-3 flex items-center gap-3 text-sm">
			{#if data.page > 1}<a href={pageUrl(data.page - 1)} class="hover:underline">← Föregående</a
				>{/if}
			<span class="text-club-900/60">Sida {data.page} av {data.pages}</span>
			{#if data.page < data.pages}<a href={pageUrl(data.page + 1)} class="hover:underline"
					>Nästa →</a
				>{/if}
		</div>
	{/if}
</section>
