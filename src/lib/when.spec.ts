import { describe, expect, it } from 'vitest';
import { resolveStartsAt, todayAsInputValue } from './when';

/** Local-time helper, so these assertions hold whatever timezone the test runner is in. */
const local = (year: number, month: number, day: number, hour = 0, minute = 0): Date =>
	new Date(year, month - 1, day, hour, minute);

const resolved = (...args: Parameters<typeof resolveStartsAt>) =>
	new Date(resolveStartsAt(...args));

describe('resolveStartsAt', () => {
	it('uses the current instant for Now', () => {
		const now = local(2026, 9, 2, 14, 30);
		expect(resolveStartsAt('now', { now })).toBe(now.toISOString());
	});

	it('resolves Tonight to six in the evening', () => {
		const start = resolved('tonight', { now: local(2026, 9, 2, 14, 30) });
		expect([start.getFullYear(), start.getMonth() + 1, start.getDate()]).toEqual([2026, 9, 2]);
		expect(start.getHours()).toBe(18);
	});

	it('resolves Tonight to now when the evening has already started', () => {
		// Otherwise a late-night dump lands in the past and can fall outside the feed window.
		const now = local(2026, 9, 2, 22, 15);
		expect(resolveStartsAt('tonight', { now })).toBe(now.toISOString());
	});

	it('resolves Tomorrow to the next morning', () => {
		const start = resolved('tomorrow', { now: local(2026, 9, 2, 22, 15) });
		expect([start.getMonth() + 1, start.getDate(), start.getHours()]).toEqual([9, 3, 9]);
	});

	it('rolls Tomorrow over a month boundary', () => {
		const start = resolved('tomorrow', { now: local(2026, 9, 30, 12, 0) });
		expect([start.getMonth() + 1, start.getDate()]).toEqual([10, 1]);
	});

	it('keeps a picked date on that local day', () => {
		// `new Date('2026-09-05')` parses as UTC midnight, which lands on the 4th in the
		// Americas and would flip a Saturday plan into the weekday filter.
		const start = resolved('pick', { pickedDate: '2026-09-05' });
		expect([start.getFullYear(), start.getMonth() + 1, start.getDate()]).toEqual([2026, 9, 5]);
		expect(start.getDay()).toBe(6);
	});

	it('rejects a picked day with no date', () => {
		expect(() => resolveStartsAt('pick')).toThrow(/requires a date/);
	});

	it('rejects a malformed date', () => {
		expect(() => resolveStartsAt('pick', { pickedDate: 'someday' })).toThrow(/valid date/);
	});
});

describe('todayAsInputValue', () => {
	it('formats local date parts, zero padded', () => {
		expect(todayAsInputValue(local(2026, 9, 2))).toBe('2026-09-02');
		expect(todayAsInputValue(local(2026, 12, 25))).toBe('2026-12-25');
	});

	it('uses the local day even late at night, when UTC has already rolled over', () => {
		expect(todayAsInputValue(local(2026, 9, 2, 23, 59))).toBe('2026-09-02');
	});
});
