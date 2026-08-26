<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { startAuthentication } from '@simplewebauthn/browser';
	let { form } = $props();

	// Passkey-inloggning: options → enhetens dialog → verifiera → session
	let pkBusy = $state(false);
	let pkError = $state<string | null>(null);
	const supported = typeof window !== 'undefined' && !!window.PublicKeyCredential;

	async function loginWithPasskey() {
		pkBusy = true;
		pkError = null;
		try {
			const options = await fetch('/api/passkey/login').then((r) => r.json());
			const response = await startAuthentication({ optionsJSON: options });
			const res = await fetch('/api/passkey/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ response })
			});
			if (!res.ok)
				throw new Error((await res.json().catch(() => ({})))?.message ?? 'Misslyckades.');
			await goto('/', { invalidateAll: true });
		} catch (e) {
			pkError =
				e instanceof Error && e.name === 'NotAllowedError'
					? 'Avbrutet eller ingen passkey vald.'
					: e instanceof Error
						? e.message
						: 'Något gick fel.';
		} finally {
			pkBusy = false;
		}
	}
</script>

<div class="mx-auto max-w-sm">
	<h1 class="font-display text-4xl font-semibold text-club-900">Logga in</h1>
	<form method="POST" use:enhance class="mt-6 space-y-4">
		{#if form?.error}
			<p class="rounded bg-red-100 px-3 py-2 text-sm text-red-700">{form.error}</p>
		{/if}
		<label class="block">
			<span class="text-sm font-medium text-club-900/70">E-post</span>
			<input
				name="email"
				type="email"
				value={form?.email ?? ''}
				required
				class="mt-1 w-full rounded-lg border-cream-300 bg-white"
			/>
		</label>
		<label class="block">
			<span class="text-sm font-medium text-club-900/70">Lösenord</span>
			<input
				name="password"
				type="password"
				required
				class="mt-1 w-full rounded-lg border-cream-300 bg-white"
			/>
		</label>
		<button
			class="w-full rounded-lg bg-club-700 px-4 py-2.5 font-semibold text-cream-200 hover:bg-club-800"
			>Logga in</button
		>
	</form>
	{#if supported}
		<div class="my-5 flex items-center gap-3 text-xs text-club-900/40">
			<span class="h-px flex-1 bg-cream-300"></span>eller<span class="h-px flex-1 bg-cream-300"
			></span>
		</div>
		<button
			type="button"
			onclick={loginWithPasskey}
			disabled={pkBusy}
			class="flex w-full items-center justify-center gap-2 rounded-lg border border-club-700 px-4 py-2.5 font-semibold text-club-800 hover:bg-club-100 disabled:opacity-50"
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
				<circle cx="9" cy="8" r="3.5" /><path d="M3 20a6 6 0 0 1 12 0" /><circle
					cx="18"
					cy="11"
					r="2.5"
				/><path d="M18 13.5V20l1.5-1.5M18 17l-1.5-1.5" />
			</svg>
			{pkBusy ? 'Väntar på enheten…' : 'Logga in med passkey'}
		</button>
		{#if pkError}<p class="mt-2 text-sm text-red-700">{pkError}</p>{/if}
		<p class="mt-2 text-xs text-club-900/50">
			Lägg till en passkey under Inställningar när du är inloggad.
		</p>
	{/if}
	<p class="mt-4 text-sm text-club-900/60">
		Ny aspirant? <a class="font-semibold underline" href="/join">Lös in din invalskod</a>.
	</p>
</div>
