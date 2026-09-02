<script lang="ts">
	import { Plus } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import PlanCard from '$lib/components/PlanCard.svelte';
	import Recorder, { type Recording } from '$lib/components/Recorder.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const FILTERS = ['All Plans', 'Weekdays', 'Weekend'];
	let filter = $state('All Plans');

	/** Previewed here too, because its recording and review states are hard to reach by hand. */
	let recording = $state<Recording | null>(null);
</script>

<svelte:head><title>Component preview · PlanDump</title></svelte:head>

<div class="flex gap-2.5 overflow-x-auto px-6 pb-1">
	{#each FILTERS as label (label)}
		<button
			type="button"
			onclick={() => (filter = label)}
			aria-pressed={filter === label}
			class="shrink-0 rounded-full px-5 py-2.5 text-sm font-bold transition-colors
				{filter === label ? 'bg-primary-tint text-primary' : 'bg-line text-ink-label'}"
		>
			{label}
		</button>
	{/each}
</div>

<div class="flex flex-col gap-6 px-6 pt-4 pb-28">
	<Recorder bind:recording />

	{#each data.plans as plan (plan.id)}
		<PlanCard {plan} viewerId="viewer" resolveAudioUrl={async () => ''} onToggleJoin={() => {}} />
	{/each}
</div>

<a
	href={resolve('/new')}
	aria-label="Dump a plan"
	class="fixed right-6 bottom-[calc(env(safe-area-inset-bottom)+6.5rem)] flex size-16 items-center justify-center rounded-full bg-action text-white shadow-lg transition active:scale-95"
>
	<Plus size={30} strokeWidth={2.5} />
</a>
