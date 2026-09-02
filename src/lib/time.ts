/** "2h ago", matching the feed cards. Deliberately terse: cards are dense. */
export function timeAgo(iso: string, now: Date = new Date()): string {
	const seconds = Math.floor((now.getTime() - new Date(iso).getTime()) / 1000);

	if (seconds < 60) return 'just now';
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 7) return `${days}d ago`;
	return `${Math.floor(days / 7)}w ago`;
}

/** "0:42" for the audio duration readout. */
export function formatDuration(ms: number): string {
	const total = Math.round(ms / 1000);
	const minutes = Math.floor(total / 60);
	const seconds = total % 60;
	return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Weekday/weekend is judged in the viewer's own timezone, so a Friday-night plan doesn't
 * read as Saturday for someone in a different offset.
 */
export function isWeekend(iso: string): boolean {
	const day = new Date(iso).getDay();
	return day === 0 || day === 6;
}
