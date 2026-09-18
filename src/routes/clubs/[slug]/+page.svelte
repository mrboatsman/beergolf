<script lang="ts">
	// Klubbsidan — "loungen": mörkgrön salong med guldkant, klubbens emblem och
	// namn i serif, medlemsroster som en gästlista. Administration bor bakom
	// kugghjulet (/clubs/[slug]/settings).
	import { enhance } from '$app/forms';
	import Avatar from '$lib/components/Avatar.svelte';
	import { shortName } from '$lib/names';
	let { data, form } = $props();

	const notice = $derived.by(() => {
		if (!form) return null;
		if (form.applied) return 'Ansökan skickad — klubbmästaren godkänner.';
		if (form.left) return 'Du har lämnat klubben.';
		if (form.homeSet) return `${data.club.name} är nu din hemmaklubb.`;
		if (form.approved) return 'Medlemmen är godkänd.';
		if (form.rejected) return 'Ansökan avslagen.';
		if (form.removed) return `${form.removed} är borttagen ur klubben.`;
		if (form.roleSet) return 'Rollen är uppdaterad.';
		if (form.reactivated) return 'Klubben är återaktiverad.';
		return null;
	});

	const founded = $derived(
		new Date(data.club.createdAt).toLocaleDateString('sv-SE', { year: 'numeric', month: 'long' })
	);
	const captains = $derived(
		[...data.home, ...data.dual].filter((m) => m.clubRole === 'captain').length
	);

	const links = [
		['/members', 'Leaderboard'],
		['/coasters', 'Coasters'],
		['/gallery', 'Galleri'],
		['/tournaments', 'Turneringar'],
		['/history', 'Historik']
	] as const;

	// Guldkantad knapp på mörk botten
	const heroBtn =
		'rounded-full border border-gold-400/70 px-4 py-2 text-sm font-semibold text-gold-300 transition hover:bg-gold-400 hover:text-club-900';
	const heroBtnSolid =
		'rounded-full bg-gold-500 px-4 py-2 text-sm font-semibold text-club-900 transition hover:bg-gold-400';
	const quiet = 'text-xs text-club-900/50 hover:text-club-900 hover:underline';
</script>

<svelte:head><title>{data.club.name} – Beer Golf</title></svelte:head>

<a href="/clubs" class="text-sm text-club-900/60 hover:underline">← Alla klubbar</a>

<!-- Salongen -->
<section
	class="relative mt-3 overflow-hidden rounded-3xl bg-club-900 text-cream-200 shadow-xl ring-1 ring-gold-500/30"
