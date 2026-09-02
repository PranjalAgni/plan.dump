/**
 * Checks a Supabase project is wired up the way the app expects:
 *
 *   node scripts/verify-supabase.mjs
 *
 * The important assertions are the negative ones. Anything reachable with only the
 * publishable key is reachable by anyone who opens devtools, so this fails loudly if the
 * anonymous role can read plans or profiles.
 */
import { createClient } from '@supabase/supabase-js';
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

const url = env.PUBLIC_SUPABASE_URL;
const anon = createClient(url, env.PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
	auth: { persistSession: false }
});
const admin = createClient(url, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

const results = [];
const record = (ok, label, detail = '') => results.push({ ok, label, detail });

// Tables exist and are shaped as the app expects.
for (const table of ['profiles', 'plans', 'plan_participants']) {
	const { error } = await admin.from(table).select('*').limit(1);
	record(!error, `table ${table} exists`, error?.message ?? '');
}

// The bucket recordings are uploaded to.
const { data: buckets, error: bucketError } = await admin.storage.listBuckets();
const bucket = buckets?.find((b) => b.name === 'plan-audio');
record(Boolean(bucket), 'storage bucket plan-audio exists', bucketError?.message ?? '');
record(bucket?.public === false, 'bucket is private', bucket ? `public=${bucket.public}` : '');

// RLS: the anonymous role must see nothing at all.
for (const table of ['plans', 'profiles', 'plan_participants']) {
	const { data, error } = await anon.from(table).select('*').limit(1);
	const blocked = Boolean(error) || (data ?? []).length === 0;
	record(
		blocked,
		`anon cannot read ${table}`,
		error ? `blocked: ${error.code}` : 'returned 0 rows'
	);
}

// RLS: the anonymous role must not be able to write either.
const { error: writeError } = await anon
	.from('plans')
	.insert({ creator_id: crypto.randomUUID(), body_text: 'should not work', vibe: 'chill' });
record(Boolean(writeError), 'anon cannot insert a plan', writeError?.code ?? 'INSERT SUCCEEDED');

// Content constraint: a plan with neither text nor audio must be rejected. Every other
// required column is supplied deliberately, so that a not-null violation can't make this
// look like it passed when the check constraint was never reached. 23514 is check_violation.
const { error: emptyError } = await admin.from('plans').insert({
	creator_id: crypto.randomUUID(),
	vibe: 'chill',
	starts_at: new Date().toISOString()
});
record(
	emptyError?.code === '23514',
	'a plan with no text and no audio is rejected by plan_has_content',
	emptyError ? `code ${emptyError.code}` : 'INSERT SUCCEEDED'
);

// The same constraint must not reject a plan that does have text. A random creator_id has
// no matching auth.users row, so a foreign-key violation here is the expected success
// signal: it proves the row got past every content check.
const { error: fkError } = await admin.from('plans').insert({
	creator_id: crypto.randomUUID(),
	vibe: 'chill',
	body_text: 'text-only plans are allowed',
	starts_at: new Date().toISOString()
});
record(
	fkError?.code === '23503',
	'a text-only plan passes the content checks',
	fkError ? `code ${fkError.code}` : 'INSERT SUCCEEDED — creator FK is missing!'
);

// Google is the only way into the app, so the provider has to be switched on in the
// dashboard. This is configuration rather than schema, and no migration can set it.
const settings = await fetch(`${url}/auth/v1/settings`, {
	headers: { apikey: env.PUBLIC_SUPABASE_PUBLISHABLE_KEY }
})
	.then((response) => response.json())
	.catch(() => null);

record(
	settings?.external?.google === true,
	'Google sign-in is enabled',
	settings ? 'enable it under Authentication -> Sign In / Providers' : 'could not reach auth API'
);

const failed = results.filter((r) => !r.ok);
for (const { ok, label, detail } of results) {
	console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
}
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
