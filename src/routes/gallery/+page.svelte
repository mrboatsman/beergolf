<script lang="ts">
	import CoasterBackView from '$lib/components/CoasterBackView.svelte';
	import CoasterPaper from '$lib/components/CoasterPaper.svelte';
	import { shortName } from '$lib/names';
	let { data } = $props();

	const fmt = (d: Date) => new Date(d).toLocaleDateString('sv-SE');

	// Visare: index i listan, flip (baksida ↔ score), swipe
	let open = $state<number | null>(null);
	let flipped = $state(false);
	let current = $derived(open === null ? null : data.coasters[open]);
	function show(i: number) {
		open = i;
		flipped = false;
	}
	function close() {
		open = null;
	}
	function step(d: number) {
		if (open === null) return;
		const n = data.coasters.length;
		open = (open + d + n) % n;
		flipped = false;
	}
	function onKey(e: KeyboardEvent) {
		if (open === null) return;
		if (e.key === 'Escape') close();
		else if (e.key === 'ArrowRight') step(1);
		else if (e.key === 'ArrowLeft') step(-1);
		else if (e.key === ' ' || e.key === 'Enter') {
			e.preventDefault();
			flipped = !flipped;
		}
	}
	// Swipe: horisontell rörelse > 60 px byter coaster; kort tryck vänder kortet
	let sx = 0;
	let sy = 0;
	let dx = $state(0);
	let availH = $state(600); // kortet är kvadratiskt: sida = min(bredd, tillgänglig höjd)
	let swiping = false;
	function pDown(e: PointerEvent) {
		sx = e.clientX;
		sy = e.clientY;
		swiping = true;
		dx = 0;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}
	function pMove(e: PointerEvent) {
		if (!swiping) return;
		if (Math.abs(e.clientX - sx) > Math.abs(e.clientY - sy)) dx = e.clientX - sx;
	}
	function pUp(e: PointerEvent) {
		if (!swiping) return;
		swiping = false;
		const moved = Math.hypot(e.clientX - sx, e.clientY - sy);
		if (dx > 60) step(-1);
		else if (dx < -60) step(1);
		else if (moved < 8) flipped = !flipped;
		dx = 0;
	}
</script>

<svelte:head><title>Galleri — Beer Golf</title></svelte:head>
<svelte:window onkeydown={onKey} />

<p class="text-xs font-semibold tracking-[0.2em] text-gold-600 uppercase">Klubbens minnen</p>
<h1 class="font-display mt-1 text-4xl font-semibold">Coaster-galleri</h1>
<p class="mt-2 max-w-xl text-sm text-club-900/70">
	Baksidorna på färdigspelade coasters. Tryck på en för att titta närmare, vänd den för score och
	deltagare, svep för nästa.
</p>

{#if data.coasters.length === 0}
	<p class="mt-8 text-sm text-club-900/60">
		Inga färdigspelade coasters än. När alla på en coaster signerat kan deltagarna vända den och
		dekorera baksidan.
	</p>
{:else}
	<div class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
		{#each data.coasters as c, i (c.id)}
			<button
				type="button"
				onclick={() => show(i)}
				class="group text-left"
				aria-label={`Visa ${c.name ?? 'Score Coaster'}`}
			>
				<CoasterBackView
					images={c.images}
					drawingKey={c.drawingKey}
					class="aspect-square w-full rounded-2xl border border-black/5 shadow-md transition group-hover:shadow-lg"
				/>
				<div class="mt-1.5 truncate px-1 text-sm font-semibold text-club-900">
					{c.name ?? 'Score Coaster'}
				</div>
				<div class="truncate px-1 text-xs text-club-900/60">
					{fmt(c.createdAt)} · {c.players.map((p) => shortName(p.name)).join(', ')}
				</div>
			</button>
		{/each}
	</div>
{/if}

{#if current}
	<!-- Visare: fullskärm, svep/pilar för nästa, tryck för att vända -->
	<div
		class="fixed inset-0 z-[60] flex flex-col bg-club-950 text-cream-200"
		role="dialog"
		aria-modal="true"
		aria-label="Coaster-visare"
	>
		<div class="flex items-center justify-between px-4 py-3 text-sm">
			<span class="text-cream-200/70">{(open ?? 0) + 1} / {data.coasters.length}</span>
			<a
				href={`/coasters/${current.id}`}
				class="font-semibold hover:underline"
				title="Öppna coastern">{current.name ?? 'Score Coaster'} ↗</a
			>
			<button
				type="button"
				onclick={close}
				aria-label="Stäng"
				class="rounded-lg px-2 py-1 text-xl hover:bg-cream-200/10">✕</button
			>
		</div>

		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			bind:clientHeight={availH}
			class="flex min-h-0 flex-1 items-center justify-center px-2 pb-2 [perspective:1800px] touch-pan-y sm:px-4"
			onpointerdown={pDown}
			onpointermove={pMove}
			onpointerup={pUp}
			onpointercancel={pUp}
		>
			{#key current.id}
				<div
					class="relative aspect-square max-w-2xl transition-transform duration-500 [transform-style:preserve-3d]"
					style:width={`min(100%, ${availH}px)`}
					style="transform: translateX({dx}px) rotateY({flipped ? 180 : 0}deg)"
				>
					<!-- Baksidan (galleriets framsida) -->
					<CoasterBackView
						images={current.images}
						drawingKey={current.drawingKey}
						class="absolute inset-0 rounded-[24px] shadow-2xl [backface-visibility:hidden]"
					/>
					<!-- Score-sidan: samma papp-coaster som på /coasters/[id] -->
					<div
						class="absolute inset-0 overflow-y-auto rounded-[24px] [backface-visibility:hidden] [transform:rotateY(180deg)]"
					>
						<CoasterPaper
							coaster={current}
							players={current.players}
							winners={current.winners}
							class="min-h-full rounded-[24px]"
						/>
					</div>
				</div>
			{/key}
		</div>

		<div
			class="flex items-center justify-between px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-sm"
		>
			<button
				type="button"
				onclick={() => step(-1)}
				class="rounded-lg px-3 py-2 hover:bg-cream-200/10"
				aria-label="Föregående">← Föregående</button
			>
			<button
				type="button"
				onclick={() => (flipped = !flipped)}
				class="rounded-lg bg-gold-500 px-3 py-2 font-semibold text-club-900 hover:bg-gold-400"
				>{flipped ? 'Visa baksidan' : 'Visa score'}</button
			>
			<button
				type="button"
				onclick={() => step(1)}
				class="rounded-lg px-3 py-2 hover:bg-cream-200/10"
				aria-label="Nästa">Nästa →</button
			>
		</div>
	</div>
{/if}
