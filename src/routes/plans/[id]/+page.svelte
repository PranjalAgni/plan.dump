<script lang="ts">
	import { ArrowLeft } from '@lucide/svelte';
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import AudioPlayer from '$lib/components/AudioPlayer.svelte';
	import Avatar from '$lib/components/Avatar.svelte';
	import GoogleMark from '$lib/components/GoogleMark.svelte';
	import ParticipantAvatars from '$lib/components/ParticipantAvatars.svelte';
	import VibeTag from '$lib/components/VibeTag.svelte';
	import { getPlayUrl } from '$lib/audio-storage';
	import { isParticipating } from '$lib/plans';
	import { formatDuration, timeAgo } from '$lib/time';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let busy = $state(false);
	let actionError = $state<string | null>(null);

	const author = $derived(
		data.plan?.creator?.display_name ?? data.preview?.creator?.display_name ?? 'Someone'
	);
	const joined = $derived(data.plan ? isParticipating(data.plan, data.viewerId) : false);
	const isMine = $derived(data.plan?.creator_id === data.viewerId);

	/** Link-preview text comes from the public-only read, so it never leaks a private plan. */
	const shareDescription = $derived.by(() => {
		const preview = data.preview;
		// A voice-only plan used to unfurl as a bare duration; its transcript says far more.
		const text = (preview?.body_text ?? preview?.transcript)?.replace(/\s+/g, ' ').trim();
		if (text) return text.length > 155 ? `${text.slice(0, 152)}…` : text;
		if (preview?.audio_duration_ms) {
			return `Voice note · ${formatDuration(preview.audio_duration_ms)}`;
		}
		return 'Someone dumped a plan on PlanDump.';
	});

	async function toggleJoin() {
		const plan = data.plan;
		if (!plan || !data.viewerId) return;

		busy = true;
		actionError = null;

		try {
			const { error } = joined
				? await data.supabase
						.from('plan_participants')
						.delete()
						.eq('plan_id', plan.id)
						.eq('user_id', data.viewerId)
				: await data.supabase
						.from('plan_participants')
						.insert({ plan_id: plan.id, user_id: data.viewerId });

			if (error) throw new Error(error.message);
			await invalidateAll();
		} catch (error) {
			actionError = error instanceof Error ? error.message : 'That did not work.';
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>{author}'s plan · PlanDump</title>
	<meta name="description" content={shareDescription} />

	{#if data.preview}
		<meta property="og:type" content="article" />
		<meta property="og:site_name" content="PlanDump" />
		<meta property="og:title" content="{author} dumped a plan" />
		<meta property="og:description" content={shareDescription} />
		<meta property="og:url" content={page.url.href} />
		<meta property="og:image" content="{page.url.origin}/icons/icon-512.png" />
		<meta name="twitter:card" content="summary" />
	{:else}
		<!-- Private, or hidden from this visitor: must not unfurl at all. -->
		<meta name="robots" content="noindex" />
	{/if}
</svelte:head>

<div class="min-h-dvh bg-bg">
	<header
		class="flex items-center gap-2 border-b border-line px-4 pt-[env(safe-area-inset-top)] pb-3"
	>
		{#if data.signedIn}
			<a
				href={resolve('/feed')}
				aria-label="Back to feed"
				class="-ml-2 flex size-11 items-center justify-center rounded-full text-ink"
			>
				<ArrowLeft size={22} />
			</a>
		{/if}
		<span class="font-display text-lg font-bold text-primary">PlanDump</span>
	</header>

	<div class="mx-auto max-w-md px-6 py-6">
		{#if data.plan}
			{@const plan = data.plan}
			<article class="rounded-card bg-surface p-5">
				<header class="flex items-start gap-3">
					<Avatar name={author} src={plan.creator?.avatar_url} size={44} />
					<div class="min-w-0 flex-1">
						<p class="truncate text-base leading-tight font-bold text-ink">{author}</p>
						<p class="mt-0.5 text-xs text-ink-muted">{timeAgo(plan.created_at)}</p>
					</div>
					<VibeTag id={plan.vibe} />
				</header>

				{#if plan.body_text}
					<p class="mt-4 text-base leading-relaxed whitespace-pre-line text-ink">
						{plan.body_text}
					</p>
				{:else if plan.transcript}
					<!-- Labelled here, unlike the feed card, because a full-page view has the room
						 to say plainly that a machine wrote this. Unclamped for the same reason. -->
					<div class="mt-4">
						<p class="text-xs font-bold text-ink-muted">Auto transcript</p>
						<p class="mt-1 text-base leading-relaxed text-ink-label italic">
							{plan.transcript}
						</p>
					</div>
				{/if}

				{#if plan.audio_path && plan.audio_duration_ms}
					{@const path = plan.audio_path}
					<div class="mt-4">
						<AudioPlayer
							resolveSrc={() => getPlayUrl(data.supabase, path)}
							durationMs={plan.audio_duration_ms}
							peaks={plan.audio_peaks}
						/>
					</div>
				{/if}

				<div class="mt-5">
					<p class="text-sm font-bold text-ink-label">
						{plan.participants.length === 1
							? '1 person in'
							: `${plan.participants.length} people in`}
					</p>
					<div class="mt-2">
						<ParticipantAvatars participants={plan.participants} max={8} />
					</div>
				</div>

				{#if !isMine}
					<button
						type="button"
						disabled={busy}
						onclick={toggleJoin}
						class="mt-5 h-14 w-full rounded-field text-base font-bold transition active:scale-[0.99] disabled:opacity-60
							{joined ? 'bg-muted text-ink-label' : 'bg-action text-white'}"
					>
						{joined ? "You're in · tap to leave" : "I'm In"}
					</button>
				{/if}

				{#if actionError}
					<p class="mt-3 text-sm text-recording" role="alert">{actionError}</p>
				{/if}
			</article>
		{:else if data.preview}
			<!-- Signed out: show the same public summary a crawler gets, then ask them in. -->
			<article class="rounded-card bg-surface p-5">
				<header class="flex items-center justify-between gap-3">
					<p class="text-base font-bold text-ink">{author} dumped a plan</p>
					<VibeTag id={data.preview.vibe} />
				</header>

				<p class="mt-4 text-base leading-relaxed text-ink">{shareDescription}</p>
			</article>

			<a
				href={resolve('/auth')}
				class="mt-5 flex h-14 w-full items-center justify-center gap-3 rounded-field border border-line bg-surface text-base font-bold text-ink"
			>
				<GoogleMark />
				Sign in to join
			</a>
		{:else}
			<p class="py-16 text-center text-[0.9375rem] leading-relaxed text-ink-muted">
				This plan is private, or it has been deleted.
			</p>
		{/if}
	</div>
</div>
