import type { FeedPlan } from './plans';
import { PEAK_BUCKETS } from './audio/peaks';

/**
 * Fixtures for the dev-only /dev preview route, mirroring the two cards in the design so
 * the implementation can be compared against the mockups without a live database.
 */

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3600_000).toISOString();

/** Deterministic, so screenshot comparisons don't churn between runs. */
function fakePeaks(seed: number): number[] {
	let state = seed;
	return Array.from({ length: PEAK_BUCKETS }, () => {
		state = (state * 1103515245 + 12345) % 2147483648;
		return 20 + Math.round((state / 2147483648) * 80);
	});
}

const alex = { id: 'u-alex', display_name: 'Alex Chen', avatar_url: null };
const sam = { id: 'u-sam', display_name: 'Sam Taylor', avatar_url: null };
const priya = { id: 'u-priya', display_name: 'Priya Nair', avatar_url: null };

/** Ordered newest first, the way `getFeed` returns them. */
export const DEMO_PLANS: FeedPlan[] = [
	{
		// Voice with no written note: the case the transcript fallback exists for, in the
		// code-mixed Roman script the en-IN recogniser actually returns.
		id: 'p-4',
		creator_id: sam.id,
		body_text: null,
		audio_path: 'u-sam/demo-2.webm',
		audio_mime: 'audio/webm;codecs=opus',
		audio_duration_ms: 9_000,
		audio_peaks: fakePeaks(91),
		transcript: 'Chalo terrace pe chai, koi aa raha hai around 6?',
		vibe: 'chill',
		visibility: 'public',
		starts_at: hoursAgo(-2),
		created_at: hoursAgo(1),
		creator: sam,
		participants: [{ user_id: sam.id, profile: sam }]
	},
	{
		id: 'p-1',
		creator_id: alex.id,
		body_text:
			'Thinking about grabbing some coffee downtown and just reading for a bit. Anyone down for a lowkey afternoon?',
		audio_path: 'u-alex/demo.webm',
		audio_mime: 'audio/webm;codecs=opus',
		audio_duration_ms: 42_000,
		audio_peaks: fakePeaks(7),
		// Present but not rendered: a written note always outranks the transcript.
		transcript: 'Thinking of coffee downtown, going to read for a bit, come along',
		vibe: 'chill',
		visibility: 'public',
		starts_at: hoursAgo(-3),
		created_at: hoursAgo(2),
		creator: alex,
		participants: [{ user_id: alex.id, profile: alex }]
	},
	{
		id: 'p-2',
		creator_id: sam.id,
		body_text:
			"Craving that new taco place that just opened up. Planning to go around 7pm. Who's hungry?",
		audio_path: 'u-sam/demo.webm',
		audio_mime: 'audio/mp4',
		audio_duration_ms: 15_000,
		audio_peaks: fakePeaks(23),
		transcript: null,
		vibe: 'food',
		visibility: 'public',
		starts_at: hoursAgo(-5),
		created_at: hoursAgo(5),
		creator: sam,
		participants: [
			{ user_id: sam.id, profile: sam },
			{ user_id: priya.id, profile: priya }
		]
	},
	{
		id: 'p-3',
		creator_id: priya.id,
		body_text: 'Anyone up for badminton at 7am tomorrow? Need one more for doubles.',
		audio_path: null,
		audio_mime: null,
		audio_duration_ms: null,
		audio_peaks: null,
		transcript: null,
		vibe: 'active',
		visibility: 'public',
		starts_at: hoursAgo(-14),
		created_at: hoursAgo(9),
		creator: priya,
		participants: [
			{ user_id: priya.id, profile: priya },
			{ user_id: alex.id, profile: alex },
			{ user_id: sam.id, profile: sam }
		]
	}
];
