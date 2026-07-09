<script lang="ts">
	import { enhance } from '$app/forms';
	let { data, form } = $props();

	let ongoing = $derived(data.coasters.filter((c) => c.signedCount < c.playerCount));
	let finished = $derived(data.coasters.filter((c) => c.signedCount >= c.playerCount));

	function fmtDate(d: Date | string) {
		return new Date(d).toLocaleDateString('sv-SE');
	}
</script>

<p class="text-xs font-semibold tracking-[0.2em] text-gold-600 uppercase">Enter Scorecard</p>
<h1 class="font-display mt-1 text-4xl font-semibold">Score Coasters</h1>

{#if form?.error}
	<p class="mt-4 rounded bg-red-100 px-3 py-2 text-sm text-red-700">{form.error}</p>
{/if}

<section class="mt-6 rounded-2xl bg-club-800 p-6 text-cream-200 shadow-md">
	<h2 class="font-display flex items-center gap-2 text-2xl font-semibold">
		<span>🍺</span> Ny Score Coaster
	</h2>
	<form method="POST" action="?/create" use:enhance class="mt-4 space-y-4">
		<label class="block text-sm">
			<span class="text-xs font-semibold tracking-[0.18em] text-gold-400 uppercase"
				>Namn (valfritt)</span
			>
			<input
				name="name"
				placeholder="Lördagsslingan"
				class="mt-1 w-full rounded-lg border-club-600 bg-club-900/40 text-cream-200 placeholder:text-cream-200/30 focus:border-gold-400 focus:ring-gold-400"
			/>
		</label>
		<div class="text-sm">
			<span class="text-xs font-semibold tracking-[0.18em] text-gold-400 uppercase"
				>Par per hål</span
			>
			<div class="mt-1 flex flex-wrap gap-1">
				{#each data.defaultPar as p, i (i)}
					<label class="flex flex-col items-center">
						<span class="text-xs text-cream-200/50">{i + 1}</span>
						<input
							name={`par${i}`}
							type="number"
							min="1"
							max="9"
							value={p}
							class="w-12 rounded-lg border-club-600 bg-club-900/40 px-1 py-1 text-center text-cream-200 focus:border-gold-400 focus:ring-gold-400"
						/>
					</label>
				{/each}
			</div>
		</div>
		<button class="rounded-lg bg-gold-500 px-5 py-2 font-semibold text-club-900 hover:bg-gold-400"
			>Skapa coaster</button
		>
	</form>
</section>

<section class="mt-8">
	<h2 class="font-display text-2xl font-semibold">Pågående ({ongoing.length})</h2>
	{#if ongoing.length === 0}
		<p class="mt-2 text-sm text-club-900/60">Inga pågående matcher.</p>
	{:else}
		<ul class="mt-3 space-y-2">
			{#each ongoing as c (c.id)}
				<li>
					<a
						href={`/coasters/${c.id}`}
						class="flex items-center justify-between rounded-xl bg-parchment px-4 py-3 shadow-sm hover:shadow"
					>
						<div>
							<span class="font-semibold">{c.name ?? 'Score Coaster'}</span>
							<span class="ml-2 text-sm text-club-900/60"
								>av {c.creatorName} · {fmtDate(c.createdAt)}</span
							>
						</div>
						<span class="text-sm text-club-900/60">
							{c.playerCount} spelare · {c.signedCount} signerade
							<span
								class="ml-2 rounded-full bg-gold-400/20 px-2.5 py-0.5 text-xs font-semibold text-gold-600"
								>Pågående</span
							>
						</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<section class="mt-8">
	<h2 class="font-display text-2xl font-semibold">Avslutade ({finished.length})</h2>
	{#if finished.length === 0}
		<p class="mt-2 text-sm text-club-900/60">Inga avslutade matcher än.</p>
	{:else}
		<ul class="mt-3 space-y-2">
			{#each finished as c (c.id)}
				<li>
					<a
						href={`/coasters/${c.id}`}
						class="flex items-center justify-between rounded-xl bg-parchment px-4 py-3 shadow-sm hover:shadow"
					>
						<div>
							<span class="font-semibold">{c.name ?? 'Score Coaster'}</span>
							<span class="ml-2 text-sm text-club-900/60"
								>av {c.creatorName} · {fmtDate(c.createdAt)}</span
							>
						</div>
						<span class="text-sm text-club-900/60">
							{c.playerCount} spelare
							<span
								class="ml-2 rounded-full bg-club-700/10 px-2.5 py-0.5 text-xs font-semibold text-club-700"
								>Avslutad</span
							>
						</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</section>
