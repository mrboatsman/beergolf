<script lang="ts">
	// Enkel beskärare: bilden visas i en kvadrat med cirkelmask, dra för att
	// flytta, slider/nyp för zoom. Exporterar en 320×320 JPEG via canvas.
	let {
		file,
		oncancel,
		onsave
	}: { file: File; oncancel: () => void; onsave: (blob: Blob) => void | Promise<void> } = $props();

	const OUT = 320;
	const VIEW = 260; // px på skärmen
	let url = $state('');
	let img = $state<HTMLImageElement | null>(null);
	let zoom = $state(1); // 1 = bilden täcker precis cirkeln
	let ox = $state(0); // offset i view-px
	let oy = $state(0);
	let saving = $state(false);

	$effect(() => {
		const u = URL.createObjectURL(file);
		url = u;
		const im = new Image();
		im.onload = () => {
			img = im;
			zoom = 1;
			ox = 0;
			oy = 0;
		};
		im.src = u;
		return () => URL.revokeObjectURL(u);
	});

	// Basskala: kortaste sidan fyller vyn
	let base = $derived(img ? VIEW / Math.min(img.naturalWidth, img.naturalHeight) : 1);
	let dispW = $derived(img ? img.naturalWidth * base * zoom : 0);
	let dispH = $derived(img ? img.naturalHeight * base * zoom : 0);
	function clamp() {
		// Bilden får inte lämna cirkeln tom
		const maxX = Math.max(0, (dispW - VIEW) / 2);
		const maxY = Math.max(0, (dispH - VIEW) / 2);
		ox = Math.max(-maxX, Math.min(maxX, ox));
		oy = Math.max(-maxY, Math.min(maxY, oy));
	}
	$effect(() => {
		zoom;
		clamp();
	});

	// Drag + pinch
	const pts = new Map<number, { x: number; y: number }>();
	let start: { ox: number; oy: number; zoom: number; p: { x: number; y: number }[] } | null = null;
	function down(e: PointerEvent) {
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
		start = { ox, oy, zoom, p: [...pts.values()] };
	}
	function move(e: PointerEvent) {
		if (!start || !pts.has(e.pointerId)) return;
		pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
		const ps = [...pts.values()];
		if (ps.length >= 2 && start.p.length >= 2) {
			const d0 = Math.hypot(start.p[1].x - start.p[0].x, start.p[1].y - start.p[0].y) || 1;
			const d1 = Math.hypot(ps[1].x - ps[0].x, ps[1].y - ps[0].y);
			zoom = Math.max(1, Math.min(5, start.zoom * (d1 / d0)));
			ox = start.ox + (ps[0].x + ps[1].x - start.p[0].x - start.p[1].x) / 2;
			oy = start.oy + (ps[0].y + ps[1].y - start.p[0].y - start.p[1].y) / 2;
		} else {
			ox = start.ox + (ps[0].x - start.p[0].x);
			oy = start.oy + (ps[0].y - start.p[0].y);
		}
		clamp();
	}
	function up(e: PointerEvent) {
		pts.delete(e.pointerId);
		start = pts.size ? { ox, oy, zoom, p: [...pts.values()] } : null;
	}

	async function save() {
		if (!img) return;
		saving = true;
		const c = document.createElement('canvas');
		c.width = OUT;
		c.height = OUT;
		const ctx = c.getContext('2d')!;
		const k = OUT / VIEW; // view-px → out-px
		const w = dispW * k;
		const h = dispH * k;
		const x = (OUT - w) / 2 + ox * k;
		const y = (OUT - h) / 2 + oy * k;
		ctx.fillStyle = '#ede6d3';
		ctx.fillRect(0, 0, OUT, OUT);
		ctx.drawImage(img, x, y, w, h);
		c.toBlob(
			async (blob) => {
				if (blob) await onsave(blob);
				saving = false;
			},
			'image/jpeg',
			0.88
		);
	}
</script>

<div class="flex flex-col items-center gap-3">
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="relative touch-none overflow-hidden rounded-2xl bg-club-900 select-none"
		style="width:{VIEW}px;height:{VIEW}px"
		onpointerdown={down}
		onpointermove={move}
		onpointerup={up}
		onpointercancel={up}
	>
		{#if img}
			<img
				src={url}
				alt=""
				draggable="false"
				class="absolute max-w-none cursor-move"
				style="width:{dispW}px;height:{dispH}px;left:{(VIEW - dispW) / 2 + ox}px;top:{(VIEW -
					dispH) /
					2 +
					oy}px"
			/>
		{/if}
		<!-- Cirkelmask -->
		<div
			class="pointer-events-none absolute inset-0"
			style="background: radial-gradient(circle at center, transparent {VIEW / 2 -
				1}px, rgba(18,43,33,0.7) {VIEW / 2}px)"
		></div>
		<div
			class="pointer-events-none absolute inset-0 rounded-full border-2 border-gold-400/80"
		></div>
	</div>
	<label class="flex w-[260px] items-center gap-2 text-xs text-club-900/70">
		Zoom
		<input
			type="range"
			min="1"
			max="5"
			step="0.01"
			bind:value={zoom}
			class="flex-1 accent-club-700"
		/>
	</label>
	<p class="text-xs text-club-900/50">
		Dra för att flytta, nyp eller använd reglaget för att zooma.
	</p>
	<div class="flex gap-2">
		<button
			type="button"
			onclick={oncancel}
			class="rounded-lg px-4 py-2 text-sm text-club-900/70 hover:bg-cream-300">Avbryt</button
		>
		<button
			type="button"
			onclick={save}
			disabled={!img || saving}
			class="rounded-lg bg-club-700 px-4 py-2 text-sm font-semibold text-cream-200 hover:bg-club-800 disabled:opacity-50"
			>{saving ? 'Sparar…' : 'Spara profilbild'}</button
		>
	</div>
</div>
