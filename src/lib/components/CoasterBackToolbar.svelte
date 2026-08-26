<script lang="ts">
	// Verktyg för baksidan — ligger utanför kortet.
	import { COLORS, type BackEditor } from '$lib/back-editor.svelte';
	let { editor, canEdit, onflip }: { editor: BackEditor; canEdit: boolean; onflip: () => void } =
		$props();
	let fileInput = $state<HTMLInputElement>();
</script>

<div class="mx-auto mt-4 max-w-2xl space-y-3" data-no-flip>
	{#if canEdit}
		<div class="flex flex-wrap items-center gap-2">
			<div class="flex overflow-hidden rounded-lg border border-club-700/40 text-xs font-semibold">
				<button
					type="button"
					onclick={() => (editor.mode = 'draw')}
					class="px-3 py-1.5 {editor.mode === 'draw'
						? 'bg-club-700 text-cream-200'
						: 'text-club-800 hover:bg-club-100'}">✏️ Rita</button
				>
				<button
					type="button"
					onclick={() => (editor.mode = 'images')}
					class="px-3 py-1.5 {editor.mode === 'images'
						? 'bg-club-700 text-cream-200'
						: 'text-club-800 hover:bg-club-100'}">🖼️ Bilder</button
				>
			</div>
			<button
				type="button"
				onclick={() => fileInput?.click()}
				class="rounded-lg bg-club-700 px-3 py-1.5 text-xs font-semibold text-cream-200 hover:bg-club-800"
				>+ Ladda upp bilder</button
			>
			<input
				bind:this={fileInput}
				type="file"
				accept="image/*"
				multiple
				class="sr-only"
				onchange={(e) => {
					const f = (e.currentTarget as HTMLInputElement).files;
					if (f?.length) editor.upload(f);
					(e.currentTarget as HTMLInputElement).value = '';
				}}
			/>
			<span class="ml-auto text-xs text-club-900/60" aria-live="polite">
				{#if editor.status === 'saving'}Sparar…{:else if editor.status === 'saved'}Sparat ✓{:else if editor.status === 'error'}<span
						class="text-red-700">Kunde inte spara</span
					>{/if}
			</span>
		</div>

		{#if editor.mode === 'draw'}
			<div class="flex flex-wrap items-center gap-2">
				{#each COLORS as c (c)}
					<button
						type="button"
						aria-label={`Färg ${c}`}
						onclick={() => (editor.color = c)}
						class="h-8 w-8 rounded-full border-2 {editor.color === c
							? 'border-gold-400 ring-2 ring-gold-400/40'
							: 'border-black/10'}"
						style="background: {c}"
					></button>
				{/each}
				<input
					type="range"
					min="2"
					max="30"
					bind:value={editor.size}
					class="w-28 accent-club-700"
					aria-label="Penselstorlek"
				/>
				<button
					type="button"
					onclick={() => editor.clearDrawing()}
					class="rounded-lg border border-club-700/40 px-2.5 py-1 text-xs font-semibold text-club-800 hover:bg-club-100"
					>Sudda allt</button
				>
			</div>
		{:else}
			<div class="flex flex-wrap items-center gap-2 text-xs">
				{#if editor.selectedId}
					<span class="text-club-900/60">Vald bild:</span>
					<button
						type="button"
						onclick={() => editor.nudge({}, { dr: -15 })}
						class="rounded-lg border border-club-700/40 px-2.5 py-1 font-semibold hover:bg-club-100"
						aria-label="Rotera vänster">⟲ 15°</button
					>
					<button
						type="button"
						onclick={() => editor.nudge({}, { dr: 15 })}
						class="rounded-lg border border-club-700/40 px-2.5 py-1 font-semibold hover:bg-club-100"
						aria-label="Rotera höger">⟳ 15°</button
					>
					<button
						type="button"
						onclick={() => editor.nudge({}, { ds: 1 / 1.15 })}
						class="rounded-lg border border-club-700/40 px-2.5 py-1 font-semibold hover:bg-club-100"
						aria-label="Mindre">−</button
					>
					<button
						type="button"
						onclick={() => editor.nudge({}, { ds: 1.15 })}
						class="rounded-lg border border-club-700/40 px-2.5 py-1 font-semibold hover:bg-club-100"
						aria-label="Större">+</button
					>
					<button
						type="button"
						onclick={() => editor.remove(editor.selectedId!)}
						class="rounded-lg border border-red-700/50 px-2.5 py-1 font-semibold text-red-700 hover:bg-red-50"
						>Ta bort</button
					>
				{:else}
					<span class="text-club-900/60"
						>Tryck på en bild för att välja den. Dra för att flytta, nyp för att skala och rotera.</span
					>
				{/if}
			</div>
		{/if}
	{/if}
	<div class="flex justify-end">
		<button
			type="button"
			onclick={onflip}
			class="text-xs font-semibold text-club-800 hover:underline">Vänd tillbaka ↩</button
		>
	</div>
</div>
