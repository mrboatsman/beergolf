<script lang="ts">
	// Handicap-trend som ren SVG — guldlinje med punkter, som designförslaget.
	let { points }: { points: number[] } = $props();

	const W = 640;
	const H = 210;
	const PAD = { l: 42, r: 16, t: 12, b: 26 };

	let lo = $derived(Math.min(...points));
	let hi = $derived(Math.max(...points));
	let span = $derived(hi - lo < 1 ? 1 : hi - lo);
	let yMin = $derived(lo - span * 0.15);
	let yMax = $derived(hi + span * 0.15);

	function x(i: number) {
		const n = Math.max(points.length - 1, 1);
		return PAD.l + (i / n) * (W - PAD.l - PAD.r);
	}
	function y(v: number) {
		return PAD.t + (1 - (v - yMin) / (yMax - yMin)) * (H - PAD.t - PAD.b);
	}

	let line = $derived(points.map((p, i) => `${x(i)},${y(p)}`).join(' '));
	let area = $derived(
		`M${x(0)},${y(points[0])} ` +
			points.map((p, i) => `L${x(i)},${y(p)}`).join(' ') +
			` L${x(points.length - 1)},${H - PAD.b} L${x(0)},${H - PAD.b} Z`
	);
	let ticks = $derived(Array.from({ length: 4 }, (_, i) => yMin + ((yMax - yMin) * (i + 0.5)) / 4));
	let labelEvery = $derived(Math.max(1, Math.ceil(points.length / 6)));
</script>

<svg viewBox={`0 0 ${W} ${H}`} class="w-full" role="img" aria-label="Handikapptrend">
	{#each ticks as t (t)}
		<line
			x1={PAD.l}
			x2={W - PAD.r}
			y1={y(t)}
			y2={y(t)}
			stroke="currentColor"
			stroke-opacity="0.12"
		/>
		<text
			x={PAD.l - 8}
			y={y(t) + 3}
			text-anchor="end"
			font-size="11"
			fill="currentColor"
			fill-opacity="0.55">{t.toFixed(1)}</text
		>
	{/each}
	<path d={area} fill="var(--color-club-700)" fill-opacity="0.06" />
	<polyline
		points={line}
		fill="none"
		stroke="var(--color-gold-500)"
		stroke-width="2.5"
		stroke-linejoin="round"
		stroke-linecap="round"
	/>
	{#each points as p, i (i)}
		<circle cx={x(i)} cy={y(p)} r="3.2" fill="var(--color-club-800)" />
		{#if i % labelEvery === 0 || i === points.length - 1}
			<text
				x={x(i)}
				y={H - 8}
				text-anchor="middle"
				font-size="11"
				fill="currentColor"
				fill-opacity="0.55">R{i + 1}</text
			>
		{/if}
	{/each}
	<circle
		cx={x(points.length - 1)}
		cy={y(points[points.length - 1])}
		r="5"
		fill="var(--color-gold-500)"
	/>
</svg>
