import { describe, expect, it } from 'vitest';
import {
	joinChunks,
	readChunks,
	tidyTranscript,
	type ResultListLike,
	type TranscriptChunk
} from './transcribe';

/** Stands in for a SpeechRecognitionResultList, which is array-like but not iterable. */
function resultList(entries: Array<[transcript: string, isFinal: boolean]>): ResultListLike {
	const results = entries.map(([transcript, isFinal]) => ({
		isFinal,
		length: 1,
		0: { transcript }
	}));

	return results as unknown as ResultListLike;
}

function chunks(entries: Array<[transcript: string, isFinal: boolean]>): TranscriptChunk[] {
	return entries.map(([transcript, isFinal]) => ({ transcript, isFinal }));
}

describe('readChunks', () => {
	it('reads every result in order, keeping the final flag', () => {
		const results = resultList([
			['coffee at six', true],
			['near the', false]
		]);

		expect(readChunks(results)).toEqual([
			{ transcript: 'coffee at six', isFinal: true },
			{ transcript: 'near the', isFinal: false }
		]);
	});

	it('handles a list with nothing in it', () => {
		expect(readChunks(resultList([]))).toEqual([]);
	});

	it('treats a result carrying no alternatives as empty rather than throwing', () => {
		const results = [{ isFinal: true, length: 0 }] as unknown as ResultListLike;
		expect(readChunks(results)).toEqual([{ transcript: '', isFinal: true }]);
	});
});

describe('joinChunks', () => {
	it('separates settled text from the pending tail', () => {
		const result = joinChunks(
			chunks([
				['chalo coffee', true],
				['peene chalein', false]
			])
		);

		expect(result).toEqual({ final: 'chalo coffee', interim: 'peene chalein' });
	});

	it('keeps settled text in the order it was heard', () => {
		const result = joinChunks(
			chunks([
				['football at seven', true],
				['bring your boots', true]
			])
		);

		expect(result.final).toBe('football at seven bring your boots');
	});

	it('does not repeat the pending tail inside the settled text', () => {
		// The two are distinct results, which is what lets the caller concatenate them.
		const result = joinChunks(chunks([['anyone up for', false]]));
		expect(result).toEqual({ final: '', interim: 'anyone up for' });
	});

	it('returns empty strings when nothing was heard', () => {
		expect(joinChunks([])).toEqual({ final: '', interim: '' });
	});
});

describe('tidyTranscript', () => {
	it('collapses the ragged spacing recognisers emit', () => {
		expect(tidyTranscript('Coffee   at\n\nsix')).toBe('Coffee at six');
	});

	it('trims the padding left by joining empty segments', () => {
		expect(tidyTranscript('  dinner plans  ')).toBe('Dinner plans');
	});

	it('capitalises the opening word so it reads as a description', () => {
		expect(tidyTranscript('anyone up for badminton')).toBe('Anyone up for badminton');
	});

	it('leaves an already tidy transcript alone', () => {
		expect(tidyTranscript('Coffee at six')).toBe('Coffee at six');
	});

	it('passes Devanagari through untouched, having no uppercase form', () => {
		expect(tidyTranscript('  चलो कॉफ़ी  पीने चलें ')).toBe('चलो कॉफ़ी पीने चलें');
	});

	it('returns nothing for a recording that produced only silence', () => {
		expect(tidyTranscript('   ')).toBe('');
		expect(tidyTranscript('')).toBe('');
	});
});
