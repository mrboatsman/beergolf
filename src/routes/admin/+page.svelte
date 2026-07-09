<script lang="ts">
	import { enhance } from '$app/forms';
	let { data, form } = $props();

	const roles = ['aspirant', 'member', 'fadder', 'captain', 'admin'];
</script>

<h1 class="text-2xl font-bold text-beer-800">Admin</h1>

{#if form?.error}
	<p class="mt-4 rounded bg-red-100 px-3 py-2 text-sm text-red-700">{form.error}</p>
{/if}
{#if form?.created}
	<p class="mt-4 rounded bg-turf-100 px-3 py-2 text-sm text-turf-700">
		Invalskod skapad: <span class="font-mono text-lg font-bold">{form.created}</span> — dela med aspiranten.
	</p>
{/if}
{#if form?.memberCreated}
	<p class="mt-4 rounded bg-turf-100 px-3 py-2 text-sm text-turf-700">Medlem skapad.</p>
{/if}

<div class="mt-6 grid gap-6 md:grid-cols-2">
	<section class="rounded-xl border border-beer-200 bg-white p-5">
		<h2 class="font-semibold text-beer-800">Skapa invalskod</h2>
		<form method="POST" action="?/createInvite" use:enhance class="mt-3 space-y-3">
			<label class="block text-sm">
				<span class="text-beer-700">Roll</span>
				<select name="role" class="mt-1 w-full rounded-lg border-beer-300">
					{#each roles as r (r)}<option value={r}>{r}</option>{/each}
				</select>
			</label>
			<button class="rounded-lg bg-beer-600 px-4 py-2 font-semibold text-white hover:bg-beer-700"
				>Generera kod</button
			>
		</form>
	</section>

	<section class="rounded-xl border border-beer-200 bg-white p-5">
		<h2 class="font-semibold text-beer-800">Skapa medlem direkt</h2>
		<form method="POST" action="?/createMember" use:enhance class="mt-3 space-y-3">
			<label class="block text-sm">
				<span class="text-beer-700">Namn</span>
				<input name="name" required class="mt-1 w-full rounded-lg border-beer-300" />
			</label>
			<label class="block text-sm">
				<span class="text-beer-700">E-post</span>
				<input name="email" type="email" required class="mt-1 w-full rounded-lg border-beer-300" />
			</label>
			<label class="block text-sm">
				<span class="text-beer-700">Tillfälligt lösenord</span>
				<input
					name="password"
					required
					minlength="8"
					class="mt-1 w-full rounded-lg border-beer-300"
				/>
			</label>
			<label class="block text-sm">
				<span class="text-beer-700">Roll</span>
				<select name="role" class="mt-1 w-full rounded-lg border-beer-300">
					{#each roles as r (r)}<option value={r}>{r}</option>{/each}
				</select>
			</label>
			<button class="rounded-lg bg-beer-600 px-4 py-2 font-semibold text-white hover:bg-beer-700"
				>Skapa medlem</button
			>
		</form>
	</section>
</div>

<section class="mt-8">
	<h2 class="font-semibold text-beer-800">Medlemmar ({data.members.length})</h2>
	<div class="mt-3 overflow-x-auto rounded-xl border border-beer-200 bg-white">
		<table class="w-full text-left text-sm">
			<thead class="bg-beer-100 text-beer-700">
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
					<tr class="border-t border-beer-100">
						<td class="px-3 py-2 font-medium">{m.name}</td>
						<td class="px-3 py-2 text-beer-600">{m.email}</td>
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
	<h2 class="font-semibold text-beer-800">Invalskoder ({data.invites.length})</h2>
	<div class="mt-3 overflow-x-auto rounded-xl border border-beer-200 bg-white">
		<table class="w-full text-left text-sm">
			<thead class="bg-beer-100 text-beer-700">
				<tr>
					<th class="px-3 py-2">Kod</th>
					<th class="px-3 py-2">Roll</th>
					<th class="px-3 py-2">Status</th>
				</tr>
			</thead>
			<tbody>
				{#each data.invites as i (i.id)}
					<tr class="border-t border-beer-100">
						<td class="px-3 py-2 font-mono font-bold">{i.code}</td>
						<td class="px-3 py-2 capitalize">{i.role}</td>
						<td class="px-3 py-2">
							{#if i.usedBy}
								<span class="text-beer-500">använd</span>
							{:else}
								<span class="font-semibold text-turf-600">öppen</span>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>
