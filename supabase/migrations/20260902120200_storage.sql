-- Private bucket for voice recordings. Objects are keyed {user_id}/{uuid}.{ext} so the
-- upload policy can check ownership from the path prefix.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
	'plan-audio',
	'plan-audio',
	false,
	5242880, -- 5 MB; a 60s recording is well under 1 MB in either codec
	array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg']
)
on conflict (id) do nothing;

create policy "upload own audio" on storage.objects
for insert to authenticated
with check (
	bucket_id = 'plan-audio'
	and (storage.foldername(name))[1] = auth.uid()::text
);

-- Playback is allowed only for audio attached to a plan the caller can see. The subquery
-- is RLS-filtered, so this rides on the plan visibility rules rather than duplicating them.
create policy "read audio for visible plans" on storage.objects
for select to authenticated
using (
	bucket_id = 'plan-audio'
	and exists (select 1 from public.plans p where p.audio_path = name)
);

-- Needed to clean up a recording the user re-records or abandons before posting.
create policy "delete own audio" on storage.objects
for delete to authenticated
using (
	bucket_id = 'plan-audio'
	and (storage.foldername(name))[1] = auth.uid()::text
);
