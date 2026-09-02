/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

/**
 * Makes the installed PWA start instantly and survive a cold start with no network.
 *
 * What it deliberately does *not* do is cache pages or API responses. Anything the service
 * worker stores outlives the session cookie, so cached signed-in content would still be
 * readable after sign-out by simply going offline. Only the build output and static assets
 * are cached; plan data always comes from the network, and screens fall back to their own
 * "couldn't reach the feed" states when it isn't there.
 */

const worker = self as unknown as ServiceWorkerGlobalScope;

const CACHE = `plandump-${version}`;
const PRECACHE = [...build, ...files];
const OFFLINE_PAGE = '/offline.html';

worker.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE).then((cache) => cache.addAll(PRECACHE))
		// No skipWaiting: a tab already running the previous build still needs the old chunks,
		// and taking over immediately would pull them out from under it.
	);
});

worker.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			const keys = await caches.keys();
			await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
		})()
	);
});

worker.addEventListener('fetch', (event) => {
	const { request } = event;

	if (request.method !== 'GET') return;

	const url = new URL(request.url);

	// Supabase is left entirely alone: intercepting it would mean caching authenticated
	// responses and personal data.
	if (url.origin !== worker.location.origin) return;

	// Avatars are same-origin now that they are proxied, but they are still somebody's face
	// behind sign-in, so they fall through to the network like any other personal data. The
	// proxy sets its own cache headers; the HTTP cache is the right place for them.
	if (url.pathname.startsWith('/avatar/')) return;

	// Hashed filenames, so a hit is always correct and a miss is worth storing.
	if (PRECACHE.includes(url.pathname)) {
		event.respondWith(
			(async () => {
				const cache = await caches.open(CACHE);
				const cached = await cache.match(url.pathname);
				if (cached) return cached;

				const response = await fetch(request);
				if (response.ok) cache.put(url.pathname, response.clone());
				return response;
			})()
		);
		return;
	}

	if (request.mode === 'navigate') {
		event.respondWith(
			(async () => {
				try {
					return await fetch(request);
				} catch {
					const cache = await caches.open(CACHE);
					return (
						(await cache.match(OFFLINE_PAGE)) ??
						new Response('You are offline.', {
							status: 503,
							headers: { 'content-type': 'text/plain; charset=utf-8' }
						})
					);
				}
			})()
		);
	}
});
