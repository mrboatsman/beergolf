<script lang="ts">
	// Read-only-rendering av en coasters baksida: bilder + ritning (PNG-overlay).
	// Samma logiska koordinatsystem som redigeraren (bredd 1200, förankrat uppe till vänster).
	import { BACK_W as W, IMAGE_BASE_W, type BackImage } from '$lib/back-editor.svelte';
	import { onMount } from 'svelte';

	let {
		images,
		drawingKey,
		class: cls = ''
	}: { images: BackImage[]; drawingKey: string | null; class?: string } = $props();

	let wrap: HTMLDivElement;
	let k = $state(0.3);
	onMount(() => {
		const ro = new ResizeObserver(() => (k = wrap.clientWidth / W));
		ro.observe(wrap);
		k = wrap.clientWidth / W;
		return () => ro.disconnect();
	});
</script>

<div
	bind:this={wrap}
	class="overflow-hidden bg-card {cls.includes('absolute') ? '' : 'relative'} {cls}"
>
	<div
		class="absolute top-0 left-0 origin-top-left"
		style="width:{W}px;height:{W * 3}px;transform:scale({k})"
	>
		{#if !images.length && !drawingKey}
			<div
				class="absolute inset-x-0 top-0 flex h-[900px] items-center justify-center px-16 text-center font-coaster text-5xl text-print/30"
			>
				Tom baksida
			</div>
		{/if}
		{#each images as img (img.id)}
			{@const w = IMAGE_BASE_W * img.scale}
			{@const h = (w * img.height) / img.width}
			<img
				src={`/files/${img.storageKey}`}
				alt=""
				draggable="false"
				class="absolute top-0 left-0 max-w-none"
				style="width:{w}px;height:{h}px;transform:translate({img.x - w / 2}px,{img.y -
					h / 2}px) rotate({img.rotation}deg);z-index:{img.z}"
			/>
		{/each}
		{#if drawingKey}
			<img
				src={`/files/${drawingKey}`}
				alt=""
				draggable="false"
				class="absolute top-0 left-0 max-w-none"
				style="z-index:1000"
			/>
		{/if}
	</div>
</div>
