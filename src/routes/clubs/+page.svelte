<script lang="ts">
	import { enhance } from '$app/forms';
	let { data, form } = $props();
	let showCreate = $state(false);
</script>

<svelte:head><title>Klubbar – Beer Golf</title></svelte:head>

<div class="flex flex-wrap items-end justify-between gap-3">
	<div>
		<p class="text-xs font-semibold tracking-[0.2em] text-gold-600 uppercase">Beer Golf™</p>
		<h1 class="font-display mt-1 text-4xl font-semibold">Klubbar</h1>
		<p class="mt-1 max-w-2xl text-sm text-club-900/60">
			Som i riktig golf: du har <strong>en hemmaklubb</strong> där du rankas och representerar, och
			kan vara <strong>dubbelmedlem</strong> i fler för att spela deras coasters. Grönt kort och handikapp
			följer dig överallt. Alla med grönt kort är med i Tablers Beer Golf Society.
		</p>
	</div>
	{#if data.canCreate}
		<button
			type="button"
			onclick={() => (showCreate = !showCreate)}
			class="rounded-lg bg-club-700 px-4 py-2 text-sm font-semibold text-cream-200 hover:bg-club-800"
			>{showCreate ? 'Avbryt' : 'Starta ny klubb'}</button
		>
	{/if}
</div>

{#if form?.error}
	<p class="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{form.error}</p>
{/if}

{#if showCreate || form?.error}
	<section class="mt-6 rounded-2xl bg-parchment p-5 shadow-sm">
		<h2 class="font-semibold text-club-900">Starta ny klubb</h2>
		<p class="mt-1 text-sm text-club-900/70">
			Du blir klubbmästare (captain) och godkänner vilka som får gå med. Klubbar som är inaktiva i
			ett år arkiveras — hemmamedlemmar flyttas då till Tablers Beer Golf Society.
		</p>
		<form method="POST" action="?/create" use:enhance class="mt-3 grid gap-3 sm:max-w-md">
			<label class="text-sm">
				<span class="block text-club-900/70">Klubbnamn</span>
				<input
					name="name"
					required
					minlength="3"
					maxlength={data.maxName}
					value={form && 'name' in form ? form.name : ''}
					placeholder="t.ex. OT109 Poseidon"
					class="mt-1 w-full rounded-lg border-cream-300 bg-white text-sm"
				/>
			</label>
			<label class="text-sm">
				<span class="block text-club-900/70">Beskrivning (valfritt)</span>
				<textarea
					name="description"
					rows="2"
					maxlength="300"
					class="mt-1 w-full rounded-lg border-cream-300 bg-white text-sm"></textarea>
			</label>
			<label class="flex items-center gap-2 text-sm text-club-900/80">
				<input type="checkbox" name="makeHome" value="1" checked class="rounded border-cream-300" />
				Gör den till min hemmaklubb
			</label>
			<div>
				<button
					class="rounded-lg bg-club-700 px-4 py-2 text-sm font-semibold text-cream-200 hover:bg-club-800"
					>Skapa klubb</button
				>
			</div>
		</form>
	</section>
{/if}

<div class="mt-6 grid gap-4 sm:grid-cols-2">
	{#each data.clubs as c (c.id)}
		<a
			href="/clubs/{c.slug}"
			class="block rounded-2xl bg-parchment p-5 shadow-sm transition hover:shadow-md {c.isHome
				? 'ring-2 ring-gold-400'
				: ''}"
		>
			<div class="flex items-start justify-between gap-2">
				<div class="flex min-w-0 items-center gap-3">
					{#if c.logoUrl}
						<img src={c.logoUrl} alt="" class="h-12 w-12 shrink-0 rounded-full object-cover" />
					{/if}
					<h2 class="font-display text-2xl font-semibold text-club-900">{c.name}</h2>
				</div>
				{#if c.isPrimary}
					<span
						class="shrink-0 rounded-full bg-club-700 px-2 py-0.5 text-[10px] font-bold tracking-wider text-cream-200 uppercase"
						>Huvudklubb</span
					>
				{/if}
			</div>
			{#if c.description}
				<p class="mt-1 text-sm text-club-900/70">{c.description}</p>
			{/if}
			<p class="mt-3 text-xs text-club-900/60">
				{c.homeMembers} hemmamedlemmar · {c.members} medlemmar totalt
				{#if c.captains}· Captain: {c.captains}{/if}
			</p>
			<div class="mt-2 flex flex-wrap gap-1.5">
				{#if c.isHome}
					<span class="rounded-full bg-gold-400 px-2 py-0.5 text-[11px] font-semibold text-club-900"
						>Min hemmaklubb</span
					>
				{:else if c.myStatus === 'active'}
					<span class="rounded-full bg-club-100 px-2 py-0.5 text-[11px] font-semibold text-club-800"
						>Dubbelmedlem</span
					>
				{:else if c.myStatus === 'pending'}
					<span
						class="rounded-full bg-cream-300 px-2 py-0.5 text-[11px] font-semibold text-club-800"
						>Ansökan väntar</span
					>
				{/if}
				{#if c.myRole === 'captain' && c.myStatus === 'active'}
					<span
						class="rounded-full bg-club-700 px-2 py-0.5 text-[11px] font-semibold text-cream-200"
						>Captain</span
					>
				{/if}
			</div>
		</a>
	{/each}
</div>

{#if data.archived.length}
	<h2 class="font-display mt-10 text-2xl font-semibold text-club-900/70">Arkiverade klubbar</h2>
	<ul class="mt-2 space-y-1 text-sm text-club-900/60">
		{#each data.archived as c (c.id)}
			<li><a href="/clubs/{c.slug}" class="underline">{c.name}</a> · {c.members} medlemmar</li>
		{/each}
	</ul>
{/if}
