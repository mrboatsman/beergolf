<script lang="ts">
	import { enhance, deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import Avatar from '$lib/components/Avatar.svelte';
	import AvatarCropper from '$lib/components/AvatarCropper.svelte';
	let { data, form } = $props();

	let confirmArchive = $state(false);

	// Klubblogga: vald fil → beskärare → uppladdning (samma flöde som profilbilden)
	let logoFile = $state<File | null>(null);
	let logoMsg = $state<string | null>(null);
	async function saveLogo(blob: Blob) {
		const fd = new FormData();
		fd.set('image', new File([blob], 'logo.jpg', { type: 'image/jpeg' }));
		const res = await fetch('?/uploadLogo', {
			method: 'POST',
			body: fd,
			headers: { 'x-sveltekit-action': 'true', accept: 'application/json' }
		});
		const r = deserialize(await res.text());
		logoMsg = r.type === 'success' ? 'Loggan är sparad.' : 'Kunde inte spara loggan.';
		logoFile = null;
		await invalidateAll();
	}

	const months = [
		'januari',
		'februari',
		'mars',
		'april',
		'maj',
		'juni',
		'juli',
		'augusti',
		'september',
		'oktober',
		'november',
		'december'
	];

	const notice = $derived.by(() => {
		if (!form) return null;
		if (form.renamed) return 'Klubben är uppdaterad.';
		if (form.logoSaved) return 'Loggan är sparad.';
		if (form.logoRemoved) return 'Loggan är borttagen.';
		if (form.seasonSaved) return `Säsongsstart sparad. Nuvarande säsong: ${form.seasonSaved}.`;
		return null;
	});

	const btn =
		'rounded-lg bg-club-700 px-4 py-2 text-sm font-semibold text-cream-200 hover:bg-club-800';
	const btnGhost =
		'rounded-lg border border-club-700/30 px-4 py-2 text-sm font-semibold text-club-800 hover:bg-club-100';
	const input = 'mt-1 w-full rounded-lg border-cream-300 bg-white text-sm';
</script>

<svelte:head><title>Inställningar – {data.club.name}</title></svelte:head>

<a href="/clubs/{data.club.slug}" class="text-sm text-club-900/60 hover:underline"
	>← {data.club.name}</a
>

<p class="mt-2 text-xs font-semibold tracking-[0.2em] text-gold-600 uppercase">Klubbmästare</p>
<h1 class="font-display mt-1 text-4xl font-semibold text-club-900">Klubbinställningar</h1>

{#if form?.error}
	<p class="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{form.error}</p>
{:else if notice || logoMsg}
	<p class="mt-4 rounded bg-club-100 px-3 py-2 text-sm text-club-700">{logoMsg ?? notice}</p>
{/if}

<!-- Namn & beskrivning -->
<section class="mt-6 rounded-2xl bg-parchment p-5 shadow-sm sm:p-6">
	<h2 class="font-display text-2xl font-semibold text-club-900">Namn & beskrivning</h2>
	<form method="POST" action="?/rename" use:enhance class="mt-3 grid gap-3 sm:max-w-md">
		<label class="text-sm">
			<span class="block text-club-900/70">Klubbnamn</span>
			<input
				name="name"
				required
				minlength="3"
				maxlength={data.maxName}
				value={data.club.name}
				class={input}
			/>
		</label>
		<label class="text-sm">
			<span class="block text-club-900/70">Beskrivning</span>
			<textarea name="description" rows="3" maxlength="300" class={input}
				>{data.club.description ?? ''}</textarea
			>
		</label>
		<div><button class={btn}>Spara</button></div>
	</form>
</section>

<!-- Logga -->
<section class="mt-6 rounded-2xl bg-parchment p-5 shadow-sm sm:p-6">
	<h2 class="font-display text-2xl font-semibold text-club-900">Logga</h2>
	{#if logoFile}
		<div class="mt-3">
			<AvatarCropper
				file={logoFile}
				out={512}
				oncancel={() => (logoFile = null)}
				onsave={saveLogo}
			/>
		</div>
	{:else}
		<div class="mt-3 flex flex-wrap items-center gap-5">
			<Avatar name={data.club.name} src={data.logoUrl} class="h-24 w-24 text-3xl" />
			<div class="space-y-2 text-sm">
				<p class="text-club-900/70">
					{#if data.logoUrl}
						Loggan visas i menyn för hemmamedlemmar, på klubbsidan och i klubblistan.
					{:else}
						Ingen logga uppladdad — sällskapets emblem visas i menyn.
					{/if}
				</p>
				<div class="flex flex-wrap gap-2">
					<label
						class="cursor-pointer rounded-lg bg-club-700 px-3 py-1.5 text-xs font-semibold text-cream-200 hover:bg-club-800"
					>
						{data.logoUrl ? 'Byt logga' : 'Ladda upp logga'}
						<input
							type="file"
							accept="image/*"
							class="sr-only"
							onchange={(e) => {
								const f = (e.currentTarget as HTMLInputElement).files?.[0];
								if (f) logoFile = f;
								(e.currentTarget as HTMLInputElement).value = '';
							}}
						/>
					</label>
					{#if data.logoUrl}
						<form
							method="POST"
							action="?/removeLogo"
							use:enhance={({ cancel }) => {
								if (!confirm('Ta bort klubbens logga?')) cancel();
							}}
						>
							<button
								class="rounded-lg border border-red-700/50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
								>Ta bort</button
							>
						</form>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</section>

<!-- Säsong -->
<section class="mt-6 rounded-2xl bg-parchment p-5 shadow-sm sm:p-6">
	<h2 class="font-display text-2xl font-semibold text-club-900">Säsong</h2>
	<p class="mt-1 text-sm text-club-900/70">
		Säsongen börjar den valda dagen varje år. Leaderboarden nollställs vid start; avslutade säsonger
		arkiveras under <a href="/history?club={data.club.slug}" class="underline">Historik</a>.
		Nuvarande säsong: <strong>{data.season.label}</strong>.
	</p>
	<form method="POST" action="?/setSeason" use:enhance class="mt-3 flex flex-wrap items-end gap-3">
		<label class="text-sm">
			<span class="block text-club-900/70">Startmånad</span>
			<select
				name="startMonth"
				value={String(data.season.startMonth)}
				class="mt-1 rounded-lg border-cream-300 bg-white text-sm"
			>
				{#each months as mname, i (i)}
					<option value={String(i + 1)}>{mname}</option>
				{/each}
			</select>
		</label>
		<label class="text-sm">
			<span class="block text-club-900/70">Dag</span>
			<input
				name="startDay"
				type="number"
				min="1"
				max="28"
				value={data.season.startDay}
				class="mt-1 w-20 rounded-lg border-cream-300 bg-white text-sm"
			/>
		</label>
		<button class={btn}>Spara</button>
	</form>
</section>

<!-- Arkivera -->
{#if !data.isPrimary}
	<section class="mt-6 rounded-2xl border border-red-700/20 bg-parchment p-5 shadow-sm sm:p-6">
		<h2 class="font-display text-2xl font-semibold text-red-800">Arkivera klubben</h2>
		<p class="mt-1 text-sm text-club-900/70">
			Klubben försvinner ur listorna och hemmamedlemmarna flyttas till Tablers Beer Golf Society.
			Spelhistoriken behålls. Klubbar utan aktivitet i ett år arkiveras automatiskt.
		</p>
		{#if confirmArchive}
			<form method="POST" action="?/archive" class="mt-3 flex flex-wrap gap-2">
				<button class="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white"
					>Ja, arkivera {data.club.name}</button
				>
				<button type="button" onclick={() => (confirmArchive = false)} class={btnGhost}
					>Avbryt</button
				>
			</form>
		{:else}
			<button type="button" onclick={() => (confirmArchive = true)} class="mt-3 {btnGhost}"
				>Arkivera…</button
			>
		{/if}
	</section>
{/if}
