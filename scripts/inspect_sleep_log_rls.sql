-- Read-only policy/grant metadata; never returns personal rows.
select c.relname as table_name, c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as force_rls,
       (select jsonb_agg(jsonb_build_object(
          'name', p.policyname, 'permissive', p.permissive, 'roles', p.roles,
          'command', p.cmd, 'using', p.qual, 'check', p.with_check
        ) order by p.policyname)
        from pg_policies p where p.schemaname = n.nspname and p.tablename = c.relname) as policies,
       (select jsonb_agg(jsonb_build_object(
          'role', r.role_name, 'select', has_table_privilege(r.role_name, c.oid, 'SELECT'),
          'insert', has_table_privilege(r.role_name, c.oid, 'INSERT'),
          'update', has_table_privilege(r.role_name, c.oid, 'UPDATE'),
          'delete', has_table_privilege(r.role_name, c.oid, 'DELETE')
        )) from (values ('anon'), ('authenticated')) r(role_name)) as grants
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('sleep_sessions', 'app_logs')
  and c.relkind = 'r'
order by c.relname;
