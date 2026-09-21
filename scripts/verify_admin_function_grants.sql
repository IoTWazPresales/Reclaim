-- Proposed grants + signup fixture are rollback-only. No customer rows queried.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
revoke execute on function public.handle_new_user(), public.verify_training_user_integrity() from public, anon, authenticated;
grant execute on function public.handle_new_user(), public.verify_training_user_integrity() to service_role;
do $$
declare fn regprocedure; fixture uuid := gen_random_uuid();
begin
  foreach fn in array array['public.handle_new_user()'::regprocedure,'public.verify_training_user_integrity()'::regprocedure] loop
    if has_function_privilege('anon',fn,'EXECUTE') or has_function_privilege('authenticated',fn,'EXECUTE')
      then raise exception 'unintended effective EXECUTE grant on %',fn; end if;
    if not has_function_privilege('service_role',fn,'EXECUTE')
      then raise exception 'administrative access lost on %',fn; end if;
  end loop;
  insert into auth.users(id,email,raw_user_meta_data,created_at,updated_at)
    values(fixture,'eif-'||fixture||'@example.invalid','{"full_name":"EIF signup trigger probe"}',now(),now());
  if not exists(select 1 from public.profiles where id=fixture and display_name='EIF signup trigger probe')
    then raise exception 'signup profile trigger failed'; end if;
end $$;
set local role authenticated;
do $$
declare denied boolean := false;
begin
  begin
    perform * from public.verify_training_user_integrity();
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'authenticated integrity RPC unexpectedly allowed'; end if;
end $$;
reset role;
set local role anon;
do $$
declare denied boolean := false;
begin
  begin
    perform * from public.verify_training_user_integrity();
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'anonymous integrity RPC unexpectedly allowed'; end if;
end $$;
reset role;
rollback;
select 'PASS: RPC grants denied; service role retained; signup trigger works; fixture rolled back' as result;
