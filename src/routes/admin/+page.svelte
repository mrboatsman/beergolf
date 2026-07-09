<script lang="ts">
	import { enhance } from '$app/forms';
	import FadderTree from '$lib/components/FadderTree.svelte';
	let { data, form } = $props();

	const roles = ['aspirant', 'member', 'fadder', 'captain', 'admin'];
</script>

<h1 class="font-display text-4xl font-semibold text-club-900">Admin</h1>

{#if form?.error}
	<p class="mt-4 rounded bg-red-100 px-3 py-2 text-sm text-red-700">{form.error}</p>
{/if}
{#if form?.created}
	<p class="mt-4 rounded bg-club-100 px-3 py-2 text-sm text-club-700">
		Invalskod skapad: <span class="font-mono text-lg font-bold">{form.created}</span> — dela med aspiranten.
	</p>
{/if}
{#if form?.memberCreated}
	<p class="mt-4 rounded bg-club-100 px-3 py-2 text-sm text-club-700">Medlem skapad.</p>
{/if}
{#if form?.questionCreated}
	<p class="mt-4 rounded bg-club-100 px-3 py-2 text-sm text-club-700">Fråga tillagd.</p>
{/if}

<div class="mt-6 grid gap-6 md:grid-cols-2">
	<section class="rounded-2xl bg-parchment shadow-sm p-5">
		<h2 class="font-semibold text-club-900">Skapa invalskod</h2>
		<form method="POST" action="?/createInvite" use:enhance class="mt-3 space-y-3">
			<label class="block text-sm">
				<span class="text-club-900/70">Roll</span>
				<select name="role" class="mt-1 w-full rounded-lg border-cream-300 bg-white">
					{#each roles as r (r)}<option value={r}>{r}</option>{/each}
				</select>
			</label>
			<button
				class="rounded-lg bg-club-700 px-4 py-2 font-semibold text-cream-200 hover:bg-club-800"
				>Generera kod</button
			>
		</form>
	</section>

	<section class="rounded-2xl bg-parchment shadow-sm p-5">
		<h2 class="font-semibold text-club-900">Skapa medlem direkt</h2>
		<form method="POST" action="?/createMember" use:enhance class="mt-3 space-y-3">
			<label class="block text-sm">
				<span class="text-club-900/70">Namn</span>
				<input name="name" required class="mt-1 w-full rounded-lg border-cream-300 bg-white" />
			</label>
			<label class="block text-sm">
				<span class="text-club-900/70">E-post</span>
				<input
					name="email"
					type="email"
					required
					class="mt-1 w-full rounded-lg border-cream-300 bg-white"
				/>
			</label>
			<label class="block text-sm">
				<span class="text-club-900/70">Tillfälligt lösenord</span>
				<input
					name="password"
					required
					minlength="8"
					class="mt-1 w-full rounded-lg border-cream-300 bg-white"
				/>
			</label>
			<label class="block text-sm">
				<span class="text-club-900/70">Roll</span>
				<select name="role" class="mt-1 w-full rounded-lg border-cream-300 bg-white">
					{#each roles as r (r)}<option value={r}>{r}</option>{/each}
				</select>
			</label>
			<button
				class="rounded-lg bg-club-700 px-4 py-2 font-semibold text-cream-200 hover:bg-club-800"
				>Skapa medlem</button
			>
		</form>
	</section>
</div>

<section class="mt-8">
	<h2 class="font-semibold text-club-900">Medlemmar ({data.members.length})</h2>
	<div class="mt-3 overflow-x-auto rounded-2xl bg-parchment shadow-sm">
		<table class="w-full text-left text-sm">
			<thead class="bg-club-800 text-cream-200">
				<tr>
					<th class="px-3 py-2">Namn</th>
					<th class="px-3 py-2">E-post</th>
					<th class="px-3 py-2">Roll</th>
					<th class="px-3 py-2">Status</th>
					<th class="px-3 py-2">HCP</th>
				</tr>
			</thead>
			<tbody>
				{#each data.members as m (m.id)}
					<tr class="border-t border-cream-300">
						<td class="px-3 py-2 font-medium">{m.name}</td>
						<td class="px-3 py-2 text-club-900/60">{m.email}</td>
						<td class="px-3 py-2 capitalize">{m.role}</td>
						<td class="px-3 py-2 capitalize">{m.status}</td>
						<td class="px-3 py-2">{m.hcp}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>

<section class="mt-8">
	<h2 class="font-semibold text-club-900">Invalskoder ({data.invites.length})</h2>
	<div class="mt-3 overflow-x-auto rounded-2xl bg-parchment shadow-sm">
		<table class="w-full text-left text-sm">
			<thead class="bg-club-800 text-cream-200">
				<tr>
					<th class="px-3 py-2">Kod</th>
					<th class="px-3 py-2">Roll</th>
					<th class="px-3 py-2">Status</th>
				</tr>
			</thead>
			<tbody>
				{#each data.invites as i (i.id)}
					<tr class="border-t border-cream-300">
						<td class="px-3 py-2 font-mono font-bold">{i.code}</td>
						<td class="px-3 py-2 capitalize">{i.role}</td>
						<td class="px-3 py-2">
							{#if i.usedBy}
								<span class="text-club-900/50">använd</span>
							{:else}
								<span class="font-semibold text-club-700">öppen</span>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>

<section class="mt-8">
	<h2 class="font-semibold text-club-900">Fadderträd</h2>
	<p class="mt-1 text-sm text-club-900/60">
		Vem har godkänt vilka — den som examinerar en aspirant blir dess fadder.
	</p>
	<div class="mt-3 rounded-2xl bg-parchment p-5 shadow-sm">
		{#if data.fadderTree.length === 0}
			<p class="text-sm text-club-900/60">Inga medlemmar än.</p>
		{:else}
			<FadderTree forest={data.fadderTree} />
		{/if}
	</div>
</section>

<section class="mt-8">
	<h2 class="font-semibold text-club-900">Teoriprov-frågor ({data.questions.length})</h2>

	<div class="mt-3 rounded-2xl bg-parchment p-5 shadow-sm">
		<h3 class="text-sm font-semibold text-club-900">Ny fråga</h3>
		<form method="POST" action="?/createQuestion" use:enhance class="mt-3 space-y-3">
			<label class="block text-sm">
				<span class="text-club-900/70">Fråga</span>
				<input name="question" required class="mt-1 w-full rounded-lg border-cream-300 bg-white" />
			</label>
			<div class="grid gap-2 sm:grid-cols-2">
				{#each [0, 1, 2, 3] as i (i)}
					<label class="flex items-center gap-2 text-sm">
						<input
							type="radio"
							name="correctIndex"
							value={i}
							required
							title="Markera rätt svar"
							class="border-club-600 text-club-700 focus:ring-gold-400"
						/>
						<input
							name={`opt${i}`}
							placeholder={`Alternativ ${i + 1}${i < 2 ? '' : ' (valfritt)'}`}
							required={i < 2}
							class="w-full rounded-lg border-cream-300 bg-white"
						/>
					</label>
				{/each}
			</div>
			<p class="text-xs text-club-900/50">Radioknappen markerar rätt svar.</p>
			<label class="block text-sm">
				<span class="text-club-900/70">Kategori</span>
				<select name="category" class="mt-1 rounded-lg border-cream-300 bg-white">
					<option value="regler">Regelkunskap</option>
					<option value="säkerhet">Säkerhet</option>
					<option value="historia">Klubbhistoria</option>
				</select>
			</label>
			<button
				class="rounded-lg bg-club-700 px-4 py-2 font-semibold text-cream-200 hover:bg-club-800"
				>Lägg till fråga</button
			>
		</form>
	</div>

	<div class="mt-4 space-y-2">
		{#each data.questions as q (q.id)}
			<div
				class="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-parchment px-4 py-3 shadow-sm {q.active
					? ''
					: 'opacity-50'}"
			>
				<div class="min-w-0">
					<div class="font-medium">{q.question}</div>
					<div class="text-xs text-club-900/60">
						Rätt: {q.options[q.correctIndex]} · {q.category}
						{#if !q.active}· inaktiv{/if}
					</div>
				</div>
				<div class="flex shrink-0 gap-2">
					<form method="POST" action="?/toggleQuestion" use:enhance>
						<input type="hidden" name="id" value={q.id} />
						<button class="text-xs font-semibold text-club-700 hover:underline"
							>{q.active ? 'Inaktivera' : 'Aktivera'}</button
						>
					</form>
					<form method="POST" action="?/deleteQuestion" use:enhance>
						<input type="hidden" name="id" value={q.id} />
						<button class="text-xs font-semibold text-red-700 hover:underline">Ta bort</button>
					</form>
				</div>
			</div>
		{/each}
	</div>
</section>
