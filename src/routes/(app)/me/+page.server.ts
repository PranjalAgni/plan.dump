import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	// Server-side so the auth cookies are cleared on the response, rather than relying on
	// the browser client and leaving a stale session cookie behind.
	signout: async ({ locals: { supabase } }) => {
		await supabase.auth.signOut();
		redirect(303, '/auth');
	}
};