>
	<!-- Guldkant + mjukt ljus -->
	<div class="pointer-events-none absolute inset-3 rounded-2xl border border-gold-400/25"></div>
	<div
		class="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-gold-400/10 blur-3xl"
	></div>

	{#if data.isCaptain && data.club.status === 'active'}
		<a
			href="/clubs/{data.club.slug}/settings"
			title="Klubbinställningar"
			aria-label="Klubbinställningar"
			class="absolute top-6 right-6 z-10 rounded-full border border-gold-400/40 p-2 text-gold-300 transition hover:bg-gold-400 hover:text-club-900"
		>
			<svg
				viewBox="0 0 24 24"
				class="h-5 w-5"
				fill="none"
				stroke="currentColor"
				stroke-width="1.8"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<circle cx="12" cy="12" r="3" />
				<path
					d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"
				/>
			</svg>
		</a>
	{/if}

	<div class="relative px-6 pt-10 pb-8 sm:px-10 sm:pt-12 sm:pb-10">
		<div
			class="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-center sm:text-left"
		>
			<div
				class="shrink-0 rounded-full p-1 shadow-[0_0_40px_rgba(207,169,100,0.25)] ring-2 ring-gold-400/80"
			>
				<Avatar
					name={data.club.name}
					src={data.logoUrl}
					class="h-28 w-28 text-4xl sm:h-32 sm:w-32"
				/>
			</div>
			<div class="min-w-0">
				<p class="text-[11px] font-semibold tracking-[0.35em] text-gold-400 uppercase">
					{data.isPrimary ? 'Huvudklubb' : 'Beer Golf™ · Klubb'}
					{#if data.club.status === 'archived'}
						· Arkiverad{/if}
				</p>
				<h1 class="font-display mt-2 text-5xl leading-none font-semibold sm:text-6xl">
					{data.club.name}
				</h1>
				{#if data.club.description}
					<p class="font-display mt-3 max-w-xl text-lg text-cream-200/75 italic">
						{data.club.description}
					</p>
				{/if}
				<p class="mt-4 text-[11px] tracking-[0.25em] text-cream-200/50 uppercase">
					Grundad {founded} · {data.home.length}
					{data.home.length === 1 ? 'hemmamedlem' : 'hemmamedlemmar'}
					{#if data.dual.length}
						· {data.dual.length} dubbel{/if}
				</p>
			</div>
		</div>

		<!-- Min plats i klubben + åtgärder -->
		<div
			class="mt-8 flex flex-col items-center gap-3 border-t border-gold-400/20 pt-6 sm:flex-row sm:justify-between"
		>
			<p class="text-sm text-cream-200/70">
				{#if data.isHome}
					<span class="text-gold-300">Din hemmaklubb.</span> Här rankas du och representerar klubben.
				{:else if data.membership?.status === 'active'}
					Du är <span class="text-gold-300">dubbelmedlem</span> — spelar klubbens coasters, rankas i din
					hemmaklubb.
				{:else if data.membership?.status === 'pending'}
					Din ansökan väntar på klubbmästaren.
				{:else if data.club.status === 'archived'}
					Klubben är arkiverad.
				{:else}
					Du är inte medlem än.
				{/if}
				{#if data.isCaptain}
					<span class="text-gold-300">Captain.</span>
				{/if}
			</p>
			<div class="flex flex-wrap justify-center gap-2">
				{#if data.club.status === 'active'}
					{#if data.membership?.status === 'active'}
						{#if !data.isHome}
							<form method="POST" action="?/setHome" use:enhance>
								<button class={heroBtnSolid}>Gör till hemmaklubb</button>
							</form>
							{#if !data.isPrimary}
								<form method="POST" action="?/leave" use:enhance>
									<button class={heroBtn}>Lämna klubben</button>
								</form>
							{/if}
						{/if}
					{:else if data.membership?.status === 'pending'}
						<form method="POST" action="?/leave" use:enhance>
							<button class={heroBtn}>Dra tillbaka ansökan</button>
						</form>
					{:else if data.canJoin}
						<form method="POST" action="?/apply" use:enhance>
							<button class={heroBtnSolid}>Ansök om medlemskap</button>
						</form>
					{/if}
				{:else if data.isAdmin}
					<form method="POST" action="?/reactivate" use:enhance>
						<button class={heroBtnSolid}>Återaktivera</button>
					</form>
				{/if}
			</div>
		</div>
	</div>

	<!-- Klubbens rum -->
	{#if data.membership?.status === 'active' || data.isAdmin}
		<nav
			aria-label="Klubbens sidor"
			class="flex flex-wrap justify-center gap-x-6 gap-y-2 border-t border-gold-400/20 bg-club-950/40 px-6 py-4 text-[11px] font-semibold tracking-[0.25em] uppercase sm:justify-start sm:px-10"
		>
			{#each links as [href, label] (href)}
				<a
					href="{href}?club={data.club.slug}"
					class="flex items-center gap-2 text-cream-200/70 transition hover:text-gold-300"
				>
					<span class="h-1 w-1 rounded-full bg-gold-400"></span>{label}
				</a>
			{/each}
		</nav>
	{/if}
</section>

{#if form?.error}
	<p class="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{form.error}</p>
{:else if notice}
	<p class="mt-4 rounded bg-club-100 px-3 py-2 text-sm text-club-700">{notice}</p>
{/if}

<!-- Captain: ansökningar -->
{#if data.isCaptain && data.pending.length}
	<section class="mt-6 rounded-2xl border border-gold-400 bg-parchment p-5 shadow-sm sm:p-6">
		<p class="text-[11px] font-semibold tracking-[0.3em] text-gold-600 uppercase">Vid dörren</p>
		<h2 class="font-display mt-1 text-2xl font-semibold text-club-900">
			{data.pending.length === 1
				? 'En ansökan väntar'
				: `${data.pending.length} ansökningar väntar`}
		</h2>
		<ul class="mt-3 divide-y divide-cream-300">
			{#each data.pending as m (m.id)}
				<li class="flex items-center gap-3 py-3">
					<Avatar name={m.name} src={m.avatarUrl} class="h-10 w-10 text-sm" />
					<div class="min-w-0 flex-1">
						<a href="/members/{m.id}" class="font-display text-lg font-semibold hover:underline"
							>{m.name}</a
						>
						<div class="text-xs text-club-900/60">
							HCP {m.hcp}{#if m.memberNumber}
								· kort nr {m.memberNumber}{/if}
						</div>
					</div>
					<form method="POST" action="?/approve" use:enhance>
						<input type="hidden" name="memberId" value={m.id} />
						<button
							class="rounded-full bg-club-800 px-4 py-1.5 text-sm font-semibold text-cream-200 hover:bg-club-900"
							>Välkomna in</button
						>
					</form>
					<form method="POST" action="?/reject" use:enhance>
						<input type="hidden" name="memberId" value={m.id} />
						<button class="px-2 text-sm text-club-900/50 hover:text-red-700">Avslå</button>
					</form>
				</li>
			{/each}
		</ul>
	</section>
{/if}

<!-- Gästlistan -->
<section class="mt-8">
	<div class="flex items-end justify-between gap-3">
		<div>
			<p class="text-[11px] font-semibold tracking-[0.3em] text-gold-600 uppercase">Medlemmar</p>
			<h2 class="font-display mt-1 text-3xl font-semibold text-club-900">Sällskapet</h2>
		</div>
		<p class="text-xs text-club-900/50">
			{data.home.length + data.dual.length} medlemmar · {captains}
			{captains === 1 ? 'captain' : 'captains'}
		</p>
	</div>

	<div class="mt-4 overflow-hidden rounded-2xl bg-parchment shadow-sm">
		{#if data.home.length === 0 && data.dual.length === 0}
			<p class="p-6 text-sm text-club-900/60">Inga medlemmar än.</p>
		{/if}
		{#each [{ title: 'Hemmaklubb', rows: data.home, dual: false }, { title: 'Dubbelmedlemmar', rows: data.dual, dual: true }] as group (group.title)}
			{#if group.rows.length}
				<div class="flex items-center gap-3 bg-club-800/5 px-5 py-2">
					<span class="text-[10px] font-semibold tracking-[0.3em] text-club-900/50 uppercase"
						>{group.title}</span
					>
					<span class="h-px flex-1 bg-club-900/10"></span>
					<span class="text-[10px] text-club-900/40">{group.rows.length}</span>
				</div>
				<ul class="divide-y divide-cream-300">
					{#each group.rows as m (m.id)}
						<li class="flex items-center gap-4 px-5 py-3">
							<Avatar name={m.name} src={m.avatarUrl} class="h-10 w-10 text-sm" />
							<div class="min-w-0 flex-1">
								<a
									href="/members/{m.id}"
									class="font-display text-lg font-semibold text-club-900 hover:underline"
								>
									<span class="sm:hidden">{shortName(m.name)}</span>
									<span class="hidden sm:inline">{m.name}</span>
								</a>
								<div class="text-[11px] tracking-[0.15em] text-club-900/50 uppercase">
									{#if m.clubRole === 'captain'}<span class="text-gold-600">Captain</span> ·
									{/if}
									{#if m.status === 'aspirant'}Aspirant{:else if m.memberNumber}Kort nr {m.memberNumber}{:else}Medlem{/if}
								</div>
							</div>
							<span class="font-display text-2xl text-gold-600" title="Handicap">{m.hcp}</span>
							{#if data.isCaptain && m.status !== 'aspirant'}
								<div class="ml-2 flex shrink-0 flex-col items-end gap-1">
									<form method="POST" action="?/setRole" use:enhance>
										<input type="hidden" name="memberId" value={m.id} />
										<input
											type="hidden"
											name="role"
											value={m.clubRole === 'captain' ? 'member' : 'captain'}
										/>
										<button class={quiet}
											>{m.clubRole === 'captain' ? 'Avsätt captain' : 'Utse captain'}</button
										>
									</form>
									{#if group.dual && m.id !== data.meId}
										<form method="POST" action="?/removeMember" use:enhance>
											<input type="hidden" name="memberId" value={m.id} />
											<button class="text-xs text-club-900/40 hover:text-red-700 hover:underline"
												>Ta bort</button
											>
										</form>
									{/if}
								</div>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		{/each}
	</div>
</section>
