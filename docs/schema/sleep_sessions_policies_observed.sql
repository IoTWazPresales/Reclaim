-- N-0019: exact policy semantics observed through linked CLI on 2026-09-21.
-- REFERENCE ONLY: not an executable migration, not applied by this assessment.
-- Both policies already exist live; redundant permissive owner checks do not
-- broaden access. Anonymous auth.uid() NULL does not satisfy either equality.
alter table public.sleep_sessions enable row level security;
create policy sleep_sessions_rw on public.sleep_sessions
  as permissive for all to public
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy sleeps_owner_rw on public.sleep_sessions
  as permissive for all to public
  using (user_id = auth.uid()) with check (user_id = auth.uid());
