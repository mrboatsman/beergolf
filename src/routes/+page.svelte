<script lang="ts">
	let { data } = $props();
	let member = $derived(data.member);
</script>

<section class="prose prose-beer max-w-none">
	<h1 class="text-beer-800">Välkommen till Beer Golf™</h1>
	<p class="text-lg text-beer-700">
		Herrklubbens system för medlemshantering, grönt kort och turneringar. Play Slow, räkna ärligt,
		håll hemresan löst.
	</p>
</section>

{#if member}
	<div class="mt-8 grid gap-4 sm:grid-cols-3">
		<a href="/rounds" class="rounded-xl border border-beer-200 bg-white p-5 shadow-sm hover:shadow">
			<div class="text-2xl">🍺</div>
			<div class="mt-2 font-semibold text-beer-800">Mina rundor</div>
			<p class="text-sm text-beer-600">Registrera Score Coasters och följ ditt handikapp.</p>
		</a>
		<div class="rounded-xl border border-beer-200 bg-white p-5 shadow-sm">
			<div class="text-2xl">⛳</div>
			<div class="mt-2 font-semibold text-beer-800">Ditt handikapp</div>
			<p class="text-3xl font-bold text-turf-600">{member.hcp}</p>
		</div>
		<div class="rounded-xl border border-beer-200 bg-white p-5 shadow-sm">
			<div class="text-2xl">🪪</div>
			<div class="mt-2 font-semibold text-beer-800">Status</div>
			<p class="text-sm capitalize text-beer-600">{member.role} · {member.status}</p>
		</div>
	</div>
{:else}
	<div class="mt-8 flex flex-wrap gap-3">
		<a
			href="/login"
			class="rounded-lg bg-turf-600 px-5 py-2.5 font-semibold text-white hover:bg-turf-700"
			>Logga in</a
		>
		<a
			href="/join"
			class="rounded-lg border border-beer-300 bg-white px-5 py-2.5 font-semibold text-beer-800 hover:bg-beer-100"
			>Har du en invalskod?</a
		>
	</div>

	<div class="prose prose-beer mt-10 max-w-none">
		<h2>Grönt kort i tre delar</h2>
		<ol>
			<li><strong>Teoriprov</strong> — kort quiz om regler, säkerhet och klubbhistoria.</li>
			<li><strong>Praktiskt prov</strong> — provslingan under uppsikt av en fadder.</li>
			<li><strong>Etikett &amp; hänsyn</strong> — bedöms löpande av faddern.</li>
		</ol>
		<p>Klaras alla tre utfärdas ett numrerat Grönt Kort och ingångshandicap HCP 36.</p>
	</div>
{/if}
