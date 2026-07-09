<script lang="ts">
	let { data } = $props();

	function fmtDate(d: Date | string) {
		return new Date(d).toLocaleDateString('sv-SE');
	}
</script>

<div class="flex items-center justify-between">
	<h1 class="font-display text-4xl font-semibold text-club-900">Mina rundor</h1>
	<span class="rounded-full bg-club-800 px-3 py-1 text-sm font-semibold text-gold-300"
		>HCP {data.hcp}</span
	>
</div>

<p class="mt-2 text-sm text-club-900/60">
	Rundor registreras genom att signera en <a class="font-semibold underline" href="/coasters"
		>Score Coaster</a
	>.
</p>

{#if data.rounds.length === 0}
	<p class="mt-6 text-sm text-club-900/60">
		Inga rundor än. <a class="font-semibold underline" href="/coasters">Skapa en Score Coaster</a> och
		signera din första runda.
	</p>
{:else}
	<div class="mt-6 overflow-x-auto rounded-2xl bg-parchment shadow-sm">
		<table class="w-full text-left text-sm">
			<thead class="bg-club-800 text-cream-200">
				<tr>
					<th class="px-3 py-2">Datum</th>
					<th class="px-3 py-2">Hål</th>
					<th class="px-3 py-2">Brutto</th>
					<th class="px-3 py-2">Netto</th>
					<th class="px-3 py-2">HCP före → efter</th>
				</tr>
			</thead>
			<tbody>
				{#each data.rounds as r (r.id)}
					<tr class="border-t border-cream-300">
						<td class="px-3 py-2">{fmtDate(r.playedAt)}</td>
						<td class="px-3 py-2">{r.holes}</td>
						<td class="px-3 py-2 font-semibold">{r.grossTotal}</td>
						<td class="px-3 py-2">{r.netTotal}</td>
						<td class="px-3 py-2">{r.hcpBefore} → {r.hcpAfter}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
