-- Rollback-only proposed configuration and synthetic temporary trigger fixtures.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
alter function public.set_updated_at() set search_path = pg_catalog, public, pg_temp;
alter function public.update_training_profiles_updated_at() set search_path = pg_catalog, public, pg_temp;
alter function public.verify_training_user_integrity() set search_path = pg_catalog, public, pg_temp;
alter function public.sleep_sessions_set_duration_minutes() set search_path = pg_catalog, public, pg_temp;

create temporary table eif_updated_at(updated_at timestamptz);
create trigger eif_updated before insert on eif_updated_at for each row execute function public.set_updated_at();
insert into eif_updated_at values(null);
create temporary table eif_profile_updated_at(updated_at timestamptz);
create trigger eif_profile_updated before insert on eif_profile_updated_at for each row execute function public.update_training_profiles_updated_at();
insert into eif_profile_updated_at values(null);
create temporary table eif_sleep(start_time timestamptz,end_time timestamptz,duration_minutes integer);
create trigger eif_duration before insert on eif_sleep for each row execute function public.sleep_sessions_set_duration_minutes();
insert into eif_sleep values(now()-interval '20 minutes',now(),null),
  (now()-interval '10 seconds',now(),null),(now()-interval '20 minutes',now(),7);

-- Deliberately incompatible shadows: without pg_temp last, the admin function fails.
create temporary table training_sessions(shadow_only integer);
create temporary table training_session_items(shadow_only integer);
create temporary table training_set_logs(shadow_only integer);
set local search_path = pg_temp, public;
do $$
declare count_rows integer; fn regprocedure;
begin
  foreach fn in array array['public.set_updated_at()'::regprocedure,
    'public.update_training_profiles_updated_at()'::regprocedure,
    'public.verify_training_user_integrity()'::regprocedure,
    'public.sleep_sessions_set_duration_minutes()'::regprocedure] loop
    if not exists(select 1 from pg_catalog.pg_proc where oid=fn and proconfig @> array['search_path=pg_catalog, public, pg_temp'])
      then raise exception 'search path not pinned for %',fn; end if;
  end loop;
  if exists(select 1 from pg_temp.eif_updated_at where updated_at is null)
    or exists(select 1 from pg_temp.eif_profile_updated_at where updated_at is null)
    then raise exception 'timestamp trigger regression'; end if;
  if (select array_agg(duration_minutes order by duration_minutes) from pg_temp.eif_sleep) <> array[1,7,20]
    then raise exception 'sleep duration trigger regression'; end if;
  select count(*) into count_rows from public.verify_training_user_integrity();
  if count_rows <> 3 then raise exception 'integrity report regression'; end if;
end $$;
rollback;
select 'PASS: four paths pinned; triggers preserved; temp shadows ignored; fixtures rolled back' as result;
