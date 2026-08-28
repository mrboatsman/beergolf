<script lang="ts">
	// Baksidan (kortytan): bildlager + rit-canvas över hela kortet.
	// Verktygen bor utanför kortet i CoasterBackToolbar och delar `editor`.
	import { deserialize } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	import {
		BACK_W as W,
		BACK_H as H0,
		IMAGE_BASE_W,
		type BackEditor,
		type BackImage
	} from '$lib/back-editor.svelte';

	let {
		coasterId,
		drawingKey,
		images,
		canEdit,
		editor
	}: {
		coasterId: string;
		drawingKey: string | null;
		images: BackImage[];
		canEdit: boolean;
		editor: BackEditor;
	} = $props();

	// Serverns bilder → editorns lokala lista (om ingen manipulering pågår)
	let manipulating = false;
	$effect(() => {
		const server = images.map((i) => ({ ...i }));
		if (!manipulating) editor.images = server;
	});

	// Ytan är exakt lika stor som coastern. Logisk bredd är alltid W (1200);
	// logisk höjd H följer kortets proportion på den här enheten. Allt ritas
	// förankrat uppe till vänster så innehållet hamnar lika på alla skärmar.
	let wrap: HTMLDivElement;
	let k = $state(1); // CSS-skala: kortbredd / logisk bredd
	let H = $state(H0);
	function measure() {
		k = wrap.clientWidth / W;
		const h = Math.max(100, Math.round(wrap.clientHeight / k));
		if (h !== H) resizeCanvas(h);
	}
	onMount(() => {
		const ro = new ResizeObserver(measure);
		ro.observe(wrap);
		measure();
		return () => ro.disconnect();
	});

	async function post(action: string, fd: FormData) {
		const res = await fetch(action, {
			method: 'POST',
			body: fd,
			headers: { 'x-sveltekit-action': 'true', accept: 'application/json' }
		});
		const r = deserialize(await res.text());
		return r.type === 'success';
	}

	// ---------- Bilder: drag (1 pekare) / pinch (2 pekare = skala + rotera + flytta) ----------
	const pointers = new Map<number, { x: number; y: number }>();
	let active: { id: string; start: BackImage; p0: { x: number; y: number }[] } | null = null;

	function lp(e: PointerEvent) {
		const r = wrap.getBoundingClientRect();
		return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k };
	}
	function imgDown(e: PointerEvent, img: BackImage) {
		if (!canEdit || editor.mode !== 'images') return;
		e.preventDefault();
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		pointers.set(e.pointerId, lp(e));
		editor.selectedId = img.id;
		manipulating = true;
		// Ny gest: frys startläge + startpekare
		const cur = editor.images.find((i) => i.id === img.id)!;
		active = { id: img.id, start: { ...cur }, p0: [...pointers.values()] };
	}
	function imgMove(e: PointerEvent) {
		if (!active || !pointers.has(e.pointerId)) return;
		pointers.set(e.pointerId, lp(e));
		const img = editor.images.find((i) => i.id === active!.id);
		if (!img) return;
		const ps = [...pointers.values()];
		const { start, p0 } = active;
		if (ps.length >= 2 && p0.length >= 2) {
			const d0 = Math.hypot(p0[1].x - p0[0].x, p0[1].y - p0[0].y) || 1;
			const d1 = Math.hypot(ps[1].x - ps[0].x, ps[1].y - ps[0].y);
			const a0 = Math.atan2(p0[1].y - p0[0].y, p0[1].x - p0[0].x);
			const a1 = Math.atan2(ps[1].y - ps[0].y, ps[1].x - ps[0].x);
			const m0 = { x: (p0[0].x + p0[1].x) / 2, y: (p0[0].y + p0[1].y) / 2 };
			const m1 = { x: (ps[0].x + ps[1].x) / 2, y: (ps[0].y + ps[1].y) / 2 };
			img.scale = Math.max(0.05, Math.min(10, start.scale * (d1 / d0)));
			img.rotation = start.rotation + ((a1 - a0) * 180) / Math.PI;
			img.x = start.x + (m1.x - m0.x);
			img.y = start.y + (m1.y - m0.y);
		} else {
			img.x = start.x + (ps[0].x - p0[0].x);
			img.y = start.y + (ps[0].y - p0[0].y);
		}
	}
	function imgUp(e: PointerEvent) {
		if (!pointers.has(e.pointerId)) return;
		pointers.delete(e.pointerId);
		if (!active) return;
		if (pointers.size > 0) {
			// En pekare kvar: starta om gesten från nuläget så det inte hoppar
			const cur = editor.images.find((i) => i.id === active!.id)!;
			active = { id: active.id, start: { ...cur }, p0: [...pointers.values()] };
			return;
		}
		const img = editor.images.find((i) => i.id === active!.id);
		active = null;
		manipulating = false;
		if (img) persist(img, true);
	}
	async function persist(img: BackImage, front = false) {
		editor.status = 'saving';
		const fd = new FormData();
		fd.set('id', img.id);
		fd.set('x', String(img.x));
		fd.set('y', String(img.y));
		fd.set('scale', String(img.scale));
		fd.set('rotation', String(img.rotation));
		if (front) fd.set('front', '1');
		editor.status = (await post('?/updateBackImage', fd)) ? 'saved' : 'error';
	}

	// Verktygsradens knappar (desktop: rotera/skala utan pinch) — kopplas i onMount
	function bindEditor() {
		editor.nudge = (_patch, delta) => {
			const img = editor.images.find((i) => i.id === editor.selectedId);
			if (!img) return;
			if (delta?.ds) img.scale = Math.max(0.05, Math.min(10, img.scale * delta.ds));
			if (delta?.dr) img.rotation += delta.dr;
			persist(img);
		};
		editor.remove = async (id) => {
			if (!confirm('Ta bort bilden?')) return;
			const fd = new FormData();
			fd.set('id', id);
			if (await post('?/removeBackImage', fd)) {
				editor.selectedId = null;
				await invalidate(`coaster:${coasterId}`);
			}
		};
		editor.upload = async (files) => {
			editor.status = 'saving';
			const fd = new FormData();
			let i = 0;
			for (const f of files) {
				fd.append('image', f);
				const dim = await imageSize(f);
				fd.set(`w${i}`, String(dim.w));
				fd.set(`h${i}`, String(dim.h));
				i++;
			}
			editor.status = (await post('?/uploadBack', fd)) ? 'saved' : 'error';
			await invalidate(`coaster:${coasterId}`);
			editor.mode = 'images';
		};
	}
	function imageSize(f: File): Promise<{ w: number; h: number }> {
		return new Promise((resolve) => {
			const url = URL.createObjectURL(f);
			const im = new Image();
			im.onload = () => {
				resolve({ w: im.naturalWidth || 4, h: im.naturalHeight || 3 });
				URL.revokeObjectURL(url);
			};
			im.onerror = () => resolve({ w: 4, h: 3 });
			im.src = url;
		});
	}

	// ---------- Ritning: canvas över hela kortet ----------
	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D;
	let drawing = false;
	let dirty = false;
	// Byt canvasens höjd utan att tappa ritningen
	function resizeCanvas(h: number) {
		const old = ctx && canvas.height > 0 ? ctx.getImageData(0, 0, W, canvas.height) : null;
		H = h;
		if (canvas) canvas.height = h;
		if (old && ctx) ctx.putImageData(old, 0, 0);
	}
	function cpos(e: PointerEvent) {
		const r = canvas.getBoundingClientRect();
		return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
	}
	function brush() {
		ctx.strokeStyle = editor.color;
		ctx.lineWidth = editor.size;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
	}
	function dDown(e: PointerEvent) {
		if (!canEdit || editor.mode !== 'draw') return;
		e.preventDefault();
		canvas.setPointerCapture(e.pointerId);
		brush();
		drawing = true;
		const { x, y } = cpos(e);
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.lineTo(x + 0.01, y);
		ctx.stroke();
	}
	function dMove(e: PointerEvent) {
		if (!drawing) return;
		const { x, y } = cpos(e);
		ctx.lineTo(x, y);
		ctx.stroke();
		dirty = true;
	}
	function dUp() {
		if (!drawing) return;
		drawing = false;
		ctx.closePath();
		if (dirty) saveDrawing();
	}
	// Ladda ritningen från servern (naturlig storlek, förankrad uppe till vänster)
	function loadDrawing(key: string | null) {
		if (!ctx) return;
		ctx.clearRect(0, 0, W, canvas.height);
		if (!key) return;
		const im = new Image();
		im.onload = () => ctx.drawImage(im, 0, 0);
		im.src = `/files/${key}`;
	}
	// Live: ny nyckel från en annan klient → rita om (inte mitt i eget penseldrag)
	let loadedKey: string | null = null;
	$effect(() => {
		const key = drawingKey;
		if (key === loadedKey || drawing || dirty) return;
		loadedKey = key;
		loadDrawing(key);
	});

	let timer: ReturnType<typeof setTimeout> | null = null;
	function saveDrawing() {
		if (timer) clearTimeout(timer);
		timer = setTimeout(async () => {
			editor.status = 'saving';
			const fd = new FormData();
			fd.set('png', canvas.toDataURL('image/png'));
			const ok = await post('?/saveDrawing', fd);
			editor.status = ok ? 'saved' : 'error';
			if (ok) dirty = false;
		}, 800);
	}
	onMount(() => {
		bindEditor();
		editor.clearDrawing = () => {
			if (!confirm('Sudda hela ritningen?')) return;
			ctx.clearRect(0, 0, W, H);
			dirty = true;
			saveDrawing();
		};
		ctx = canvas.getContext('2d')!;
		canvas.height = H;
		loadDrawing(drawingKey);
	});
