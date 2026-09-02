import { describe, expect, it } from 'vitest';
import { downsampleToPeaks, resamplePeaks } from './peaks';

function sine(length: number, amplitude: number): Float32Array {
	return Float32Array.from({ length }, (_, i) => amplitude * Math.sin((i / length) * Math.PI * 40));
}

describe('downsampleToPeaks', () => {
	it('returns exactly the requested number of buckets', () => {
		expect(downsampleToPeaks(sine(5000, 0.5), 48)).toHaveLength(48);
		expect(downsampleToPeaks(sine(5000, 0.5), 12)).toHaveLength(12);
	});

	it('keeps every value within 0..100', () => {
		const peaks = downsampleToPeaks(sine(5000, 0.9), 48);
		expect(Math.min(...peaks)).toBeGreaterThanOrEqual(0);
		expect(Math.max(...peaks)).toBeLessThanOrEqual(100);
	});

	it('normalises so the loudest bucket reaches full height', () => {
		// A quiet recording must still fill the bar height rather than render flat.
		expect(Math.max(...downsampleToPeaks(sine(5000, 0.02), 48))).toBe(100);
	});

	it('scales quiet and loud recordings of the same shape identically', () => {
		expect(downsampleToPeaks(sine(4800, 0.05), 24)).toEqual(downsampleToPeaks(sine(4800, 0.8), 24));
	});

	it('tracks loudness across the clip', () => {
		// Silence in the first half, tone in the second.
		const samples = new Float32Array(4000);
		for (let i = 2000; i < 4000; i++) samples[i] = 0.7;

		const peaks = downsampleToPeaks(samples, 4);
		expect(peaks.slice(0, 2)).toEqual([0, 0]);
		expect(peaks.slice(2)).toEqual([100, 100]);
	});

	it('returns silence for silence rather than dividing by zero', () => {
		expect(downsampleToPeaks(new Float32Array(1000), 8)).toEqual(new Array(8).fill(0));
	});

	it('handles an empty recording', () => {
		expect(downsampleToPeaks(new Float32Array(0), 6)).toEqual(new Array(6).fill(0));
	});

	it('handles fewer samples than buckets without producing NaN', () => {
		const peaks = downsampleToPeaks(Float32Array.from([0.5, 0.5, 0.5]), 10);
		expect(peaks).toHaveLength(10);
		expect(peaks.every(Number.isFinite)).toBe(true);
	});

	it('rejects a bucket count below one', () => {
		expect(() => downsampleToPeaks(sine(100, 0.5), 0)).toThrow(RangeError);
	});
});

describe('resamplePeaks', () => {
	it('passes through when the counts already match', () => {
		expect(resamplePeaks([1, 2, 3], 3)).toEqual([1, 2, 3]);
	});

	it('averages down to fewer bars', () => {
		expect(resamplePeaks([0, 100, 0, 100], 2)).toEqual([50, 50]);
	});

	it('stretches up to more bars', () => {
		expect(resamplePeaks([0, 100], 4)).toEqual([0, 0, 100, 100]);
	});

	it('handles missing peaks by rendering flat', () => {
		expect(resamplePeaks([], 5)).toEqual(new Array(5).fill(0));
	});

	it('rejects a bar count below one', () => {
		expect(() => resamplePeaks([1, 2], 0)).toThrow(RangeError);
	});
});
