<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatKr } from '$lib/money';
	import TournamentReport from '$lib/components/TournamentReport.svelte';
	import MatchBracket from '$lib/components/MatchBracket.svelte';
	let { data, form } = $props();

	let t = $derived(data.tournament);
	let lb = $derived(data.leaderboard);
	let scoreTab: 'net' | 'gross' = $state('net');

	const STATUS: Record<string, { label: string; cls: string }> = {
		draft: {
			label: 'Utkast',
			cls: 'bg-club-700/10 text-club-700 border border-dashed border-club-700/40'
		},
		open: { label: 'Öppen', cls: 'bg-gold-400/20 text-gold-600' },
		finished: { label: 'Avslutad', cls: 'bg-club-700/10 text-club-700' },
		cancelled: { label: 'Inställd', cls: 'bg-red-100 text-red-700' }
	};
	const VISIBILITY: Record<string, string> = {
		open: 'Öppen för alla medlemmar',
		closed: 'Stängd — endast inbjudna',
		public: 'Publik — även gäster'
	};
	const PAY_STATUS: Record<string, { label: string; cls: string }> = {
		invited: { label: 'Inbjuden', cls: 'bg-club-700/10 text-club-700' },
		pending: { label: 'Väntar på betalning', cls: 'bg-gold-400/20 text-gold-600' },
		paid: { label: 'Betald', cls: 'bg-club-700/10 text-club-700' },
		refunded: { label: 'Återbetald', cls: 'bg-red-100 text-red-700' }
	};

	function fmtDate(d: Date | string | null) {
		return d ? new Date(d).toLocaleDateString('sv-SE') : null;
	}
	function fmtDateInput(d: Date | string | null) {
		return d ? new Date(d).toISOString().slice(0, 10) : '';
	}
	function prizeValue(place: number): string {
		const tier = t.prizes.find((p) => p.place === place);
		if (!tier) return '';
		return t.prizeMode === 'fixed'
			? String((tier.amountOre ?? 0) / 100)
			: String(tier.percent ?? '');
	}
	const PLACE_LABEL = ['1:a pris', '2:a pris', '3:e pris'];

	let successMsg = $derived(
		form?.drawn
			? 'Lottningen är klar — må bäste spelare vinna!'
			: form?.winnerSet
				? 'Vinnaren är satt.'
				: form?.updated
					? 'Turneringen uppdaterad.'
					: form?.opened
						? 'Turneringen är öppen — anmälan är igång!'
						: form?.finished
							? 'Turneringen är avslutad.'
							: form?.registered
								? 'Du är anmäld!'
								: form?.invited
									? `${form.invited} är inbjuden.`
									: form?.markedPaid
										? 'Markerad som betald.'
										: form?.expenseAdded
											? 'Kostnaden är bokförd.'
											: form?.charityMarked
												? 'Utbetalningen till välgörenheten är bokförd.'
												: null
	);
</script>

<a href="/tournaments" class="text-sm text-club-900/60 hover:text-club-900">← Alla turneringar</a>

