import { getPeople, type Person } from '$lib/people';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, depends }) => {
	depends('app:people');
	const { supabase, user } = await parent();

	let people: Person[] = [];
	let loadError: string | null = null;

	try {
		people = await getPeople(supabase);
	} catch (error) {
		loadError = error instanceof Error ? error.message : 'Could not load people.';
	}

	return { people, loadError, viewerId: user?.id ?? null };
};
