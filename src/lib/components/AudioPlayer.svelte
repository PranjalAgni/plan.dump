<script lang="ts" module>
	/** Only one voice note plays at a time; starting one stops whatever else was going. */
	let stopCurrent: (() => void) | null = null;
</script>

<script lang="ts">
	import { Pause, Play } from '@lucide/svelte';
	import Waveform from './Waveform.svelte';
	import { formatDuration } from '$lib/time';

	let {
		resolveSrc,
		durationMs,
		peaks = null
	}: {
		/** Called on first play only, so the feed signs no URLs and moves no audio until asked. */
		resolveSrc: () => Promise<string>;
		durationMs: number;
		peaks?: readonly number[] | null;
	} = $props();

	let audio: HTMLAudioElement | null = null;
	let playing = $state(false);
	let loading = $state(false);
	let failed = $state(false);
	let elapsedMs = $state(0);

	const progress = $derived(durationMs > 0 ? Math.min(1, elapsedMs / durationMs) : 0);
	const readout = $derived(
		playing || elapsedMs > 0 ? formatDuration(elapsedMs) : formatDuration(durationMs)
	);

	function stop() {
		audio?.pause();
		playing = false;
	}

	async function toggle() {
		if (playing) {
			stop();
			return;
		}

		if (stopCurrent && stopCurrent !== stop) stopCurrent();
		stopCurrent = stop;

		try {
			if (!audio) {
				loading = true;
				const element = new Audio(await resolveSrc());
				element.preload = 'auto';
				element.addEventListener('timeupdate', () => (elapsedMs = element.currentTime * 1000));
				element.addEventListener('ended', () => {
					playing = false;
					elapsedMs = 0;
				});
				element.addEventListener('error', () => {
					failed = true;
					playing = false;
				});
				audio = element;
			}
			await audio.play();
			playing = true;
			failed = false;
		} catch {
			failed = true;
			playing = false;
		} finally {
			loading = false;
		}
	}

	$effect(() => () => {
		if (stopCurrent === stop) stopCurrent = null;
		audio?.pause();
		audio = null;
	});
</script>

<div class="flex items-center gap-4 rounded-field bg-muted px-3 py-3">
	<button
		type="button"
		onclick={toggle}
		disabled={loading}
		aria-label={playing ? 'Pause voice note' : 'Play voice note'}
		class="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-white transition active:scale-95 disabled:opacity-70"
	>
		{#if playing}
			<Pause size={18} fill="currentColor" />
		{:else}
			<Play size={18} fill="currentColor" class="ml-0.5" />
		{/if}
	</button>

	<div class="min-w-0 flex-1">
		<Waveform {peaks} {progress} />
	</div>

	<span class="shrink-0 text-sm font-bold text-ink-muted tabular-nums">
		{failed ? '--:--' : readout}
	</span>
</div>

{#if failed}
	<p class="mt-1.5 text-xs text-recording">Couldn't play that recording.</p>
{/if}
