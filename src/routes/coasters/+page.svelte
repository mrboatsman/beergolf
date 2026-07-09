<script lang="ts">
	import { enhance } from '$app/forms';
	let { data, form } = $props();

	function fmtDate(d: Date | string) {
		return new Date(d).toLocaleDateString('sv-SE');
	}
</script>

<div class="flex items-center justify-between">
	<h1 class="text-2xl font-bold text-beer-800">Score Coasters</h1>
</div>

{#if form?.error}
	<p class="mt-4 rounded bg-red-100 px-3 py-2 text-sm text-red-700">{form.error}</p>
{/if}

<section class="mt-6 rounded-2xl border-2 border-beer-300 bg-beer-100 p-5">
	<h2 class="flex items-center gap-2 font-semibold text-beer-800">
		<span>🍺</span> Ny Score Coaster
	</h2>
	<form method="POST" action="?/create" use:enhance class="mt-3 space-y-3">
		<label class="block text-sm">
			<span class="text-beer-700">Namn (valfritt)</span>
			<input
				name="name"
				placeholder="Lördagsslingan"
				class="mt-1 w-full rounded-lg border-beer-300"
			/>
		</label>
		<div class="text-sm">
			<span class="text-beer-700">Par per hål</span>
			<div class="mt-1 flex flex-wrap gap-1">
				{#each data.defaultPar as p, i (i)}
					<label class="flex flex-col items-center">
						<span class="text-xs text-beer-500">{i + 1}</span>
						<input
							name={`par${i}`}
							type="number"
							min="1"
							max="9"
							value={p}
							class="w-12 rounded-lg border-beer-300 px-1 py-1 text-center"
						/>
					</label>
				{/each}
			</div>
		</div>
		<button class="rounded-lg bg-turf-600 px-4 py-2 font-semibold text-white hover:bg-turf-700"
			>Skapa coaster</button
		>
	</form>
</section>

<section class="mt-8">
	<h2 class="font-semibold text-beer-800">Alla coasters ({data.coasters.length})</h2>
	{#if data.coasters.length === 0}
		<p class="mt-2 text-sm text-beer-600">Inga coasters än. Skapa den första ovan.</p>
	{:else}
		<ul class="mt-3 space-y-2">
			{#each data.coasters as c (c.id)}
				<li>
					<a
						href={`/coasters/${c.id}`}
						class="flex items-center justify-between rounded-xl border border-beer-200 bg-white px-4 py-3 shadow-sm hover:shadow"
					>
						<div>
							<span class="font-semibold text-beer-800">{c.name ?? 'Score Coaster'}</span>
							<span class="ml-2 text-sm text-beer-600"
								>av {c.creatorName} · {fmtDate(c.createdAt)}</span
							>
						</div>
						<span class="text-sm text-beer-600">
							{c.playerCount} spelare
							{#if c.signedCount === c.playerCount}
								<span class="ml-1 font-semibold text-turf-600">✓ klar</span>
							{:else}
								<span class="ml-1">({c.signedCount} signerade)</span>
							{/if}
						</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</section>
