import { error } from '@sveltejs/kit';
import { getPlan, type FeedPlan } from '$lib/plans';
import { getPlanPreview, isPlanId } from '$lib/server/plan-preview';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase, safeGetSession } }) => {
	if (!isPlanId(params.id)) error(404, 'No such plan');

	const { user } = await safeGetSession();

	// Two reads with different jobs. The preview is public-only and exists so that a shared
	// link unfurls for a crawler with no cookies; the RLS-scoped read is what actually
	// decides whether this visitor gets to see the plan.
	const [preview, plan] = await Promise.all([
		getPlanPreview(params.id),
		user ? getPlan(supabase, params.id) : Promise.resolve<FeedPlan | null>(null)
	]);

	if (!plan && !preview) error(404, 'No such plan');

	return { plan, preview, signedIn: Boolean(user), viewerId: user?.id ?? null };
};
