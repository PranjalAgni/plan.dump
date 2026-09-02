/**
 * Google serves profile images from a single host, with a size directive on the end of the
 * path like `=s96-c`. We never point an `<img>` at that host directly: see `avatarSrc`.
 */
const GOOGLE_AVATAR_ORIGIN = 'https://lh3.googleusercontent.com';

/**
 * The only sizes we ever ask Google for. Every distinct size is a separate URL, which means
 * a separate cache entry, a separate render on Google's side and a separate bucket in its
 * per-URL rate limiting, so requested sizes are rounded up into these rather than passed
 * through exactly. The endpoint rejects anything else, to keep the set closed.
 */
export const AVATAR_SIZES = [64, 128, 256] as const;

function bucketFor(px: number): number {
	return AVATAR_SIZES.find((size) => size >= px) ?? AVATAR_SIZES[AVATAR_SIZES.length - 1];
}

/**
 * The stable part of a Google avatar URL: its path, with any size directive stripped. Null
 * for anything that isn't a Google avatar, which is what makes this safe to feed back into
 * a server-side fetch — the origin is ours to supply, never the caller's.
 */
export function googleAvatarPath(url: string): string | null {
	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return null;
	}

	if (parsed.origin !== GOOGLE_AVATAR_ORIGIN) return null;

	const path = parsed.pathname.replace(/^\/+/, '').replace(/=s\d+(-c)?$/, '');
	return path || null;
}

/**
 * What an `<img>` should actually load.
 *
 * Google's image CDN rate-limits per avatar URL per client and answers with a 429 once a
 * browser has asked too often, which it will: a feed shows the same handful of faces on
 * every card, and a reload with the cache disabled refetches every one of them. So avatars
 * go through our own `/avatar` endpoint, which fetches from Google at most once per cache
 * period and serves the result from our origin. Non-Google URLs are used as they are.
 */
export function avatarSrc(url: string, px: number): string {
	const path = googleAvatarPath(url);
	if (!path) return url;

	return `/avatar/${path}?s=${bucketFor(px)}`;
}

/**
 * The upstream URL the `/avatar` endpoint fetches. Google hands back a small image by
 * default, which the browser then upscales and which looks soft on retina screens, so we
 * ask for the size we need.
 */
export function sizedAvatarUrl(url: string, px: number): string {
	if (!/googleusercontent\.com/i.test(url)) return url;

	const size = bucketFor(px);

	const directive = /=s\d+(-c)?$/;
	if (directive.test(url)) return url.replace(directive, (_, crop) => `=s${size}${crop ?? ''}`);

	return `${url}=s${size}-c`;
}

/**
 * First letter of the first two words. Segmented by grapheme cluster rather than by code
 * point, because slicing a code point off a name written in a script that uses combining
 * marks leaves an orphaned mark, which browsers render as a dotted-circle placeholder.
 */
function firstGrapheme(word: string): string {
	if (typeof Intl.Segmenter === 'function') {
		const [first] = new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(word);
		return first?.segment ?? '';
	}
	return [...word][0] ?? '';
}

/** Fallback when the avatar URL is missing or 404s, which happens when someone changes photo. */
export function initialsOf(name: string): string {
	const words = name.trim().split(/\s+/).filter(Boolean);
	if (words.length === 0) return '?';

	return words
		.slice(0, 2)
		.map((word) => firstGrapheme(word).toUpperCase())
		.join('');
}
