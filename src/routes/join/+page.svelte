<script lang="ts">
	import { enhance } from '$app/forms';
	let { data, form } = $props();
</script>

<div class="mx-auto max-w-sm">
	<h1 class="font-display text-4xl font-semibold text-club-900">Lös in invalskod</h1>
	<p class="mt-2 text-sm text-club-900/60">
		Skapa ditt aspirant-konto. Grönt kort utfärdas efter godkänt teori-, praktiskt- och etikettprov.
	</p>
	<form method="POST" use:enhance class="mt-6 space-y-4">
		{#if form?.error}
			<p class="rounded bg-red-100 px-3 py-2 text-sm text-red-700">{form.error}</p>
		{/if}
		<label class="block">
			<span class="text-sm font-medium text-club-900/70">Invalskod</span>
			<input
				name="code"
				value={form?.code ?? data.code}
				required
				class="mt-1 w-full rounded-lg border-cream-300 bg-white font-mono tracking-widest uppercase"
			/>
		</label>
		<label class="block">
			<span class="text-sm font-medium text-club-900/70">Namn</span>
			<input
				name="name"
				value={form?.name ?? ''}
				required
				class="mt-1 w-full rounded-lg border-cream-300 bg-white"
			/>
		</label>
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
			<span class="text-sm font-medium text-club-900/70">Lösenord (min 8 tecken)</span>
			<input
				name="password"
				type="password"
				required
				minlength="8"
				class="mt-1 w-full rounded-lg border-cream-300 bg-white"
			/>
		</label>
		<button
			class="w-full rounded-lg bg-club-700 px-4 py-2.5 font-semibold text-cream-200 hover:bg-club-800"
			>Skapa konto</button
		>
	</form>
</div>
