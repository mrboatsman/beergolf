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
</script>

<p class="text-xs font-semibold tracking-[0.2em] text-gold-600 uppercase">Klubben</p>
<h1 class="font-display mt-1 text-4xl font-semibold">Medlemmar</h1>

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
