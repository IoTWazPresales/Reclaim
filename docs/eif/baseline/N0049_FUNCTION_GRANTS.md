# N-0049 function EXECUTE boundary

Source truth: live function definitions, effective role privileges and repository
caller search. `handle_new_user()` is a SECURITY DEFINER signup trigger;
`verify_training_user_integrity()` is an administrative integrity-report function,
NOT a trigger. No application RPC callers exist for either name. Preserve both
bodies and security modes; revoke PUBLIC as well as anon/authenticated so inherited
PUBLIC access cannot undermine the restriction. Explicitly retain service_role.

The rollback-only SQL probe asserts effective privileges, tests denied integrity
RPC execution as both untrusted roles, and checks that a new synthetic auth row
still produces its profile through the signup trigger. No real account signup or
deletion journey is claimed. Apply only this migration through the linked CLI.

## Evidence

Live rollback preflight passed: both denied RPC calls, effective grants, and signup
profile creation. Focused migration/probe contract tests 2/2. Applied only
`20260921091000_restrict_admin_function_execute.sql` via CLI `db query --file`;
post-apply rollback probe passed. Live metadata: anon=false, authenticated=false,
service_role=true for both functions. Full verbose harness **139 files / 882 tests
PASS** (94.39 s, recorded 30-second timeout workaround); typecheck 0; dual-path
27/27; catalogue 357 / zero issues. Bodies and existing RLS policies are unchanged.
