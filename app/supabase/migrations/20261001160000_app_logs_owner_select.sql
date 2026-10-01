-- N-0063: close anonymous reads of app_logs.
-- Does not drop insert policies and does not read log rows.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

drop policy if exists "Users can view their own logs" on public.app_logs;

create policy "Users can view their own logs"
  on public.app_logs
  for select
  to authenticated
  using (auth.uid() = user_id);

revoke select on table public.app_logs from anon;
revoke select on table public.app_logs from public;
grant select on table public.app_logs to authenticated;

commit;
