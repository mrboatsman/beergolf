<script lang="ts">
	// Klubbflikar: visas bara när medlemmen har fler än en klubb. Valet ligger i
	// URL:en (?club=slug) så sidan är länkbar — inget globalt läge.
	import { page } from '$app/state';
	let {
		clubs,
		current
	}: {
		clubs: { id: string; slug: string; name: string; isHome: boolean }[];
		current: string;
	} = $props();
</script>

{#if clubs.length > 1}
	<nav aria-label="Klubb" class="mt-4 flex flex-wrap gap-1 border-b border-club-700/20">
		{#each clubs as c (c.id)}
			<a
				href="{page.url.pathname}?club={c.slug}"
				aria-current={c.id === current ? 'page' : undefined}
				class="-mb-px rounded-t-lg border-b-2 px-3 py-2 text-sm font-semibold {c.id === current
					? 'border-gold-500 text-club-900'
					: 'border-transparent text-club-900/50 hover:text-club-900'}"
				>{c.name}{#if c.isHome}<span class="ml-1 text-[10px] tracking-wider text-gold-600 uppercase"
						>hemma</span
					>{/if}</a
			>
		{/each}
	</nav>
{/if}
