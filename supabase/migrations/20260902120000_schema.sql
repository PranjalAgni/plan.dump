-- PlanDump core schema.

create type public.plan_vibe as enum ('chill', 'active', 'food', 'movie', 'music', 'outdoors');
create type public.plan_visibility as enum ('public', 'private');

create table public.profiles (
	id uuid primary key references auth.users (id) on delete cascade,
	display_name text not null,
	avatar_url text,
	last_seen_at timestamptz not null default now(),
	show_presence boolean not null default true,
	created_at timestamptz not null default now()
);

create table public.plans (
	id uuid primary key default gen_random_uuid(),
	creator_id uuid not null references public.profiles (id) on delete cascade,

	body_text text,
	audio_path text,
	audio_mime text,
	audio_duration_ms integer,
	-- Amplitude summary computed once at record time, 0-100 per bucket, so the feed can
	-- draw waveforms without downloading any audio. Nullable on purpose: a decode failure
	-- must never block posting a plan.
	audio_peaks smallint[],
	transcript text,

	vibe public.plan_vibe not null,
	visibility public.plan_visibility not null default 'public',
	starts_at timestamptz not null,
	created_at timestamptz not null default now(),

	-- A plan is text, or audio, or both, but never empty.
	constraint plan_has_content check (
		(body_text is not null and length(btrim(body_text)) > 0) or audio_path is not null
	),
	constraint body_text_length check (body_text is null or length(body_text) <= 1000),

	-- Audio metadata travels as a set.
	constraint audio_fields_together check (
		(audio_path is null) = (audio_mime is null)
		and (audio_path is null) = (audio_duration_ms is null)
	),
	constraint audio_peaks_need_audio check (audio_peaks is null or audio_path is not null),
	-- 60s cap, with a second of slack for recorder timing jitter.
	constraint audio_duration_sane check (
		audio_duration_ms is null or (audio_duration_ms > 0 and audio_duration_ms <= 61000)
	)
);

create table public.plan_participants (
	plan_id uuid not null references public.plans (id) on delete cascade,
	user_id uuid not null references public.profiles (id) on delete cascade,
	created_at timestamptz not null default now(),
	primary key (plan_id, user_id)
);

create index plans_feed_idx on public.plans (visibility, starts_at desc);
create index plans_creator_idx on public.plans (creator_id, created_at desc);
create index plan_participants_user_idx on public.plan_participants (user_id);

-- Keeps profiles in step with Google. Runs on update too, because Google rotates avatar
-- URLs when someone changes their photo and the old URL starts 404ing.
create function public.sync_profile_from_auth_user() returns trigger
language plpgsql
security definer
set search_path = '' as $$
begin
	insert into public.profiles (id, display_name, avatar_url)
	values (
		new.id,
		coalesce(
			nullif(new.raw_user_meta_data ->> 'full_name', ''),
			nullif(new.raw_user_meta_data ->> 'name', ''),
			split_part(coalesce(new.email, 'friend'), '@', 1)
		),
		coalesce(
			nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
			nullif(new.raw_user_meta_data ->> 'picture', '')
		)
	)
	on conflict (id) do update
		set display_name = excluded.display_name,
			avatar_url = excluded.avatar_url;
	return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.sync_profile_from_auth_user();

create trigger on_auth_user_updated
after update of raw_user_meta_data on auth.users
for each row
execute function public.sync_profile_from_auth_user();

-- The creator is implicitly in their own plan, which is why a brand new card already
-- shows one participant avatar.
create function public.add_creator_as_participant() returns trigger
language plpgsql
security definer
set search_path = '' as $$
begin
	insert into public.plan_participants (plan_id, user_id)
	values (new.id, new.creator_id)
	on conflict do nothing;
	return new;
end $$;

create trigger plans_add_creator
after insert on public.plans
for each row
execute function public.add_creator_as_participant();

-- Heartbeat for the Friends directory. An RPC rather than a client-side row update so the
-- client never needs write access to the rest of the profile.
create function public.touch_last_seen() returns void
language sql
security definer
set search_path = '' as $$
	update public.profiles set last_seen_at = now() where id = auth.uid();
$$;
