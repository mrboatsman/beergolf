<script lang="ts">
	import { formatKr } from '$lib/money';
	import type { Report } from '$lib/server/tournaments';

	let {
		report,
		charityName,
		showReceipts = false
	}: { report: Report; charityName: string | null; showReceipts?: boolean } = $props();

	function fmtDate(d: Date | string | null) {
		return d ? new Date(d).toLocaleDateString('sv-SE') : null;
	}
</script>

<!-- Transparensen är poängen: varje krona in och ut redovisas öppet. -->
<div class="mt-3 overflow-x-auto rounded-2xl bg-parchment shadow-sm">
	<table class="w-full text-sm">
		<tbody>
			<tr class="border-b border-cream-300">
				<td class="px-4 py-2 font-semibold">
					Anmälningsavgifter ({report.paidCount} betalda)
					<span class="ml-1 font-normal text-club-900/50">
						{#if report.byVia.stripe}{report.byVia.stripe} via Stripe{/if}
						{#if report.byVia.manual}· {report.byVia.manual} manuellt{/if}
						{#if report.byVia.free}· {report.byVia.free} fria{/if}
					</span>
				</td>
				<td class="px-4 py-2 text-right font-semibold">{formatKr(report.grossIncomeOre)}</td>
			</tr>
			<tr class="border-b border-cream-300 text-club-900/70">
				<td class="px-4 py-2">Stripe-avgifter</td>
				<td class="px-4 py-2 text-right">−{formatKr(report.stripeFeesOre)}</td>
			</tr>
			{#each report.expenses as e (e.id)}
				<tr class="border-b border-cream-300 text-club-900/70">
					<td class="px-4 py-2">
						{e.description}
						{#if showReceipts && e.receiptKey}
							<a href={`/files/${e.receiptKey}`} class="ml-1 text-xs text-gold-600 underline"
								>kvitto</a
							>
						{/if}
					</td>
					<td class="px-4 py-2 text-right">−{formatKr(e.amountOre)}</td>
				</tr>
			{/each}
			{#each report.prizes as p (p.tier.place)}
				<tr class="border-b border-cream-300 text-club-900/70">
					<td class="px-4 py-2">
						Pris plats {p.tier.place}{p.winnerName ? ` — ${p.winnerName}` : ''}
						{#if p.tier.percent}
							<span class="text-xs text-club-900/50">({p.tier.percent} % av potten)</span>
						{/if}
					</td>
					<td class="px-4 py-2 text-right">−{formatKr(p.amountOre)}</td>
				</tr>
			{/each}
			<tr class="bg-club-800 text-cream-200">
				<td class="font-display px-4 py-3 text-lg font-semibold">
					Till {charityName ?? 'välgörenheten'}
				</td>
				<td class="font-display px-4 py-3 text-right text-lg font-semibold text-gold-400">
					{formatKr(report.charityComputedOre)}
				</td>
			</tr>
		</tbody>
	</table>
</div>

{#if report.charityPaidAt}
	<p class="mt-2 text-sm">
		✅ {formatKr(report.charityPaidOre ?? 0)} utbetalt till {charityName ?? 'välgörenheten'} den
		{fmtDate(report.charityPaidAt)}
		{#if showReceipts && report.charityReceiptKey}
			— <a href={`/files/${report.charityReceiptKey}`} class="text-gold-600 underline">kvitto</a>
		{/if}
	</p>
	{#if report.mismatch}
		<p class="mt-1 rounded bg-gold-400/20 px-3 py-2 text-sm text-gold-600">
			⚠️ Utbetalt belopp skiljer sig från beräknat ({formatKr(report.charityComputedOre)}).
		</p>
	{/if}
{:else}
	<p class="mt-2 text-sm text-club-900/60">Utbetalningen till välgörenheten är inte bokförd än.</p>
{/if}
