-- N-0063: synthetic fixtures only. ALWAYS rollback. Do not select log properties.
-- Run after 20261001160000_app_logs_owner_select.sql is applied.
-- Pass: anon sees no synthetic rows, each user sees only their own marker.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
begin
  perform set_config('eif.test_user_a', a::text, true);
  perform set_config('eif.test_user_b', b::text, true);
  insert into auth.users (id, email, raw_user_meta_data, created_at, updated_at)
    values (a, 'eif-' || a || '@example.invalid', '{}'::jsonb, now(), now()),
           (b, 'eif-' || b || '@example.invalid', '{}'::jsonb, now(), now());
  insert into public.app_logs (user_id, event_name, severity)
    values (a, 'eif-n0063-a', 'info'),
           (b, 'eif-n0063-b', 'info');
end $$;

set local role anon;
do $$
declare seen integer;
begin
  insert into public.app_logs (user_id, event_name, severity)
    values (null, 'eif-n0063-anon', 'info');
  select count(*) into seen from public.app_logs where event_name like 'eif-n0063-%';
  if seen <> 0 then raise exception 'anon can read app_logs'; end if;
end $$;

reset role;
set local role authenticated;
do $$
declare
  subject uuid;
  other_user uuid;
  own_count integer;
  other_count integer;
begin
  foreach subject in array array[
    current_setting('eif.test_user_a')::uuid,
    current_setting('eif.test_user_b')::uuid
  ] loop
    other_user := case
      when subject = current_setting('eif.test_user_a')::uuid
        then current_setting('eif.test_user_b')::uuid
      else current_setting('eif.test_user_a')::uuid
    end;
    perform set_config('request.jwt.claim.sub', subject::text, true);
    perform set_config('request.jwt.claims', jsonb_build_object('sub', subject, 'role', 'authenticated')::text, true);
    if auth.uid() is distinct from subject then raise exception 'test identity not installed'; end if;
    select count(*) into own_count from public.app_logs
      where event_name = 'eif-n0063-' || case when subject = current_setting('eif.test_user_a')::uuid then 'a' else 'b' end;
    select count(*) into other_count from public.app_logs where user_id = other_user;
    if own_count <> 1 then raise exception 'owner cannot read own synthetic log'; end if;
    if other_count <> 0 then raise exception 'cross-user app_logs read'; end if;
  end loop;
end $$;

reset role;
rollback;
select 'PASS: anon and cross-user reads blocked; fixtures rolled back' as result;
