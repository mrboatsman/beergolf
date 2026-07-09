<script lang="ts">
	import { enhance } from '$app/forms';
	let { data, form } = $props();

	let coaster = $derived(data.coaster);
	let players = $derived(data.players);
	let myRow = $derived(players.find((p) => p.memberId === data.meId));
	let parTotal = $derived(coaster.par.reduce((a, b) => a + b, 0));

	function rowTotal(scores: (number | null)[]) {
		const filled = scores.filter((s): s is number => s !== null);
		return filled.length ? filled.reduce((a, b) => a + b, 0) : null;
	}

	function fmtDate(d: Date | string) {
		return new Date(d).toLocaleDateString('sv-SE');
	}
</script>

{#if form?.error}
	<p class="mb-4 rounded bg-red-100 px-3 py-2 text-sm text-red-700">{form.error}</p>
{/if}
{#if form?.signed}
	<p class="mb-4 rounded bg-turf-100 px-3 py-2 text-sm text-turf-700">
		Signerat! HCP {form.hcpBefore} → <strong>{form.hcpAfter}</strong>.
	</p>
{/if}
{#if form?.saved}
	<p class="mb-4 rounded bg-turf-100 px-3 py-2 text-sm text-turf-700">Poäng sparade.</p>
{/if}
{#if form?.added}
	<p class="mb-4 rounded bg-turf-100 px-3 py-2 text-sm text-turf-700">{form.added} tillagd.</p>
{/if}

<!-- Virtuell Score Coaster — layout efter det fysiska underlägget -->
<div
	class="mx-auto max-w-3xl rounded-2xl border-2 border-beer-300 bg-[#fbf6ea] p-6 shadow-md sm:p-8"
>
	<div class="flex items-start justify-between">
		<div>
			<h1 class="font-serif text-3xl font-extrabold tracking-tight text-turf-700 sm:text-4xl">
				Score Coaster
			</h1>
			<p class="mt-1 text-xs font-semibold text-turf-700 sm:text-sm">
				You don't have to play nine at one time. Drink responsibly.
			</p>
			{#if coaster.name}
				<p class="mt-1 text-sm text-beer-600">{coaster.name} · {fmtDate(coaster.createdAt)}</p>
			{/if}
		</div>
		<!-- Beer Golf-märke (glas) -->
		<div
			class="flex h-16 w-14 flex-col items-center justify-center border-2 border-turf-700 text-center font-serif text-xs leading-tight font-bold text-turf-700 [clip-path:polygon(0%_0%,100%_0%,82%_100%,18%_100%)]"
		>
			<span>Beer</span>
			<span>Golf</span>
		</div>
	</div>

	<!-- Formulär för egen rad — inputs kopplas hit via form-attributet -->
	{#if myRow && !myRow.signedAt}
		<form id="scoreform" method="POST" action="?/saveScores" use:enhance></form>
	{/if}

	<div class="mt-6 overflow-x-auto">
		<table class="w-full border-collapse text-sm">
			<thead>
				<tr class="border-y-2 border-beer-800/60">
					<th class="py-1.5 pr-2 text-left font-bold text-beer-900">Hole</th>
					{#each coaster.par as _, i (i)}
						<th class="w-9 px-1 py-1.5 text-center font-bold text-beer-900">{i + 1}</th>
					{/each}
					<th class="w-14 px-1 py-1.5 text-center font-bold text-beer-900">Total</th>
				</tr>
			</thead>
			<tbody>
				<tr class="border-b border-beer-800/40">
					<td class="py-1.5 pr-2 font-bold text-beer-900">Par</td>
					{#each coaster.par as p, i (i)}
						<td class="border-l border-beer-800/30 px-1 py-1.5 text-center">{p}</td>
					{/each}
					<td class="border-l border-beer-800/30 px-1 py-1.5 text-center font-semibold"
						>{parTotal}</td
					>
				</tr>
				{#each players as p (p.id)}
					{@const mine = p.memberId === data.meId && !p.signedAt}
					<tr class="border-b border-beer-800/40">
						<td class="py-1.5 pr-2">
							<span class="font-medium text-beer-900">{p.name}</span>
							{#if p.signedAt}<span class="ml-1 text-turf-600" title="Signerad">✓</span>{/if}
						</td>
						{#each p.scores as s, i (i)}
							<td class="border-l border-beer-800/30 px-0.5 py-1 text-center">
								{#if mine}
									<input
										form="scoreform"
										name={`s${i}`}
										type="number"
										min="1"
										max="30"
										value={s ?? ''}
										class="h-8 w-8 rounded border-beer-300 p-0 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
									/>
								{:else}
									{s ?? ''}
								{/if}
							</td>
						{/each}
						<td class="border-l border-beer-800/30 px-1 py-1.5 text-center font-bold">
							{rowTotal(p.scores) ?? ''}
						</td>
					</tr>
				{/each}
				<!-- Tomma rader upp till max, som på det fysiska underlägget -->
				{#each Array(Math.max(0, data.maxPlayers - players.length)) as _, i (i)}
					<tr class="border-b border-beer-800/40">
						<td class="py-3 pr-2 text-xs text-beer-400">Player {players.length + i + 1}</td>
						{#each coaster.par as _p, j (j)}
							<td class="border-l border-beer-800/30"></td>
						{/each}
						<td class="border-l border-beer-800/30"></td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	{#if myRow && !myRow.signedAt}
		<div class="mt-4 flex flex-wrap gap-2">
			<button
				form="scoreform"
				class="rounded-lg bg-beer-600 px-4 py-2 text-sm font-semibold text-white hover:bg-beer-700"
				>Spara poäng</button
			>
			<form method="POST" action="?/sign" use:enhance>
				<button
					class="rounded-lg bg-turf-600 px-4 py-2 text-sm font-semibold text-white hover:bg-turf-700"
					disabled={myRow.scores.some((s) => s === null)}
					title={myRow.scores.some((s) => s === null) ? 'Fyll i alla nio hål först' : ''}
					>Signera rundan</button
				>
			</form>
		</div>
	{/if}

	<!-- Player Signature -->
	<div class="mt-8 border-t border-beer-800/40 pt-3">
		<span class="font-bold text-beer-900">Player Signature:</span>
		<div class="mt-2 flex flex-wrap gap-x-8 gap-y-1">
			{#each players.filter((p) => p.signedAt) as p (p.id)}
				<span class="font-serif text-lg text-beer-800 italic underline decoration-beer-400"
					>{p.name}</span
				>
			{/each}
		</div>
	</div>
</div>

<!-- Lägg till spelare -->
{#if players.length < data.maxPlayers && data.addable.length > 0}
	<div class="mx-auto mt-6 max-w-3xl">
		<form method="POST" action="?/addPlayer" use:enhance class="flex items-end gap-2">
			<label class="block flex-1 text-sm">
				<span class="text-beer-700">Lägg till spelare</span>
				<select name="memberId" class="mt-1 w-full rounded-lg border-beer-300">
					{#each data.addable as m (m.id)}
						<option value={m.id}>{m.name}</option>
					{/each}
				</select>
			</label>
			<button
				class="rounded-lg bg-beer-600 px-4 py-2 text-sm font-semibold text-white hover:bg-beer-700"
				>Lägg till</button
			>
		</form>
	</div>
{/if}

<div class="mx-auto mt-4 max-w-3xl">
	<a href="/coasters" class="text-sm text-beer-600 hover:underline">← Alla coasters</a>
</div>
