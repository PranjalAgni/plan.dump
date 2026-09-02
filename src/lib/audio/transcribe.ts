/**
 * Speech-to-text for voice dumps, using the browser's own recognition service.
 *
 * Recognition runs alongside MediaRecorder rather than over the finished blob, because the
 * Web Speech API only ever listens to a live microphone and cannot be pointed at recorded
 * audio. That means two consumers of the mic at once, so everything here is best-effort:
 * any failure leaves the recording untouched and the plan posts without a transcript.
 *
 * Audio is processed by the browser vendor (Google for Chrome and Edge, Apple for Safari),
 * neither by us nor on-device, which is why the privacy note calls it out.
 */

/**
 * The API cannot detect the spoken language. `lang` selects exactly one model for the whole
 * utterance, and a wrong guess returns confident nonsense rather than an error, so this is a
 * deliberate choice and not a default worth leaving to chance.
 *
 * Indian English absorbs the Hindi words that turn up in everyday speech and returns them in
 * Roman script, which matches how people already type here. The `hi-IN` model handles heavier
 * mixing but answers in Devanagari, which would read as broken next to typed plans.
 */
export const TRANSCRIPT_LANG = 'en-IN';

/** Browsers end a session on long silences even with `continuous` set; resuming has a ceiling. */
const MAX_RESTARTS = 8;

/** Some browsers never fire `end` after `stop()`. A transcript must not hold up the post. */
const END_GRACE_MS = 2000;

/** Restarting after these would spin: the cause does not clear on its own. */
const FATAL_ERRORS = new Set([
	'not-allowed',
	'service-not-allowed',
	'audio-capture',
	'language-not-supported',
	'network'
]);

type AlternativeLike = { transcript: string };

type ResultLike = {
	readonly isFinal: boolean;
	readonly length: number;
	[index: number]: AlternativeLike;
};

export type ResultListLike = {
	readonly length: number;
	[index: number]: ResultLike;
};

type RecognitionLike = {
	lang: string;
	continuous: boolean;
	interimResults: boolean;
	maxAlternatives: number;
	start(): void;
	stop(): void;
	abort(): void;
	onresult: ((event: { results: ResultListLike }) => void) | null;
	onerror: ((event: { error: string }) => void) | null;
	onend: (() => void) | null;
};

type RecognitionConstructor = new () => RecognitionLike;

/**
 * Declared structurally rather than leaning on `lib.dom`: the interface is still prefixed in
 * every shipping browser, so the cast is unavoidable regardless of the TypeScript version.
 */
function recognitionConstructor(): RecognitionConstructor | null {
	if (typeof window === 'undefined') return null;

	const scope = window as unknown as {
		SpeechRecognition?: RecognitionConstructor;
		webkitSpeechRecognition?: RecognitionConstructor;
	};

	return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

export function isTranscriptionSupported(): boolean {
	return recognitionConstructor() !== null;
}

export type TranscriptChunk = { isFinal: boolean; transcript: string };

/** The result list is array-like but not iterable in the browsers that ship this API. */
export function readChunks(results: ResultListLike): TranscriptChunk[] {
	const chunks: TranscriptChunk[] = [];

	for (let i = 0; i < results.length; i += 1) {
		const result = results[i];
		chunks.push({ isFinal: result.isFinal, transcript: result[0]?.transcript ?? '' });
	}

	return chunks;
}

/**
 * Finalised and pending text are separate results, never overlapping ones, so the two can be
 * concatenated to get everything heard so far without repeating a word.
 */
export function joinChunks(chunks: TranscriptChunk[]): { final: string; interim: string } {
	const final: string[] = [];
	const interim: string[] = [];

	for (const chunk of chunks) {
		(chunk.isFinal ? final : interim).push(chunk.transcript);
	}

	return { final: final.join(' '), interim: interim.join(' ') };
}

/** Recognisers emit ragged spacing and leave the opening word lowercase. */
export function tidyTranscript(raw: string): string {
	const collapsed = raw.replace(/\s+/g, ' ').trim();
	if (!collapsed) return '';
	return collapsed.charAt(0).toUpperCase() + collapsed.slice(1);
}

export type TranscriptionSession = {
	/** Ends recognition and resolves with everything heard, or `''` if nothing was. */
	finish(): Promise<string>;
	/** Drops recognition without waiting, for when the take is discarded. */
	cancel(): void;
};

export type TranscriptionOptions = {
	lang?: string;
	/** Called as words land, for live feedback while recording. */
	onPreview?: (text: string) => void;
};

/** Null when this browser has no recognition service; callers carry on without one. */
export function startTranscription(
	options: TranscriptionOptions = {}
): TranscriptionSession | null {
	const Recognition = recognitionConstructor();
	if (!Recognition) return null;

	const { lang = TRANSCRIPT_LANG, onPreview } = options;

	let recognition: RecognitionLike | null = null;
	let chunks: TranscriptChunk[] = [];
	/** Finals from earlier runs: a restart resets `results`, so they have to be kept here. */
	let carried = '';
	let stopping = false;
	let restarts = 0;
	let onEnded: (() => void) | null = null;

	function currentText(): string {
		const { final, interim } = joinChunks(chunks);
		return tidyTranscript([carried, final, interim].join(' '));
	}

	function spawn(Ctor: RecognitionConstructor): RecognitionLike {
		const instance = new Ctor();
		instance.lang = lang;
		// Without this, recognition stops at the first pause and truncates anything longer
		// than a one-liner.
		instance.continuous = true;
		instance.interimResults = true;
		instance.maxAlternatives = 1;

		instance.onresult = (event) => {
			chunks = readChunks(event.results);
			onPreview?.(currentText());
		};

		instance.onerror = (event) => {
			if (FATAL_ERRORS.has(event.error)) stopping = true;
		};

		instance.onend = () => {
			// Pending words are carried alongside settled ones. Chrome finalises whatever it was
			// hearing before it ends, but a browser that does not would otherwise drop the tail
			// of the sentence with nothing to show that it had.
			const { final, interim } = joinChunks(chunks);
			const heard = `${final} ${interim}`.trim();
			if (heard) carried = `${carried} ${heard}`;
			chunks = [];

			if (!stopping && restarts < MAX_RESTARTS) {
				restarts += 1;
				try {
					instance.start();
					return;
				} catch {
					// A start() that throws here will not succeed on a retry either, so settle.
				}
			}

			recognition = null;
			onEnded?.();
		};

		instance.start();
		return instance;
	}

	try {
		recognition = spawn(Recognition);
	} catch {
		return null;
	}

	return {
		finish() {
			stopping = true;
			if (!recognition) return Promise.resolve(currentText());

			return new Promise<string>((resolve) => {
				let guard: ReturnType<typeof setTimeout> | null = null;

				const settle = () => {
					if (guard) clearTimeout(guard);
					onEnded = null;
					resolve(currentText());
				};

				guard = setTimeout(settle, END_GRACE_MS);
				onEnded = settle;
				recognition?.stop();
			});
		},

		cancel() {
			stopping = true;
			onEnded = null;
			recognition?.abort();
			recognition = null;
		}
	};
}
