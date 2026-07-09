<script lang="ts">
	import { enhance } from '$app/forms';
	import { ETIQUETTE_CRITERIA } from '$lib/etiquette';
	let { data, form } = $props();

	let s = $derived(data.status);
	let doneCount = $derived(
		[s.theory.passed, s.practical.passed, s.etiquette.passed].filter(Boolean).length
	);

	// Modal: vilken aspirant etikett-godkännandet gäller (null = stängd)
	let etiquetteFor = $state<{ id: string; name: string } | null>(null);

	// Namnfilter — det kan bli många aspiranter samtidigt
	let aspirantFilter = $state('');
	let filteredAspirants = $derived(
		data.aspirants.filter((a) => a.name.toLowerCase().includes(aspirantFilter.trim().toLowerCase()))
	);

	function fmtDate(d: Date | string) {
		return new Date(d).toLocaleDateString('sv-SE');
	}
</script>

<p class="text-xs font-semibold tracking-[0.2em] text-gold-600 uppercase">Certifiering</p>
<h1 class="font-display mt-1 text-4xl font-semibold">Grönt Kort</h1>

{#if form?.error}
	<p class="mt-4 rounded bg-red-100 px-3 py-2 text-sm text-red-700">{form.error}</p>
{/if}
{#if form?.approved}
	<p class="mt-4 rounded bg-club-100 px-3 py-2 text-sm text-club-700">
		{form.approved === 'practical' ? 'Praktiskt prov' : 'Etikett & hänsyn'} godkänt för
		{form.aspirantName}.
		{#if form.issued}<strong>Alla delar klara — Grönt Kort utfärdat! 🍺⛳</strong>{/if}
		{#if form.promoted}<strong>Du är nu fadder.</strong>{/if}
	</p>
{/if}

{#if data.me.greenCardIssuedAt}
	<!-- Utfärdat kort -->
	<div class="mt-6 max-w-md rounded-2xl bg-club-800 p-6 text-cream-200 shadow-md">
		<div class="flex items-start justify-between">
			<span class="text-xs font-semibold tracking-[0.2em] text-gold-400 uppercase">
				Grönt Kort
			</span>
			<span class="font-display text-2xl font-semibold text-gold-300"
				>Nr {data.me.memberNumber}</span
			>
		</div>
		<div class="font-display mt-3 text-3xl font-semibold">{data.me.name}</div>
		<div class="mt-1 text-sm text-cream-200/70">
			Certifierad {fmtDate(data.me.greenCardIssuedAt)}
			{#if s.fadderName}· Fadder: {s.fadderName}{/if}
		</div>
		<div class="mt-4 border-t border-cream-200/15 pt-3 text-xs text-cream-200/60">
			Play Slow. En klunk per hål. Hederssystemet gäller.
		</div>
	</div>
{:else if data.me.isAspirant}
	<p class="mt-2 max-w-2xl text-sm text-club-900/70">
		Tre delar krävs innan klubbhuset låses upp: teoriprov, praktiskt prov på provslingan och godkänd
		etikett &amp; hänsyn — de två senare bedöms av en fadder (certifierad medlem).
	</p>
	<p class="mt-3 text-sm font-semibold text-club-900">{doneCount} av 3 delar klara</p>
{/if}

{#if !data.me.isAspirant && !data.me.greenCardIssuedAt}
	<p class="mt-2 max-w-2xl text-sm text-club-900/70">
		Du är certifierad urmedlem — medlem sedan före grönt kort-systemet.
	</p>
{/if}

{#if data.me.isAspirant}
	<!-- De tre delarna -->
	<div class="mt-6 grid gap-4 md:grid-cols-3">
		<div
			class="rounded-2xl bg-parchment p-5 shadow-sm {s.theory.passed
				? 'ring-2 ring-club-700/30'
				: ''}"
		>
			<div class="flex items-center justify-between">
				<span class="text-xs font-semibold tracking-[0.18em] text-club-900/60 uppercase">Del 1</span
				>
				{#if s.theory.passed}<span class="text-club-700">✓</span>{/if}
			</div>
			<h2 class="font-display mt-1 text-2xl font-semibold">Teoriprov</h2>
			{#if s.theory.passed}
				<p class="mt-2 text-sm text-club-700">
					Godkänt{#if s.theory.score !== null}
						med {Math.round(s.theory.score * 100)} %{/if}{#if s.theory.at}
						({fmtDate(s.theory.at)}){/if}.
				</p>
			{:else}
				<p class="mt-2 text-sm text-club-900/70">
					Regler, säkerhet och klubbhistoria. Godkänt vid 80 %.
				</p>
				{#if data.me.isAspirant}
					<a
						href="/quiz"
						class="mt-3 inline-block rounded-lg bg-club-700 px-4 py-2 text-sm font-semibold text-cream-200 hover:bg-club-800"
						>Gör provet</a
					>
				{/if}
			{/if}
		</div>

		<div
			class="rounded-2xl bg-parchment p-5 shadow-sm {s.practical.passed
				? 'ring-2 ring-club-700/30'
				: ''}"
		>
			<div class="flex items-center justify-between">
				<span class="text-xs font-semibold tracking-[0.18em] text-club-900/60 uppercase">Del 2</span
				>
				{#if s.practical.passed}<span class="text-club-700">✓</span>{/if}
			</div>
			<h2 class="font-display mt-1 text-2xl font-semibold">Praktiskt prov</h2>
			{#if s.practical.passed}
				<p class="mt-2 text-sm text-club-700">
					Godkänt{#if s.practical.at}
						({fmtDate(s.practical.at)}){/if}{#if s.fadderName}
						av {s.fadderName}{/if}.
				</p>
				{#if s.practical.comment}
					<p class="mt-2 text-sm text-club-900/70 italic">”{s.practical.comment}”</p>
				{/if}
				{#if s.practical.proofs.length > 0}
					<div class="mt-3 grid grid-cols-2 gap-2">
						{#each s.practical.proofs as p (p.id)}
							{#if p.contentType.startsWith('image/')}
								<a href={p.url} target="_blank" rel="noreferrer">
									<img
										src={p.url}
										alt={p.filename}
										class="h-24 w-full rounded-lg object-cover shadow-sm"
									/>
								</a>
							{:else}
								<!-- svelte-ignore a11y_media_has_caption -->
								<video src={p.url} controls class="h-24 w-full rounded-lg bg-black shadow-sm"
								></video>
							{/if}
						{/each}
					</div>
				{/if}
			{:else}
				<p class="mt-2 text-sm text-club-900/70">
					Provslingan under uppsikt av fadder: korrekt fyllning, kontrollerad klunk per hål, godkänt
					utslag nära pinnen och rätt fört protokoll.
				</p>
			{/if}
		</div>

		<div
			class="rounded-2xl bg-parchment p-5 shadow-sm {s.etiquette.passed
				? 'ring-2 ring-club-700/30'
				: ''}"
		>
			<div class="flex items-center justify-between">
				<span class="text-xs font-semibold tracking-[0.18em] text-club-900/60 uppercase">Del 3</span
				>
				{#if s.etiquette.passed}<span class="text-club-700">✓</span>{/if}
			</div>
			<h2 class="font-display mt-1 text-2xl font-semibold">Etikett &amp; hänsyn</h2>
			{#if s.etiquette.passed}
				<p class="mt-2 text-sm text-club-700">Godkänd av fadder.</p>
			{:else if data.theorySubmitted}
				<p class="mt-2 text-sm text-club-900/70">Faddern bedömer löpande under provslingan:</p>
				<ul class="mt-2 space-y-1 text-sm text-club-900/70">
					{#each ETIQUETTE_CRITERIA as c (c)}
						<li class="flex gap-2"><span class="text-club-700">·</span>{c}</li>
					{/each}
				</ul>
			{:else}
				<p class="mt-2 text-sm text-club-900/70">
					Bedöms löpande under provslingan. Kriterierna visas när du lämnat in teoriprovet.
				</p>
			{/if}
		</div>
	</div>
{/if}

<!-- Fadder-vy: examinera aspiranter -->
{#if !data.me.isAspirant}
	<section class="mt-10">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<h2 class="font-display text-2xl font-semibold">Aspiranter ({data.aspirants.length})</h2>
			{#if data.aspirants.length > 1}
				<input
					type="search"
					bind:value={aspirantFilter}
					placeholder="Filtrera på namn…"
					class="w-56 rounded-lg border-cream-300 bg-white text-sm"
				/>
			{/if}
		</div>
		{#if data.aspirants.length === 0}
			<p class="mt-2 text-sm text-club-900/60">Inga aspiranter väntar på examination.</p>
		{:else if filteredAspirants.length === 0}
			<p class="mt-2 text-sm text-club-900/60">Ingen aspirant matchar ”{aspirantFilter}”.</p>
		{:else}
			<div class="mt-3 space-y-3">
				{#each filteredAspirants as a (a.id)}
					<div class="rounded-2xl bg-parchment p-5 shadow-sm">
						<div class="flex flex-wrap items-center justify-between gap-2">
							<div class="font-semibold">{a.name}</div>
							<div class="flex gap-2 text-xs">
								<span
									class="rounded-full px-2.5 py-0.5 font-semibold {a.theory
										? 'bg-club-700/10 text-club-700'
										: 'bg-cream-300 text-club-900/50'}">Teori {a.theory ? '✓' : '–'}</span
								>
								<span
									class="rounded-full px-2.5 py-0.5 font-semibold {a.practical
										? 'bg-club-700/10 text-club-700'
										: 'bg-cream-300 text-club-900/50'}">Praktik {a.practical ? '✓' : '–'}</span
								>
								<span
									class="rounded-full px-2.5 py-0.5 font-semibold {a.etiquette
										? 'bg-club-700/10 text-club-700'
										: 'bg-cream-300 text-club-900/50'}">Etikett {a.etiquette ? '✓' : '–'}</span
								>
							</div>
						</div>
						<div class="mt-3 flex flex-wrap items-end gap-2">
							{#if !a.practical}
								<form
									method="POST"
									action="?/approvePractical"
									enctype="multipart/form-data"
									use:enhance
									class="w-full space-y-2"
								>
									<input type="hidden" name="memberId" value={a.id} />
									<label class="block text-xs">
										<span class="text-club-900/60">Omdöme från provslingan (valfritt)</span>
										<textarea
											name="comment"
											rows="2"
											placeholder="Fyllde korrekt, kontrollerad klunk per hål, fint utslag på hål 2…"
											class="mt-1 w-full rounded-lg border-cream-300 bg-white text-sm"></textarea>
									</label>
									<label class="block text-xs">
										<span class="text-club-900/60"
											>Bevis — minst en bild eller film krävs. Missade ni att ta bevis? Rekonstruera
											situationen.</span
										>
										<input
											name="files"
											type="file"
											multiple
											required
											accept="image/*,video/*"
											class="mt-1 block w-full text-sm text-club-900/70 file:mr-3 file:rounded-lg file:border-0 file:bg-club-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-club-700"
										/>
									</label>
									<button
										class="rounded-lg bg-club-700 px-3 py-2 text-sm font-semibold text-cream-200 hover:bg-club-800"
										>Godkänn praktiskt prov</button
									>
								</form>
							{/if}
							{#if !a.etiquette}
								<button
									type="button"
									onclick={() => (etiquetteFor = { id: a.id, name: a.name })}
									class="rounded-lg bg-gold-500 px-3 py-2 text-sm font-semibold text-club-900 hover:bg-gold-400"
									>Godkänn etikett &amp; hänsyn</button
								>
							{/if}
							{#if !a.theory}
								<span class="text-xs text-club-900/50">Teoriprovet gör aspiranten själv.</span>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</section>
{/if}

<!-- Modal: bekräfta etikett & hänsyn mot kriterierna -->
{#if etiquetteFor}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-club-950/60 p-4"
		role="presentation"
		onclick={(e) => {
			if (e.target === e.currentTarget) etiquetteFor = null;
		}}
	>
		<div
			class="w-full max-w-md rounded-2xl bg-parchment p-6 shadow-xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby="etiquette-title"
		>
			<p class="text-xs font-semibold tracking-[0.2em] text-gold-600 uppercase">
				Etikett &amp; hänsyn
			</p>
			<h3 id="etiquette-title" class="font-display mt-1 text-2xl font-semibold">
				{etiquetteFor.name}
			</h3>
			<p class="mt-2 text-sm text-club-900/70">
				Genom att godkänna intygar du att aspiranten under provslingan visat:
			</p>
			<ul class="mt-3 space-y-2 text-sm">
				{#each ETIQUETTE_CRITERIA as c (c)}
					<li class="flex gap-2"><span class="font-semibold text-club-700">✓</span>{c}</li>
				{/each}
			</ul>
			<div class="mt-5 flex justify-end gap-2">
				<button
					type="button"
					onclick={() => (etiquetteFor = null)}
					class="rounded-lg px-4 py-2 text-sm font-semibold text-club-900/70 hover:bg-cream-300"
					>Avbryt</button
				>
				<form
					method="POST"
					action="?/approveEtiquette"
					use:enhance={() => {
						etiquetteFor = null;
						return async ({ update }) => update();
					}}
				>
					<input type="hidden" name="memberId" value={etiquetteFor.id} />
					<button
						class="rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-club-900 hover:bg-gold-400"
						>OK — godkänn</button
					>
				</form>
			</div>
		</div>
	</div>
{/if}
