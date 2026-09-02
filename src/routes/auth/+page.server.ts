import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

/** Only ever an in-app path, so a crafted ?returnTo= can't bounce a user off-site. */
function safeReturnTo(raw: string | null): string {
	if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/feed';
	return raw;
}

const CALLBACK_ERRORS: Record<string, string> = {
	missing_code: 'Google sent us back without a sign-in code. Please try again.',
	exchange_failed: "We couldn't complete that sign-in. Please try again."
};

export const load: PageServerLoad = ({ url }) => {
	const code = url.searchParams.get('error');
	return {
		returnTo: safeReturnTo(url.searchParams.get('returnTo')),
		callbackError: code ? (CALLBACK_ERRORS[code] ?? 'Something went wrong signing in.') : null
	};
};

export const actions: Actions = {
	google: async ({ locals: { supabase }, url, request }) => {
		const form = await request.formData();
		const returnTo = safeReturnTo(String(form.get('returnTo') ?? ''));

		const { data, error } = await supabase.auth.signInWithOAuth({
			provider: 'google',
			options: {
				redirectTo: `${url.origin}/auth/callback?next=${encodeURIComponent(returnTo)}`
			}
		});

		if (error || !data.url) {
			return fail(500, { message: "Couldn't reach Google. Try again in a moment." });
		}

		redirect(303, data.url);
	}
};
