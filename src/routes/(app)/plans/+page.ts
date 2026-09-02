import { getMyPlans, type FeedPlan } from '$lib/plans';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, depends }) => {
	depends('app:my-plans');
	const { supabase, user } = await parent();

	let plans: FeedPlan[] = [];
	let loadError: string | null = null;

	if (user) {
		try {
			plans = await getMyPlans(supabase, user.id);
		} catch (error) {
			loadError = error instanceof Error ? error.message : 'Could not load your plans.';
		}
	}

	return { plans, loadError, viewerId: user?.id ?? null };
};
