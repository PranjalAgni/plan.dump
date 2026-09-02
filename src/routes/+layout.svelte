<script lang="ts">
	import './layout.css';
	import { untrack, type Snippet } from 'svelte';
	import { invalidate } from '$app/navigation';
	import favicon from '$lib/assets/favicon.svg';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	const supabase = $derived(data.supabase);

	$effect(() => {
		const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
			// Only re-run loads when the token actually changed, otherwise token refreshes
			// every hour would pointlessly re-fetch the whole page tree.
			const current = untrack(() => data.session);
			if (newSession?.expires_at !== current?.expires_at) {
				invalidate('supabase:auth');
			}
		});
		return () => listener.subscription.unsubscribe();
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

{@render children()}
