<script lang="ts">
	import { enhance } from '$app/forms';
	let { data, form } = $props();
</script>

<div class="mx-auto max-w-sm">
	<p class="text-xs font-semibold tracking-[0.2em] text-gold-600 uppercase">Konto</p>
	<h1 class="font-display mt-1 text-4xl font-semibold">Byt lösenord</h1>
	{#if data.forced}
		<p class="mt-3 rounded-xl bg-gold-400/20 px-4 py-3 text-sm text-club-900">
			Du loggade in med ett engångslösenord — välj ett eget innan du fortsätter.
		</p>
	{/if}

	{#if form?.error}
		<p class="mt-4 rounded bg-red-100 px-3 py-2 text-sm text-red-700">{form.error}</p>
	{/if}
	{#if form?.changed}
		<p class="mt-4 rounded bg-club-100 px-3 py-2 text-sm text-club-700">
			Lösenordet är bytt. <a class="font-semibold underline" href="/">Till dashboarden</a>
		</p>
	{:else}
		<form method="POST" use:enhance class="mt-6 space-y-4">
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
				class="w-full rounded-lg bg-club-700 px-4 py-2.5 font-semibold text-cream-200 hover:bg-club-800"
				>Byt lösenord</button
			>
		</form>
	{/if}
</div>
