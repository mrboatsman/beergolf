<script lang="ts">
	import { RULES } from '$lib/rules';
	let { open = false }: { open?: boolean } = $props();
</script>

<!-- Hopfällbara regler — visas ovanför coastern så nya spelare kan kolla utan att lämna sidan -->
<details
	{open}
	class="group rounded-xl border border-club-700/20 bg-parchment text-club-900 shadow-sm open:shadow-md"
>
	<summary
		class="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 text-sm font-semibold select-none"
	>
		<span>📜 Regler för Beer Golf™</span>
		<span class="text-xs font-normal text-club-900/60 group-open:hidden">Visa</span>
		<span class="hidden text-xs font-normal text-club-900/60 group-open:inline">Dölj</span>
	</summary>
	<div class="grid gap-4 border-t border-club-700/10 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
		{#each RULES as section (section.title)}
			<div>
				<h3 class="font-display text-lg font-semibold text-club-800">{section.title}</h3>
				<ol class="mt-1.5 list-decimal space-y-1.5 pl-4 text-sm text-club-900/85">
					{#each section.rules as rule, i (i)}
						<li>{rule}</li>
					{/each}
				</ol>
			</div>
		{/each}
	</div>
</details>
