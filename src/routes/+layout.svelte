<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.png';
	import logo from '$lib/assets/logo.png';
	import { page } from '$app/state';
	import { fly } from 'svelte/transition';

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
					{ href: '/gallery', label: 'Galleri', active: page.url.pathname.startsWith('/gallery') },
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
					{ href: '/invite', label: 'Bjud in', active: page.url.pathname.startsWith('/invite') },
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

	// Bottennav på mobil/PWA: de viktigaste vyerna som ikoner (ej för aspiranter)
	let tabs = $derived(
		member?.status === 'aspirant'
			? [
					{
						href: '/certification',
						label: 'Grönt Kort',
						icon: 'card',
						active: page.url.pathname.startsWith('/certification')
					},
					...(data.theoryPassed
						? []
						: [
								{
									href: '/quiz',
									label: 'Teoriprov',
									icon: 'quiz',
									active: page.url.pathname.startsWith('/quiz')
								}
							])
				]
			: [
					{ href: '/', label: 'Hem', icon: 'home', active: page.url.pathname === '/' },
					{
						href: '/coasters',
						label: 'Coasters',
						icon: 'coaster',
						active: page.url.pathname.startsWith('/coasters')
					},
					{
						href: '/members',
						label: 'Leaderboard',
						icon: 'trophy',
						active: page.url.pathname.startsWith('/members')
					},
					{
						href: '/invite',
						label: 'Bjud in',
						icon: 'invite',
						active: page.url.pathname.startsWith('/invite')
					}
				]
	);

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
					<div class="mt-3 flex items-center gap-3">
						<a
							href="/settings"
							class="text-xs text-cream-200/60 hover:text-cream-200 hover:underline"
							>Inställningar</a
						>
						<form method="POST" action="/logout" class="flex">
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
			<!-- Sticky topbar; pt = safe-area så den hamnar under klockan/notchen i PWA-läge -->
			<header
				class="sticky top-0 z-30 bg-club-800 pt-[env(safe-area-inset-top)] text-cream-200 shadow-md lg:hidden"
			>
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
				</div>
			</header>

			<main class="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-8">
				{@render children()}
			</main>

			<footer
				class="px-4 py-6 text-center text-xs text-club-900/50 {tabs.length ? 'pb-24 lg:pb-6' : ''}"
			>
				Tablers Beer Golf Society — Färre slag. Fler skål.
			</footer>

			{#if menuOpen}
				<!-- Mobilmeny som bottom sheet: glider upp ovanför bottennavet -->
				<div
					class="fixed inset-0 z-30 bg-club-950/50 lg:hidden"
					role="presentation"
					onclick={() => (menuOpen = false)}
				></div>
				<nav
					id="mobile-menu"
					aria-label="Meny"
					class="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-40 max-h-[70vh] overflow-y-auto rounded-t-2xl border-t border-club-700 bg-club-800 px-3 pt-3 pb-3 text-cream-200 shadow-[0_-10px_30px_rgba(0,0,0,0.35)] lg:hidden"
					transition:fly={{ y: 200, duration: 200 }}
				>
					<div class="mx-auto mb-2 h-1 w-10 rounded-full bg-cream-200/30"></div>
					<div class="mb-2 flex items-center gap-3 rounded-xl bg-club-700/40 px-3 py-3">
						<span
							class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-400 text-sm font-bold text-club-900"
							>{initials}</span
						>
						<div class="min-w-0 flex-1">
							<div class="truncate text-sm font-semibold">{member.name}</div>
							<div class="text-xs text-cream-200/60">HCP {member.hcp}</div>
						</div>
						<div class="flex items-center gap-3 text-xs leading-none">
							<a href="/settings" class="text-cream-200/70 hover:underline">Inställningar</a>
							<form method="POST" action="/logout" class="flex">
								<button class="text-cream-200/70 hover:underline">Logga ut</button>
							</form>
						</div>
					</div>
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
				</nav>
			{/if}

			{#if tabs.length}
				<!-- Bottennav (mobil/PWA): fast längst ner, respekterar iPhone-safe-area -->
				<nav
					aria-label="Snabbmeny"
					class="fixed inset-x-0 bottom-0 z-40 border-t border-club-700 bg-club-800 pb-[env(safe-area-inset-bottom)] text-cream-200 lg:hidden"
				>
					<div class="mx-auto flex max-w-lg items-stretch">
						{#each tabs as t (t.href)}
							<a
								href={t.href}
								aria-current={t.active ? 'page' : undefined}
								class="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium {t.active
									? 'text-gold-300'
									: 'text-cream-200/60 active:text-cream-200'}"
							>
								<svg
									viewBox="0 0 24 24"
									class="h-6 w-6"
									fill="none"
									stroke="currentColor"
									stroke-width="1.8"
									stroke-linecap="round"
									stroke-linejoin="round"
									aria-hidden="true"
								>
									{#if t.icon === 'home'}
										<path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v10h5v-6h4v6h5V10" />
									{:else if t.icon === 'coaster'}
										<circle cx="12" cy="12" r="9" /><path d="M7 9h10M7 12h10M7 15h6" />
									{:else if t.icon === 'trophy'}
										<path d="M8 4h8v5a4 4 0 0 1-8 0Z" /><path
											d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4"
										/><path d="M12 13v4M9 20h6M10 17h4v3h-4Z" />
									{:else if t.icon === 'invite'}
										<circle cx="10" cy="8" r="3.5" /><path d="M4 20a6 6 0 0 1 12 0" /><path
											d="M19 8v6M16 11h6"
										/>
									{:else if t.icon === 'card'}
										<rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h4" />
									{:else if t.icon === 'quiz'}
										<circle cx="12" cy="12" r="9" /><path
											d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7"
										/><path d="M12 17h.01" />
									{/if}
								</svg>
								{t.label}
							</a>
						{/each}
						<button
							type="button"
							onclick={() => (menuOpen = !menuOpen)}
							aria-expanded={menuOpen}
							aria-controls="mobile-menu"
							class="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium {menuOpen
								? 'text-gold-300'
								: 'text-cream-200/60'}"
							aria-label="Öppna menyn"
						>
							<svg
								viewBox="0 0 24 24"
								class="h-6 w-6"
								fill="none"
								stroke="currentColor"
								stroke-width="1.8"
								stroke-linecap="round"
								aria-hidden="true"
							>
								<path d="M4 7h16M4 12h16M4 17h16" />
							</svg>
							Meny
						</button>
					</div>
				</nav>
			{/if}
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
