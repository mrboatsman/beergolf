<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { startRegistration } from '@simplewebauthn/browser';
	let { data, form } = $props();

	const fmt = (d: Date | null) => (d ? new Date(d).toLocaleDateString('sv-SE') : '—');

	// Passkey-registrering: options från servern → enhetens dialog → verifiera
	let pkBusy = $state(false);
	let pkError = $state<string | null>(null);
	let pkDone = $state<string | null>(null);
	let pkName = $state('');
	const supported = typeof window !== 'undefined' && !!window.PublicKeyCredential;

	async function addPasskey() {
		pkBusy = true;
		pkError = null;
		pkDone = null;
		try {
			const options = await fetch('/api/passkey/register').then((r) => r.json());
			const response = await startRegistration({ optionsJSON: options });
			const res = await fetch('/api/passkey/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ response, name: pkName || defaultName() })
			});
			if (!res.ok)
				throw new Error((await res.json().catch(() => ({})))?.message ?? 'Misslyckades.');
			pkDone = pkName || defaultName();
			pkName = '';
			await invalidateAll();
		} catch (e) {
			pkError =
				e instanceof Error && e.name === 'NotAllowedError'
					? 'Avbrutet.'
					: e instanceof Error
						? e.message
						: 'Något gick fel.';
		} finally {
			pkBusy = false;
		}
	}
	function defaultName() {
		const ua = navigator.userAgent;
		if (/iPhone|iPad/.test(ua)) return 'iPhone';
		if (/Android/.test(ua)) return 'Android';
		if (/Mac/.test(ua)) return 'Mac';
		if (/Windows/.test(ua)) return 'Windows';
		return 'Passkey';
	}
</script>

<svelte:head><title>Inställningar — Beer Golf</title></svelte:head>

<div class="mx-auto max-w-lg">
	<p class="text-xs font-semibold tracking-[0.2em] text-gold-600 uppercase">Konto</p>
	<h1 class="font-display mt-1 text-4xl font-semibold">Inställningar</h1>
	{#if data.forced}
		<p class="mt-3 rounded-xl bg-gold-400/20 px-4 py-3 text-sm text-club-900">
			Du loggade in med ett engångslösenord — välj ett eget innan du fortsätter.
		</p>
	{/if}

	{#if form?.error}
		<p class="mt-4 rounded bg-red-100 px-3 py-2 text-sm text-red-700">{form.error}</p>
	{/if}
	{#if form?.passkeyDeleted}
		<p class="mt-4 rounded bg-club-100 px-3 py-2 text-sm text-club-700">
			Passkeyn ”{form.passkeyDeleted}” är borttagen.
		</p>
	{/if}

	<!-- Passkeys -->
	<section class="mt-8 rounded-2xl bg-parchment p-5 shadow-sm">
		<h2 class="font-display text-2xl font-semibold text-club-900">Passkeys</h2>
		<p class="mt-1 text-sm text-club-900/70">
			Logga in med Face ID, Touch ID eller enhetens lås istället för lösenord. Passkeyn sparas på
			din enhet (och i din nyckelring om den synkas).
		</p>

		{#if data.passkeys.length}
			<ul class="mt-4 divide-y divide-cream-300">
				{#each data.passkeys as pk (pk.id)}
					<li class="flex items-center justify-between gap-3 py-2.5">
						<div class="min-w-0">
							<div class="truncate font-semibold text-club-900">{pk.name}</div>
							<div class="text-xs text-club-900/60">
								Skapad {fmt(pk.createdAt)} · Senast använd {fmt(pk.lastUsedAt)}
								{#if pk.backedUp}· synkad{/if}
							</div>
						</div>
						<form
							method="POST"
							action="?/deletePasskey"
							use:enhance={({ cancel }) => {
								if (!confirm(`Ta bort passkeyn ”${pk.name}”?`)) cancel();
							}}
						>
							<input type="hidden" name="id" value={pk.id} />
							<button class="text-xs font-semibold text-red-700 hover:underline">Ta bort</button>
						</form>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="mt-3 text-sm text-club-900/50">Inga passkeys än.</p>
		{/if}

		{#if supported}
			<div class="mt-4 flex flex-wrap items-end gap-2">
				<label class="text-sm">
					<span class="text-club-900/70">Namn (valfritt)</span>
					<input
						bind:value={pkName}
						maxlength="40"
						placeholder="t.ex. iPhone"
						class="mt-1 block w-44 rounded-lg border-cream-300 bg-white text-sm"
					/>
				</label>
				<button
					type="button"
					onclick={addPasskey}
					disabled={pkBusy}
					class="rounded-lg bg-club-700 px-4 py-2 text-sm font-semibold text-cream-200 hover:bg-club-800 disabled:opacity-50"
					>{pkBusy ? 'Väntar på enheten…' : '+ Lägg till passkey'}</button
				>
			</div>
			{#if pkError}<p class="mt-2 text-sm text-red-700">{pkError}</p>{/if}
			{#if pkDone}<p class="mt-2 text-sm text-club-700">Passkey ”{pkDone}” tillagd.</p>{/if}
		{:else}
			<p class="mt-3 text-sm text-club-900/50">Din webbläsare stöder inte passkeys.</p>
		{/if}
	</section>

	<!-- Lösenord -->
	<section class="mt-6 rounded-2xl bg-parchment p-5 shadow-sm">
		<h2 class="font-display text-2xl font-semibold text-club-900">Byt lösenord</h2>
		{#if form?.changed}
			<p class="mt-3 rounded bg-club-100 px-3 py-2 text-sm text-club-700">
				Lösenordet är bytt. <a class="font-semibold underline" href="/">Till dashboarden</a>
			</p>
		{:else}
			<form method="POST" action="?/password" use:enhance class="mt-4 space-y-4">
				<label class="block">
					<span class="text-sm font-medium text-club-900/70">Nytt lösenord (minst 8 tecken)</span>
					<input
						name="password"
						type="password"
						required
						minlength="8"
						autocomplete="new-password"
						class="mt-1 w-full rounded-lg border-cream-300 bg-white"
					/>
				</label>
				<label class="block">
					<span class="text-sm font-medium text-club-900/70">Upprepa lösenordet</span>
					<input
						name="confirm"
						type="password"
						required
						minlength="8"
						autocomplete="new-password"
						class="mt-1 w-full rounded-lg border-cream-300 bg-white"
					/>
				</label>
				<button
					class="rounded-lg bg-club-700 px-4 py-2 text-sm font-semibold text-cream-200 hover:bg-club-800"
					>Spara lösenord</button
				>
				<p class="text-xs text-club-900/50">Övriga inloggade enheter loggas ut.</p>
			</form>
		{/if}
	</section>
</div>
