<script lang="ts">
	import { enhance } from '$app/forms';
	let { data, form } = $props();

	let result = $derived(form?.result);

	const categoryLabel: Record<string, string> = {
		regler: 'Regelkunskap',
		säkerhet: 'Säkerhet',
		historia: 'Klubbhistoria'
	};

	function fmtDate(d: Date | string) {
		return new Date(d).toLocaleDateString('sv-SE');
	}
	function pct(n: number) {
		return `${Math.round(n * 100)} %`;
	}
</script>

<p class="text-xs font-semibold tracking-[0.2em] text-gold-600 uppercase">Grönt kort · Del 1</p>
<h1 class="font-display mt-1 text-4xl font-semibold">Teoriprov</h1>
<p class="mt-2 max-w-2xl text-sm text-club-900/70">
	Regelkunskap, säkerhet och klubbhistoria. Godkänt vid minst {Math.round(
		data.passThreshold * 100
	)}&nbsp;% rätt. Hederssystemet gäller — inga hjälpmedel.
</p>

{#if data.theory.passed}
	<div class="mt-4 flex items-center gap-3 rounded-xl bg-club-100 px-4 py-3 text-sm text-club-700">
		<span class="text-lg">✓</span>
		<span>
			<strong>Teoriprovet är godkänt</strong>
			{#if data.theory.score !== null}med {pct(data.theory.score)}{/if}
			{#if data.theory.at}({fmtDate(data.theory.at)}){/if} — del 1 av grönt kort klar.
		</span>
	</div>
{/if}

{#if form?.error}
	<p class="mt-4 rounded bg-red-100 px-3 py-2 text-sm text-red-700">{form.error}</p>
{/if}

{#if result}
	<!-- Resultatvy -->
	<div
		class="mt-6 rounded-2xl p-6 shadow-md {result.passed
			? 'bg-club-800 text-cream-200'
			: 'bg-parchment'}"
	>
		<p
			class="text-xs font-semibold tracking-[0.2em] uppercase {result.passed
				? 'text-gold-400'
				: 'text-club-900/60'}"
		>
			Resultat
		</p>
		<div class="font-display mt-1 text-5xl font-semibold">
			{pct(result.score)}
		</div>
		<p class="mt-2 text-sm {result.passed ? 'text-cream-200/80' : 'text-club-900/70'}">
			{result.correctCount} av {result.total} rätt —
			{#if result.passed}
				<strong>Godkänt!</strong> Del 1 av grönt kort är klar. Nästa steg: provslingan med din fadder.
			{:else}
				<strong>Ej godkänt.</strong> Läs på reglerna och försök igen.
			{/if}
		</p>
		<a
			href="/quiz"
			data-sveltekit-reload
			class="mt-4 inline-block rounded-lg px-4 py-2 text-sm font-semibold {result.passed
				? 'bg-gold-500 text-club-900 hover:bg-gold-400'
				: 'bg-club-700 text-cream-200 hover:bg-club-800'}"
		>
			{result.passed ? 'Tillbaka' : 'Försök igen'}
		</a>
	</div>
{:else if data.questions.length === 0}
	<p class="mt-6 text-sm text-club-900/60">Inga frågor upplagda ännu — hör av dig till admin.</p>
{:else}
	<!-- Provet -->
	<form method="POST" action="?/submit" use:enhance class="mt-6 space-y-4">
		{#each data.questions as q, qi (q.id)}
			<fieldset class="rounded-2xl bg-parchment p-5 shadow-sm">
				<legend class="sr-only">Fråga {qi + 1}</legend>
				<div class="flex items-baseline justify-between gap-3">
					<p class="font-semibold">
						<span class="font-display mr-1 text-xl">{qi + 1}.</span>
						{q.question}
					</p>
					<span
						class="shrink-0 rounded-full bg-club-700/10 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider text-club-700 uppercase"
						>{categoryLabel[q.category] ?? q.category}</span
					>
				</div>
				<div class="mt-3 space-y-1.5">
					{#each q.options as opt, oi (oi)}
						<label
							class="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-club-100/60"
						>
							<input
								type="radio"
								name={`q_${q.id}`}
								value={oi}
								required
								class="border-club-600 text-club-700 focus:ring-gold-400"
							/>
							<span class="text-sm">{opt}</span>
						</label>
					{/each}
				</div>
			</fieldset>
		{/each}
		<button
			class="rounded-lg bg-club-700 px-6 py-2.5 font-semibold text-cream-200 hover:bg-club-800"
			>Lämna in provet</button
		>
	</form>
{/if}

<!-- Försökshistorik -->
{#if data.attempts.length > 0}
	<section class="mt-10">
		<h2 class="font-display text-2xl font-semibold">Mina försök</h2>
		<div class="mt-3 overflow-hidden rounded-2xl bg-parchment shadow-sm">
			<table class="w-full text-left text-sm">
				<thead class="bg-club-800 text-cream-200">
					<tr>
						<th class="px-4 py-2">Datum</th>
						<th class="px-4 py-2">Resultat</th>
						<th class="px-4 py-2">Status</th>
					</tr>
				</thead>
				<tbody>
					{#each data.attempts as a (a.id)}
						<tr class="border-t border-cream-300">
							<td class="px-4 py-2">{fmtDate(a.takenAt)}</td>
							<td class="px-4 py-2 font-semibold">{pct(a.score)}</td>
							<td class="px-4 py-2">
								{#if a.passed}
									<span class="font-semibold text-club-700">Godkänt</span>
								{:else}
									<span class="text-club-900/50">Ej godkänt</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>
{/if}
