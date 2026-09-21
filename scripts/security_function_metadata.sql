select p.oid::regprocedure::text as function, p.prosecdef as security_definer,
       p.proconfig as settings, pg_get_functiondef(p.oid) as definition,
       has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
       has_function_privilege('service_role',p.oid,'EXECUTE') as service_role_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in
('handle_new_user','verify_training_user_integrity','set_updated_at',
 'update_training_profiles_updated_at','sleep_sessions_set_duration_minutes')
order by p.proname;
