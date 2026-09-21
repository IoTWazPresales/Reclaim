# N-0050 pinned function name resolution

Live definitions from `security_function_metadata.sql` show three trigger
functions use builtins/NEW only; the definer integrity function also uses
unqualified public training tables and explicitly qualified auth.users. Pin
`pg_catalog, public, pg_temp` on the four flagged functions, without changing
bodies or grants. Explicit pg_temp last prevents caller-created temporary tables
from shadowing real public tables in the definer function.

The rollback probe executes all three trigger functions against temporary fixture
tables (timestamp writes; computed/minimum/explicit sleep durations), checks all
four proconfig values, and executes the integrity report with incompatible temp
shadows present. Only the report row count is used, not customer data or values.

## Executed evidence

Live rollback preflight passed all configuration, trigger and temp-shadow checks.
Applied only `20260921092000_pin_function_search_paths.sql` via pinned linked CLI
`db query --file`. Focused migration/probe contract tests 2/2. Full source gates and
post-apply verification follow below.

Post-apply rollback probe passed again; live metadata confirms all four paths
and unchanged N-0049 effective grants. Security advisors now report **zero ERROR**;
only WARNs remain: moddatetime in public (N-0057 assessment), leaked-password
protection disabled (dashboard HUMAN_CHECK). Neither warning is called resolved.

Full verbose harness **140 files / 884 tests PASS** (160.14 s, recorded 30-second
timeout workaround); typecheck 0; dual-path 27/27; catalogue 357 / zero issues.
