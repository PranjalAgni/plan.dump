import { createClient } from '@supabase/supabase-js';
import { SUPABASE_SECRET_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import type { Database, PlanVibe } from '$lib/database.types';

/**
 * Reads just enough of a plan to render link-preview metadata, for callers with no session.
 *
 * This is the one place in the app that bypasses row-level security, which is why it lives
 * under `$lib/server` — SvelteKit refuses to bundle anything from here into client code, so
 * the secret key cannot leak by an accidental import.
 *
 * When someone shares a plan link, the crawler that fetches it (Slack, WhatsApp, iMessage)
 * has no cookies, and the `anon` role has no grants at all, so RLS correctly returns
 * nothing and the link would unfurl blank. The safety of the bypass rests entirely on the
 * `visibility = 'public'` filter below and on the narrow column list: no private plan and
 * no participant list is ever readable through this path.
 */

export type PlanPreview = {
	id: string;
	body_text: string | null;
	transcript: string | null;
	audio_duration_ms: number | null;
	vibe: PlanVibe;
	creator: { display_name: string } | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPlanId(value: string): boolean {
	return UUID.test(value);
}

/** No session persistence: this client must never pick up or write a user's auth state. */
const admin = createClient<Database>(PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, {
	auth: { persistSession: false, autoRefreshToken: false }
});

export async function getPlanPreview(planId: string): Promise<PlanPreview | null> {
	if (!isPlanId(planId)) return null;

	const { data, error } = await admin
		.from('plans')
		.select(
			'id, body_text, transcript, audio_duration_ms, vibe, creator:profiles!plans_creator_id_fkey ( display_name )'
		)
		.eq('id', planId)
		// Load-bearing: without this the service role would happily return private plans.
		.eq('visibility', 'public')
		.maybeSingle<PlanPreview>();

	if (error) return null;
	return data;
}
