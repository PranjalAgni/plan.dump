/**
 * Amplitude summaries for the feed waveforms.
 *
 * These are computed once, in the browser, at record time — before upload — so that
 * scrolling the feed never downloads or decodes audio. Feed cards draw bars straight from
 * the numbers on the plan row, and audio only transfers when someone presses play.
 */

/** Stored per plan. Small enough to be free (48 bytes as smallint[]), dense enough to re-bucket. */
export const PEAK_BUCKETS = 48;

/**
 * Reduces raw samples to `buckets` loudness values in 0..100.
 *
 * Uses RMS rather than the loudest sample per bucket: speech is full of brief transients,
 * so peak-max would push almost every bar to full height and the waveform would read as a
 * solid block. RMS approximates perceived loudness and gives usable variation.
 *
 * Normalised against the loudest bucket, so a quietly-recorded note still fills the
 * available height instead of rendering as a flat line.
 */
export function downsampleToPeaks(samples: Float32Array, buckets = PEAK_BUCKETS): number[] {
	if (buckets < 1) throw new RangeError('buckets must be >= 1');
	if (samples.length === 0) return new Array(buckets).fill(0);

	const size = samples.length / buckets;
	const rms = new Array<number>(buckets);

	for (let i = 0; i < buckets; i++) {
		const start = Math.floor(i * size);
		const end = Math.min(samples.length, Math.max(start + 1, Math.floor((i + 1) * size)));

		let sumOfSquares = 0;
		for (let j = start; j < end; j++) sumOfSquares += samples[j] * samples[j];
		rms[i] = Math.sqrt(sumOfSquares / (end - start));
	}

	const loudest = Math.max(...rms);
	if (loudest === 0) return new Array(buckets).fill(0);

	return rms.map((value) => Math.round((value / loudest) * 100));
}

/**
 * Re-buckets stored peaks to however many bars a component actually renders, so the same
 * stored array serves a narrow feed card and a wider detail view.
 */
export function resamplePeaks(peaks: readonly number[], bars: number): number[] {
	if (bars < 1) throw new RangeError('bars must be >= 1');
	if (peaks.length === 0) return new Array(bars).fill(0);
	if (peaks.length === bars) return [...peaks];

	const size = peaks.length / bars;
	return Array.from({ length: bars }, (_, i) => {
		const start = Math.floor(i * size);
		const end = Math.min(peaks.length, Math.max(start + 1, Math.floor((i + 1) * size)));
		let total = 0;
		for (let j = start; j < end; j++) total += peaks[j];
		return Math.round(total / (end - start));
	});
}

/**
 * Decodes a recording and summarises it. Returns null rather than throwing: a codec we
 * can't decode must never block someone from posting their plan, so the caller stores a
 * null peaks column and the UI falls back to flat bars.
 */
export async function computePeaks(blob: Blob): Promise<number[] | null> {
	try {
		// OfflineAudioContext needs no user gesture, unlike AudioContext on iOS.
		const context = new OfflineAudioContext(1, 1, 44100);
		const decoded = await context.decodeAudioData(await blob.arrayBuffer());
		return downsampleToPeaks(decoded.getChannelData(0));
	} catch {
		return null;
	}
}
