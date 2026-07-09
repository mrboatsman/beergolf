<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
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
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

{#if member}
	<div class="flex min-h-screen">
		<!-- Sidebar (desktop) -->
		<aside
			class="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-club-800 text-cream-200 lg:flex"
		>
			<a href="/" class="flex items-center gap-3 px-6 pt-7 pb-6">
				<span
					class="flex h-12 w-12 items-center justify-center rounded-full border-2 border-gold-400 font-display text-xl font-semibold text-gold-300"
					>BG</span
				>
				<span>
					<span class="font-display block text-xl leading-tight font-semibold"
						>Tablers Beer Golf Society</span
					>
					<span class="block text-[10px] tracking-[0.25em] text-gold-400 uppercase"
						>estd · 2026</span
					>
				</span>
			</a>

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
					<form method="POST" action="/logout" class="mt-3">
						<button class="text-xs text-cream-200/60 hover:text-cream-200 hover:underline"
							>Logga ut</button
						>
					</form>
				</div>
			</div>
		</aside>

		<!-- Topbar (mobil) -->
		<div class="flex min-w-0 flex-1 flex-col">
			<header class="bg-club-800 text-cream-200 lg:hidden">
				<div class="flex items-center justify-between px-4 py-3">
					<a href="/" class="flex items-center gap-2">
						<span
							class="flex h-8 w-8 items-center justify-center rounded-full border border-gold-400 font-display text-sm font-semibold text-gold-300"
							>BG</span
						>
						<span class="font-display text-lg font-semibold">Tablers Beer Golf Society</span>
					</a>
					<form method="POST" action="/logout">
						<button class="text-xs text-cream-200/70 hover:underline">Logga ut</button>
					</form>
				</div>
				<nav class="flex gap-1 overflow-x-auto px-3 pb-2">
					{#each nav as item (item.href)}
						<a
							href={item.href}
							class="rounded-full px-3 py-1 text-sm whitespace-nowrap {item.active
								? 'bg-club-700 font-semibold text-gold-300'
								: 'text-cream-200/70'}">{item.label}</a
						>
					{/each}
				</nav>
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
				<a href="/" class="flex items-center gap-2">
					<span
						class="flex h-9 w-9 items-center justify-center rounded-full border border-gold-400 font-display font-semibold text-gold-300"
						>BG</span
					>
					<span class="font-display text-xl font-semibold">Beer Golf™</span>
				</a>
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
