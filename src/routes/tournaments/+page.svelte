<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatKr } from '$lib/money';
	let { data, form } = $props();

	const STATUS: Record<string, { label: string; cls: string }> = {
		draft: {
			label: 'Utkast',
			cls: 'bg-club-700/10 text-club-700 border border-dashed border-club-700/40'
		},
		open: { label: 'Öppen', cls: 'bg-gold-400/20 text-gold-600' },
		finished: { label: 'Avslutad', cls: 'bg-club-700/10 text-club-700' },
		cancelled: { label: 'Inställd', cls: 'bg-red-100 text-red-700' }
	};
	const VISIBILITY: Record<string, string> = {
		open: 'Öppen för alla medlemmar',
		closed: 'Stängd — endast inbjudna',
		public: 'Publik — även gäster'
	};

	function fmtDate(d: Date | string | null) {
		return d ? new Date(d).toLocaleDateString('sv-SE') : 'Datum ej satt';
	}
</script>

<p class="text-xs font-semibold tracking-[0.2em] text-gold-600 uppercase">Klubben · Välgörenhet</p>
<h1 class="font-display mt-1 text-4xl font-semibold">Turneringar</h1>
<p class="mt-1 text-sm text-club-900/60">
	Varje turnering spelas till förmån för en välgörenhet — full transparens efter avslut.
</p>

{#if form?.error}
	<p class="mt-4 rounded bg-red-100 px-3 py-2 text-sm text-red-700">{form.error}</p>
{/if}

{#if data.isStaff}
	<section class="mt-6 rounded-2xl bg-club-800 p-6 text-cream-200 shadow-md">
		<h2 class="font-display flex items-center gap-2 text-2xl font-semibold">Ny turnering</h2>
		<form method="POST" action="?/create" use:enhance class="mt-4 space-y-4">
			<label class="block text-sm">
				<span class="text-xs font-semibold tracking-[0.18em] text-gold-400 uppercase">Namn</span>
				<input
					name="name"
					required
					placeholder="Höstslaget 2026"
					class="mt-1 w-full rounded-lg border-club-600 bg-club-900/40 text-cream-200 placeholder:text-cream-200/30 focus:border-gold-400 focus:ring-gold-400"
				/>
			</label>
			<label class="block text-sm">
				<span class="text-xs font-semibold tracking-[0.18em] text-gold-400 uppercase"
					>Synlighet</span
				>
				<select
					name="visibility"
					class="mt-1 w-full rounded-lg border-club-600 bg-club-900/40 text-cream-200 focus:border-gold-400 focus:ring-gold-400"
				>
					{#each Object.entries(VISIBILITY) as [value, label] (value)}
						<option {value}>{label}</option>
					{/each}
				</select>
			</label>
			<label class="block text-sm">
				<span class="text-xs font-semibold tracking-[0.18em] text-gold-400 uppercase"
					>Spelformat</span
				>
				<select
					name="format"
					class="mt-1 w-full rounded-lg border-club-600 bg-club-900/40 text-cream-200 focus:border-gold-400 focus:ring-gold-400"
				>
					<option value="stroke">Slagspel — alla mot startfältet, lägst netto vinner</option>
					<option value="match">Matchspel — cup, vinnaren går vidare</option>
				</select>
			</label>
			<button class="rounded-lg bg-gold-500 px-5 py-2 font-semibold text-club-900 hover:bg-gold-400"
				>Skapa utkast</button
			>
			<p class="text-xs text-cream-200/50">
				Turneringen skapas som utkast — välgörenhet, avgift och priser sätts innan den öppnas.
			</p>
		</form>
	</section>
{/if}

<section class="mt-8">
	{#if data.tournaments.length === 0}
		<p class="mt-2 text-sm text-club-900/60">Inga turneringar än.</p>
	{:else}
		<ul class="mt-3 space-y-2">
			{#each data.tournaments as t (t.id)}
				{@const s = STATUS[t.status]}
				<li>
					<a
						href={`/tournaments/${t.id}`}
						class="flex items-center justify-between gap-3 rounded-xl bg-parchment px-4 py-3 shadow-sm hover:shadow"
					>
						<div>
							<span class="font-semibold">{t.name}</span>
							<span class="ml-2 text-sm text-club-900/60">{fmtDate(t.startsAt)}</span>
							{#if t.charityName}
								<p class="text-sm text-club-900/60">Till förmån för {t.charityName}</p>
							{/if}
						</div>
						<span class="flex shrink-0 items-center gap-2 text-sm text-club-900/60">
							{t.paidCount} anmälda
							{#if t.entryFeeOre > 0}· {formatKr(t.entryFeeOre)}{/if}
							<span class={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}
								>{s.label}</span
							>
						</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</section>
