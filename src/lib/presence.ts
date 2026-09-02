import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

/**
 * Presence via a `last_seen_at` heartbeat rather than Supabase Realtime Presence.
 *
 * Realtime Presence only describes who is connected right now, so it can't answer "when
 * was Sam last around", which is the more useful signal in a friends directory. A stored
 * timestamp answers both, and survives a reload.
 */

const HEARTBEAT_MS = 60_000;

/** Two missed heartbeats before someone drops offline, so a brief blip doesn't flicker. */
const ONLINE_WINDOW_MS = 2 * HEARTBEAT_MS;

export function isOnline(lastSeenAt: string | null, now: Date = new Date()): boolean {
	if (!lastSeenAt) return false;
	const seen = new Date(lastSeenAt).getTime();
	if (Number.isNaN(seen)) return false;
	return now.getTime() - seen < ONLINE_WINDOW_MS;
}

/**
 * Presence for one row of the directory, given who is looking.
 *
 * The viewer is around by definition, whatever their stored heartbeat says. Without that
 * special case, opening the directory directly shows you as away every time, because the
 * page's data is fetched before the first beat of the session has landed.
 *
 * A null `last_seen_at` means presence is switched off, and that still wins for the viewer:
 * their own row should report what everyone else sees, not make an exception for them.
 */
export function isPersonAround(
	person: { id: string; last_seen_at: string | null },
	viewerId: string | null,
	now: Date = new Date()
): boolean {
	if (!person.last_seen_at) return false;
	if (person.id === viewerId) return true;
	return isOnline(person.last_seen_at, now);
}

/**
 * Beats once immediately, then only while the tab is visible. A backgrounded PWA that kept
 * beating would report people as around when their phone is in their pocket, and would
 * spend writes doing it.
 *
 * Takes no user id: the row stamped is whoever the client's session says it is, so there is
 * no way to ask for a heartbeat on somebody else's behalf.
 */
export function startHeartbeat(supabase: SupabaseClient<Database>): () => void {
	let timer: ReturnType<typeof setInterval> | null = null;

	const beat = async () => {
		try {
			// Awaited, and never a bare row update. A supabase-js builder is a lazy thenable, so
			// discarding one sends no request whatsoever, which is how this went unnoticed.
			//
			// The RPC also stamps the row with the database's clock instead of the device's. A
			// phone running slow would otherwise report its owner as away while they are using
			// the app, and one running fast would report them present forever.
			const { error } = await supabase.rpc('touch_last_seen');
			if (error) throw new Error(error.message);
		} catch (cause) {
			// Presence is decoration and the next beat retries, so this never reaches the UI.
			// Logged rather than swallowed, because swallowing it hid a heartbeat that had
			// never once succeeded.
			console.warn('presence heartbeat failed', cause);
		}
	};

	const start = () => {
		if (timer) return;
		beat();
		timer = setInterval(beat, HEARTBEAT_MS);
	};

	const stop = () => {
		if (timer) clearInterval(timer);
		timer = null;
	};

	const onVisibilityChange = () => (document.hidden ? stop() : start());

	document.addEventListener('visibilitychange', onVisibilityChange);
	if (!document.hidden) start();

	return () => {
		document.removeEventListener('visibilitychange', onVisibilityChange);
		stop();
	};
}
