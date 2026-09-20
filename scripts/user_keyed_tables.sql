-- Metadata only: no customer rows or auth identifiers are selected.
with user_keyed as (
  select c.oid, n.nspname as schema_name, c.relname as table_name,
    array_agg(a.attname::text order by a.attname) as user_columns
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
  where n.nspname = 'public' and c.relkind in ('r', 'p')
    and (a.attname = 'user_id' or exists (
      select 1 from pg_constraint fk
      join pg_class referenced on referenced.oid = fk.confrelid
      join pg_namespace rn on rn.oid = referenced.relnamespace
      where fk.contype = 'f' and fk.conrelid = c.oid
        and a.attnum = any(fk.conkey)
        and rn.nspname = 'auth' and referenced.relname = 'users'
    ))
  group by c.oid, n.nspname, c.relname
)
select uk.schema_name as schema, uk.table_name as name, uk.user_columns,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'name', fk.conname,
      'columns', (select jsonb_agg(a.attname order by k.ord)
        from unnest(fk.conkey) with ordinality k(num, ord)
        join pg_attribute a on a.attrelid = fk.conrelid and a.attnum = k.num),
      'referenced_schema', rn.nspname,
      'referenced_table', rc.relname,
      'referenced_columns', (select jsonb_agg(a.attname order by k.ord)
        from unnest(fk.confkey) with ordinality k(num, ord)
        join pg_attribute a on a.attrelid = fk.confrelid and a.attnum = k.num),
      'delete_rule', case fk.confdeltype
        when 'a' then 'NO ACTION' when 'r' then 'RESTRICT' when 'c' then 'CASCADE'
        when 'n' then 'SET NULL' when 'd' then 'SET DEFAULT' end
    ) order by fk.conname)
    from pg_constraint fk
    join pg_class rc on rc.oid = fk.confrelid
    join pg_namespace rn on rn.oid = rc.relnamespace
    where fk.contype = 'f' and fk.conrelid = uk.oid
  ), '[]'::jsonb) as foreign_keys
from user_keyed uk
order by uk.schema_name, uk.table_name;
