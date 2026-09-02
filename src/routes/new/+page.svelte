<script lang="ts">
	import { Lock, X } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Recorder, { type Recording } from '$lib/components/Recorder.svelte';
	import { upload, remove } from '$lib/audio-storage';
	import type { PlanVibe } from '$lib/database.types';
	import { VIBES } from '$lib/vibes';
	import { resolveStartsAt, todayAsInputValue, WHEN_OPTIONS, type WhenChoice } from '$lib/when';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const MAX_CHARS = 280;

	let text = $state('');
	let recording = $state<Recording | null>(null);
	let when = $state<WhenChoice>('now');
	let pickedDate = $state(todayAsInputValue());
	let vibe = $state<PlanVibe | null>(null);
	let isPrivate = $state(false);

	let submitting = $state(false);
	let submitError = $state<string | null>(null);

	const hasContent = $derived(text.trim().length > 0 || recording !== null);
	const canSubmit = $derived(hasContent && vibe !== null && !submitting);
	const charsLeft = $derived(MAX_CHARS - text.length);

	async function submit() {
		const userId = data.user?.id;
		if (!canSubmit || !vibe || !userId) return;

		submitting = true;
		submitError = null;

		// Uploaded before the row is inserted, because the row's audio_path has to point at
		// something that already exists. If the insert then fails we delete the object again,
		// rather than leaving bytes in the bucket that nothing references.
		let audioPath: string | null = null;

		try {
			if (recording) {
				audioPath = await upload(data.supabase, userId, recording.blob, recording.mime);
			}

			const { error } = await data.supabase.from('plans').insert({
				creator_id: userId,
				body_text: text.trim() || null,
				audio_path: audioPath,
				audio_mime: recording?.mime ?? null,
				audio_duration_ms: recording?.durationMs ?? null,
				audio_peaks: recording?.peaks ?? null,
				transcript: recording?.transcript.trim() || null,
				vibe,
				visibility: isPrivate ? 'private' : 'public',
				starts_at: resolveStartsAt(when, { pickedDate })
			});

			if (error) throw new Error(error.message);

			await goto(resolve('/feed'), { invalidateAll: true });
		} catch (error) {
			if (audioPath) await remove(data.supabase, audioPath).catch(() => {});
			submitError = error instanceof Error ? error.message : 'Could not post that plan.';
			submitting = false;
		}
	}
</script>

<svelte:head><title>Dump a Plan · PlanDump</title></svelte:head>

<div class="flex min-h-dvh flex-col bg-bg">
	<header
		class="sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-bg px-4 pt-[env(safe-area-inset-top)] pb-3"
	>
		<a
			href={resolve('/feed')}
			aria-label="Cancel"
			class="-ml-2 flex size-11 items-center justify-center rounded-full text-ink"
		>
			<X size={24} />
		</a>
		<h1 class="text-lg font-bold text-ink">Dump a Plan</h1>
	</header>

	<div class="flex flex-col gap-5 px-6 pt-5 pb-40">
		<div class="rounded-card bg-surface p-4">
			<label for="body" class="text-sm font-bold text-ink-label">What's the plan?</label>
			<textarea
				id="body"
				bind:value={text}
				maxlength={MAX_CHARS}
				rows="4"
				placeholder="Coffee downtown, anyone? Heading out around 4."
				class="mt-2 w-full resize-none bg-transparent text-base leading-relaxed text-ink outline-none placeholder:text-ink-muted"
			></textarea>
			{#if charsLeft <= 40}
				<p class="text-right text-xs text-ink-muted tabular-nums">{charsLeft} left</p>
			{/if}
		</div>

		<Recorder bind:recording />

		<section class="rounded-card bg-surface p-4">
			<h2 class="text-sm font-bold text-ink-label">When?</h2>
			<div class="mt-3 flex flex-wrap gap-2">
				{#each WHEN_OPTIONS as option (option.id)}
					<button
						type="button"
						onclick={() => (when = option.id)}
						aria-pressed={when === option.id}
						class="rounded-full px-4 py-2 text-sm font-bold transition-colors
							{when === option.id ? 'bg-primary-tint text-primary' : 'bg-muted text-ink-label'}"
					>
						{option.label}
					</button>
				{/each}
			</div>

			{#if when === 'pick'}
				<input
					type="date"
					bind:value={pickedDate}
					min={todayAsInputValue()}
					aria-label="Plan date"
					class="mt-3 w-full rounded-field border border-line bg-transparent px-3 py-2.5 text-base text-ink"
				/>
			{/if}
		</section>

		<section class="rounded-card bg-surface p-4">
			<h2 class="text-sm font-bold text-ink-label">
				Set the Vibe <span class="font-normal text-ink-muted">· pick one</span>
			</h2>
			<div class="mt-3 flex flex-wrap gap-2">
				{#each VIBES as option (option.id)}
					<button
						type="button"
						onclick={() => (vibe = option.id)}
						aria-pressed={vibe === option.id}
						class="rounded-full px-4 py-2 text-sm font-bold transition
							{vibe === option.id
							? `${option.tint} ${option.ink} ring-2 ring-primary/30`
							: 'bg-muted text-ink-label'}"
					>
						#{option.id}
					</button>
				{/each}
			</div>
		</section>

		<section class="rounded-card bg-surface p-4">
			<label class="flex items-start gap-3">
				<input
					type="checkbox"
					bind:checked={isPrivate}
					class="mt-0.5 size-5 shrink-0 accent-primary"
				/>
				<span>
					<span class="flex items-center gap-1.5 text-[0.9375rem] font-bold text-ink">
						<Lock size={15} />
						Keep it private
					</span>
					<!-- Stated plainly because there is no friends graph yet: private means nobody
						 else sees it at all, which is a scratchpad rather than a sharing control. -->
					<span class="mt-1 block text-xs leading-relaxed text-ink-muted">
						Only you will see this plan. Handy for parking an idea before you share it.
					</span>
				</span>
			</label>
		</section>

		{#if submitError}
			<p class="text-sm text-recording" role="alert">{submitError}</p>
		{/if}
	</div>

	<div
		class="fixed inset-x-0 bottom-0 border-t border-line bg-bg px-6 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]"
	>
		<button
			type="button"
			onclick={submit}
			disabled={!canSubmit}
			class="h-14 w-full rounded-field text-base font-bold transition active:scale-[0.99]
				{canSubmit ? 'bg-action text-white' : 'bg-muted text-ink-muted'}"
		>
			{submitting ? 'Dropping…' : 'Drop It'}
		</button>
		{#if !hasContent}
			<p class="mt-2 text-center text-xs text-ink-muted">Add a note or a voice dump to post.</p>
		{:else if !vibe}
			<p class="mt-2 text-center text-xs text-ink-muted">Pick a vibe to post.</p>
		{/if}
	</div>
</div>
