/**
 * Turns the coarse "when" choice on the compose screen into a `starts_at` timestamp.
 *
 * Deliberately coarse: nobody wants a datetime picker to say "coffee in an hour". The
 * stored value only has to be good enough for the two things the feed does with it —
 * expire stale plans after a grace period, and classify weekday versus weekend — so each
 * choice resolves to the start of its window in the composer's local timezone.
 */

export type WhenChoice = 'now' | 'tonight' | 'tomorrow' | 'pick';

export const WHEN_OPTIONS = [
	{ id: 'now', label: 'Now' },
	{ id: 'tonight', label: 'Tonight' },
	{ id: 'tomorrow', label: 'Tomorrow' },
	{ id: 'pick', label: 'Pick a day' }
] as const satisfies ReadonlyArray<{ id: WhenChoice; label: string }>;

const EVENING_HOUR = 18;
const MORNING_HOUR = 9;

function atLocalHour(base: Date, dayOffset: number, hour: number): Date {
	const result = new Date(base);
	result.setDate(result.getDate() + dayOffset);
	result.setHours(hour, 0, 0, 0);
	return result;
}

/** `pickedDate` is a plain `YYYY-MM-DD` string, as produced by `<input type="date">`. */
export function resolveStartsAt(
	choice: WhenChoice,
	{ now = new Date(), pickedDate }: { now?: Date; pickedDate?: string } = {}
): string {
	switch (choice) {
		case 'now':
			return now.toISOString();

		case 'tonight': {
			// Past six already means tonight starts now, not in the past, or the plan would
			// land outside the feed's grace window on a late-night dump.
			const evening = atLocalHour(now, 0, EVENING_HOUR);
			return (evening > now ? evening : now).toISOString();
		}

		case 'tomorrow':
			return atLocalHour(now, 1, MORNING_HOUR).toISOString();

		case 'pick': {
			if (!pickedDate) throw new Error('Pick a day requires a date.');

			const [year, month, day] = pickedDate.split('-').map(Number);
			if (!year || !month || !day) throw new Error(`Not a valid date: ${pickedDate}`);

			// Constructed component-wise rather than parsed, because `new Date('2026-09-05')`
			// is treated as UTC midnight and can land on the previous day locally, flipping a
			// Saturday plan into the weekday filter.
			const picked = new Date(year, month - 1, day, MORNING_HOUR, 0, 0, 0);
			return picked.toISOString();
		}
	}
}

/** The earliest day the picker should offer, as `YYYY-MM-DD` in local time. */
export function todayAsInputValue(now: Date = new Date()): string {
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');
	return `${now.getFullYear()}-${month}-${day}`;
}
