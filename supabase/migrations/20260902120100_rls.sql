-- All read authorisation lives here and nowhere else. Introducing friends or circles later
-- means editing the "read public plans" policy, not the client.

alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.plan_participants enable row level security;

-- Google-only auth: there is no guest mode, so anon gets nothing at all. RLS alone would
-- already block it, but revoking makes the intent explicit and survives policy edits.
revoke all on public.profiles from anon;
revoke all on public.plans from anon;
revoke all on public.plan_participants from anon;

-- Profiles: the Friends directory needs every signed-in user to see every profile.
create policy "profiles readable when signed in" on public.profiles
for select to authenticated
using (true);

create policy "own profile is editable" on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Plans. The two select policies are permissive, so they OR together.
create policy "read public plans" on public.plans
for select to authenticated
using (visibility = 'public');

create policy "read own plans" on public.plans
for select to authenticated
using (creator_id = auth.uid());

create policy "create own plans" on public.plans
for insert to authenticated
with check (creator_id = auth.uid());

create policy "edit own plans" on public.plans
for update to authenticated
using (creator_id = auth.uid())
with check (creator_id = auth.uid());

create policy "delete own plans" on public.plans
for delete to authenticated
using (creator_id = auth.uid());

-- Participants. The subquery against public.plans is itself RLS-filtered, so participants
-- are only visible for plans the caller can already see. No recursion, because the plans
-- policies never reference plan_participants.
create policy "read participants of visible plans" on public.plan_participants
for select to authenticated
using (exists (select 1 from public.plans p where p.id = plan_id));

create policy "join a visible public plan" on public.plan_participants
for insert to authenticated
with check (
	user_id = auth.uid()
	and exists (
		select 1 from public.plans p
		where p.id = plan_id and p.visibility = 'public'
	)
);

create policy "leave a plan" on public.plan_participants
for delete to authenticated
using (user_id = auth.uid());

-- Live feed and live participant counts. Realtime honours the policies above.
alter publication supabase_realtime add table public.plans;
alter publication supabase_realtime add table public.plan_participants;
