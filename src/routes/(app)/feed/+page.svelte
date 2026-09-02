<script lang="ts">
	import { Plus } from '@lucide/svelte';
	import { invalidate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import PlanCard from '$lib/components/PlanCard.svelte';
	import { getPlayUrl } from '$lib/audio-storage';
	import { isParticipating, type FeedPlan } from '$lib/plans';
	import { isWeekend } from '$lib/time';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const FILTERS = [
		{ id: 'all', label: 'All Plans' },
		{ id: 'weekdays', label: 'Weekdays' },
		{ id: 'weekend', label: 'Weekend' }
	] as const;

	let filter = $state<(typeof FILTERS)[number]['id']>('all');
	let busyPlanId = $state<string | null>(null);

	const plans = $derived(
		data.plans.filter((plan) => {
			if (filter === 'all') return true;
			return filter === 'weekend' ? isWeekend(plan.starts_at) : !isWeekend(plan.starts_at);
		})
	);

	// Signed on demand so scrolling the feed transfers no audio.
	const resolveAudioUrl = (path: string) => getPlayUrl(data.supabase, path);

	async function toggleJoin(plan: FeedPlan) {
		if (!data.viewerId) return;
		busyPlanId = plan.id;

		try {
			if (isParticipating(plan, data.viewerId)) {
				await data.supabase
					.from('plan_participants')
					.delete()
					.eq('plan_id', plan.id)
					.eq('user_id', data.viewerId);
			} else {
				await data.supabase
					.from('plan_participants')
					.insert({ plan_id: plan.id, user_id: data.viewerId });
			}
			await invalidate('app:feed');
		} finally {
			busyPlanId = null;
		}
	}

	// Without push notifications, a live feed is the closest thing to being told a plan
	// landed, so it earns its keep here.
	$effect(() => {
		const channel = data.supabase
			.channel('feed')
			.on('postgres_changes', { event: '*', schema: 'public', table: 'plans' }, () =>
				invalidate('app:feed')
			)
			.on('postgres_changes', { event: '*', schema: 'public', table: 'plan_participants' }, () =>
				invalidate('app:feed')
			)
			.subscribe();

		return () => void data.supabase.removeChannel(channel);
	});
</script>

<svelte:head><title>Feed · PlanDump</title></svelte:head>

<div class="flex gap-2.5 overflow-x-auto px-6 pb-1">
	{#each FILTERS as option (option.id)}
		<button
			type="button"
			onclick={() => (filter = option.id)}
			aria-pressed={filter === option.id}
			class="shrink-0 rounded-full px-5 py-2.5 text-sm font-bold transition-colors
				{filter === option.id ? 'bg-primary-tint text-primary' : 'bg-line text-ink-label'}"
		>
			{option.label}
		</button>
	{/each}
</div>

<div class="flex flex-col gap-6 px-6 pt-4 pb-28">
	{#each plans as plan (plan.id)}
		<PlanCard
			{plan}
			viewerId={data.viewerId}
			{resolveAudioUrl}
			onToggleJoin={toggleJoin}
			busy={busyPlanId === plan.id}
		/>
	{:else}
		<p class="px-2 py-16 text-center text-[0.9375rem] leading-relaxed text-ink-muted">
			{#if data.loadError}
				Couldn't reach the feed. Check your connection and pull to refresh.
			{:else if filter === 'all'}
				Nothing on yet. Dump the first plan and see who bites.
			{:else}
				No {filter === 'weekend' ? 'weekend' : 'weekday'} plans right now.
			{/if}
		</p>
	{/each}
</div>

<a
	href={resolve('/new')}
	aria-label="Dump a plan"
	class="fixed right-6 bottom-[calc(env(safe-area-inset-bottom)+6.5rem)] flex size-16 items-center justify-center rounded-full bg-action text-white shadow-lg transition active:scale-95"
>
	<Plus size={30} strokeWidth={2.5} />
</a>
