<script lang="ts">
	import type { Snippet } from 'svelte';
	import AppHeader from '$lib/components/AppHeader.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import { startHeartbeat } from '$lib/presence';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	// Runs for the whole signed-in shell rather than per page, so navigating between tabs
	// doesn't restart the heartbeat. Still keyed on the user, so signing in or out restarts it.
	$effect(() => {
		if (!data.user?.id) return;
		return startHeartbeat(data.supabase);
	});
</script>

<div class="flex min-h-dvh flex-col bg-bg">
	<AppHeader />
	<main class="flex-1">
		{@render children()}
	</main>
	<BottomNav />
</div>
