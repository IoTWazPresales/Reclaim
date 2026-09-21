-- N-0050: builtins first, known public relations next, temporary schema LAST.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
alter function public.set_updated_at() set search_path = pg_catalog, public, pg_temp;
alter function public.update_training_profiles_updated_at() set search_path = pg_catalog, public, pg_temp;
alter function public.verify_training_user_integrity() set search_path = pg_catalog, public, pg_temp;
alter function public.sleep_sessions_set_duration_minutes() set search_path = pg_catalog, public, pg_temp;
commit;
