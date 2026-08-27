<script lang="ts">
	import CoasterRules from '$lib/components/CoasterRules.svelte';
	let { data } = $props();
</script>

<svelte:head><title>FAQ — Beer Golf</title></svelte:head>

<p class="text-xs font-semibold tracking-[0.2em] text-gold-600 uppercase">Klubbhuset</p>
<h1 class="font-display mt-1 text-4xl font-semibold text-club-900">Vanliga frågor</h1>
<p class="mt-2 max-w-xl text-sm text-club-900/70">
	Hur leaderboarden rankar, hur handikappet räknas, reglerna och annat man kan undra över.
</p>

<!-- Innehåll -->
<nav aria-label="Innehåll" class="mt-5 flex flex-wrap gap-2">
	{#each data.sections as s (s.id)}
		<a
			href="#{s.id}"
			class="rounded-full bg-parchment px-3 py-1 text-sm text-club-800 shadow-sm hover:bg-cream-300"
			>{s.title}</a
		>
	{/each}
</nav>

{#each data.sections as s (s.id)}
	<section id={s.id} class="mt-10 scroll-mt-20">
		<h2 class="font-display text-2xl font-semibold text-club-900">{s.title}</h2>

		{#if s.id === 'regler'}
			<!-- Samma regelkomponent som på coastern — ingen duplicerad text -->
			<div class="mt-3">
				<CoasterRules open />
			</div>
		{/if}

		<div class="mt-3 space-y-2">
			{#each s.items as item (item.q)}
				<details class="group rounded-xl bg-parchment shadow-sm">
					<summary
						class="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-semibold text-club-900 select-none"
					>
						{item.q}
						<span class="text-club-900/40 transition group-open:rotate-45" aria-hidden="true"
							>+</span
						>
					</summary>
					<div class="space-y-2 border-t border-club-700/10 px-4 py-3 text-sm text-club-900/85">
						{#each item.a as para, i (i)}
							<p>{para}</p>
						{/each}
					</div>
				</details>
			{/each}
		</div>
	</section>
{/each}
