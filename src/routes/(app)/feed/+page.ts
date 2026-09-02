import { getFeed, type FeedPlan } from '$lib/plans';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, depends }) => {
	depends('app:feed');
	const { supabase, user } = await parent();

	let plans: FeedPlan[] = [];
	let loadError: string | null = null;

	// A failed feed read renders an empty state rather than an error page: offline is a
	// normal condition for an installed PWA, and a blank screen is worse than a message.
	try {
		plans = await getFeed(supabase);
	} catch (error) {
		loadError = error instanceof Error ? error.message : 'Could not load the feed.';
	}

	return { plans, loadError, viewerId: user?.id ?? null };
};
