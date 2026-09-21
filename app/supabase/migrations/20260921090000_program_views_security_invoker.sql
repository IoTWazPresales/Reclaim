-- N-0048: preserve view columns/definitions; evaluate underlying RLS as caller.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
alter view public.user_active_programs set (security_invoker = true);
alter view public.program_progress set (security_invoker = true);
commit;
