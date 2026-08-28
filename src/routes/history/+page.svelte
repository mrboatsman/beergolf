<script lang="ts">
	let { data } = $props();
</script>

<svelte:head><title>Historik — Beer Golf</title></svelte:head>

<p class="text-xs font-semibold tracking-[0.2em] text-gold-600 uppercase">Klubben</p>
<h1 class="font-display mt-1 text-4xl font-semibold text-club-900">Historik</h1>
<p class="mt-2 max-w-xl text-sm text-club-900/70">
	Avslutade säsonger med slutställning, vinnare och statistik. Pågående säsong: <strong
		>{data.current.label}</strong
	>
	({data.current.range}) — se <a href="/members" class="underline">leaderboarden</a>.
</p>

{#if data.seasons.length === 0}
	<p class="mt-8 text-sm text-club-900/60">
		Ingen säsong har avslutats än. Den första arkiveras automatiskt när den tar slut.
	</p>
{:else}
	<ul class="mt-6 space-y-3">
		{#each data.seasons as s (s.label)}
			<li>
				<a
					href="/history/{encodeURIComponent(s.label)}"
					class="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-club-800 px-5 py-4 text-cream-200 shadow-md hover:bg-club-700"
				>
					<div>
						<div class="font-display text-2xl font-semibold text-gold-300">Säsongen {s.label}</div>
						<div class="text-xs text-cream-200/60">
							{s.range} · {s.rounds} rundor · {s.players} spelare
						</div>
					</div>
					<div class="text-sm">
						{#if s.winners.length}
							🏆 {s.winners.map((w) => w.name).join(' & ')}
						{:else}
							<span class="text-cream-200/60">Inga rundor spelade</span>
						{/if}
					</div>
				</a>
			</li>
		{/each}
	</ul>
{/if}
