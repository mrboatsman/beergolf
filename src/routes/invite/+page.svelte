<script lang="ts">
	import { enhance } from '$app/forms';
	let { data, form } = $props();

	const fmt = (d: Date | null) => (d ? new Date(d).toLocaleDateString('sv-SE') : '—');
	const link = (code: string) => `${data.origin}/join?code=${code}`;
	const isExpired = (d: Date | null) => !!d && new Date(d).getTime() < Date.now();

	let copied = $state<string | null>(null);
	async function copy(code: string) {
		try {
			await navigator.clipboard.writeText(link(code));
			copied = code;
			setTimeout(() => (copied = null), 2000);
		} catch {
			/* utan clipboard-API: användaren markerar länken själv */
		}
	}
	function share(code: string) {
		if (navigator.share) {
			navigator
				.share({
					title: 'Tablers Beer Golf Society',
					text: 'Du är inbjuden till Beer Golf. Skapa ditt aspirantkonto här:',
					url: link(code)
				})
				.catch(() => {});
		} else copy(code);
	}
</script>

<svelte:head><title>Bjud in — Beer Golf</title></svelte:head>

<h1 class="font-display text-4xl font-semibold text-club-900">Bjud in</h1>
<p class="mt-2 max-w-xl text-sm text-club-900/70">
	Skapa en invalskod och skicka länken till den du vill ha med i sällskapet. När hen skapar sitt
	konto blir <strong>du fadder</strong> och följer aspiranten genom grönt kort-certifieringen. Koden
	är personlig, engångs och gäller i {data.inviteDays} dagar.
</p>

{#if form?.error}
	<p class="mt-4 rounded bg-red-100 px-3 py-2 text-sm text-red-700">{form.error}</p>
{/if}

<form method="POST" action="?/create" use:enhance class="mt-6">
	<button
		class="rounded-lg bg-gold-500 px-5 py-2.5 text-sm font-semibold text-club-900 hover:bg-gold-400"
		>+ Ny invalskod</button
	>
</form>

{#if form?.created}
	<section class="mt-6 rounded-2xl border border-gold-400/60 bg-parchment p-5 shadow-sm">
		<p class="text-sm text-club-900/70">Ny kod skapad. Dela länken:</p>
		<p class="mt-2 font-mono text-3xl font-bold tracking-widest text-club-900">{form.created}</p>
		<p class="mt-1 text-sm break-all text-club-900/70 select-all">{link(form.created)}</p>
		<div class="mt-3 flex flex-wrap gap-2">
			<button
				type="button"
				onclick={() => copy(form.created)}
				class="rounded-lg bg-club-700 px-4 py-2 text-sm font-semibold text-cream-200 hover:bg-club-800"
				>{copied === form.created ? 'Kopierad ✓' : 'Kopiera länk'}</button
			>
			<button
				type="button"
				onclick={() => share(form.created)}
				class="rounded-lg border border-club-700 px-4 py-2 text-sm font-semibold text-club-800 hover:bg-club-100"
				>Dela…</button
			>
		</div>
	</section>
{/if}

<section class="mt-8">
	<h2 class="font-semibold text-club-900">Mina koder ({data.invites.length})</h2>
	<ul class="mt-3 space-y-2">
		{#each data.invites as i (i.id)}
			<li class="rounded-2xl bg-parchment px-4 py-3 shadow-sm">
				<div class="flex flex-wrap items-center justify-between gap-2">
					<span class="font-mono text-lg font-bold tracking-widest text-club-900">{i.code}</span>
					<span class="text-xs text-club-900/50">Skapad {fmt(i.createdAt)}</span>
				</div>
				<div class="mt-1 text-sm text-club-900/80">
					{#if i.usedById}
						Använd {fmt(i.usedAt)} av
						<a href="/members/{i.usedById}" class="font-medium hover:underline">{i.usedByName}</a>
						{#if i.usedByStatus === 'aspirant'}
							<span class="ml-1 rounded bg-cream-300 px-1.5 py-0.5 text-xs">under certifiering</span
							>
							<a
								href="/certification?aspirant={i.usedById}"
								class="ml-2 inline-block rounded-lg bg-club-700 px-2.5 py-1 text-xs font-semibold text-cream-200 hover:bg-club-800"
								>Examinera →</a
							>
						{:else}
							<span class="ml-1 rounded bg-club-800 px-1.5 py-0.5 text-xs text-cream-200"
								>grönt kort</span
							>
						{/if}
					{:else if isExpired(i.expiresAt)}
						<span class="text-club-900/50">Utgången {fmt(i.expiresAt)}</span>
					{:else}
						Oanvänd, gäller till {fmt(i.expiresAt)}
					{/if}
				</div>
				{#if !i.usedById && !isExpired(i.expiresAt)}
					<div class="mt-2 flex flex-wrap items-center gap-3">
						<button
							type="button"
							onclick={() => copy(i.code)}
							class="text-xs font-semibold text-club-700 hover:underline"
							>{copied === i.code ? 'Kopierad ✓' : 'Kopiera länk'}</button
						>
						<button
							type="button"
							onclick={() => share(i.code)}
							class="text-xs font-semibold text-club-700 hover:underline">Dela…</button
						>
						<form method="POST" action="?/revoke" use:enhance class="inline">
							<input type="hidden" name="id" value={i.id} />
							<button class="text-xs text-red-700 hover:underline">Ta bort</button>
						</form>
					</div>
				{/if}
			</li>
		{:else}
			<li class="rounded-2xl bg-parchment px-4 py-4 text-sm text-club-900/50 shadow-sm">
				Inga koder än.
			</li>
		{/each}
	</ul>
</section>
