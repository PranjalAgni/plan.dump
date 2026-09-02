import { describe, expect, it } from 'vitest';
import { extensionFor, pickRecordingMime } from './recorder';

const supports =
	(...supported: string[]) =>
	(mime: string) =>
		supported.includes(mime);

describe('pickRecordingMime', () => {
	it('prefers Opus in WebM where it is available', () => {
		expect(pickRecordingMime(supports('audio/webm;codecs=opus', 'audio/mp4'))).toBe(
			'audio/webm;codecs=opus'
		);
	});

	it('falls back to AAC in MP4 on Safari and iOS', () => {
		expect(pickRecordingMime(supports('audio/mp4;codecs=mp4a.40.2', 'audio/mp4'))).toBe(
			'audio/mp4;codecs=mp4a.40.2'
		);
	});

	it('accepts a bare container when no codec-qualified type is offered', () => {
		expect(pickRecordingMime(supports('audio/webm'))).toBe('audio/webm');
	});

	it('returns null when the browser supports nothing, so the UI can say so', () => {
		expect(pickRecordingMime(() => false)).toBeNull();
	});
});

describe('extensionFor', () => {
	it('strips codec parameters', () => {
		expect(extensionFor('audio/webm;codecs=opus')).toBe('webm');
		expect(extensionFor('audio/mp4;codecs=mp4a.40.2')).toBe('m4a');
	});

	it('maps the containers we accept', () => {
		expect(extensionFor('audio/webm')).toBe('webm');
		expect(extensionFor('audio/ogg')).toBe('ogg');
		expect(extensionFor('audio/mp4')).toBe('m4a');
		expect(extensionFor('audio/mpeg')).toBe('mp3');
	});

	it('is case and whitespace insensitive', () => {
		expect(extensionFor(' AUDIO/MP4 ; codecs=mp4a.40.2')).toBe('m4a');
	});

	it('degrades to .bin rather than throwing on something unexpected', () => {
		expect(extensionFor('audio/flac')).toBe('bin');
	});
});
