<script lang="ts">
	import Avatar from '$lib/components/Avatar.svelte';
	import ProofLightbox from '$lib/components/ProofLightbox.svelte';
	import WelcomeModal from '$lib/components/WelcomeModal.svelte';
	import HcpTrend from './HcpTrend.svelte';
	import type { Dashboard } from '$lib/server/dashboard';

	let { dashboard, isSelf = false }: { dashboard: Dashboard; isSelf?: boolean } = $props();

	let d = $derived(dashboard);

	// Hälsning efter besökarens klocka (lokal tid i webbläsaren)
	function timeGreeting(h: number) {
		if (h < 5) return 'Godnatt';
		if (h < 10) return 'God morgon';
		if (h < 12) return 'God dag';
		if (h < 18) return 'God eftermiddag';
		if (h < 23) return 'God kväll';
		return 'Godnatt';
	}

	let greeting = $derived.by(() => {
		if (!isSelf) return d.member.name;
		return `${timeGreeting(new Date().getHours())}, ${d.member.name.split(' ')[0]}`;
	});

	let ongoing = $derived(d.matches.filter((m) => !m.finished));
	let finished = $derived(d.matches.filter((m) => m.finished));
	let certDone = $derived(
		[d.cert.theory.passed, d.cert.practical.passed, d.cert.etiquette.passed].filter(Boolean).length
	);

	// Helskärmsvisare för bevis (null = stängd)
	let proofIndex = $state<number | null>(null);

	// Info-modal: bevismaterial, teoriprov-resultat och fadderns omdöme
	let showCertInfo = $state(false);

	function fmtDate(dt: Date | string) {
		return new Date(dt).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
	}
	function toPar(n: number) {
		return n > 0 ? `+${n}` : n === 0 ? '±0' : `${n}`;
	}
</script>

