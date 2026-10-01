-- N-0057: catalog metadata only. No row contents.
select e.extname, n.nspname as extension_schema, e.extversion
from pg_extension e
join pg_namespace n on n.oid = e.extnamespace
where e.extname = 'moddatetime';

select n.nspname as function_schema, p.proname,
       pg_get_function_identity_arguments(p.oid) as args,
       p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.proname = 'moddatetime';

select event_object_schema, event_object_table, trigger_name,
       action_timing, event_manipulation, action_statement
from information_schema.triggers
where action_statement ilike '%moddatetime%'
order by event_object_schema, event_object_table, trigger_name;
