import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, cookies }) => {
	return {
		session: locals.session,
		user: locals.user,
		// Forwarded so the server-side pass of +layout.ts can build a client with the same
		// auth cookies the request arrived with.
		cookies: cookies.getAll()
	};
};
