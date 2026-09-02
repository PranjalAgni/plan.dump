import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, PlanVibe, PlanVisibility } from './database.types';

/**
 * The one place the feed is read.
 *
 * Visibility is enforced by RLS, never by a filter here, which is what makes a later move
 * to a friends or circles model a policy change rather than a client change. The only
 * filter applied is recency.
 */

export type PlanAuthor = {
	id: string;
	display_name: string;
	avatar_url: string | null;
};

export type PlanParticipant = {
	user_id: string;
	profile: PlanAuthor | null;
};

export type FeedPlan = {
	id: string;
	creator_id: string;
	body_text: string | null;
	audio_path: string | null;
	audio_mime: string | null;
	audio_duration_ms: number | null;
	audio_peaks: number[] | null;
	/** Speech-to-text of the voice note. Stands in for `body_text` when there is none. */
	transcript: string | null;
	vibe: PlanVibe;
	visibility: PlanVisibility;
	starts_at: string;
	created_at: string;
	creator: PlanAuthor | null;
	participants: PlanParticipant[];
};

const FEED_SELECT = `
	id, creator_id, body_text, audio_path, audio_mime, audio_duration_ms, audio_peaks, transcript,
	vibe, visibility, starts_at, created_at,
	creator:profiles!plans_creator_id_fkey ( id, display_name, avatar_url ),
	participants:plan_participants ( user_id, profile:profiles ( id, display_name, avatar_url ) )
`;

/**
 * How long a plan lingers past its start time. Long enough that a "right now" plan doesn't
 * disappear while people are still turning up, short enough that the feed self-cleans
 * without a scheduled job.
 */
const FEED_GRACE_HOURS = 4;

export async function getFeed(
	supabase: SupabaseClient<Database>,
	{ limit = 50, now = new Date() }: { limit?: number; now?: Date } = {}
): Promise<FeedPlan[]> {
	const cutoff = new Date(now.getTime() - FEED_GRACE_HOURS * 3600_000).toISOString();

	const { data, error } = await supabase
		.from('plans')
		.select(FEED_SELECT)
		.gte('starts_at', cutoff)
		// Newest dump first: the cards lead with "2h ago", not with start time.
		.order('created_at', { ascending: false })
		.limit(limit)
		.returns<FeedPlan[]>();

	if (error) throw new Error(`Could not load the feed: ${error.message}`);
	return data ?? [];
}

/**
 * Everything the caller created, including private plans and ones that have already run.
 * This is the "Plans" tab, so it deliberately ignores the feed's recency window.
 */
export async function getMyPlans(
	supabase: SupabaseClient<Database>,
	userId: string
): Promise<FeedPlan[]> {
	const { data, error } = await supabase
		.from('plans')
		.select(FEED_SELECT)
		.eq('creator_id', userId)
		.order('created_at', { ascending: false })
		.returns<FeedPlan[]>();

	if (error) throw new Error(`Could not load your plans: ${error.message}`);
	return data ?? [];
}

/** Returns null when RLS hides the plan, which is indistinguishable from it not existing. */
export async function getPlan(
	supabase: SupabaseClient<Database>,
	planId: string
): Promise<FeedPlan | null> {
	const { data, error } = await supabase
		.from('plans')
		.select(FEED_SELECT)
		.eq('id', planId)
		.maybeSingle<FeedPlan>();

	if (error) throw new Error(`Could not load that plan: ${error.message}`);
	return data;
}

export function isParticipating(plan: FeedPlan, userId: string | null): boolean {
	if (!userId) return false;
	return plan.participants.some((p) => p.user_id === userId);
}
