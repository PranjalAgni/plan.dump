/**
 * Prints the Postgres connection string for `pnpm db:push`, assembled from .env so the
 * password never has to be pasted onto a command line or into shell history.
 *
 * It targets the connection pooler rather than `db.<ref>.supabase.co`, because the direct
 * host is IPv6-only on current projects and refuses connections from IPv4-only networks.
 * The pooler hostname contains the project's region, which is why it's configured
 * explicitly instead of derived from the API URL.
 */
import { readFile } from 'node:fs/promises';

const env = Object.fromEntries(
	(await readFile('.env', 'utf8'))
		.split('\n')
		.filter((line) => /^[A-Z]/.test(line))
		.map((line) => {
			const at = line.indexOf('=');
			return [line.slice(0, at).trim(), line.slice(at + 1).trim()];
		})
);

const required = ['PUBLIC_SUPABASE_URL', 'SUPABASE_DATABASE_PASSWORD', 'SUPABASE_DB_POOLER_HOST'];
const missing = required.filter((key) => !env[key]);
if (missing.length > 0) {
	console.error(`Missing in .env: ${missing.join(', ')}`);
	process.exit(1);
}

const ref = new URL(env.PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const password = encodeURIComponent(env.SUPABASE_DATABASE_PASSWORD);

process.stdout.write(
	`postgresql://postgres.${ref}:${password}@${env.SUPABASE_DB_POOLER_HOST}:5432/postgres`
);
