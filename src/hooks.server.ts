import { createServerClient } from '@supabase/ssr';
import { redirect, type Handle } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_PUBLISHABLE_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import type { Database } from '$lib/database.types';

/**
 * Everything else requires a session. `/plans/*` is reachable without one so link
 * previews work for crawlers, and the page itself renders only preview metadata plus a
 * sign-in prompt when there is no user.
 */
function isPublicPath(pathname: string): boolean {
	// The component preview route renders fixtures and 404s outside dev.
	if (import.meta.env.DEV && pathname.startsWith('/dev')) return true;
	return (
		pathname.startsWith('/auth') ||
		// Linked from the sign-in screen, so they must be readable before signing in — and
		// Google's OAuth verification fetches the privacy policy anonymously.
		pathname.startsWith('/legal') ||
		pathname.startsWith('/plans/')
	);
}

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createServerClient<Database>(
		PUBLIC_SUPABASE_URL,
		PUBLIC_SUPABASE_PUBLISHABLE_KEY,
		{
			cookies: {
				getAll: () => event.cookies.getAll(),
				setAll: (cookiesToSet) => {
					for (const { name, value, options } of cookiesToSet) {
						event.cookies.set(name, value, { ...options, path: '/' });
					}
				}
			}
		}
	);

	/**
	 * `getSession()` decodes the cookie without verifying it, so it must never be the basis
	 * of an authorisation decision. `getUser()` validates the JWT with Supabase. We need
	 * both: the session carries the access token, the user is the authoritative identity.
	 */
	event.locals.safeGetSession = async () => {
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();
		if (!session) return { session: null, user: null };

		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser();
		if (error) return { session: null, user: null };

		return { session, user };
	};

	const { session, user } = await event.locals.safeGetSession();
	event.locals.session = session;
	event.locals.user = user;

	const { pathname, search } = event.url;

	if (!user && !isPublicPath(pathname)) {
		const returnTo = encodeURIComponent(pathname + search);
		redirect(303, `/auth?returnTo=${returnTo}`);
	}

	if (user && pathname === '/auth') {
		redirect(303, '/feed');
	}

	return resolve(event, {
		filterSerializedResponseHeaders: (name) =>
			name === 'content-range' || name === 'x-supabase-api-version'
	});
};
