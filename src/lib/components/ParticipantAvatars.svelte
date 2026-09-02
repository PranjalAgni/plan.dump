<script lang="ts">
	import Avatar from './Avatar.svelte';
	import type { PlanParticipant } from '$lib/plans';

	let { participants, max = 4 }: { participants: readonly PlanParticipant[]; max?: number } =
		$props();

	const shown = $derived(participants.slice(0, max));
	const overflow = $derived(Math.max(0, participants.length - shown.length));
	const label = $derived(
		participants.length === 1 ? '1 person in' : `${participants.length} people in`
	);
</script>

<div class="flex items-center" aria-label={label}>
	{#each shown as participant, index (participant.user_id)}
		<div class="rounded-full ring-2 ring-surface" class:-ml-2={index > 0}>
			<Avatar
				name={participant.profile?.display_name ?? 'Someone'}
				src={participant.profile?.avatar_url}
				size={28}
			/>
		</div>
	{/each}

	{#if overflow > 0}
		<span
			class="-ml-2 flex size-7 items-center justify-center rounded-full bg-muted text-[0.6875rem] font-bold text-ink-muted ring-2 ring-surface"
		>
			+{overflow}
		</span>
	{/if}
</div>
