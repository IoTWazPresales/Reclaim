# N-0048 view caller security

Source of truth: live `pg_class`, `pg_get_viewdef`, `pg_policies` and column
metadata via `scripts/security_view_metadata.sql`. Both program views currently
have no security_invoker option. All three underlying tables have RLS enabled and
SELECT policies `auth.uid() = user_id`. Repository search found no application RPC
or view callers; current program queries access underlying tables directly.

The migration only changes the two view options. PostgreSQL's
[CREATE VIEW reference](https://www.postgresql.org/docs/current/sql-createview.html)
specifies that security_invoker uses the caller's permissions/RLS for base tables.
No policy is widened. `verify_program_view_rls.sql` installs the proposed options
inside a rollback-only transaction, creates two random synthetic identities with
program/day/session fixtures, impersonates each authenticated subject and asserts
own aggregates plus zero cross-user rows. It rolls back all fixtures and options.
Run this before applying the migration, then after. A successful metadata read
alone is not an isolation proof. No customer rows are selected by the probe.

## Executed verification

- Caller search in `app/src`: zero references to either view. Underlying SELECT
  grants/RLS were exercised as `authenticated`, not as a bypass-RLS admin.
- Initial fixture attempt used an invalid session mode and rolled back on the
  existing CHECK constraint. Corrected fixture to the live `manual` mode (this is
  execution mode, not the future Strength/Running/Hybrid preference).
- Corrected live preflight: PASS, both users see their own complete aggregates
  and zero rows for the other synthetic user. All fixtures/options rolled back.
- Migration contract tests 2/2; typecheck 0. Full verbose harness **138 files /
  880 tests PASS** (158.27 s, recorded 30-second timeout workaround).
- Applied ONLY `20260921090000_program_views_security_invoker.sql` via the pinned
  linked CLI `db query --file`; no bulk schema push. Live metadata now shows
  security_invoker=true for both views. Post-apply rollback-only two-user probe
  passed again. No fixture identities or programme rows persist.
- Dual-path 27/27; catalogue 357 rows / zero issues. Source review confirms
  unchanged view projections/joins, scoped identities and rollback-only test data.