</script>

<!-- Kortytan: fyller hela baksidan; allt inuti ritas i logiska px (bredd 1200) -->
<div
	bind:this={wrap}
	data-no-flip
	class="absolute inset-0 touch-none overflow-hidden rounded-[28px] bg-card select-none"
>
	<div
		class="absolute top-0 left-0 origin-top-left"
		style="width:{W}px;height:{H}px;transform:scale({k})"
	>
		{#if !editor.images.length && !drawingKey}
			<div
				class="absolute inset-0 flex items-center justify-center px-16 text-center font-coaster text-5xl text-print/30"
			>
				{canEdit ? 'Ladda upp bilder och rita något fint' : 'Inget på baksidan än.'}
			</div>
		{/if}
		{#each editor.images as img (img.id)}
			{@const w = IMAGE_BASE_W * img.scale}
			{@const h = (w * img.height) / img.width}
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<img
				src={`/files/${img.storageKey}`}
				alt=""
				draggable="false"
				class="absolute top-0 left-0 {editor.mode === 'images' && canEdit
					? 'cursor-move'
					: ''} {editor.selectedId === img.id && editor.mode === 'images' && canEdit
					? 'outline outline-4 outline-gold-400'
					: ''}"
				style="width:{w}px;height:{h}px;transform:translate({img.x - w / 2}px,{img.y -
					h / 2}px) rotate({img.rotation}deg);z-index:{img.z};pointer-events:{editor.mode ===
					'images' && canEdit
					? 'auto'
					: 'none'}"
				onpointerdown={(e) => imgDown(e, img)}
				onpointermove={imgMove}
				onpointerup={imgUp}
				onpointercancel={imgUp}
			/>
		{/each}
		<canvas
			bind:this={canvas}
			width={W}
			class="absolute top-0 left-0 {editor.mode === 'draw' && canEdit ? 'cursor-crosshair' : ''}"
			style="width:{W}px;height:{H}px;z-index:1000;pointer-events:{editor.mode === 'draw' && canEdit
				? 'auto'
				: 'none'}"
			onpointerdown={dDown}
			onpointermove={dMove}
			onpointerup={dUp}
			onpointercancel={dUp}
		></canvas>
	</div>
</div>
