<script lang="ts">
	import { invalidate } from '$app/navigation';
	import PlanCard from '$lib/components/PlanCard.svelte';
	import { getPlayUrl, remove } from '$lib/audio-storage';
	import type { FeedPlan } from '$lib/plans';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let busyPlanId = $state<string | null>(null);
	let actionError = $state<string | null>(null);

	const resolveAudioUrl = (path: string) => getPlayUrl(data.supabase, path);

	async function deletePlan(plan: FeedPlan) {
		if (!confirm('Delete this plan? Anyone who joined will lose it.')) return;

		busyPlanId = plan.id;
		actionError = null;

		try {
			const { error } = await data.supabase.from('plans').delete().eq('id', plan.id);
			if (error) throw new Error(error.message);

			// Storage has no foreign keys, so deleting the row would otherwise leave the
			// recording behind as an orphan counting against the bucket quota.
			if (plan.audio_path) await remove(data.supabase, plan.audio_path).catch(() => {});

			await invalidate('app:my-plans');
		} catch (error) {
			actionError = error instanceof Error ? error.message : 'Could not delete that plan.';
		} finally {
			busyPlanId = null;
		}
	}
</script>

<svelte:head><title>Your plans · PlanDump</title></svelte:head>

<div class="flex flex-col gap-6 px-6 pt-2 pb-28">
	{#if actionError}
		<p class="text-sm text-recording" role="alert">{actionError}</p>
	{/if}

	{#each data.plans as plan (plan.id)}
		<PlanCard
			{plan}
			viewerId={data.viewerId}
			{resolveAudioUrl}
			onToggleJoin={() => {}}
			onDelete={deletePlan}
			busy={busyPlanId === plan.id}
		/>
	{:else}
		<p class="px-2 py-16 text-center text-[0.9375rem] leading-relaxed text-ink-muted">
			{#if data.loadError}
				Couldn't load your plans. Check your connection.
			{:else}
				You haven't dumped a plan yet.
			{/if}
		</p>
	{/each}
</div>
