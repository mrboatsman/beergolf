<script lang="ts">
	import { enhance } from '$app/forms';
	let { data, form } = $props();
</script>

<div class="mx-auto max-w-sm">
	<h1 class="text-2xl font-bold text-beer-800">Lös in invalskod</h1>
	<p class="mt-2 text-sm text-beer-600">
		Skapa ditt aspirant-konto. Grönt kort utfärdas efter godkänt teori-, praktiskt- och etikettprov.
	</p>
	<form method="POST" use:enhance class="mt-6 space-y-4">
		{#if form?.error}
			<p class="rounded bg-red-100 px-3 py-2 text-sm text-red-700">{form.error}</p>
		{/if}
		<label class="block">
			<span class="text-sm font-medium text-beer-700">Invalskod</span>
			<input
				name="code"
				value={form?.code ?? data.code}
				required
				class="mt-1 w-full rounded-lg border-beer-300 font-mono tracking-widest uppercase"
			/>
		</label>
		<label class="block">
			<span class="text-sm font-medium text-beer-700">Namn</span>
			<input
				name="name"
				value={form?.name ?? ''}
				required
				class="mt-1 w-full rounded-lg border-beer-300"
			/>
		</label>
		<label class="block">
			<span class="text-sm font-medium text-beer-700">E-post</span>
			<input
				name="email"
				type="email"
				value={form?.email ?? ''}
				required
				class="mt-1 w-full rounded-lg border-beer-300"
			/>
		</label>
		<label class="block">
			<span class="text-sm font-medium text-beer-700">Lösenord (min 8 tecken)</span>
			<input
				name="password"
				type="password"
				required
				minlength="8"
				class="mt-1 w-full rounded-lg border-beer-300"
			/>
		</label>
		<button
			class="w-full rounded-lg bg-turf-600 px-4 py-2.5 font-semibold text-white hover:bg-turf-700"
			>Skapa konto</button
		>
	</form>
</div>
