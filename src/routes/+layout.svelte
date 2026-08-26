<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.png';
	import logo from '$lib/assets/logo.png';
	import { page } from '$app/state';

	let { children, data } = $props();
	let member = $derived(data.member);
	let isStaff = $derived(!!member && ['captain', 'admin'].includes(member.role));

	// Aspiranter ser bara certifieringsflödet tills grönt kort är utfärdat.
	// Avklarat teoriprov plockar bort Teoriprov ur menyn.
	let quizItem = $derived(
		data.theoryPassed
			? []
			: [{ href: '/quiz', label: 'Teoriprov', active: page.url.pathname.startsWith('/quiz') }]
	);
	let nav = $derived(
		member?.status === 'aspirant'
			? [
					{
						href: '/certification',
						label: 'Grönt Kort',
						active: page.url.pathname.startsWith('/certification')
					},
					...quizItem
				]
			: [
					{ href: '/', label: 'Dashboard', active: page.url.pathname === '/' },
					{
						href: '/coasters',
						label: 'Enter Scorecard',
						active: page.url.pathname.startsWith('/coasters')
					},
					{ href: '/rounds', label: 'Rundor', active: page.url.pathname === '/rounds' },
					{
						href: '/tournaments',
						label: 'Turneringar',
						active: page.url.pathname.startsWith('/tournaments')
					},
					{
						href: '/certification',
						label: 'Grönt Kort',
						active: page.url.pathname.startsWith('/certification')
					},
					...quizItem,
					{
						href: '/members',
						label: 'Leaderboard',
						active: page.url.pathname.startsWith('/members')
					},
					...(isStaff
						? [{ href: '/admin', label: 'Admin', active: page.url.pathname.startsWith('/admin') }]
						: [])
				]
	);

	let initials = $derived(
		member
			? member.name
					.split(/\s+/)
					.map((w: string) => w[0])
					.slice(0, 2)
					.join('')
					.toUpperCase()
			: ''
	);

	// Om sällskapet — öppnas när man klickar på emblemet
	let showAbout = $state(false);

	// Mobilmeny (hamburgare) — stängs vid navigering
	let menuOpen = $state(false);
	$effect(() => {
		page.url.pathname;
		menuOpen = false;
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

{#if member}
	<div class="flex min-h-screen">
		<!-- Sidebar (desktop) -->
		<aside
			class="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-club-800 text-cream-200 lg:flex"
		>
			<div class="flex items-center gap-3 px-6 pt-7 pb-6">
				<button
					type="button"
					onclick={() => (showAbout = true)}
					title="Om sällskapet"
					aria-label="Om sällskapet"
					class="shrink-0 rounded-full transition-transform hover:scale-105"
				>
					<img src={logo} alt="" class="h-12 w-12 rounded-full" />
				</button>
				<a href="/">
					<span class="font-display block text-xl leading-tight font-semibold"
						>Tablers Beer Golf Society</span
					>
					<span class="block text-[10px] tracking-[0.25em] text-gold-400 uppercase"
						>estd · 2026</span
					>
				</a>
			</div>

			<p
				class="px-6 pt-4 pb-2 text-[10px] font-semibold tracking-[0.3em] text-cream-200/40 uppercase"
			>
				Clubhouse
			</p>
			<nav class="flex flex-col gap-1 px-4">
				{#each nav as item (item.href)}
					<a
						href={item.href}
						class="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition-colors {item.active
							? 'border-l-2 border-gold-400 bg-club-700 font-semibold text-cream-200'
							: 'text-cream-200/70 hover:bg-club-700/50 hover:text-cream-200'}"
					>
						<span class="h-1.5 w-1.5 rounded-full {item.active ? 'bg-gold-400' : 'bg-cream-200/30'}"
						></span>
						{item.label}
					</a>
				{/each}
			</nav>

			<div class="mt-auto p-4">
				<div class="rounded-xl bg-club-700/40 p-4">
					<div class="flex items-center gap-3">
						<span
							class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-400 text-sm font-bold text-club-900"
							>{initials}</span
						>
						<div class="min-w-0">
							<div class="truncate text-sm font-semibold">{member.name}</div>
							<div class="text-xs text-cream-200/60">HCP {member.hcp}</div>
						</div>
					</div>
					<div class="mt-3 flex gap-3">
						<a
							href="/password"
							class="text-xs text-cream-200/60 hover:text-cream-200 hover:underline">Byt lösenord</a
						>
						<form method="POST" action="/logout">
							<button class="text-xs text-cream-200/60 hover:text-cream-200 hover:underline"
								>Logga ut</button
							>
						</form>
					</div>
				</div>
			</div>
		</aside>

		<!-- Topbar (mobil) -->
		<div class="flex min-w-0 flex-1 flex-col">
			<header class="bg-club-800 text-cream-200 lg:hidden">
				<div class="flex items-center justify-between gap-2 px-3 py-2.5">
					<div class="flex min-w-0 items-center gap-2">
						<button
							type="button"
							onclick={() => (showAbout = true)}
							aria-label="Om sällskapet"
							class="shrink-0 rounded-full"
						>
							<img src={logo} alt="" class="h-8 w-8 rounded-full" />
						</button>
						<a href="/" class="font-display truncate text-lg font-semibold"
							>Tablers Beer Golf Society</a
						>
					</div>
					<!-- Hamburgare: öppnar/stänger menypanelen -->
					<button
						type="button"
						onclick={() => (menuOpen = !menuOpen)}
						aria-label={menuOpen ? 'Stäng menyn' : 'Öppna menyn'}
						aria-expanded={menuOpen}
						aria-controls="mobile-menu"
						class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg hover:bg-club-700"
					>
						<svg
							viewBox="0 0 24 24"
							class="h-6 w-6"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
						>
							{#if menuOpen}
								<path d="M6 6l12 12M18 6L6 18" />
							{:else}
								<path d="M4 7h16M4 12h16M4 17h16" />
							{/if}
						</svg>
					</button>
				</div>
				{#if menuOpen}
					<nav id="mobile-menu" class="border-t border-club-700 px-3 pt-2 pb-3">
						{#each nav as item (item.href)}
							<a
								href={item.href}
								class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-base {item.active
									? 'bg-club-700 font-semibold text-gold-300'
									: 'text-cream-200/80 hover:bg-club-700/50'}"
							>
								<span
									class="h-1.5 w-1.5 rounded-full {item.active ? 'bg-gold-400' : 'bg-cream-200/30'}"
								></span>
								{item.label}
							</a>
						{/each}
						<div class="mt-2 flex items-center gap-3 rounded-xl bg-club-700/40 px-3 py-3">
							<span
								class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-400 text-sm font-bold text-club-900"
								>{initials}</span
							>
							<div class="min-w-0 flex-1">
								<div class="truncate text-sm font-semibold">{member.name}</div>
								<div class="text-xs text-cream-200/60">HCP {member.hcp}</div>
							</div>
							<a href="/password" class="text-xs text-cream-200/70 hover:underline">Byt lösenord</a>
							<form method="POST" action="/logout">
								<button class="text-xs text-cream-200/70 hover:underline">Logga ut</button>
							</form>
						</div>
					</nav>
				{/if}
			</header>

			<main class="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-8">
				{@render children()}
			</main>

			<footer class="px-4 py-6 text-center text-xs text-club-900/50">
				Tablers Beer Golf Society — Färre slag. Fler skål.
			</footer>
		</div>
	</div>
{:else}
	<!-- Utloggad: enkel centrerad vy -->
	<div class="flex min-h-screen flex-col">
		<header class="bg-club-800 text-cream-200">
			<nav class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
				<div class="flex items-center gap-2">
					<button
						type="button"
						onclick={() => (showAbout = true)}
						aria-label="Om sällskapet"
						class="shrink-0 rounded-full"
					>
						<img src={logo} alt="" class="h-9 w-9 rounded-full" />
					</button>
					<a href="/" class="font-display text-xl font-semibold">Tablers Beer Golf Society</a>
				</div>
				<a href="/login" class="text-sm text-cream-200/80 hover:underline">Logga in</a>
			</nav>
		</header>
		<main class="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
			{@render children()}
		</main>
		<footer class="px-4 py-6 text-center text-xs text-club-900/50">
			Tablers Beer Golf Society — Färre slag. Fler skål.
		</footer>
	</div>
{/if}

<!-- Om sällskapet -->
{#if showAbout}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-club-950/70 p-4"
		role="presentation"
		onclick={(e) => {
			if (e.target === e.currentTarget) showAbout = false;
		}}
	>
		<div
			class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-parchment p-8 shadow-xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby="about-title"
		>
			<img
				src={logo}
				alt="Tablers Beer Golf Society"
				class="mx-auto h-44 w-44 rounded-full shadow-lg"
			/>
			<p class="mt-5 text-center text-xs font-semibold tracking-[0.25em] text-gold-600 uppercase">
				estd · september 2026
			</p>
			<h2
				id="about-title"
				class="font-display mt-1 text-center text-3xl font-semibold text-club-900"
			>
				Tablers Beer Golf Society
			</h2>

			<div class="mt-4 space-y-3 text-sm leading-relaxed text-club-900/80">
				<p>
					Allt började en sen kväll runt bordet hos <strong>OT109</strong>, när samtalet kom in på
					ölutmaningar. <em>Split the G</em> i all ära, men ingen av oss hade vågat försöka.
					Guinness förlåter inga darrhänta. Birra Morettis <em>Setting the Table</em> gick bort direkt,
					för hur lägger man ölets nivå i linje med ett runt bord? Och Neknomination kändes mest fånigt.
					Vi är för gamla för sånt, och någon utmaning är det ju inte heller.
				</p>
				<p>
					Mitt i allt detta pekade en av bröderna på kvällens mest välfyllda glas, en bra bit över
					50 cl-strecket, och sa till ägaren:
				</p>
				<p class="font-display border-l-2 border-gold-400 pl-4 text-base text-club-800 italic">
					”Du som är så duktig på golf. Dig vill jag se lägga ölen närmast pinnen. Du kommer inte
					ens <strong>pin high</strong> på 50 cl-strecket.”
				</p>
				<p>
					Utmaningen antogs på stående fot. Klunk för klunk och hål för hål växte Beer Golf fram,
					konsten att med kontrollerade klunkar landa ölen exakt på strecket. I september 2026
					stadfäste OT109 sällskapet. Sedan dess spelar vi i Old Tablers-anda, med kamratskap,
					hederssystem och ädel tävlan på provslingan.
				</p>
			</div>

			<p class="font-display mt-4 text-center text-lg text-club-700 italic">
				Färre slag. Fler skål.
			</p>
			<div class="mt-5 text-center">
				<button
					type="button"
					onclick={() => (showAbout = false)}
					class="rounded-lg bg-club-700 px-5 py-2 text-sm font-semibold text-cream-200 hover:bg-club-800"
					>Stäng</button
				>
			</div>
		</div>
	</div>
{/if}
