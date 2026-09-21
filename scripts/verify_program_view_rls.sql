-- N-0048: synthetic fixtures only; ALWAYS rollback, including temporary view options.
-- Run as the linked CLI admin. Never commit this transaction.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
alter view public.user_active_programs set (security_invoker = true);
alter view public.program_progress set (security_invoker = true);

do $$
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid();
  pa uuid := gen_random_uuid(); pb uuid := gen_random_uuid();
  da uuid := gen_random_uuid(); db uuid := gen_random_uuid();
begin
  perform set_config('eif.test_user_a', a::text, true);
  perform set_config('eif.test_user_b', b::text, true);
  insert into auth.users (id, email, raw_user_meta_data, created_at, updated_at)
    values (a, 'eif-' || a || '@example.invalid', '{}'::jsonb, now(), now()),
           (b, 'eif-' || b || '@example.invalid', '{}'::jsonb, now(), now());
  insert into public.training_program_instances
    (id,user_id,start_date,selected_weekdays,plan,profile_snapshot)
    values (pa,a,current_date,array[1],'{}','{}'), (pb,b,current_date,array[1],'{}','{}');
  insert into public.training_program_days
    (id,program_id,user_id,date,week_index,day_index,label,intents)
    values (da,pa,a,current_date,1,1,'EIF synthetic A','[]'),
           (db,pb,b,current_date,1,1,'EIF synthetic B','[]');
  insert into public.training_sessions
    (id,user_id,mode,goals,program_id,program_day_id,started_at,ended_at)
    values (gen_random_uuid()::text,a,'manual','[]',pa,da,now()-interval '10 minutes',now()),
           (gen_random_uuid()::text,b,'manual','[]',pb,db,now()-interval '10 minutes',now());
end $$;

set local role authenticated;
do $$
declare
  subject uuid; other_user uuid; own_count integer;
begin
  foreach subject in array array[current_setting('eif.test_user_a')::uuid,current_setting('eif.test_user_b')::uuid] loop
    other_user := case when subject=current_setting('eif.test_user_a')::uuid
      then current_setting('eif.test_user_b')::uuid else current_setting('eif.test_user_a')::uuid end;
    perform set_config('request.jwt.claim.sub',subject::text,true);
    perform set_config('request.jwt.claims',jsonb_build_object('sub',subject,'role','authenticated')::text,true);
    if auth.uid() is distinct from subject then raise exception 'test identity not installed'; end if;
    select count(*) into own_count from public.user_active_programs
      where user_id=subject and total_planned_days=1 and completed_sessions=1;
    if own_count <> 1 then raise exception 'own active-program aggregation broken'; end if;
    select count(*) into own_count from public.program_progress
      where user_id=subject and total_days=1 and completed_days=1 and completion_percentage=100;
    if own_count <> 1 then raise exception 'own progress aggregation broken'; end if;
    if exists(select 1 from public.user_active_programs where user_id=other_user)
      or exists(select 1 from public.program_progress where user_id=other_user)
      then raise exception 'cross-user view leak'; end if;
  end loop;
end $$;
reset role;
rollback;
select 'PASS: both users see own aggregates only; all fixtures rolled back' as result;
