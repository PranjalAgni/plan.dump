<script lang="ts">
	import { Lock, Trash2 } from '@lucide/svelte';
	import Avatar from './Avatar.svelte';
	import AudioPlayer from './AudioPlayer.svelte';
	import ParticipantAvatars from './ParticipantAvatars.svelte';
	import VibeTag from './VibeTag.svelte';
	import { timeAgo } from '$lib/time';
	import { isParticipating, type FeedPlan } from '$lib/plans';

	let {
		plan,
		viewerId = null,
		resolveAudioUrl,
		onToggleJoin,
		onDelete = null,
		busy = false
	}: {
		plan: FeedPlan;
		viewerId?: string | null;
		resolveAudioUrl: (path: string) => Promise<string>;
		onToggleJoin: (plan: FeedPlan) => void;
		/** Supplied on the Plans tab, where the creator manages their own plans. */
		onDelete?: ((plan: FeedPlan) => void) | null;
		busy?: boolean;
	} = $props();

	const author = $derived(plan.creator?.display_name ?? 'Someone');
	const joined = $derived(isParticipating(plan, viewerId));
	const isMine = $derived(plan.creator_id === viewerId);
</script>

<article class="rounded-card bg-surface p-4">
	<header class="flex items-start gap-3">
		<Avatar name={author} src={plan.creator?.avatar_url} size={40} />

		<div class="min-w-0 flex-1">
			<p class="truncate text-[0.9375rem] leading-tight font-bold text-ink">{author}</p>
			<p class="mt-0.5 text-xs text-ink-muted">{timeAgo(plan.created_at)}</p>
		</div>

		<div class="flex shrink-0 items-center gap-1.5">
			{#if plan.visibility === 'private'}
				<span
					class="flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs font-bold text-ink-muted"
				>
					<Lock size={12} />
					Private
				</span>
			{/if}
			<VibeTag id={plan.vibe} />
		</div>
	</header>

	{#if plan.body_text}
		<p class="mt-3 text-[0.9375rem] leading-relaxed whitespace-pre-line text-ink">
			{plan.body_text}
		</p>
	{:else if plan.transcript}
		<!-- Italic rather than labelled: it reads as the plan's text but should not be mistaken
			 for words the author typed, and a feed card has no room for a caption. Clamped
			 because a full minute of speech would otherwise swamp everything around it. -->
		<p class="mt-3 line-clamp-4 text-[0.9375rem] leading-relaxed text-ink-label italic">
			{plan.transcript}
		</p>
	{/if}

	{#if plan.audio_path && plan.audio_duration_ms}
		{@const path = plan.audio_path}
		<div class="mt-3">
			<AudioPlayer
				resolveSrc={() => resolveAudioUrl(path)}
				durationMs={plan.audio_duration_ms}
				peaks={plan.audio_peaks}
			/>
		</div>
	{/if}

	<footer class="mt-4 flex items-center justify-between gap-3">
		<ParticipantAvatars participants={plan.participants} />

		{#if isMine && onDelete}
			<button
				type="button"
				disabled={busy}
				onclick={() => onDelete?.(plan)}
				class="flex items-center gap-1.5 text-sm font-bold text-ink-muted hover:text-recording disabled:opacity-60"
			>
				<Trash2 size={16} />
				Delete
			</button>
		{:else if isMine}
			<span class="text-sm font-bold text-ink-muted">Your plan</span>
		{:else}
			<button
				type="button"
				disabled={busy}
				onclick={() => onToggleJoin(plan)}
				class="h-14 w-25 rounded-xl text-base font-bold transition active:scale-[0.98] disabled:opacity-60
					{joined ? 'bg-muted text-ink-label' : 'bg-action text-white'}"
			>
				{joined ? "You're in" : "I'm In"}
			</button>
		{/if}
	</footer>
</article>
