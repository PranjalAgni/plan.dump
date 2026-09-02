import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

/**
 * There is no social graph in v1: everyone with an account is in the directory. That is a
 * deliberate fit for a small group of actual friends, and it keeps the RLS policies simple
 * enough to reason about. A graph would change these queries, not the schema.
 */

export type Person = {
	id: string;
	display_name: string;
	avatar_url: string | null;
	/** Null when the person has presence switched off, so the UI cannot leak it by accident. */
	last_seen_at: string | null;
	show_presence: boolean;
};

export async function getPeople(supabase: SupabaseClient<Database>): Promise<Person[]> {
	const { data, error } = await supabase
		.from('profiles')
		.select('id, display_name, avatar_url, last_seen_at, show_presence')
		.order('display_name', { ascending: true })
		.returns<Person[]>();

	if (error) throw new Error(`Could not load people: ${error.message}`);

	// Blanked here rather than in the component: presence should be unavailable to the
	// rendering layer, not merely unrendered.
	return (data ?? []).map((person) =>
		person.show_presence ? person : { ...person, last_seen_at: null }
	);
}

export async function getProfile(
	supabase: SupabaseClient<Database>,
	userId: string
): Promise<Person | null> {
	const { data, error } = await supabase
		.from('profiles')
		.select('id, display_name, avatar_url, last_seen_at, show_presence')
		.eq('id', userId)
		.maybeSingle<Person>();

	if (error) throw new Error(`Could not load profile: ${error.message}`);
	return data;
}
