import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';
import { DEMO_PLANS } from '$lib/fixtures';
import type { PageLoad } from './$types';

export const load: PageLoad = () => {
	if (!dev) error(404);
	return { plans: DEMO_PLANS };
};
