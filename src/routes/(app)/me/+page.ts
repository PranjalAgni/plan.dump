import { getProfile, type Person } from '$lib/people';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, depends }) => {
	depends('app:me');
	const { supabase, user } = await parent();

	let profile: Person | null = null;
	let loadError: string | null = null;

	if (user) {
		try {
			profile = await getProfile(supabase, user.id);
		} catch (error) {
			loadError = error instanceof Error ? error.message : 'Could not load your profile.';
		}
	}

	return { profile, loadError, email: user?.email ?? null };
};
