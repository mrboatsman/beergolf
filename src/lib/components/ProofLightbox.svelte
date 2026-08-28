<script lang="ts">
	// Helskärmsvisare för bevismaterial (bild/film). Stängs med ✕, Esc, eller
	// tryck utanför; svep/piltangenter bläddrar. Ligger ovanpå ev. modal (z-70)
	// och tar hänsyn till iPhone-safe-area i PWA-läge.
	import { fade } from 'svelte/transition';

	type Item = { id: string; url: string; contentType: string; filename: string };
	let {
		items,
		index = $bindable(0),
		onclose
	}: { items: Item[]; index?: number; onclose: () => void } = $props();

	let current = $derived(items[index]);
	let isImage = $derived(current?.contentType.startsWith('image/'));

	function step(d: number) {
		if (items.length < 2) return;
		index = (index + d + items.length) % items.length;
	}
	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
		else if (e.key === 'ArrowRight') step(1);
		else if (e.key === 'ArrowLeft') step(-1);
	}

	// Svep i sidled
	let sx = 0;
	let sy = 0;
	let dx = $state(0);
	let swiping = false;
	function pDown(e: PointerEvent) {
		sx = e.clientX;
		sy = e.clientY;
		dx = 0;
		swiping = true;
	}
	function pMove(e: PointerEvent) {
		if (!swiping) return;
		if (Math.abs(e.clientX - sx) > Math.abs(e.clientY - sy)) dx = e.clientX - sx;
	}
	function pUp(e: PointerEvent) {
		if (!swiping) return;
		swiping = false;
		if (dx > 60) step(-1);
		else if (dx < -60) step(1);
		else if (
			Math.hypot(e.clientX - sx, e.clientY - sy) < 8 &&
			!(e.target as HTMLElement).closest('video')
		)
			onclose(); // kort tryck (även på bilden) stänger; film har egna kontroller
		dx = 0;
	}
</script>

<svelte:window onkeydown={onKey} />

{#if current}
	<div
		class="fixed inset-0 z-[70] flex flex-col bg-black text-cream-200"
		role="dialog"
		aria-modal="true"
		aria-label="Bevismaterial"
		transition:fade={{ duration: 150 }}
	>
		<!-- Topprad: under klockan i PWA -->
		<div
			class="flex items-center justify-between px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3 text-sm"
		>
			<span class="text-cream-200/70"
				>{items.length > 1 ? `${index + 1} / ${items.length}` : ''}</span
			>
			<span class="max-w-[60%] truncate">{current.filename}</span>
			<button
				type="button"
				onclick={onclose}
				aria-label="Stäng"
				class="flex h-10 w-10 items-center justify-center rounded-full bg-cream-200/10 text-xl hover:bg-cream-200/20"
				>✕</button
			>
		</div>

		<!-- Innehåll: tryck utanför bilden stänger, svep bläddrar -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="flex min-h-0 flex-1 touch-pan-y items-center justify-center px-2"
			onpointerdown={pDown}
			onpointermove={pMove}
			onpointerup={pUp}
			onpointercancel={pUp}
		>
			{#key current.id}
				{#if isImage}
					<img
						src={current.url}
						alt={current.filename}
						draggable="false"
						class="h-full w-full object-contain select-none"
						style="transform: translateX({dx}px)"
					/>
				{:else}
					<!-- svelte-ignore a11y_media_has_caption -->
					<video
						src={current.url}
						controls
						autoplay
						playsinline
						class="h-full w-full bg-black object-contain"
						style="transform: translateX({dx}px)"
					></video>
				{/if}
			{/key}
		</div>

		<div
			class="flex items-center justify-between px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] text-sm"
		>
			{#if items.length > 1}
				<button
					type="button"
					onclick={() => step(-1)}
					class="rounded-lg px-3 py-2 hover:bg-cream-200/10"
					aria-label="Föregående">← Föregående</button
				>
				<button
					type="button"
					onclick={() => step(1)}
					class="rounded-lg px-3 py-2 hover:bg-cream-200/10"
					aria-label="Nästa">Nästa →</button
				>
			{:else}
				<span></span>
				<button
					type="button"
					onclick={onclose}
					class="rounded-lg bg-cream-200/10 px-4 py-2 hover:bg-cream-200/20">Stäng</button
				>
			{/if}
		</div>
	</div>
{/if}
