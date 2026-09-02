<script lang="ts" module>
	export type Recording = {
		blob: Blob;
		mime: string;
		durationMs: number;
		/** Null when the browser couldn't decode its own recording; the UI falls back to flat bars. */
		peaks: number[] | null;
		/** Empty when nothing was recognised, which is not an error worth surfacing. */
		transcript: string;
	};
</script>

<script lang="ts">
	import { Mic, Square, Trash2 } from '@lucide/svelte';
	import AudioPlayer from './AudioPlayer.svelte';
	import { computePeaks } from '$lib/audio/peaks';
	import { MAX_RECORDING_MS, pickRecordingMime } from '$lib/audio/recorder';
	import { startTranscription, type TranscriptionSession } from '$lib/audio/transcribe';
	import { formatDuration } from '$lib/time';

	let { recording = $bindable(null) }: { recording?: Recording | null } = $props();

	type Stage = 'idle' | 'starting' | 'recording' | 'processing' | 'review' | 'blocked';

	let stage = $state<Stage>('idle');
	let message = $state<string | null>(null);
	let elapsedMs = $state(0);
	let previewUrl = $state<string | null>(null);
	/** Partial words, shown only while recording, as proof that listening is working. */
	let heard = $state('');

	let recorder: MediaRecorder | null = null;
	let stream: MediaStream | null = null;
	let speech: TranscriptionSession | null = null;
	let ticker: ReturnType<typeof setInterval> | null = null;
	let capTimer: ReturnType<typeof setTimeout> | null = null;

	const remaining = $derived(Math.max(0, MAX_RECORDING_MS - elapsedMs));

	/**
	 * Sizes the transcript box to its text. A fixed row count is wrong at both ends: it leaves
	 * dead space under a five-word plan and hides the tail of a full minute of speech.
	 */
	function autogrow(node: HTMLTextAreaElement) {
		const fit = () => {
			node.style.height = 'auto';
			node.style.height = `${node.scrollHeight}px`;
		};

		fit();
		node.addEventListener('input', fit);
		return { destroy: () => node.removeEventListener('input', fit) };
	}

	/**
	 * Tracks must be stopped explicitly, not just the recorder: leaving them live keeps the
	 * browser's microphone-in-use indicator on, which reads as the app still listening.
	 */
	function releaseMicrophone() {
		stream?.getTracks().forEach((track) => track.stop());
		stream = null;
	}

	function clearTimers() {
		if (ticker) clearInterval(ticker);
		if (capTimer) clearTimeout(capTimer);
		ticker = null;
		capTimer = null;
	}

	async function start() {
		const mime = pickRecordingMime();
		if (!mime) {
			stage = 'blocked';
			message = "This browser can't record audio. You can still post text.";
			return;
		}

		stage = 'starting';
		message = null;

		try {
			stream = await navigator.mediaDevices.getUserMedia({
				audio: { echoCancellation: true, noiseSuppression: true }
			});
		} catch {
			stage = 'blocked';
			message = 'PlanDump needs microphone access to record a voice note.';
			return;
		}

		const chunks: Blob[] = [];
		// Measured rather than read back: MediaRecorder's WebM output routinely carries no
		// duration in its metadata, which is what makes audio elements report Infinity.
		const startedAt = performance.now();

		recorder = new MediaRecorder(stream, { mimeType: mime });
		recorder.ondataavailable = (event) => {
			if (event.data.size > 0) chunks.push(event.data);
		};
		recorder.onstop = async () => {
			clearTimers();
			releaseMicrophone();

			const durationMs = Math.min(MAX_RECORDING_MS, Math.round(performance.now() - startedAt));
			const blob = new Blob(chunks, { type: mime });

			stage = 'processing';
			const [peaks, transcript] = await Promise.all([
				computePeaks(blob),
				// Never allowed to fail the take: a missing transcript is a smaller loss than
				// a lost recording, so anything that goes wrong resolves to no transcript.
				speech?.finish().catch(() => '') ?? Promise.resolve('')
			]);
			speech = null;

			recording = { blob, mime, durationMs, peaks, transcript };
			previewUrl = URL.createObjectURL(blob);
			elapsedMs = durationMs;
			stage = 'review';
		};

		recorder.start();
		stage = 'recording';
		elapsedMs = 0;
		heard = '';

		// Started only after the recorder is definitely running. Recognition opens a second
		// microphone capture of its own, and that is the part most likely to misbehave.
		speech = startTranscription({ onPreview: (text) => (heard = text) });

		ticker = setInterval(() => (elapsedMs = performance.now() - startedAt), 100);
		capTimer = setTimeout(stop, MAX_RECORDING_MS);
	}

	function stop() {
		if (recorder?.state === 'recording') recorder.stop();
	}

	function discard() {
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		previewUrl = null;
		recording = null;
		elapsedMs = 0;
		heard = '';
		stage = 'idle';
		message = null;
		speech?.cancel();
		speech = null;
	}

	$effect(() => () => {
		clearTimers();
		if (recorder?.state === 'recording') recorder.stop();
		releaseMicrophone();
		speech?.cancel();
		if (previewUrl) URL.revokeObjectURL(previewUrl);
	});
