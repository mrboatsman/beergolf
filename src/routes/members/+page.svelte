<script lang="ts">
	let { data } = $props();

	function initials(name: string) {
		return name
			.split(/\s+/)
			.map((w) => w[0])
			.slice(0, 2)
			.join('')
			.toUpperCase();
	}

	const roleLabel: Record<string, string> = {
		aspirant: 'Aspirant',
		member: 'Medlem',
		fadder: 'Fadder',
		captain: 'Klubbmästare',
		admin: 'Admin'
	};

	function pageUrl(p: number) {
		const params = new URLSearchParams();
		if (data.q) params.set('q', data.q);
		if (p > 1) params.set('page', String(p));
		const s = params.toString();
		return s ? `/members?${s}` : '/members';
	}
</script>

<div class="flex flex-wrap items-end justify-between gap-3">
	<div>
		<p class="text-xs font-semibold tracking-[0.2em] text-gold-600 uppercase">Klubben</p>
		<h1 class="font-display mt-1 text-4xl font-semibold">Medlemmar ({data.total})</h1>
	</div>
	<form method="GET" class="flex gap-2">
		<input
			type="search"
			name="q"
			value={data.q}
			placeholder="Sök namn eller e-post…"
			class="w-64 rounded-lg border-cream-300 bg-white text-sm"
		/>
		<button
			class="rounded-lg bg-club-700 px-4 py-2 text-sm font-semibold text-cream-200 hover:bg-club-800"
			>Sök</button
		>
	</form>
</div>

{#if data.members.length === 0}
	<p class="mt-6 text-sm text-club-900/60">Ingen medlem matchar ”{data.q}”.</p>
{:else}
	<div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each data.members as m (m.id)}
			<a
				href={`/members/${m.id}`}
				class="flex items-center gap-4 rounded-2xl bg-parchment p-5 shadow-sm transition-shadow hover:shadow-md"
			>
				<span
					class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-club-800 font-display text-lg font-semibold text-gold-300"
					>{initials(m.name)}</span
				>
				<div class="min-w-0">
					<div class="truncate font-semibold">{m.name}</div>
					<div class="text-xs text-club-900/60">
						{roleLabel[m.role] ?? m.role}
						{#if m.memberNumber}· Grönt Kort nr {m.memberNumber}{/if}
					</div>
				</div>
				<span class="ml-auto font-display text-2xl font-semibold text-club-700">{m.hcp}</span>
			</a>
		{/each}
	</div>
{/if}

{#if data.pages > 1}
	<nav class="mt-6 flex items-center justify-center gap-3 text-sm" aria-label="Sidnavigering">
		{#if data.page > 1}
			<a href={pageUrl(data.page - 1)} class="font-semibold text-club-700 hover:underline"
				>← Föregående</a
			>
		{/if}
		<span class="text-club-900/60">Sida {data.page} av {data.pages}</span>
		{#if data.page < data.pages}
			<a href={pageUrl(data.page + 1)} class="font-semibold text-club-700 hover:underline"
				>Nästa →</a
			>
		{/if}
	</nav>
{/if}
