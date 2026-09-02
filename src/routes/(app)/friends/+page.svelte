<script lang="ts">
	import Avatar from '$lib/components/Avatar.svelte';
	import { isPersonAround } from '$lib/presence';
	import { timeAgo } from '$lib/time';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const around = (person: { id: string; last_seen_at: string | null }) =>
		isPersonAround(person, data.viewerId);

	// Around first, then alphabetical, so the useful half of the list is at the top.
	const people = $derived(
		[...data.people].sort((a, b) => {
			const byPresence = Number(around(b)) - Number(around(a));
			return byPresence !== 0 ? byPresence : a.display_name.localeCompare(b.display_name);
		})
	);
</script>

<svelte:head><title>Friends · PlanDump</title></svelte:head>

<div class="flex flex-col gap-2 px-6 pt-2 pb-28">
	{#each people as person (person.id)}
		{@const online = around(person)}
		<div class="flex items-center gap-3 rounded-card bg-surface p-3">
			<div class="relative">
				<Avatar name={person.display_name} src={person.avatar_url} size={44} />
				{#if online}
					<span
						class="absolute right-0 bottom-0 size-3 rounded-full bg-green-500 ring-2 ring-surface"
						aria-hidden="true"
					></span>
				{/if}
			</div>

			<div class="min-w-0 flex-1">
				<p class="truncate text-[0.9375rem] font-bold text-ink">
					{person.display_name}
					{#if person.id === data.viewerId}
						<span class="font-normal text-ink-muted">· you</span>
					{/if}
				</p>
				<p class="mt-0.5 text-xs text-ink-muted">
					{#if online}
						Around now
					{:else if person.last_seen_at}
						Last seen {timeAgo(person.last_seen_at)}
					{:else}
						Presence hidden
					{/if}
				</p>
			</div>
		</div>
	{:else}
		<p class="px-2 py-16 text-center text-[0.9375rem] leading-relaxed text-ink-muted">
			{#if data.loadError}
				Couldn't load who's around. Check your connection.
			{:else}
				Nobody else has signed up yet.
			{/if}
		</p>
	{/each}
</div>
