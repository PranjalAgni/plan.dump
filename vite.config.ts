import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-vercel';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	// Pinned, and strict so startup fails rather than quietly moving to the next free port.
	// The port is part of the OAuth redirect allowlist in the Supabase dashboard, so a
	// silent drift to 5174 would break sign-in with a redirect_uri mismatch instead of an
	// obvious error.
	server: { port: 5173, strictPort: true },
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// Mumbai, to sit beside the Supabase project in ap-south-1. Vercel otherwise runs
			// functions in Washington by default, and almost every route here does server-side
			// database work, starting with the root layout resolving the session before anything
			// renders, so each request would cross to Virginia and back before returning a page.
			// One region only: multiple regions for serverless functions need an Enterprise plan.
			adapter: adapter({ regions: ['bom1'] })
		})
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