</script>

<section class="rounded-card bg-surface p-4">
	<div class="flex items-baseline justify-between">
		<h2 class="text-sm font-bold text-ink-label">Voice Dump</h2>
		<span class="text-xs text-ink-muted">optional</span>
	</div>

	{#if stage === 'review' && previewUrl && recording}
		{@const url = previewUrl}
		<div class="mt-3">
			<AudioPlayer
				resolveSrc={async () => url}
				durationMs={recording.durationMs}
				peaks={recording.peaks}
			/>
		</div>

		{#if recording.transcript}
			<div class="mt-3 border-t border-line pt-3">
				<div class="flex items-baseline justify-between gap-2">
					<label for="transcript" class="text-xs font-bold text-ink-label">Auto transcript</label>
					<button
						type="button"
						onclick={() => {
							if (recording) recording.transcript = '';
						}}
						class="text-xs font-bold text-ink-muted hover:text-recording"
					>
						Clear
					</button>
				</div>

				<textarea
					id="transcript"
					bind:value={recording.transcript}
					rows="1"
					use:autogrow
					class="mt-1 max-h-40 w-full resize-none overflow-y-auto bg-transparent text-sm leading-relaxed text-ink outline-none"
				></textarea>

				<p class="mt-1.5 text-xs leading-relaxed text-ink-muted">
					Heard as English (India). Stands in as your plan's text if you don't write a note.
				</p>
			</div>
		{/if}

		<button
			type="button"
			onclick={discard}
			class="mt-3 flex items-center gap-1.5 text-sm font-bold text-ink-muted hover:text-recording"
		>
			<Trash2 size={16} />
			Record again
		</button>
	{:else if stage === 'recording'}
		<div class="mt-4 flex flex-col items-center gap-3">
			<button
				type="button"
				onclick={stop}
				aria-label="Stop recording"
				class="flex size-16 items-center justify-center rounded-full bg-recording text-white motion-safe:animate-pulse"
			>
				<Square size={22} fill="currentColor" />
			</button>

			<p class="text-lg font-bold text-recording tabular-nums" aria-live="off">
				{formatDuration(elapsedMs)}
			</p>

			<div class="h-1 w-full overflow-hidden rounded-full bg-muted">
				<div
					class="h-full rounded-full bg-recording"
					style="width: {(elapsedMs / MAX_RECORDING_MS) * 100}%"
				></div>
			</div>

			<p class="text-xs text-ink-muted">
				{formatDuration(remaining)} left · tap to stop
			</p>

			<!-- Last element in the block, so appearing words push nothing else around. -->
			{#if heard}
				<p class="line-clamp-2 text-center text-xs leading-relaxed text-ink-muted italic">
					{heard}
				</p>
			{/if}
		</div>
	{:else}
		<div class="mt-4 flex flex-col items-center gap-3">
			<button
				type="button"
				onclick={start}
				disabled={stage === 'starting' || stage === 'processing' || stage === 'blocked'}
				aria-label="Record a voice note"
				class="flex size-16 items-center justify-center rounded-full bg-primary text-white transition active:scale-95 disabled:opacity-60"
			>
				<Mic size={24} />
			</button>

			<p class="text-center text-xs leading-relaxed text-ink-muted">
				{#if stage === 'starting'}
					Waiting for the mic…
				{:else if stage === 'processing'}
					Getting your recording ready…
				{:else if message}
					{message}
				{:else}
					Tap to record · 60s max
				{/if}
			</p>
		</div>
	{/if}
</section>
