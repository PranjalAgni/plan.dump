import { error } from '@sveltejs/kit';
import { AVATAR_SIZES, googleAvatarPath, sizedAvatarUrl } from '$lib/avatar';
import type { RequestHandler } from './$types';

/**
 * Serves Google profile images from our own origin.
 *
 * Pointing an `<img>` at lh3.googleusercontent.com directly does not survive normal use.
 * Google rate-limits per avatar URL per client and starts answering 429, because the same
 * few faces appear on every card in a feed and every reload with a cold cache asks for all
 * of them again. Proxying puts the caching under our control: the response below is
 * cacheable for a day and servable stale for a week, so a browser or CDN hit never reaches
 * Google, and a throttled upstream keeps returning the last good image instead of a gap.
 *
 * This route is not in `isPublicPath`, so `hooks.server.ts` has already established a
 * session by the time it runs. Faces stay behind sign-in, like every other profile field.
 */

const DAY = 86_400;
const WEEK = 604_800;

export const GET: RequestHandler = async ({ params, url, setHeaders }) => {
	const size = Number(url.searchParams.get('s'));
	if (!AVATAR_SIZES.includes(size as (typeof AVATAR_SIZES)[number])) {
		error(400, 'Unsupported avatar size');
	}

	// Rebuilt from our own origin rather than anything the caller supplied, then checked
	// back through the same parser: a path like `//evil.example/x` resolves to a different
	// origin and is rejected here, so this cannot be turned into an open proxy.
	const candidate = `https://lh3.googleusercontent.com/${params.path}`;
	if (googleAvatarPath(candidate) === null) error(400, 'Not a Google avatar path');

	let upstream: Response;
	try {
		upstream = await fetch(sizedAvatarUrl(candidate, size), {
			// Nothing about the requesting page is Google's business, and it keeps the
			// upstream request identical for every visitor, so it caches as one entry.
			referrerPolicy: 'no-referrer',
			headers: { accept: 'image/avif,image/webp,image/jpeg,image/*' }
		});
	} catch {
		error(502, 'Could not reach the avatar host');
	}

	if (!upstream.ok || !upstream.body) {
		// Deliberately uncached, unlike a hit: a 429 or a rotated-away 404 is temporary, and
		// the caller falls back to initials in the meantime.
		setHeaders({ 'cache-control': 'no-store' });
		error(upstream.status === 404 ? 404 : 502, 'Avatar unavailable');
	}

	return new Response(upstream.body, {
		headers: {
			'content-type': upstream.headers.get('content-type') ?? 'image/jpeg',
			'cache-control': `public, max-age=${DAY}, s-maxage=${DAY}, stale-while-revalidate=${WEEK}`,
			// The image is the same for everyone, but it is only served to signed-in callers,
			// so a shared cache must not hand it to an anonymous one.
			vary: 'Cookie',
			'x-content-type-options': 'nosniff'
		}
	});
};
