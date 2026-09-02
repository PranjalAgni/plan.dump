import { afterEach, describe, expect, it, vi } from 'vitest';
import { isOnline, isPersonAround, startHeartbeat } from './presence';

const now = new Date('2026-09-02T12:00:00Z');
const secondsAgo = (seconds: number) => new Date(now.getTime() - seconds * 1000).toISOString();

describe('isOnline', () => {
	it('counts a fresh heartbeat as online', () => {
		expect(isOnline(secondsAgo(5), now)).toBe(true);
	});

	it('tolerates one missed heartbeat, so a brief blip does not flicker', () => {
		expect(isOnline(secondsAgo(90), now)).toBe(true);
	});

	it('drops offline after two missed heartbeats', () => {
		expect(isOnline(secondsAgo(150), now)).toBe(false);
	});

	it('treats someone who has never been seen as offline', () => {
		expect(isOnline(null, now)).toBe(false);
	});

	it('treats an unparseable timestamp as offline rather than throwing', () => {
		expect(isOnline('not a date', now)).toBe(false);
	});

	it('does not report a future timestamp as offline', () => {
		// Clock skew between client and database should not read as absence.
		expect(isOnline(secondsAgo(-30), now)).toBe(true);
	});
});

describe('isPersonAround', () => {
	const person = (id: string, lastSeenAt: string | null) => ({ id, last_seen_at: lastSeenAt });

	it('shows the viewer as around even when their stored heartbeat is stale', () => {
		// The directory is fetched before the session's first beat lands, so a viewer looking
		// straight at the screen would otherwise be listed as hours away.
		expect(isPersonAround(person('me', secondsAgo(6 * 3600)), 'me', now)).toBe(true);
	});

	it('still hides the viewer when they have presence switched off', () => {
		// Their own row should report what everyone else sees.
		expect(isPersonAround(person('me', null), 'me', now)).toBe(false);
	});

	it('judges everyone else by their heartbeat', () => {
		expect(isPersonAround(person('sam', secondsAgo(30)), 'me', now)).toBe(true);
		expect(isPersonAround(person('sam', secondsAgo(150)), 'me', now)).toBe(false);
	});

	it('does not treat a signed-out visitor as anybody', () => {
		expect(isPersonAround(person('sam', secondsAgo(6 * 3600)), null, now)).toBe(false);
	});
});

describe('startHeartbeat', () => {
	afterEach(() => vi.unstubAllGlobals());

	/** Only the three members startHeartbeat touches. */
	function stubDocument(hidden: boolean) {
		const listeners = new Map<string, Set<() => void>>();
		vi.stubGlobal('document', {
			hidden,
			addEventListener: (type: string, fn: () => void) => {
				if (!listeners.has(type)) listeners.set(type, new Set());
				listeners.get(type)?.add(fn);
			},
			removeEventListener: (type: string, fn: () => void) => listeners.get(type)?.delete(fn)
		});
		return listeners;
	}

	/**
	 * Lazy on purpose, exactly like a real supabase-js builder: `sent` only records a call once
	 * something awaits it. A stub that recorded on construction would pass just as happily for
	 * the discarded-builder bug this is here to catch.
	 */
	function stubClient() {
		const built: string[] = [];
		const sent: string[] = [];

		const client = {
			rpc: (name: string) => {
				built.push(name);
				return {
					then: (resolve: (value: { error: null }) => unknown) => {
						sent.push(name);
						return Promise.resolve({ error: null }).then(resolve);
					}
				};
			}
		} as unknown as Parameters<typeof startHeartbeat>[0];

		return { built, sent, client };
	}

	it('actually issues the request on the first beat', async () => {
		// The regression this guards: the write used to be a discarded query builder, and those
		// are lazy, so no request was ever sent and no error was ever raised either.
		stubDocument(false);
		const { sent, client } = stubClient();

		const stop = startHeartbeat(client);
		await vi.waitFor(() => expect(sent).toEqual(['touch_last_seen']));
		stop();
	});

	it('does not beat while the tab is hidden', () => {
		stubDocument(true);
		const { built, client } = stubClient();

		const stop = startHeartbeat(client);
		expect(built).toEqual([]);
		stop();
	});

	it('stops listening once torn down', () => {
		const listeners = stubDocument(false);
		const { client } = stubClient();

		startHeartbeat(client)();
		expect(listeners.get('visibilitychange')?.size ?? 0).toBe(0);
	});
});