<div class="mt-2 flex flex-wrap items-center gap-3">
	<p class="text-xs font-semibold tracking-[0.2em] text-gold-600 uppercase">
		{t.format === 'match' ? 'Matchspel (cup)' : 'Slagspel'} · {VISIBILITY[t.visibility]}
	</p>
	<span class={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS[t.status].cls}`}
		>{STATUS[t.status].label}</span
	>
</div>
<h1 class="font-display mt-1 text-4xl font-semibold">{t.name}</h1>
<p class="mt-1 text-sm text-club-900/60">
	{fmtDate(t.startsAt) ?? 'Startdatum ej satt'}
	{#if t.entryFeeOre > 0}
		· Anmälningsavgift {formatKr(t.entryFeeOre)}
	{:else}
		· Fri anmälan
	{/if}
</p>
{#if t.description}
	<p class="mt-3 max-w-2xl text-sm">{t.description}</p>
{/if}

{#if form?.error}
	<p class="mt-4 rounded bg-red-100 px-3 py-2 text-sm text-red-700">{form.error}</p>
{/if}
{#if successMsg}
	<p class="mt-4 rounded bg-gold-400/20 px-3 py-2 text-sm text-gold-600">{successMsg}</p>
{/if}

<!-- Välgörenhetskortet — turneringens hjärta -->
{#if t.charityName}
	<section class="mt-6 rounded-2xl bg-club-800 p-6 text-cream-200 shadow-md">
		<p class="text-xs font-semibold tracking-[0.2em] text-gold-400 uppercase">Till förmån för</p>
		<h2 class="font-display mt-1 text-3xl font-semibold">{t.charityName}</h2>
		{#if t.charityDescription}
			<p class="mt-2 max-w-2xl text-sm text-cream-200/80">{t.charityDescription}</p>
		{/if}
		{#if t.charityUrl}
			<a
				href={t.charityUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="mt-2 inline-block text-sm text-gold-400 underline hover:text-gold-300"
				>Läs mer om {t.charityName} →</a
			>
		{/if}
		{#if t.prizeMode !== 'none' && t.prizes.length}
			<p class="mt-3 text-sm text-cream-200/70">
				Priser: {t.prizes
					.map((p) =>
						t.prizeMode === 'fixed'
							? `plats ${p.place} — ${formatKr(p.amountOre ?? 0)}`
							: `plats ${p.place} — ${p.percent} % av potten`
					)
					.join(' · ')}. Resten går till välgörenheten.
			</p>
		{:else}
			<p class="mt-3 text-sm text-cream-200/70">
				Inga pengapriser — hela behållningen går till välgörenheten. Vinnaren får äran.
			</p>
		{/if}
	</section>
{/if}

<!-- Anmälan -->
{#if t.status === 'open'}
	<section class="mt-6 rounded-2xl bg-parchment p-6 shadow-sm">
		<h2 class="font-display text-2xl font-semibold">Anmälan</h2>
		{#if data.myParticipant?.status === 'paid'}
			<p class="mt-2 text-sm">
				✅ Du är anmäld{data.myParticipant.paidVia === 'free' ? '' : ' och har betalat'}. Lycka
				till!
			</p>
		{:else if data.myParticipant?.status === 'pending' && t.entryFeeOre > 0}
			<p class="mt-2 text-sm text-club-900/70">Din betalning är inte slutförd.</p>
			<form method="POST" action="?/register" use:enhance class="mt-3">
				<button
					class="rounded-lg bg-gold-500 px-5 py-2 font-semibold text-club-900 hover:bg-gold-400"
					>Slutför betalning ({formatKr(t.entryFeeOre)})</button
				>
			</form>
		{:else if data.myParticipant?.status === 'refunded'}
			<p class="mt-2 text-sm text-club-900/70">Din anmälan är återbetald.</p>
		{:else if t.visibility === 'closed' && !data.myParticipant}
			<p class="mt-2 text-sm text-club-900/70">Stängd turnering — anmälan kräver inbjudan.</p>
		{:else if !data.canPlay}
			<p class="mt-2 text-sm text-club-900/70">Grönt kort krävs för att spela turnering.</p>
		{:else}
			<form method="POST" action="?/register" use:enhance class="mt-3">
				<button
					class="rounded-lg bg-gold-500 px-5 py-2 font-semibold text-club-900 hover:bg-gold-400"
				>
					{t.entryFeeOre > 0 ? `Anmäl & betala ${formatKr(t.entryFeeOre)}` : 'Anmäl dig'}
				</button>
				{#if t.entryFeeOre > 0}
					<p class="mt-2 text-xs text-club-900/50">
						Betalningen sker säkert via Stripe. Överskottet går till {t.charityName}.
					</p>
				{/if}
			</form>
		{/if}
	</section>
{/if}

<!-- Cupstege (matchspel) -->
{#if t.format === 'match' && t.status !== 'draft'}
	<section class="mt-8">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<h2 class="font-display text-2xl font-semibold">Cupstege</h2>
			{#if data.isStaff && t.status === 'open'}
				<form
					method="POST"
					action="?/drawBracket"
					use:enhance={({ cancel }) => {
						if (data.bracket && !confirm('Lotta om? Nuvarande stege ersätts.')) cancel();
						return async ({ update }) => update();
					}}
				>
					<button
						class="rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-club-900 hover:bg-gold-400"
						>{data.bracket ? 'Lotta om' : 'Lotta första omgången'}</button
					>
				</form>
			{/if}
		</div>
		{#if data.bracket}
			<div class="mt-3">
				<MatchBracket bracket={data.bracket} interactive isStaff={data.isStaff} />
			</div>
			<p class="mt-2 text-xs text-club-900/50">
				Varje match spelas på egen coaster — lägst netto vinner när båda signerat. Lika resultat
				eller walkover avgörs av captain.
			</p>
		{:else}
			<p class="mt-2 text-sm text-club-900/60">
				Ingen lottning än — captain lottar när startfältet är klart.
			</p>
		{/if}
	</section>
{/if}

<!-- Leaderboard (slagspel) -->
{#if lb && (lb.entries.length || lb.unfinished.length)}
	<section class="mt-8">
		<div class="flex items-center justify-between">
			<h2 class="font-display text-2xl font-semibold">Leaderboard</h2>
			<div class="flex gap-1 rounded-full bg-club-700/10 p-1 text-xs font-semibold">
				<button
					class={`rounded-full px-3 py-1 ${scoreTab === 'net' ? 'bg-club-800 text-cream-200' : 'text-club-700'}`}
					onclick={() => (scoreTab = 'net')}>Netto</button
				>
				<button
					class={`rounded-full px-3 py-1 ${scoreTab === 'gross' ? 'bg-club-800 text-cream-200' : 'text-club-700'}`}
					onclick={() => (scoreTab = 'gross')}>Brutto</button
				>
			</div>
		</div>
		<div class="mt-3 overflow-x-auto rounded-2xl bg-parchment shadow-sm">
			<table class="w-full text-sm">
				<thead class="bg-club-800 text-cream-200">
					<tr>
						<th class="px-4 py-2 text-left">Plac.</th>
						<th class="px-4 py-2 text-left">Spelare</th>
						<th class="px-4 py-2 text-right">HCP</th>
						<th class="px-4 py-2 text-right">Brutto</th>
						<th class="px-4 py-2 text-right">Netto</th>
						<th class="px-4 py-2 text-right">Mot par</th>
					</tr>
				</thead>
				<tbody>
					{#each scoreTab === 'net' ? lb.entries : [...lb.entries].sort((a, b) => a.gross - b.gross) as e (e.participantId)}
						{@const rank = scoreTab === 'net' ? e.netRank : e.grossRank}
						<tr class="border-t border-cream-300 hover:bg-white/60">
							<td class="font-display px-4 py-2 text-lg font-semibold">
								{rank}{rank === 1 ? ' 🏆' : ''}
							</td>
							<td class="px-4 py-2">
								{e.name}
								{#if e.isGuest}
									<span
										class="ml-1 rounded-full bg-club-700/10 px-2 py-0.5 text-xs font-semibold text-club-700"
										>gäst</span
									>
								{/if}
							</td>
							<td class="px-4 py-2 text-right">{e.playingHcp}</td>
							<td class="px-4 py-2 text-right">{e.gross}</td>
							<td class="font-display px-4 py-2 text-right text-lg font-semibold">{e.net}</td>
							<td class="px-4 py-2 text-right"
								>{e.toPar > 0 ? `+${e.toPar}` : e.toPar === 0 ? 'E' : e.toPar}</td
							>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		{#if lb.unfinished.length}
			<p class="mt-2 text-sm text-club-900/60">
				Ej färdigspelat: {lb.unfinished
					.map((u) => u.name + (u.isGuest ? ' (gäst)' : ''))
					.join(', ')}
			</p>
		{/if}
	</section>
{/if}

<!-- Transparensrapport -->
{#if data.report}
	<section class="mt-8">
		<h2 class="font-display text-2xl font-semibold">Transparensrapport</h2>
		<TournamentReport report={data.report} charityName={t.charityName} showReceipts />
		{#if t.visibility === 'public' && t.slug}
			<p class="mt-2 text-sm text-club-900/60">
				Publik delningssida: <a href={`/t/${t.slug}`} class="text-gold-600 underline">/t/{t.slug}</a
				>
			</p>
		{/if}
	</section>
{/if}

<!-- Coasters (slagspel — matchspel skapar coasters per match i stegen) -->
{#if t.status !== 'draft' && t.format !== 'match'}
	<section class="mt-8">
		<h2 class="font-display text-2xl font-semibold">Turneringens coasters</h2>
		{#if data.coasters.length === 0}
			<p class="mt-2 text-sm text-club-900/60">Inga coasters än.</p>
		{:else}
			<ul class="mt-3 space-y-2">
				{#each data.coasters as c (c.id)}
					<li>
						<a
							href={`/coasters/${c.id}`}
							class="flex items-center justify-between rounded-xl bg-parchment px-4 py-3 shadow-sm hover:shadow"
						>
							<div>
								<span class="font-semibold">{c.name ?? 'Score Coaster'}</span>
								<span class="ml-2 text-sm text-club-900/60"
									>av {c.creatorName} · {fmtDate(c.createdAt)}</span
								>
							</div>
							<span class="text-sm text-club-900/60"
								>{c.playerCount} spelare · {c.signedCount} signerade</span
							>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
		{#if t.status === 'open' && (data.isStaff || data.myParticipant?.status === 'paid')}
			<form
				method="POST"
				action="?/createCoaster"
				use:enhance
				class="mt-3 flex flex-wrap items-end gap-2"
			>
				<label class="block text-sm">
					<span class="text-xs font-semibold tracking-[0.18em] text-club-900/50 uppercase"
						>Namn (valfritt)</span
					>
					<input
						name="name"
						placeholder="Bana A"
						class="mt-1 rounded-lg border-cream-300 bg-white/70 focus:border-gold-400 focus:ring-gold-400"
					/>
				</label>
				<button
					class="rounded-lg bg-club-800 px-4 py-2 text-sm font-semibold text-cream-200 hover:bg-club-700"
					>Ny turneringscoaster</button
				>
			</form>
			<p class="mt-1 text-xs text-club-900/50">
				Alla turneringscoasters spelar standardpar — brutto blir jämförbart rakt över.
			</p>
		{/if}
	</section>
{/if}

<!-- Deltagare -->
<section class="mt-8">
	<h2 class="font-display text-2xl font-semibold">Deltagare ({data.participants.length})</h2>
	{#if data.participants.length === 0}
		<p class="mt-2 text-sm text-club-900/60">Inga deltagare än.</p>
	{:else}
		<ul class="mt-3 space-y-1">
			{#each data.participants as p (p.id)}
				{@const ps = PAY_STATUS[p.status]}
				<li
					class="flex items-center justify-between rounded-xl bg-parchment px-4 py-2 text-sm shadow-sm"
				>
					<span>
						{#if p.memberId}
							<a href={`/members/${p.memberId}`} class="font-semibold hover:underline">{p.name}</a>
						{:else}
							<span class="font-semibold">{p.name}</span>
							<span
								class="ml-1 rounded-full bg-club-700/10 px-2 py-0.5 text-xs font-semibold text-club-700"
								>gäst</span
							>
						{/if}
						<span class="ml-2 text-club-900/50">HCP {p.playingHcp}</span>
					</span>
					<span class="flex items-center gap-2">
						{#if p.paidVia === 'manual'}
							<span class="text-xs text-club-900/50">manuellt</span>
						{/if}
						<span class={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ps.cls}`}
							>{ps.label}</span
						>
						{#if data.isStaff && p.status !== 'paid' && p.status !== 'refunded' && t.status !== 'finished'}
							{#if t.entryFeeOre > 0}
								<form method="POST" action="?/markPaid" use:enhance>
									<input type="hidden" name="participantId" value={p.id} />
									<button class="text-xs text-gold-600 hover:underline">Markera betald</button>
								</form>
							{/if}
							<form method="POST" action="?/removeParticipant" use:enhance>
								<input type="hidden" name="participantId" value={p.id} />
								<button class="text-xs text-red-700 hover:underline" title="Ta bort">✕</button>
							</form>
						{:else if data.isStaff && p.status === 'paid' && p.paidVia !== 'free'}
							<form
								method="POST"
								action="?/refund"
								use:enhance={({ cancel }) => {
									if (!confirm('Markera som återbetald? Själva återbetalningen gör du i Stripe.'))
										cancel();
									return async ({ update }) => update();
								}}
							>
								<input type="hidden" name="participantId" value={p.id} />
								<button class="text-xs text-club-900/40 hover:text-red-700 hover:underline"
									>Återbetald</button
								>
							</form>
						{/if}
					</span>
				</li>
			{/each}
		</ul>
	{/if}

	{#if data.isStaff && t.visibility === 'closed' && t.status !== 'finished' && t.status !== 'cancelled'}
		<div class="mt-4 rounded-xl bg-parchment p-4 shadow-sm">
			<h3 class="text-sm font-semibold">Bjud in medlem</h3>
			<form method="GET" class="mt-2 flex gap-2">
				<input
					name="q"
					value={data.inviteQuery}
					placeholder="Sök namn…"
					class="w-full max-w-xs rounded-lg border-cream-300 bg-white/70 text-sm focus:border-gold-400 focus:ring-gold-400"
				/>
				<button
					class="rounded-lg bg-club-800 px-3 py-1.5 text-sm font-semibold text-cream-200 hover:bg-club-700"
					>Sök</button
				>
			</form>
			{#if data.invitable.length}
				<ul class="mt-2 space-y-1">
					{#each data.invitable as m (m.id)}
						<li class="flex items-center justify-between text-sm">
							{m.name}
							<form method="POST" action="?/invite" use:enhance>
								<input type="hidden" name="memberId" value={m.id} />
								<button class="text-xs font-semibold text-gold-600 hover:underline">Bjud in</button>
							</form>
						</li>
					{/each}
				</ul>
			{:else if data.inviteQuery}
				<p class="mt-2 text-sm text-club-900/50">Inga träffar.</p>
			{/if}
		</div>
	{/if}
</section>

<!-- Captain-panel -->
{#if data.isStaff}
	<section class="mt-10 rounded-2xl border border-gold-400/40 bg-parchment p-6 shadow-sm">
		<p class="text-xs font-semibold tracking-[0.2em] text-gold-600 uppercase">Captain-panel</p>

		{#if t.status === 'draft'}
			<form method="POST" action="?/update" use:enhance class="mt-4 grid gap-4 md:grid-cols-2">
				<label class="block text-sm">
					<span class="text-xs font-semibold text-club-900/50 uppercase">Namn</span>
					<input
						name="name"
						value={t.name}
						required
						class="mt-1 w-full rounded-lg border-cream-300 bg-white/70 focus:border-gold-400 focus:ring-gold-400"
					/>
				</label>
				<label class="block text-sm">
					<span class="text-xs font-semibold text-club-900/50 uppercase">Startdatum</span>
					<input
						name="startsAt"
						type="date"
						value={fmtDateInput(t.startsAt)}
						class="mt-1 w-full rounded-lg border-cream-300 bg-white/70 focus:border-gold-400 focus:ring-gold-400"
					/>
				</label>
				<label class="block text-sm md:col-span-2">
					<span class="text-xs font-semibold text-club-900/50 uppercase">Beskrivning</span>
					<textarea
						name="description"
						rows="2"
						class="mt-1 w-full rounded-lg border-cream-300 bg-white/70 focus:border-gold-400 focus:ring-gold-400"
						>{t.description ?? ''}</textarea
					>
				</label>
				<label class="block text-sm">
					<span class="text-xs font-semibold text-club-900/50 uppercase">Synlighet</span>
					<select
						name="visibility"
						class="mt-1 w-full rounded-lg border-cream-300 bg-white/70 focus:border-gold-400 focus:ring-gold-400"
					>
						{#each Object.entries(VISIBILITY) as [value, label] (value)}
							<option {value} selected={t.visibility === value}>{label}</option>
						{/each}
					</select>
				</label>
				<label class="block text-sm">
					<span class="text-xs font-semibold text-club-900/50 uppercase">Spelformat</span>
					<select
						name="format"
						class="mt-1 w-full rounded-lg border-cream-300 bg-white/70 focus:border-gold-400 focus:ring-gold-400"
					>
						<option value="stroke" selected={t.format === 'stroke'}
							>Slagspel — lägst netto vinner</option
						>
						<option value="match" selected={t.format === 'match'}
							>Matchspel — cup, vinnaren vidare</option
						>
					</select>
				</label>
				<label class="block text-sm">
					<span class="text-xs font-semibold text-club-900/50 uppercase">Publik adress (/t/…)</span>
					<input
						name="slug"
						value={t.slug ?? ''}
						placeholder="hostslaget-2026"
						class="mt-1 w-full rounded-lg border-cream-300 bg-white/70 focus:border-gold-400 focus:ring-gold-400"
					/>
				</label>
				<fieldset class="md:col-span-2">
					<legend class="text-xs font-semibold text-club-900/50 uppercase"
						>Välgörenhet (krävs för att öppna)</legend
					>
					<div class="mt-1 grid gap-2 md:grid-cols-2">
						<input
							name="charityName"
							value={t.charityName ?? ''}
							placeholder="Namn, t.ex. Barncancerfonden"
							class="rounded-lg border-cream-300 bg-white/70 text-sm focus:border-gold-400 focus:ring-gold-400"
						/>
						<input
							name="charityUrl"
							value={t.charityUrl ?? ''}
							placeholder="https://…"
							class="rounded-lg border-cream-300 bg-white/70 text-sm focus:border-gold-400 focus:ring-gold-400"
						/>
						<textarea
							name="charityDescription"
							rows="2"
							placeholder="Varför just den här välgörenheten?"
							class="rounded-lg border-cream-300 bg-white/70 text-sm focus:border-gold-400 focus:ring-gold-400 md:col-span-2"
							>{t.charityDescription ?? ''}</textarea
						>
					</div>
				</fieldset>
				<label class="block text-sm">
					<span class="text-xs font-semibold text-club-900/50 uppercase">Anmälningsavgift (kr)</span
					>
					<input
						name="entryFee"
						value={t.entryFeeOre / 100}
						inputmode="decimal"
						class="mt-1 w-full rounded-lg border-cream-300 bg-white/70 focus:border-gold-400 focus:ring-gold-400"
					/>
				</label>
				<label class="block text-sm">
					<span class="text-xs font-semibold text-club-900/50 uppercase">Prisupplägg</span>
					<select
						name="prizeMode"
						class="mt-1 w-full rounded-lg border-cream-300 bg-white/70 focus:border-gold-400 focus:ring-gold-400"
					>
						<option value="none" selected={t.prizeMode === 'none'}
							>Inga pengapriser — allt till välgörenhet</option
						>
						<option value="fixed" selected={t.prizeMode === 'fixed'}>Fasta belopp (kr)</option>
						<option value="percent" selected={t.prizeMode === 'percent'}
							>Procent av potten (%)</option
						>
					</select>
				</label>
				<fieldset class="md:col-span-2">
					<legend class="text-xs font-semibold text-club-900/50 uppercase"
						>Prisnivåer (kr eller % beroende på upplägg — lämna tomt för att hoppa över)</legend
					>
					<div class="mt-1 flex gap-2">
						{#each PLACE_LABEL as label, i (label)}
							<label class="block text-sm">
								<span class="text-xs text-club-900/50">{label}</span>
								<input
									name={`prize${i + 1}`}
									value={prizeValue(i + 1)}
									inputmode="decimal"
									class="mt-0.5 w-24 rounded-lg border-cream-300 bg-white/70 focus:border-gold-400 focus:ring-gold-400"
								/>
							</label>
						{/each}
					</div>
				</fieldset>
				<div class="md:col-span-2">
					<button
						class="rounded-lg bg-club-800 px-5 py-2 font-semibold text-cream-200 hover:bg-club-700"
						>Spara utkast</button
					>
				</div>
			</form>

			<div class="mt-4 flex gap-2 border-t border-cream-300 pt-4">
				<form method="POST" action="?/openTournament" use:enhance>
					<button
						class="rounded-lg bg-gold-500 px-5 py-2 font-semibold text-club-900 hover:bg-gold-400"
						>Öppna turneringen</button
					>
				</form>
				<form
					method="POST"
					action="?/cancel"
					use:enhance={({ cancel }) => {
						if (!confirm('Ställa in turneringen?')) cancel();
						return async ({ update }) => update();
					}}
				>
					<button class="rounded-lg px-5 py-2 text-sm text-red-700 hover:bg-red-50">Ställ in</button
					>
				</form>
			</div>
			<p class="mt-2 text-xs text-club-900/50">
				När turneringen öppnas låses avgift, priser och synlighet — deklarerat är deklarerat.
			</p>
		{/if}

		{#if t.status === 'open'}
			<div class="mt-4 flex flex-wrap gap-2">
				<form
					method="POST"
					action="?/finish"
					use:enhance={({ cancel }) => {
						if (
							!confirm(
								'Avsluta turneringen? Anmälan stängs. Osignerade rader kan signeras klart efteråt.'
							)
						)
							cancel();
						return async ({ update }) => update();
					}}
				>
					<button
						class="rounded-lg bg-club-800 px-5 py-2 font-semibold text-cream-200 hover:bg-club-700"
						>Avsluta turneringen</button
					>
				</form>
				<form
					method="POST"
					action="?/cancel"
					use:enhance={({ cancel }) => {
						if (
							!confirm(
								'Ställa in turneringen? Betalda avgifter återbetalar du i Stripe-dashboarden och markerar sedan här.'
							)
						)
							cancel();
						return async ({ update }) => update();
					}}
				>
					<button class="rounded-lg px-5 py-2 text-sm text-red-700 hover:bg-red-50">Ställ in</button
					>
				</form>
			</div>
		{/if}

		{#if t.status === 'open' || t.status === 'finished'}
			<!-- Kostnadsbok -->
			<div class="mt-6 border-t border-cream-300 pt-4">
				<h3 class="font-display text-xl font-semibold">Kostnadsbok</h3>
				<p class="text-xs text-club-900/50">
					Alla kostnader redovisas öppet i transparensrapporten.
				</p>
				{#if data.expenses.length}
					<ul class="mt-2 space-y-1">
						{#each data.expenses as e (e.id)}
							<li
								class="flex items-center justify-between rounded-lg bg-white/60 px-3 py-1.5 text-sm"
							>
								<span>
									{e.description}
									{#if e.receiptKey}
										<a href={`/files/${e.receiptKey}`} class="ml-1 text-xs text-gold-600 underline"
											>kvitto</a
										>
									{/if}
								</span>
								<span class="flex items-center gap-2">
									<span class="font-semibold">{formatKr(e.amountOre)}</span>
									<form method="POST" action="?/removeExpense" use:enhance>
										<input type="hidden" name="expenseId" value={e.id} />
										<button class="text-xs text-red-700 hover:underline">✕</button>
									</form>
								</span>
							</li>
						{/each}
					</ul>
				{/if}
				<form
					method="POST"
					action="?/addExpense"
					enctype="multipart/form-data"
					use:enhance
					class="mt-3 flex flex-wrap items-end gap-2"
				>
					<label class="block text-sm">
						<span class="text-xs text-club-900/50">Beskrivning</span>
						<input
							name="description"
							required
							placeholder="Fat & festtält"
							class="mt-0.5 rounded-lg border-cream-300 bg-white/70 text-sm focus:border-gold-400 focus:ring-gold-400"
						/>
					</label>
					<label class="block text-sm">
						<span class="text-xs text-club-900/50">Belopp (kr)</span>
						<input
							name="amount"
							required
							inputmode="decimal"
							class="mt-0.5 w-28 rounded-lg border-cream-300 bg-white/70 text-sm focus:border-gold-400 focus:ring-gold-400"
						/>
					</label>
					<label class="block text-sm">
						<span class="text-xs text-club-900/50">Kvitto (valfritt)</span>
						<input
							name="receipt"
							type="file"
							accept="image/*,application/pdf"
							class="mt-0.5 block text-xs"
						/>
					</label>
					<button
						class="rounded-lg bg-club-800 px-4 py-2 text-sm font-semibold text-cream-200 hover:bg-club-700"
						>Bokför kostnad</button
					>
				</form>
			</div>
		{/if}

		{#if t.status === 'finished'}
			<!-- Välgörenhetsutbetalning -->
			<div class="mt-6 border-t border-cream-300 pt-4">
				<h3 class="font-display text-xl font-semibold">Utbetalning till välgörenheten</h3>
				{#if t.charityPaidAt}
					<p class="mt-1 text-sm">
						Utbetalt {formatKr(t.charityPaidOre ?? 0)} den {fmtDate(t.charityPaidAt)}
						{#if t.charityReceiptKey}
							— <a href={`/files/${t.charityReceiptKey}`} class="text-gold-600 underline">kvitto</a>
						{/if}
					</p>
				{/if}
				<form
					method="POST"
					action="?/markCharityPaid"
					enctype="multipart/form-data"
					use:enhance
					class="mt-3 flex flex-wrap items-end gap-2"
				>
					<label class="block text-sm">
						<span class="text-xs text-club-900/50">Belopp (kr)</span>
						<input
							name="amount"
							required
							inputmode="decimal"
							value={data.report ? data.report.charityComputedOre / 100 : ''}
							class="mt-0.5 w-32 rounded-lg border-cream-300 bg-white/70 text-sm focus:border-gold-400 focus:ring-gold-400"
						/>
					</label>
					<label class="block text-sm">
						<span class="text-xs text-club-900/50">Kvitto/underlag (valfritt)</span>
						<input
							name="receipt"
							type="file"
							accept="image/*,application/pdf"
							class="mt-0.5 block text-xs"
						/>
					</label>
					<button
						class="rounded-lg bg-gold-500 px-4 py-2 text-sm font-semibold text-club-900 hover:bg-gold-400"
						>{t.charityPaidAt ? 'Uppdatera utbetalning' : 'Markera utbetald'}</button
					>
				</form>
			</div>
		{/if}
	</section>
{/if}
