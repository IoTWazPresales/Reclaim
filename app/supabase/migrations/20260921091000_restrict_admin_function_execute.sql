-- N-0049: no app RPC callers; keep service-role administration and signup trigger.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
revoke execute on function public.handle_new_user(), public.verify_training_user_integrity() from public, anon, authenticated;
grant execute on function public.handle_new_user(), public.verify_training_user_integrity() to service_role;
commit;
