select jsonb_build_object(
  'checks', (select jsonb_agg(pg_get_constraintdef(oid)) from pg_constraint where conrelid='public.training_sessions'::regclass and contype='c'),
  'columns', (select jsonb_agg(jsonb_build_object('table',table_name,'column',column_name,'type',data_type,'nullable',is_nullable,'default',column_default) order by table_name,ordinal_position) from information_schema.columns where table_schema='public' and table_name in ('training_program_instances','training_program_days','training_sessions')),
  'views', (select jsonb_agg(jsonb_build_object('name',c.relname,'options',c.reloptions,'definition',pg_get_viewdef(c.oid,true))) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('user_active_programs','program_progress')),
  'policies', (select jsonb_agg(to_jsonb(p)) from pg_policies p where schemaname='public' and tablename in ('training_program_instances','training_program_days','training_sessions')),
  'rls', (select jsonb_agg(jsonb_build_object('table',relname,'enabled',relrowsecurity)) from pg_class where oid in ('public.training_program_instances'::regclass,'public.training_program_days'::regclass,'public.training_sessions'::regclass))
) as metadata;
