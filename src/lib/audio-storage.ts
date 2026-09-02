import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { extensionFor } from './audio/recorder';

/**
 * Every read and write of recording bytes goes through this module.
 *
 * That is deliberate: Supabase Storage is the right call while audio is small, but its
 * free egress allowance (5 GB/month) is the tightest part of the stack. Moving the bucket
 * to Cloudflare R2, which never charges egress, should be a change to these two functions
 * plus a one-off object migration — not a change spread across components.
 */

const BUCKET = 'plan-audio';

/** Long enough to listen to a 60s clip and scrub it, short enough that a leaked URL dies. */
const PLAY_URL_TTL_SECONDS = 3600;

type Client = SupabaseClient<Database>;

/**
 * Objects are keyed `{userId}/{uuid}.{ext}` because the storage insert policy authorises
 * uploads by matching the first path segment against auth.uid().
 */
export async function upload(
	supabase: Client,
	userId: string,
	blob: Blob,
	mime: string
): Promise<string> {
	const path = `${userId}/${crypto.randomUUID()}.${extensionFor(mime)}`;

	const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
		contentType: mime,
		upsert: false
	});
	if (error) throw new Error(`Audio upload failed: ${error.message}`);

	return path;
}

/**
 * Signed on demand, when someone actually presses play. Signing eagerly for every feed
 * card would defeat the point of precomputed waveforms.
 */
export async function getPlayUrl(supabase: Client, path: string): Promise<string> {
	const { data, error } = await supabase.storage
		.from(BUCKET)
		.createSignedUrl(path, PLAY_URL_TTL_SECONDS);

	if (error || !data) throw new Error(`Could not sign audio URL: ${error?.message ?? 'unknown'}`);
	return data.signedUrl;
}

/** Used when a recording is replaced or its plan is deleted. */
export async function remove(supabase: Client, path: string): Promise<void> {
	const { error } = await supabase.storage.from(BUCKET).remove([path]);
	if (error) throw new Error(`Could not delete audio: ${error.message}`);
}
