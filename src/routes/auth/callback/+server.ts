import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
	const code = url.searchParams.get('code');
	const next = url.searchParams.get('next');
	const destination = next?.startsWith('/') && !next.startsWith('//') ? next : '/feed';

	if (!code) {
		redirect(303, '/auth?error=missing_code');
	}

	// Sets the auth cookies via the setAll handler configured in hooks.server.ts.
	const { error } = await supabase.auth.exchangeCodeForSession(code);
	if (error) {
		redirect(303, '/auth?error=exchange_failed');
	}

	redirect(303, destination);
};