<!-- Rubrikrad -->
<div class="flex flex-wrap items-end justify-between gap-2">
	<div>
		<p class="text-xs font-semibold tracking-[0.2em] text-gold-600 uppercase">
			{isSelf ? "Members' lounge" : 'Medlemsprofil'}
		</p>
		<div class="mt-1 flex items-center gap-3">
			<Avatar
				name={d.member.name}
				src={d.member.avatarUrl}
				class="h-14 w-14 text-xl sm:h-16 sm:w-16"
			/>
			<h1 class="font-display text-4xl font-semibold sm:text-5xl">{greeting}</h1>
		</div>
	</div>
	<div class="text-right text-sm text-club-900/60">
		<div>Säsong {d.seasonYear}</div>
		{#if d.member.memberNumber}<div>Grönt Kort nr {d.member.memberNumber}</div>{/if}
	</div>
</div>

{#if isSelf && d.pendingAspirants.length}
	<!-- Fadder-att-göra: aspiranter som väntar på godkännande/bevis -->
	<section class="mt-6 rounded-2xl border border-gold-400/60 bg-parchment p-5 shadow-sm">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<h2 class="font-display text-2xl font-semibold text-club-900">
				Dina aspiranter väntar
				<span class="ml-1 rounded-full bg-gold-400 px-2.5 py-0.5 align-middle text-sm font-bold"
					>{d.pendingAspirants.length}</span
				>
			</h2>
			<a href="/certification" class="text-sm font-semibold text-club-700 hover:underline"
				>Alla aspiranter →</a
			>
		</div>
		<p class="mt-1 text-sm text-club-900/70">
			Du är fadder för dessa. Ladda upp bevis från provslingan och godkänn så de får sitt gröna
			kort.
		</p>
		<ul class="mt-3 divide-y divide-cream-300">
			{#each d.pendingAspirants as a (a.id)}
				<li class="flex flex-wrap items-center justify-between gap-2 py-2.5">
					<div class="min-w-0">
						<a href={`/members/${a.id}`} class="font-semibold text-club-900 hover:underline"
							>{a.name}</a
						>
						<div class="mt-0.5 flex flex-wrap gap-1">
							{#each a.missing as m (m)}
								<span
									class="rounded-full bg-cream-300 px-2 py-0.5 text-[11px] font-semibold text-club-900/70"
									>{m} saknas</span
								>
							{/each}
						</div>
					</div>
					<a
						href={`/certification?aspirant=${a.id}`}
						class="rounded-lg bg-club-700 px-3 py-1.5 text-xs font-semibold text-cream-200 hover:bg-club-800"
						>Ladda upp bevis & godkänn →</a
					>
				</li>
			{/each}
		</ul>
	</section>
{/if}

<!-- Hero: HCP + statkort -->
<div class="mt-6 grid gap-4 lg:grid-cols-[3fr_2fr]">
	<div class="rounded-2xl bg-club-800 p-6 text-cream-200 shadow-md sm:p-7">
		<div class="flex items-start justify-between">
			<span class="text-xs font-semibold tracking-[0.2em] text-gold-400 uppercase"> Handicap </span>
			<a
				href="/members"
				class="text-xs font-semibold tracking-widest text-gold-300 uppercase hover:underline"
				>#{d.member.rank} av {d.member.memberCount} på leaderboarden</a
			>
		</div>
		<div class="mt-2 flex items-center gap-4">
			<span class="font-display text-7xl leading-none font-semibold">{d.member.hcp}</span>
			{#if d.stats.roundsSeason > 0 && d.stats.hcpChange !== 0}
				<span
					class="rounded-full bg-club-950/60 px-3 py-1 text-sm font-semibold {d.stats.hcpChange < 0
						? 'text-gold-300'
						: 'text-cream-200/70'}"
				>
					{d.stats.hcpChange < 0 ? '▾' : '▴'}
					{Math.abs(d.stats.hcpChange)} denna säsong
				</span>
			{/if}
		</div>
		<div class="mt-5 border-t border-cream-200/15 pt-3 text-sm text-cream-200/70">
			{#if d.stats.lowestHcp !== null}
				Lägst i år <strong class="text-cream-200">{d.stats.lowestHcp}</strong>
				· {d.stats.roundsSeason}
				{d.stats.roundsSeason === 1 ? 'runda' : 'rundor'} spelade
			{:else}
				Ingångshandicap — inga rundor spelade i år
			{/if}
		</div>
	</div>

	<div class="grid gap-4">
		<div class="flex items-center justify-between rounded-2xl bg-parchment px-6 py-4 shadow-sm">
			<span class="text-xs font-semibold tracking-[0.18em] text-club-900/60 uppercase"
				>Rundor denna säsong</span
			>
			<span class="font-display text-4xl font-semibold">{d.stats.roundsSeason}</span>
		</div>
		<div class="flex items-center justify-between rounded-2xl bg-parchment px-6 py-4 shadow-sm">
			<span class="text-xs font-semibold tracking-[0.18em] text-club-900/60 uppercase"
				>Bästa brutto</span
			>
			<span class="font-display text-4xl font-semibold">{d.stats.bestGross ?? '—'}</span>
		</div>
		<div class="flex items-center justify-between rounded-2xl bg-parchment px-6 py-4 shadow-sm">
			<span class="text-xs font-semibold tracking-[0.18em] text-club-900/60 uppercase"
				>Snitt mot par</span
			>
			<span class="font-display text-4xl font-semibold"
				>{d.stats.avgToPar !== null ? toPar(d.stats.avgToPar) : '—'}</span
			>
		</div>
	</div>
</div>

<!-- Handicap-trend -->
<div class="mt-6 rounded-2xl bg-parchment p-6 shadow-sm">
	<div class="flex items-baseline justify-between">
		<h2 class="font-display text-2xl font-semibold">Handicap-trend</h2>
		<span class="text-xs text-club-900/50">Senaste {Math.min(d.trend.length, 12)} rundorna</span>
	</div>
	{#if d.trend.length >= 2}
		<div class="mt-4 text-club-900">
			<HcpTrend points={d.trend} />
		</div>
	{:else}
		<p class="mt-4 text-sm text-club-900/60">Trend visas efter minst två signerade rundor.</p>
	{/if}
</div>

<!-- Matcher -->
<div class="mt-8">
	<div class="flex items-baseline justify-between">
		<h2 class="font-display text-2xl font-semibold">Matcher</h2>
		<a
			href="/coasters"
			class="text-xs font-semibold tracking-widest text-gold-600 uppercase hover:underline"
			>Alla coasters</a
		>
	</div>
	{#if d.matches.length === 0}
		<p class="mt-3 text-sm text-club-900/60">
			Inga matcher än{#if isSelf}
				— <a class="underline" href="/coasters">skapa en Score Coaster</a>{/if}.
		</p>
	{:else}
		<div class="mt-3 grid gap-4 md:grid-cols-2">
			<div>
				<h3 class="text-xs font-semibold tracking-[0.18em] text-club-900/60 uppercase">
					Pågående ({ongoing.length})
				</h3>
				<ul class="mt-2 space-y-2">
					{#each ongoing as m (m.id)}
						<li>
							<a
								href={`/coasters/${m.id}`}
								class="flex items-center justify-between rounded-xl bg-parchment px-4 py-3 shadow-sm hover:shadow"
							>
								<div>
									<div class="font-semibold">{m.name ?? 'Score Coaster'}</div>
									<div class="text-xs text-club-900/60">
										{fmtDate(m.createdAt)} · {m.playerCount} spelare · {m.signedCount} signerade
									</div>
								</div>
								<span
									class="rounded-full bg-gold-400/20 px-2.5 py-0.5 text-xs font-semibold text-gold-600"
									>Pågående</span
								>
							</a>
						</li>
					{:else}
						<li class="text-sm text-club-900/50">Inga pågående.</li>
					{/each}
				</ul>
			</div>
			<div>
				<h3 class="text-xs font-semibold tracking-[0.18em] text-club-900/60 uppercase">
					Avslutade ({finished.length})
				</h3>
				<ul class="mt-2 space-y-2">
					{#each finished as m (m.id)}
						<li>
							<a
								href={`/coasters/${m.id}`}
								class="flex items-center justify-between rounded-xl bg-parchment px-4 py-3 shadow-sm hover:shadow"
							>
								<div>
									<div class="font-semibold">{m.name ?? 'Score Coaster'}</div>
									<div class="text-xs text-club-900/60">
										{fmtDate(m.createdAt)} · {m.playerCount} spelare
										{#if m.myGross !== null}· brutto {m.myGross}{/if}
									</div>
								</div>
								<span
									class="rounded-full bg-club-700/10 px-2.5 py-0.5 text-xs font-semibold text-club-700"
									>Avslutad</span
								>
							</a>
						</li>
					{:else}
						<li class="text-sm text-club-900/50">Inga avslutade.</li>
					{/each}
				</ul>
			</div>
		</div>
	{/if}
</div>

<!-- Grönt Kort: som på /certification, med info-knapp för underlaget -->
<div class="mt-8">
	<h2 class="font-display text-2xl font-semibold">Grönt Kort</h2>
	{#if d.member.greenCardIssuedAt}
		<div class="relative mt-3 max-w-md rounded-2xl bg-club-800 p-6 text-cream-200 shadow-md">
			<div class="flex items-start justify-between">
				<span class="text-xs font-semibold tracking-[0.2em] text-gold-400 uppercase">
					Grönt Kort
				</span>
				<span class="font-display text-2xl font-semibold text-gold-300"
					>Nr {d.member.memberNumber}</span
				>
			</div>
			<div class="font-display mt-3 text-3xl font-semibold">{d.member.name}</div>
			<div class="mt-1 text-sm text-cream-200/70">
				Certifierad {fmtDate(d.member.greenCardIssuedAt)}
				{#if d.cert.fadderName}· Fadder: {d.cert.fadderName}{/if}
			</div>
			<div class="mt-4 border-t border-cream-200/15 pt-3 pr-8 text-xs text-cream-200/60">
				Play Slow. Ett slag per hål. Hederssystemet gäller.
			</div>
			<button
				type="button"
				onclick={() => (showCertInfo = true)}
				title="Bevismaterial, teoriprov och fadderns omdöme"
				aria-label="Visa certifieringsunderlag"
				class="absolute right-4 bottom-4 flex h-7 w-7 items-center justify-center rounded-full border border-gold-400/60 text-sm text-gold-300 hover:bg-club-700"
				>i</button
			>
		</div>
	{:else}
		<div class="relative mt-3 max-w-md rounded-2xl bg-parchment p-6 shadow-sm">
			{#if d.member.status === 'aspirant'}
				<p class="text-sm text-club-900/70">
					Under certifiering — <strong>{certDone} av 3</strong> delar klara.
				</p>
			{:else}
				<p class="text-sm text-club-900/70">Certifierad urmedlem — före grönt kort-systemet.</p>
			{/if}
			{#if d.theoryAttempts.length > 0 || d.cert.practical.passed}
				<button
					type="button"
					onclick={() => (showCertInfo = true)}
					title="Bevismaterial, teoriprov och fadderns omdöme"
					aria-label="Visa certifieringsunderlag"
					class="absolute right-4 bottom-4 flex h-7 w-7 items-center justify-center rounded-full border border-club-700/40 text-sm text-club-700 hover:bg-club-100"
					>i</button
				>
			{/if}
		</div>
	{/if}
</div>

<!-- Modal: certifieringsunderlaget -->
{#if showCertInfo}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-club-950/60 p-4"
		role="presentation"
		onclick={(e) => {
			if (e.target === e.currentTarget) showCertInfo = false;
		}}
	>
		<div
			class="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-parchment p-6 shadow-xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby="certinfo-title"
		>
			<div class="flex items-start justify-between">
				<div>
					<p class="text-xs font-semibold tracking-[0.2em] text-gold-600 uppercase">
						Certifieringsunderlag
					</p>
					<h3 id="certinfo-title" class="font-display mt-1 text-2xl font-semibold">
						{d.member.name}
					</h3>
				</div>
				<button
					type="button"
					onclick={() => (showCertInfo = false)}
					aria-label="Stäng"
					class="rounded-full px-2 text-xl text-club-900/50 hover:text-club-900">×</button
				>
			</div>

			<!-- Teoriprov -->
			<h4 class="mt-5 text-xs font-semibold tracking-[0.18em] text-club-900/60 uppercase">
				Teoriprov
			</h4>
			{#if d.cert.theory.passed}
				<p class="mt-1 text-sm text-club-700">
					<span class="font-semibold">✓ Godkänt</span>
					{#if d.cert.theory.autoPassed}
						<span
							class="ml-1 rounded-full bg-gold-400/25 px-2.5 py-0.5 text-xs font-semibold text-gold-600"
							>Autorättat på heder</span
						>
					{:else if d.cert.theory.score !== null}
						med {Math.round(d.cert.theory.score * 100)} %
					{/if}
					{#if d.cert.theory.at}<span class="text-club-900/60">
							· {fmtDate(d.cert.theory.at)}</span
						>{/if}
				</p>
			{:else}
				<p class="mt-1 text-sm text-club-900/60">Inte godkänt ännu.</p>
			{/if}
			{#if d.theoryAttempts.length > 0}
				<ul class="mt-2 space-y-1 text-sm">
					{#each d.theoryAttempts as a (a.id)}
						<li class="flex items-center justify-between">
							<span class="text-club-900/60">{fmtDate(a.takenAt)}</span>
							<span class="font-semibold">{Math.round(a.score * 100)} %</span>
							{#if a.passed}
								<span class="font-semibold text-club-700">Godkänt</span>
							{:else}
								<span class="text-red-700/70">Underkänt</span>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}

			<!-- Fadderns omdöme -->
			<h4 class="mt-5 text-xs font-semibold tracking-[0.18em] text-club-900/60 uppercase">
				Fadderns omdöme
			</h4>
			{#if d.cert.practical.comment}
				<p class="mt-1 text-sm text-club-900/80 italic">”{d.cert.practical.comment}”</p>
				{#if d.cert.fadderName}
					<p class="mt-1 text-xs text-club-900/60">— {d.cert.fadderName}</p>
				{/if}
			{:else if d.cert.practical.passed}
				<p class="mt-1 text-sm text-club-900/60">
					Godkänt{#if d.cert.fadderName}
						av {d.cert.fadderName}{/if} utan skriftligt omdöme.
				</p>
			{:else}
				<p class="mt-1 text-sm text-club-900/60">Praktiska provet är inte genomfört ännu.</p>
			{/if}

			<!-- Bevismaterial -->
			<h4 class="mt-5 text-xs font-semibold tracking-[0.18em] text-club-900/60 uppercase">
				Bevismaterial
			</h4>
			{#if d.cert.practical.proofs.length > 0}
				<div class="mt-2 grid grid-cols-3 gap-2">
					{#each d.cert.practical.proofs as p, i (p.id)}
						<button
							type="button"
							onclick={() => (proofIndex = i)}
							class="group relative aspect-square overflow-hidden rounded-xl bg-club-900 shadow-sm ring-gold-400 focus:ring-2 focus:outline-none"
							aria-label={`Visa ${p.filename}`}
						>
							{#if p.contentType.startsWith('image/')}
								<img
									src={p.url}
									alt=""
									loading="lazy"
									class="h-full w-full object-cover transition group-hover:scale-105"
								/>
							{:else}
								<!-- Film: första bildrutan som thumbnail + play-badge -->
								<!-- svelte-ignore a11y_media_has_caption -->
								<video
									src={p.url}
									muted
									playsinline
									preload="metadata"
									class="h-full w-full object-cover opacity-80"
								></video>
								<span
									class="absolute inset-0 flex items-center justify-center text-3xl text-cream-200 drop-shadow"
									aria-hidden="true">▶</span
								>
							{/if}
						</button>
					{/each}
				</div>
			{:else}
				<p class="mt-1 text-sm text-club-900/60">Inget bevismaterial uppladdat.</p>
			{/if}
		</div>
	</div>
{/if}

<!-- Senaste rundor -->
<div class="mt-8">
	<div class="flex items-baseline justify-between">
		<h2 class="font-display text-2xl font-semibold">Senaste rundor</h2>
		{#if isSelf}
			<a
				href="/rounds"
				class="text-xs font-semibold tracking-widest text-gold-600 uppercase hover:underline"
				>Visa alla</a
			>
		{/if}
	</div>
	{#if d.recent.length === 0}
		<p class="mt-3 text-sm text-club-900/60">Inga signerade rundor än.</p>
	{:else}
		<div class="mt-3 divide-y divide-cream-300 overflow-hidden rounded-2xl bg-parchment shadow-sm">
			{#each d.recent as r (r.id)}
				<div class="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
					<div>
						<div class="font-semibold">
							{#if r.coasterId}
								<a class="hover:underline" href={`/coasters/${r.coasterId}`}
									>{r.coasterName ?? 'Score Coaster'}</a
								>
							{:else}
								Score Coaster
							{/if}
						</div>
						<div class="text-xs text-club-900/60">{fmtDate(r.playedAt)} · {r.holes} hål</div>
					</div>
					<div class="flex items-center gap-6 text-sm">
						<span>Brutto <strong class="text-base">{r.grossTotal}</strong></span>
						<span>Netto <strong class="text-base">{r.netTotal}</strong></span>
						<span class="w-10 text-right font-semibold">{toPar(r.toPar)}</span>
						{#if r.id === d.bestNetRoundId}
							<span
								class="rounded-full bg-gold-400/25 px-2.5 py-0.5 text-xs font-semibold text-gold-600"
								>Bästa netto</span
							>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

{#if proofIndex !== null}
	<ProofLightbox
		items={d.cert.practical.proofs}
		bind:index={proofIndex}
		onclose={() => (proofIndex = null)}
	/>
{/if}

{#if isSelf && d.member.greenCardIssuedAt && !d.member.welcomeSeenAt}
	<WelcomeModal
		name={d.member.name}
		memberNumber={d.member.memberNumber}
		avatarUrl={d.member.avatarUrl}
	/>
{/if}
