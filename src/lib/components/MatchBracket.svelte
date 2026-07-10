<script lang="ts">
	import { enhance } from '$app/forms';
	import type { Bracket, BracketMatch } from '$lib/server/tournaments';

	// Cupstege med finalen (och mästaren) i mitten: första omgångens vänstra
	// halva till vänster, högra halvan till höger, omgångarna konvergerar inåt.
	let {
		bracket,
		interactive = false,
		isStaff = false
	}: { bracket: Bracket; interactive?: boolean; isStaff?: boolean } = $props();

	let totalRounds = $derived(bracket.rounds.length);
	let final = $derived(bracket.rounds.at(-1)?.[0] ?? null);
	let champion = $derived(
		final?.winnerId
			? final.participant1?.id === final.winnerId
				? final.participant1
				: final.participant2
			: null
	);

	// Vänster/höger halva per omgång (utom finalen). Omgång r: slots < hälften → vänster.
	function half(round: number, side: 'left' | 'right'): BracketMatch[] {
		const matches = bracket.rounds[round - 1] ?? [];
		if (round === totalRounds) return [];
		const mid = Math.ceil(matches.length / 2);
		return side === 'left' ? matches.slice(0, mid) : matches.slice(mid);
	}

	let leftRounds = $derived(Array.from({ length: totalRounds - 1 }, (_, i) => half(i + 1, 'left')));
	let rightRounds = $derived(
		Array.from({ length: totalRounds - 1 }, (_, i) => half(i + 1, 'right')).reverse()
	);

	const ROUND_NAME = (round: number) => {
		const fromEnd = totalRounds - round;
		if (fromEnd === 0) return 'Final';
		if (fromEnd === 1) return 'Semifinal';
		if (fromEnd === 2) return 'Kvartsfinal';
		return `Omgång ${round}`;
	};
</script>

{#snippet playerLine(m: BracketMatch, which: 1 | 2)}
	{@const p = which === 1 ? m.participant1 : m.participant2}
	{@const net = which === 1 ? m.net1 : m.net2}
	{@const won = !!p && m.winnerId === p.id}
	<div
		class={`flex items-center justify-between gap-2 px-2.5 py-1 text-xs ${won ? 'font-bold text-gold-600' : m.winnerId && p ? 'text-club-900/40 line-through' : ''}`}
	>
		<span class="truncate">
			{#if p}
				{p.name}{p.isGuest ? ' (gäst)' : ''}
			{:else if m.bye}
				<span class="text-club-900/30 italic">frilottad</span>
			{:else}
				<span class="text-club-900/30 italic">väntar…</span>
			{/if}
		</span>
		<span class="flex shrink-0 items-center gap-1">
			{#if net !== null}<span class="tabular-nums text-club-900/50">{net}</span>{/if}
			{#if won}🏅{/if}
		</span>
	</div>
{/snippet}

{#snippet matchCard(m: BracketMatch)}
	<div class="rounded-lg bg-parchment shadow-sm">
		{@render playerLine(m, 1)}
		<div class="border-t border-cream-300"></div>
		{#if !m.bye}
			{@render playerLine(m, 2)}
		{:else}
			<div class="px-2.5 py-1 text-xs text-club-900/30 italic">vidare direkt</div>
		{/if}
		{#if interactive && !m.bye && m.participant1 && m.participant2}
			<div class="flex flex-wrap items-center gap-2 border-t border-cream-300 px-2.5 py-1">
				{#if m.coasterId}
					<a href={`/coasters/${m.coasterId}`} class="text-[11px] text-gold-600 underline"
						>coaster</a
					>
				{:else if isStaff || !m.winnerId}
					<form method="POST" action="?/createMatchCoaster" use:enhance>
						<input type="hidden" name="matchId" value={m.id} />
						<button class="text-[11px] text-gold-600 hover:underline">skapa coaster</button>
					</form>
				{/if}
				{#if isStaff && !m.winnerId}
					<form method="POST" action="?/setWinner" use:enhance class="inline">
						<input type="hidden" name="matchId" value={m.id} />
						<input type="hidden" name="winnerId" value={m.participant1.id} />
						<button class="text-[11px] text-club-900/40 hover:text-club-900 hover:underline"
							>1 vann</button
						>
					</form>
					<form method="POST" action="?/setWinner" use:enhance class="inline">
						<input type="hidden" name="matchId" value={m.id} />
						<input type="hidden" name="winnerId" value={m.participant2.id} />
						<button class="text-[11px] text-club-900/40 hover:text-club-900 hover:underline"
							>2 vann</button
						>
					</form>
				{/if}
			</div>
		{/if}
	</div>
{/snippet}

<div class="overflow-x-auto pb-2">
	<div class="flex min-w-fit items-stretch gap-3">
		<!-- Vänstra halvan: omgång 1 → semifinal -->
		{#each leftRounds as matches, i (i)}
			{#if matches.length}
				<div class="flex w-44 shrink-0 flex-col">
					<p
						class="mb-2 text-center text-[10px] font-semibold tracking-widest text-club-900/40 uppercase"
					>
						{ROUND_NAME(i + 1)}
					</p>
					<div class="flex flex-1 flex-col justify-around gap-2">
						{#each matches as m (m.id)}
							{@render matchCard(m)}
						{/each}
					</div>
				</div>
			{/if}
		{/each}

		<!-- Mitten: finalen + mästaren -->
		{#if final}
			<div class="flex w-52 shrink-0 flex-col justify-center">
				<div class="rounded-2xl border-2 border-gold-400 bg-club-800 p-3 text-cream-200 shadow-md">
					<p class="text-center text-[10px] font-semibold tracking-widest text-gold-400 uppercase">
						{champion ? 'Mästare' : 'Final'}
					</p>
					{#if champion}
						<p class="font-display mt-1 text-center text-2xl font-semibold">
							🏆 {champion.name}
						</p>
						{#if champion.isGuest}<p class="text-center text-xs text-cream-200/60">gäst</p>{/if}
					{/if}
					<div class="mt-2 rounded-lg bg-cream-200 text-club-900">
						{@render matchCard(final)}
					</div>
				</div>
			</div>
		{/if}

		<!-- Högra halvan: semifinal → omgång 1 -->
		{#each rightRounds as matches, i (i)}
			{#if matches.length}
				<div class="flex w-44 shrink-0 flex-col">
					<p
						class="mb-2 text-center text-[10px] font-semibold tracking-widest text-club-900/40 uppercase"
					>
						{ROUND_NAME(totalRounds - 1 - i)}
					</p>
					<div class="flex flex-1 flex-col justify-around gap-2">
						{#each matches as m (m.id)}
							{@render matchCard(m)}
						{/each}
					</div>
				</div>
			{/if}
		{/each}
	</div>
</div>
