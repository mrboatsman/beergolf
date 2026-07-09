<script lang="ts">
	import MemberDashboard from '$lib/components/MemberDashboard.svelte';
	let { data } = $props();
</script>

<MemberDashboard dashboard={data.dashboard} isSelf={data.isSelf} />

<div class="mt-6">
	<a href="/members" class="text-sm text-club-900/60 hover:underline">← Alla medlemmar</a>
</div>
