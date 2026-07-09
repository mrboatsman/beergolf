<script lang="ts">
	import { enhance } from '$app/forms';
	let { data, form } = $props();

	function fmtDate(d: Date | string) {
		return new Date(d).toLocaleDateString('sv-SE');
	}
</script>

<div class="flex items-center justify-between">
	<h1 class="text-2xl font-bold text-beer-800">Mina rundor</h1>
	<span class="rounded-full bg-turf-600 px-3 py-1 text-sm font-semibold text-white"
		>HCP {data.hcp}</span
	>
</div>

{#if form?.error}
	<p class="mt-4 rounded bg-red-100 px-3 py-2 text-sm text-red-700">{form.error}</p>
{/if}
{#if form?.added}
	<p class="mt-4 rounded bg-turf-100 px-3 py-2 text-sm text-turf-700">
		Runda registrerad. HCP {form.hcpBefore} → <strong>{form.hcpAfter}</strong>.
	</p>
{/if}

<!-- Virtuell Score Coaster -->
<section class="mt-6 rounded-2xl border-2 border-beer-300 bg-beer-100 p-5 shadow-inner">
	<h2 class="flex items-center gap-2 font-semibold text-beer-800">
		<span>🍺</span> Ny Score Coaster
	</h2>
	<form method="POST" action="?/add" use:enhance class="mt-3 space-y-3">
		<label class="block text-sm">
			<span class="text-beer-700">Antal hål</span>
			<select name="holes" class="mt-1 rounded-lg border-beer-300">
				<option value="18">18</option>
				<option value="9">9</option>
			</select>
		</label>
		<label class="block text-sm">
			<span class="text-beer-700">Poäng per hål (separera med mellanslag eller komma)</span>
			<input
				name="scores"
				placeholder="3 4 2 5 3 ..."
				class="mt-1 w-full rounded-lg border-beer-300 font-mono"
			/>
		</label>
		<button class="rounded-lg bg-turf-600 px-4 py-2 font-semibold text-white hover:bg-turf-700"
			>Registrera runda</button
		>
	</form>
</section>

<section class="mt-8">
	<h2 class="font-semibold text-beer-800">Historik</h2>
	{#if data.rounds.length === 0}
		<p class="mt-2 text-sm text-beer-600">Inga rundor än. Registrera din första ovan.</p>
	{:else}
		<div class="mt-3 overflow-x-auto rounded-xl border border-beer-200 bg-white">
			<table class="w-full text-left text-sm">
				<thead class="bg-beer-100 text-beer-700">
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
						<tr class="border-t border-beer-100">
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
</section>
