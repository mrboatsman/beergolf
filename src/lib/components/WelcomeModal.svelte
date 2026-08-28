<script lang="ts">
	// Välkomstmodal — visas EN gång efter att grönt kort utfärdats:
	// gratulation, vad man kan göra nu, profilbild (beskärare) och PWA-installation.
	// "Slå ut!" stämplar members.welcomeSeenAt via ?/dismissWelcome.
	import { enhance, deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import Avatar from '$lib/components/Avatar.svelte';
	import AvatarCropper from '$lib/components/AvatarCropper.svelte';
	import { isIOS, isStandalone } from '$lib/push-client';

	let {
		name,
		memberNumber,
		avatarUrl
	}: { name: string; memberNumber: number | null; avatarUrl: string | null } = $props();

	// Profilbild
	let cropFile = $state<File | null>(null);
	let avatarMsg = $state<string | null>(null);
	async function saveAvatar(blob: Blob) {
		const fd = new FormData();
		fd.set('image', new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
		const res = await fetch('/settings?/uploadAvatar', {
			method: 'POST',
			body: fd,
			headers: { 'x-sveltekit-action': 'true', accept: 'application/json' }
		});
		const r = deserialize(await res.text());
		avatarMsg = r.type === 'success' ? 'Profilbilden är sparad.' : 'Kunde inte spara bilden.';
		cropFile = null;
		await invalidateAll();
	}

	// PWA-installation: Chrome/Android ger beforeinstallprompt, iOS kräver Dela-menyn
	let installEvent = $state<(Event & { prompt: () => Promise<void> }) | null>(null);
	let standalone = $state(false);
	let ios = $state(false);
	onMount(() => {
		standalone = isStandalone();
		ios = isIOS();
		const h = (e: Event) => {
			e.preventDefault();
			installEvent = e as Event & { prompt: () => Promise<void> };
		};
		window.addEventListener('beforeinstallprompt', h);
		return () => window.removeEventListener('beforeinstallprompt', h);
	});
</script>

<div
	class="fixed inset-0 z-[65] flex items-end justify-center bg-club-950/70 p-0 sm:items-center sm:p-4"
	role="dialog"
	aria-modal="true"
	aria-labelledby="welcome-title"
>
	<div
		class="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-parchment p-6 shadow-2xl sm:rounded-3xl"
	>
		<p class="text-xs font-semibold tracking-[0.2em] text-gold-600 uppercase">Grattis</p>
		<h2 id="welcome-title" class="font-display mt-1 text-3xl font-semibold text-club-900">
			Välkommen till klubbhuset, {name.split(' ')[0]}!
		</h2>
		<p class="mt-2 text-sm text-club-900/80">
			Du har nu Grönt Kort{#if memberNumber}&nbsp;nr&nbsp;<strong>{memberNumber}</strong>{/if} och är
			fullvärdig medlem i Tablers Beer Golf Society. Från och med nu kan du:
		</p>
		<ul class="mt-3 space-y-1.5 text-sm text-club-900/85">
			<li>
				<strong>Skapa Score Coasters</strong> under Coasters och spela matcher med andra medlemmar — poängen
				sparas automatiskt och ditt handikapp justeras när du signerar.
			</li>
			<li><strong>Bjuda in nya</strong> under Bjud in — den du bjuder in får dig som fadder.</li>
			<li>Klättra på <strong>leaderboarden</strong> — lägst handikapp vinner.</li>
		</ul>

		<!-- Profilbild -->
		<div class="mt-5 rounded-2xl bg-cream-200 p-4">
			<h3 class="font-semibold text-club-900">Profilbild</h3>
			{#if cropFile}
				<div class="mt-3">
					<AvatarCropper file={cropFile} oncancel={() => (cropFile = null)} onsave={saveAvatar} />
				</div>
			{:else}
				<div class="mt-2 flex items-center gap-4">
					<Avatar {name} src={avatarUrl} class="h-16 w-16 text-xl" />
					<div class="text-sm">
						<label
							class="cursor-pointer rounded-lg bg-club-700 px-3 py-1.5 text-xs font-semibold text-cream-200 hover:bg-club-800"
						>
							Ladda upp bild
							<input
								type="file"
								accept="image/*"
								class="sr-only"
								onchange={(e) => {
									const f = (e.currentTarget as HTMLInputElement).files?.[0];
									if (f) cropFile = f;
									(e.currentTarget as HTMLInputElement).value = '';
								}}
							/>
						</label>
						<p class="mt-1.5 text-xs text-club-900/60">
							{avatarMsg ??
								'Annars visas din Gravatar eller dina initialer. Går att ändra under Inställningar.'}
						</p>
					</div>
				</div>
			{/if}
		</div>

		<!-- PWA -->
		<div class="mt-3 rounded-2xl bg-cream-200 p-4 text-sm">
			<h3 class="font-semibold text-club-900">Lägg till som app på telefonen</h3>
			{#if standalone}
				<p class="mt-1 text-club-900/70">✓ Du kör redan Beer Golf som app.</p>
			{:else if installEvent}
				<p class="mt-1 text-club-900/70">Få snabbmenyn längst ner, helskärm och notiser.</p>
				<button
					type="button"
					onclick={async () => {
						await installEvent?.prompt();
						installEvent = null;
					}}
					class="mt-2 rounded-lg bg-club-700 px-3 py-1.5 text-xs font-semibold text-cream-200 hover:bg-club-800"
					>Installera Beer Golf</button
				>
			{:else if ios}
				<p class="mt-1 text-club-900/70">
					iPhone: tryck på <strong>Dela</strong>-knappen i Safari och välj
					<strong>Lägg till på hemskärmen</strong>. Öppna sedan appen därifrån — då får du också
					notiser.
				</p>
			{:else}
				<p class="mt-1 text-club-900/70">
					I Chrome/Edge: menyn (⋮) → <strong>Installera app</strong>. Öppna sedan Beer Golf från
					hemskärmen.
				</p>
			{/if}
			<p class="mt-1.5 text-xs text-club-900/50">
				Notiser slår du på under Inställningar → Notiser (i appen frågar vi en gång).
			</p>
		</div>

		<form method="POST" action="?/dismissWelcome" use:enhance class="mt-5">
			<button
				class="w-full rounded-xl bg-gold-500 px-5 py-3 font-display text-lg font-semibold text-club-900 hover:bg-gold-400"
				>Slå ut!</button
			>
		</form>
	</div>
</div>
