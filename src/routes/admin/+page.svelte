<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import FadderTree from '$lib/components/FadderTree.svelte';
	let { data, form } = $props();

	const roles = ['aspirant', 'member', 'fadder', 'captain', 'admin'];
	let isAdmin = $derived(page.data.member?.role === 'admin');
	let meId = $derived(page.data.member?.id);

	// Val av öppna invalskoder för utskrift
	let selectedCodes = $state(new Set<string>());
	function toggleCode(code: string) {
		const next = new Set(selectedCodes);
		if (next.has(code)) next.delete(code);
		else next.add(code);
		selectedCodes = next;
	}

	// Redigera medlem (modal)
	let editing = $state<null | (typeof data.members)[number]>(null);

	// Paginering: bevara båda tabellernas query-params i länkarna
	function pageUrl(patch: Record<string, string | number>) {
		const params = new URLSearchParams();
		if (data.memberQ) params.set('mq', data.memberQ);
		if (data.memberPage > 1) params.set('mpage', String(data.memberPage));
		if (data.inviteQ) params.set('iq', data.inviteQ);
		if (data.invitePage > 1) params.set('ipage', String(data.invitePage));
		for (const [k, v] of Object.entries(patch)) {
			if (v === '' || v === 1) params.delete(k);
			else params.set(k, String(v));
		}
		const s = params.toString();
		return s ? `/admin?${s}` : '/admin';
	}

	function fmtDate(d: Date | string) {
		return new Date(d).toLocaleDateString('sv-SE');
	}
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
{#if form?.passwordReset}
	<p class="mt-4 rounded bg-gold-400/20 px-3 py-2 text-sm text-club-900">
		Engångslösenord för <strong>{form.passwordReset.name}</strong>:
		<span class="font-mono text-lg font-bold">{form.passwordReset.oneTime}</span>
		— visas bara nu. Användaren måste byta det vid inloggning.
	</p>
{/if}
{#if form?.greenCardIssued}
	<p class="mt-4 rounded bg-club-100 px-3 py-2 text-sm text-club-700">
		Grönt kort utfärdat till {form.greenCardIssued}.
	</p>
{/if}
{#if form?.memberUpdated}
	<p class="mt-4 rounded bg-club-100 px-3 py-2 text-sm text-club-700">
		Uppgifter sparade för {form.memberUpdated}.
	</p>
{/if}
{#if form?.deactivated}
	<p class="mt-4 rounded bg-club-100 px-3 py-2 text-sm text-club-700">
		{form.deactivated} inaktiverad — kan inte längre logga in.
	</p>
{/if}
{#if form?.activated}
	<p class="mt-4 rounded bg-club-100 px-3 py-2 text-sm text-club-700">
		{form.activated} aktiverad igen.
	</p>
{/if}
{#if form?.anonymized}
	<p class="mt-4 rounded bg-club-100 px-3 py-2 text-sm text-club-700">
		Anonymiserad enligt GDPR: {form.anonymized}. Personuppgifter, bevismedia och omdömen raderade.
	</p>
{/if}

{#if isAdmin}
	<a
		href="/admin/coasters"
		class="mt-6 flex items-center justify-between rounded-2xl bg-parchment px-5 py-4 shadow-sm hover:bg-cream-200"
	>
		<span>
			<span class="font-semibold text-club-900">Score Coasters</span>
			<span class="block text-sm text-club-900/60"
				>Sök, rätta poäng, häv signaturer och ta bort coasters.</span
			>
		</span>
		<span class="text-club-900/60">→</span>
	</a>
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
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h2 class="font-semibold text-club-900">Medlemmar ({data.memberTotal})</h2>
		<form method="GET" class="flex gap-2">
			{#if data.inviteQ}<input type="hidden" name="iq" value={data.inviteQ} />{/if}
			<input
				type="search"
				name="mq"
				value={data.memberQ}
				placeholder="Sök namn eller e-post…"
				class="w-56 rounded-lg border-cream-300 bg-white text-sm"
			/>
			<button
				class="rounded-lg bg-club-700 px-3 py-2 text-sm font-semibold text-cream-200 hover:bg-club-800"
				>Sök</button
			>
		</form>
	</div>
	<div class="mt-3 overflow-x-auto rounded-2xl bg-parchment shadow-sm">
		<table class="w-full text-left text-sm">
			<thead class="bg-club-800 text-cream-200">
				<tr>
					<th class="px-3 py-2">Namn</th>
					<th class="px-3 py-2">E-post</th>
					<th class="px-3 py-2">Roll</th>
					<th class="px-3 py-2">Status</th>
					<th class="px-3 py-2">HCP</th>
					{#if isAdmin}<th class="px-3 py-2">Åtgärder</th>{/if}
				</tr>
			</thead>
			<tbody>
				{#each data.members as m (m.id)}
					<tr class="border-t border-cream-300 {m.status === 'inactive' ? 'opacity-50' : ''}">
						<td class="px-3 py-2 font-medium"
							><a class="hover:underline" href={`/members/${m.id}`}>{m.name}</a></td
						>
						<td class="px-3 py-2 text-club-900/60">{m.email}</td>
						<td class="px-3 py-2 capitalize">{m.role}</td>
						<td class="px-3 py-2 capitalize">{m.status}</td>
						<td class="px-3 py-2">{m.hcp}</td>
						{#if isAdmin}
							<td class="px-3 py-2">
								<div class="flex flex-wrap gap-2 text-xs whitespace-nowrap">
									<button
										type="button"
										onclick={() => (editing = m)}
										class="font-semibold text-club-700 hover:underline">Redigera</button
									>
									{#if !m.greenCardIssuedAt}
										<form
											method="POST"
											action="?/issueGreenCard"
											use:enhance={({ cancel }) => {
												if (!confirm(`Utfärda grönt kort till ${m.name} utan prov (urmedlem)?`))
													cancel();
											}}
										>
											<input type="hidden" name="id" value={m.id} />
											<button class="font-semibold text-club-700 hover:underline"
												>Utfärda grönt kort</button
											>
										</form>
									{/if}
									{#if m.id !== meId}
										<form method="POST" action="?/resetPassword" use:enhance>
											<input type="hidden" name="id" value={m.id} />
											<button class="font-semibold text-club-700 hover:underline"
												>Återställ lösenord</button
											>
										</form>
										<form method="POST" action="?/toggleActive" use:enhance>
											<input type="hidden" name="id" value={m.id} />
											<button class="font-semibold text-club-700 hover:underline"
												>{m.status === 'inactive' ? 'Aktivera' : 'Inaktivera'}</button
											>
										</form>
										<form
											method="POST"
											action="?/anonymize"
											use:enhance={({ cancel }) => {
												if (
													!confirm(
														`Anonymisera ${m.name} enligt GDPR? Namn, e-post, lösenord, bevismedia och omdömen raderas permanent. Detta går inte att ångra.`
													)
												)
													cancel();
												return async ({ update }) => update();
											}}
										>
											<input type="hidden" name="id" value={m.id} />
											<button class="font-semibold text-red-700 hover:underline">Anonymisera</button
											>
										</form>
									{/if}
								</div>
							</td>
						{/if}
					</tr>
				{:else}
					<tr><td colspan="6" class="px-3 py-3 text-club-900/60">Ingen träff.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
	{#if data.memberPages > 1}
		<nav class="mt-3 flex items-center justify-center gap-3 text-sm" aria-label="Medlemssidor">
			{#if data.memberPage > 1}
				<a
					href={pageUrl({ mpage: data.memberPage - 1 })}
					class="font-semibold text-club-700 hover:underline">← Föregående</a
				>
			{/if}
			<span class="text-club-900/60">Sida {data.memberPage} av {data.memberPages}</span>
			{#if data.memberPage < data.memberPages}
				<a
					href={pageUrl({ mpage: data.memberPage + 1 })}
					class="font-semibold text-club-700 hover:underline">Nästa →</a
				>
			{/if}
		</nav>
	{/if}
</section>

<section class="mt-8">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<h2 class="font-semibold text-club-900">
			Invalskoder ({data.inviteTotal})
			{#if selectedCodes.size}
				<a
					href={`/invite/print?codes=${[...selectedCodes].join(',')}`}
					class="ml-3 rounded-lg border border-club-700 px-3 py-1 text-xs font-semibold text-club-800 hover:bg-club-100"
					>Skriv ut valda ({selectedCodes.size})</a
				>
			{/if}
		</h2>
		<form method="GET" class="flex gap-2">
			{#if data.memberQ}<input type="hidden" name="mq" value={data.memberQ} />{/if}
			<input
				type="search"
				name="iq"
				value={data.inviteQ}
				placeholder="Sök kod, medlem eller skapare…"
				class="w-56 rounded-lg border-cream-300 bg-white text-sm"
			/>
			<button
				class="rounded-lg bg-club-700 px-3 py-2 text-sm font-semibold text-cream-200 hover:bg-club-800"
				>Sök</button
			>
		</form>
	</div>
	<div class="mt-3 overflow-x-auto rounded-2xl bg-parchment shadow-sm">
		<table class="w-full text-left text-sm">
			<thead class="bg-club-800 text-cream-200">
				<tr>
					<th class="px-3 py-2">Kod</th>
					<th class="px-3 py-2">Roll</th>
					<th class="px-3 py-2">Skapad av</th>
					<th class="px-3 py-2">Status</th>
					<th class="px-3 py-2">Blev medlem</th>
				</tr>
			</thead>
			<tbody>
				{#each data.invites as i (i.id)}
					<tr class="border-t border-cream-300">
						<td class="px-3 py-2 font-mono font-bold">{i.code}</td>
						<td class="px-3 py-2 capitalize">{i.role}</td>
						<td class="px-3 py-2">
							{#if i.createdById}
								<a class="hover:underline" href={`/members/${i.createdById}`}>{i.createdByName}</a>
								<span class="text-xs text-club-900/50">{fmtDate(i.createdAt)}</span>
							{:else}
								<span class="text-club-900/40">—</span>
							{/if}
						</td>
						<td class="px-3 py-2">
							{#if i.usedById}
								<span class="text-club-900/50"
									>använd{#if i.usedAt}
										{fmtDate(i.usedAt)}{/if}</span
								>
							{:else}
								<label class="inline-flex items-center gap-1.5">
									<input
										type="checkbox"
										checked={selectedCodes.has(i.code)}
										onchange={() => toggleCode(i.code)}
										aria-label={`Välj ${i.code} för utskrift`}
										class="rounded border-cream-300 text-club-700 focus:ring-gold-400"
									/>
									<span class="font-semibold text-club-700">öppen</span>
								</label>
								<a
									href="/invite/print?codes={i.code}"
									class="ml-2 text-xs text-club-700 hover:underline">Skriv ut</a
								>
							{/if}
						</td>
						<td class="px-3 py-2">
							{#if i.usedById}
								<a class="font-medium hover:underline" href={`/members/${i.usedById}`}
									>{i.usedByName}</a
								>
							{:else}
								<span class="text-club-900/40">—</span>
							{/if}
						</td>
					</tr>
				{:else}
					<tr><td colspan="5" class="px-3 py-3 text-club-900/60">Ingen träff.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
	{#if data.invitePages > 1}
		<nav class="mt-3 flex items-center justify-center gap-3 text-sm" aria-label="Invalskodssidor">
			{#if data.invitePage > 1}
				<a
					href={pageUrl({ ipage: data.invitePage - 1 })}
					class="font-semibold text-club-700 hover:underline">← Föregående</a
				>
			{/if}
			<span class="text-club-900/60">Sida {data.invitePage} av {data.invitePages}</span>
			{#if data.invitePage < data.invitePages}
				<a
					href={pageUrl({ ipage: data.invitePage + 1 })}
					class="font-semibold text-club-700 hover:underline">Nästa →</a
				>
			{/if}
		</nav>
	{/if}
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

{#if editing}
	{@const m = editing}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-club-950/60 p-4"
		role="presentation"
		onclick={(e) => {
			if (e.target === e.currentTarget) editing = null;
		}}
	>
		<div
			class="w-full max-w-md rounded-2xl bg-parchment p-6 shadow-xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby="edit-member-title"
		>
			<h2 id="edit-member-title" class="font-display text-2xl font-semibold text-club-900">
				Redigera medlem
			</h2>
			<form
				method="POST"
				action="?/updateMember"
				use:enhance={() =>
					async ({ result, update }) => {
						if (result.type === 'success') editing = null;
						await update();
					}}
				class="mt-4 grid gap-3"
			>
				<input type="hidden" name="id" value={m.id} />
				{#if form?.error}
					<p class="rounded bg-red-100 px-3 py-2 text-sm text-red-700">{form.error}</p>
				{/if}
				<label class="text-sm">
					<span class="font-semibold text-club-900">Namn</span>
					<input
						name="name"
						value={m.name}
						required
						minlength="2"
						class="mt-1 w-full rounded-lg border-cream-300 bg-white text-sm"
					/>
				</label>
				<label class="text-sm">
					<span class="font-semibold text-club-900">E-post</span>
					<input
						name="email"
						type="email"
						value={m.email}
						required
						class="mt-1 w-full rounded-lg border-cream-300 bg-white text-sm"
					/>
				</label>
				<div class="grid grid-cols-3 gap-3">
					<label class="text-sm">
						<span class="font-semibold text-club-900">Roll</span>
						<select
							name="role"
							value={m.role}
							disabled={m.id === meId}
							class="mt-1 w-full rounded-lg border-cream-300 bg-white text-sm capitalize disabled:opacity-60"
						>
							{#each roles as r (r)}<option value={r}>{r}</option>{/each}
						</select>
					</label>
					<label class="text-sm">
						<span class="font-semibold text-club-900">HCP</span>
						<input
							name="hcp"
							type="number"
							step="0.1"
							min="0"
							max="54"
							value={m.hcp}
							required
							class="mt-1 w-full rounded-lg border-cream-300 bg-white text-sm"
						/>
					</label>
					<label class="text-sm">
						<span class="font-semibold text-club-900">Kort-nr</span>
						<input
							name="memberNumber"
							type="number"
							min="1"
							step="1"
							value={m.memberNumber ?? ''}
							placeholder="—"
							class="mt-1 w-full rounded-lg border-cream-300 bg-white text-sm"
						/>
					</label>
				</div>
				{#if m.id === meId}
					<p class="text-xs text-club-900/60">Din egen roll kan inte ändras här.</p>
				{/if}
				<p class="text-xs text-club-900/60">
					Status, lösenord och grönt kort hanteras via åtgärderna i tabellen respektive
					certifieringen.
				</p>
				<div class="mt-2 flex justify-end gap-2">
					<button
						type="button"
						onclick={() => (editing = null)}
						class="rounded-lg px-4 py-2 text-sm text-club-900/70 hover:bg-cream-300">Avbryt</button
					>
					<button
						class="rounded-lg bg-club-700 px-4 py-2 text-sm font-semibold text-cream-200 hover:bg-club-800"
						>Spara</button
					>
				</div>
			</form>
		</div>
	</div>
{/if}
