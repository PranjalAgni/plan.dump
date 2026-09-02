/** 60s cap: keeps uploads small, playback snappy, and voice notes actually listenable. */
export const MAX_RECORDING_MS = 60_000;

/**
 * Browsers disagree about container and codec, and there is no shared format:
 * Chromium and Firefox give Opus in WebM, Safari and iOS give AAC in MP4. So we probe in
 * preference order and store whichever we got on the plan row, rather than assuming.
 */
const CANDIDATE_MIMES = [
	'audio/webm;codecs=opus',
	'audio/ogg;codecs=opus',
	'audio/mp4;codecs=mp4a.40.2',
	'audio/mp4',
	'audio/webm'
] as const;

function defaultIsTypeSupported(mime: string): boolean {
	return typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime);
}

/** Null means this browser can't record audio at all, which the UI must surface. */
export function pickRecordingMime(
	isTypeSupported: (mime: string) => boolean = defaultIsTypeSupported
): string | null {
	return CANDIDATE_MIMES.find(isTypeSupported) ?? null;
}

/** Storage object extension. Codec parameters are stripped: `audio/webm;codecs=opus` -> `webm`. */
export function extensionFor(mime: string): string {
	const base = mime.split(';')[0].trim().toLowerCase();
	switch (base) {
		case 'audio/webm':
			return 'webm';
		case 'audio/ogg':
			return 'ogg';
		case 'audio/mp4':
			return 'm4a';
		case 'audio/mpeg':
			return 'mp3';
		default:
			return 'bin';
	}
}
