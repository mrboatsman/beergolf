<script lang="ts">
	import MemberDashboard from '$lib/components/MemberDashboard.svelte';
	let { data } = $props();
</script>

{#if data.dashboard}
	<MemberDashboard dashboard={data.dashboard} isSelf />
{:else}
	<section class="mx-auto max-w-2xl pt-8 text-center">
		<p class="text-xs font-semibold tracking-[0.25em] text-gold-600 uppercase">Herrklubben</p>
		<h1 class="font-display mt-2 text-5xl font-semibold sm:text-6xl">Beer Golf™</h1>
		<p class="mt-4 text-lg text-club-900/70">
			Medlemshantering, grönt kort och turneringar. Play Slow, räkna ärligt, håll hemresan löst.
		</p>
		<div class="mt-8 flex flex-wrap justify-center gap-3">
			<a
				href="/login"
				class="rounded-lg bg-club-700 px-6 py-2.5 font-semibold text-cream-200 hover:bg-club-800"
				>Logga in</a
			>
			<a
				href="/join"
				class="rounded-lg border border-gold-500 px-6 py-2.5 font-semibold text-club-900 hover:bg-gold-400/10"
				>Har du en invalskod?</a
			>
		</div>
	</section>

	<div class="mx-auto mt-14 max-w-2xl">
		<h2 class="font-display text-3xl font-semibold">Grönt kort i tre delar</h2>
		<ol class="mt-4 space-y-3">
			<li class="rounded-xl bg-parchment px-5 py-4 shadow-sm">
				<strong>1. Teoriprov</strong> — kort quiz om regler, säkerhet och klubbhistoria.
			</li>
			<li class="rounded-xl bg-parchment px-5 py-4 shadow-sm">
				<strong>2. Praktiskt prov</strong> — provslingan under uppsikt av en fadder.
			</li>
			<li class="rounded-xl bg-parchment px-5 py-4 shadow-sm">
				<strong>3. Etikett &amp; hänsyn</strong> — bedöms löpande av faddern.
			</li>
		</ol>
		<p class="mt-4 text-sm text-club-900/70">
			Klaras alla tre utfärdas ett numrerat Grönt Kort och ingångshandicap HCP 36.
		</p>
	</div>
{/if}
