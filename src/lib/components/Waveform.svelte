<script lang="ts">
	import { resamplePeaks } from '$lib/audio/peaks';

	let {
		peaks = null,
		bars = 28,
		progress = 0
	}: { peaks?: readonly number[] | null; bars?: number; progress?: number } = $props();

	// Drawn entirely from numbers already on the plan row, so rendering the feed costs no
	// audio egress. A null peaks column means the decode failed; flat bars are the fallback.
	const values = $derived(resamplePeaks(peaks ?? [], bars));
	const playedBars = $derived(progress * bars);
</script>

<!-- Bars flex to fill whatever width the row gives them, so the same component works in a
	 feed card and in the wider recorder review strip. -->
<div class="flex h-10 items-end gap-[4px]" aria-hidden="true">
	{#each values as value, index (index)}
		<span
			class="min-w-[2px] flex-1 rounded-full bg-primary"
			class:opacity-40={index >= playedBars}
			style="height: {Math.max(14, value)}%"
		></span>
	{/each}
</div>
