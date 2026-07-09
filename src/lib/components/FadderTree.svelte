<script lang="ts">
	// Interaktivt fadderträd (d3): skalar till 1000+ medlemmar.
	// Sök på namn → visa bara den medlemmens relaterade träd
	// (fadder-kedjan uppåt + alla skyddslingar neråt). Zoom/panorering.
	import { hierarchy, tree, type HierarchyPointNode } from 'd3-hierarchy';
	import { linkHorizontal } from 'd3-shape';
	import { select } from 'd3-selection';
	import { zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom';
	import { flattenForest, focusForest, type FadderNode } from '$lib/fadder-tree';

	let { forest }: { forest: FadderNode[] } = $props();

	let query = $state('');
	let focusId = $state<string | null>(null);

	let all = $derived(flattenForest(forest));
	let suggestions = $derived(
		query.trim().length === 0
			? []
			: all.filter((m) => m.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8)
	);
	let focused = $derived(focusId ? all.find((m) => m.id === focusId) : null);
	let displayed = $derived(focusId ? focusForest(forest, focusId) : forest);

	// Layout: horisontellt träd, virtuell rot binder ihop skogen.
	const NODE_H = 30;
	const NODE_W = 190;
	type Datum = FadderNode & { virtual?: boolean };
	let layout = $derived.by(() => {
		const virtualRoot: Datum = {
			id: '__root',
			name: '',
			role: '',
			status: '',
			virtual: true,
			children: displayed
		};
		const root = hierarchy<Datum>(virtualRoot);
		tree<Datum>().nodeSize([NODE_H, NODE_W])(root);
		const pointRoot = root as HierarchyPointNode<Datum>;
		const nodes = pointRoot.descendants().filter((d) => !d.data.virtual);
		const links = pointRoot.links().filter((l) => !l.source.data.virtual);
		const xs = nodes.map((n) => n.x);
		const ys = nodes.map((n) => n.y);
		const pad = 30;
		return {
			nodes,
			links,
			minX: Math.min(...xs, 0) - pad,
			maxX: Math.max(...xs, 0) + pad,
			minY: Math.min(...ys, 0) - pad,
			maxY: Math.max(...ys, 0) + pad + 150 // plats för namnetiketter
		};
	});

	const linkPath = linkHorizontal<
		{ source: HierarchyPointNode<Datum>; target: HierarchyPointNode<Datum> },
		HierarchyPointNode<Datum>
	>()
		.x((d) => d.y)
		.y((d) => d.x);

	const roleColor: Record<string, string> = {
		admin: 'var(--color-gold-500)',
		captain: 'var(--color-gold-500)',
		fadder: 'var(--color-club-600)',
		member: 'var(--color-club-800)',
		aspirant: 'var(--color-gold-300)'
	};

	// Zoom/panorering i pixelkoordinater. Startläget anpassas till trädets
	// storlek och zoomgränserna beräknas dynamiskt — ett träd på 1000
	// medlemmar ska gå att både överblicka och zooma in till läsbar text.
	let svgEl = $state<SVGSVGElement | null>(null);
	let gEl = $state<SVGGElement | null>(null);
	let wrapEl = $state<HTMLDivElement | null>(null);
	let isFullscreen = $state(false);
	let zoomBehavior: ZoomBehavior<SVGSVGElement, unknown> | null = null;

	async function toggleFullscreen() {
		if (document.fullscreenElement) await document.exitFullscreen();
		else await wrapEl?.requestFullscreen();
	}

	function fitView() {
		if (!svgEl || !zoomBehavior) return;
		const w = svgEl.clientWidth;
		const h = svgEl.clientHeight;
		const treeW = layout.maxY - layout.minY;
		const treeH = layout.maxX - layout.minX;
		const k = Math.min(w / treeW, h / treeH, 1);
		const tx = (w - k * (layout.minY + layout.maxY)) / 2;
		const ty = (h - k * (layout.minX + layout.maxX)) / 2;
		// tillåt alltid att zooma ut till helbild och in till 12x läsläge
		zoomBehavior.scaleExtent([Math.min(k, 0.05), 12]);
		select(svgEl).call(zoomBehavior.transform, zoomIdentity.translate(tx, ty).scale(k));
	}

	$effect(() => {
		if (!svgEl || !gEl) return;
		const g = gEl;
		zoomBehavior = zoom<SVGSVGElement, unknown>().on('zoom', (e) =>
			select(g).attr('transform', e.transform.toString())
		);
		select(svgEl).call(zoomBehavior);
		fitView();

		// Anpassa vyn när fullskärmsläget slås av/på (ytan byter storlek)
		const onFsChange = () => {
			isFullscreen = !!document.fullscreenElement;
			requestAnimationFrame(() => fitView());
		};
		document.addEventListener('fullscreenchange', onFsChange);
		return () => document.removeEventListener('fullscreenchange', onFsChange);
	});

	// Anpassa vyn när fokus ändras (layouten byts)
	$effect(() => {
		void layout;
		fitView();
	});

	function pick(id: string) {
		focusId = id;
		query = '';
	}
</script>

<div
	bind:this={wrapEl}
	class={isFullscreen ? 'flex h-full flex-col overflow-hidden bg-cream-200 p-6' : ''}
>
	<div class="flex flex-wrap items-center gap-2">
		<div class="relative">
			<input
				type="search"
				bind:value={query}
				placeholder="Sök fadder eller medlem…"
				class="w-64 rounded-lg border-cream-300 bg-white text-sm"
			/>
			{#if suggestions.length > 0}
				<ul
					class="absolute z-10 mt-1 w-64 overflow-hidden rounded-lg border border-cream-300 bg-white shadow-lg"
				>
					{#each suggestions as m (m.id)}
						<li>
							<button
								type="button"
								onclick={() => pick(m.id)}
								class="w-full px-3 py-2 text-left text-sm hover:bg-club-100"
							>
								{m.name}
								<span class="text-xs text-club-900/50">
									{#if m.children.length > 0}· fadder åt {m.children.length}{/if}
								</span>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
		{#if focused}
			<span class="rounded-full bg-club-700/10 px-3 py-1 text-sm font-semibold text-club-700">
				{focused.name}s träd
			</span>
			<button
				type="button"
				onclick={() => (focusId = null)}
				class="text-sm text-club-900/60 underline hover:text-club-900">Visa hela trädet</button
			>
		{/if}
		<button
			type="button"
			onclick={fitView}
			class="rounded-lg border border-cream-300 bg-white px-3 py-1 text-sm text-club-900/70 hover:bg-club-100"
			>Anpassa vy</button
		>
		<button
			type="button"
			onclick={toggleFullscreen}
			class="rounded-lg border border-cream-300 bg-white px-3 py-1 text-sm text-club-900/70 hover:bg-club-100"
			>{isFullscreen ? 'Avsluta fullskärm' : 'Fullskärm'}</button
		>
		<span class="ml-auto text-xs text-club-900/50">
			{all.length} medlemmar · scrolla för zoom, dra för att panorera
		</span>
	</div>

	<svg
		bind:this={svgEl}
		class="mt-3 w-full cursor-grab rounded-xl bg-white/50 active:cursor-grabbing {isFullscreen
			? 'min-h-0 flex-1'
			: 'h-[520px]'}"
		role="img"
		aria-label="Fadderträd"
	>
		<g bind:this={gEl}>
			{#each layout.links as l (l.target.data.id)}
				<path
					d={linkPath(l) ?? ''}
					fill="none"
					stroke="var(--color-club-700)"
					stroke-opacity="0.25"
					stroke-width="1.5"
				/>
			{/each}
			{#each layout.nodes as n (n.data.id)}
				<g
					transform={`translate(${n.y},${n.x})`}
					class="cursor-pointer"
					onclick={() => pick(n.data.id)}
					onkeydown={(e) => e.key === 'Enter' && pick(n.data.id)}
					role="button"
					tabindex="0"
					aria-label={`Fokusera ${n.data.name}`}
				>
					<circle
						r="6"
						fill={roleColor[n.data.role] ?? 'var(--color-club-800)'}
						stroke={n.data.id === focusId ? 'var(--color-gold-500)' : 'none'}
						stroke-width="3"
					/>
					<text
						x="11"
						dy="4"
						font-size="12"
						fill="var(--color-club-900)"
						class="select-none"
						font-weight={n.data.id === focusId ? '700' : '400'}
					>
						{n.data.name}{n.data.status === 'aspirant' ? ' ◦' : ''}
					</text>
				</g>
			{/each}
		</g>
	</svg>
	<p class="mt-2 text-xs text-club-900/50">
		Klicka på en nod för att se dess relaterade träd. ◦ = aspirant. Guld = captain/admin, grön =
		fadder/medlem.
	</p>
</div>
