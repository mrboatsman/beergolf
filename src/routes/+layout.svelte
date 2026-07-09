<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';

	let { children, data } = $props();
	let member = $derived(data.member);
	let isStaff = $derived(!!member && ['fadder', 'captain', 'admin'].includes(member.role));
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="flex min-h-screen flex-col">
	<header class="border-b border-beer-200 bg-beer-100/80 backdrop-blur">
		<nav class="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
			<a href="/" class="flex items-center gap-2 font-bold text-beer-800">
				<span class="text-xl">🍺⛳</span>
				<span>Beer Golf™</span>
			</a>
			<div class="ml-auto flex items-center gap-3 text-sm">
				{#if member}
					<a
						class="hover:underline"
						class:font-semibold={page.url.pathname.startsWith('/coasters')}
						href="/coasters">Coasters</a
					>
					<a
						class="hover:underline"
						class:font-semibold={page.url.pathname === '/rounds'}
						href="/rounds">Mina rundor</a
					>
					{#if isStaff}
						<a
							class="hover:underline"
							class:font-semibold={page.url.pathname.startsWith('/admin')}
							href="/admin">Admin</a
						>
					{/if}
					<span class="rounded-full bg-turf-600 px-2 py-0.5 text-xs font-semibold text-white">
						HCP {member.hcp}
					</span>
					<form method="POST" action="/logout">
						<button class="text-beer-700 hover:underline">Logga ut</button>
					</form>
				{:else}
					<a class="hover:underline" href="/login">Logga in</a>
				{/if}
			</div>
		</nav>
	</header>

	<main class="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
		{@render children()}
	</main>

	<footer class="border-t border-beer-200 px-4 py-6 text-center text-xs text-beer-600">
		Beer Golf™ — Play Slow. Hederssystemet gäller.
	</footer>
</div>
