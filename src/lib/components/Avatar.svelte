<script lang="ts">
	// Profilbild i cirkel: bild-URL (egen/Gravatar) med initialer som reserv.
	// Gravatar med d=404 ger 404 om ingen bild finns → onerror → initialer.
	let {
		name,
		src = null,
		class: cls = 'h-10 w-10 text-sm'
	}: { name: string; src?: string | null; class?: string } = $props();

	let failed = $state(false);
	$effect(() => {
		src;
		failed = false;
	});
	let initials = $derived(
		name
			.split(/\s+/)
			.map((w) => w[0])
			.slice(0, 2)
			.join('')
			.toUpperCase()
	);
</script>

{#if src && !failed}
	<img
		{src}
		alt=""
		onerror={() => (failed = true)}
		class="shrink-0 rounded-full object-cover {cls}"
		loading="lazy"
		referrerpolicy="no-referrer"
	/>
{:else}
	<span
		class="flex shrink-0 items-center justify-center rounded-full bg-gold-400 font-display font-semibold text-club-900 {cls}"
		>{initials}</span
	>
{/if}
