# N-0019 sleep and app-log RLS source assessment

Read-only discovery node. Authority is actual Postgres relation/RLS/policy/role
metadata, compared with checked-in SQL, not the older audit's UNKNOWN label.
No table contents, user data, or credentials are needed. No migration is applied
without the separate authorization required by AGENTS section 8.

Check both sleep_sessions (audit missing-policy claim) and app_logs (audit nullable
auth.uid SELECT claim); distinguish configured ownership policies from tested
role isolation. Any live access problem becomes a chartered corrective node.

## Live observations — linked CLI 2026-09-21

Command from app: `npx --yes supabase db query --linked --project-ref
bgtosdgrvjwlpqxqjvdf --file ../scripts/inspect_sleep_log_rls.sql -o json`, bounded
by a 75-second subprocess timeout. Query succeeded. Only catalog metadata read.

| Table | RLS | Policies / result |
|---|---|---|
| sleep_sessions | enabled, not forced | PUBLIC permissive ALL policies sleep_sessions_rw and sleeps_owner_rw; both USING and WITH CHECK require auth.uid() = user_id (operand order differs). Ownership semantics present live. |
| app_logs | enabled, not forced | PUBLIC permissive SELECT "Users can view their own logs" has ((auth.uid() = user_id) OR (auth.uid() IS NULL)). anon has SELECT privilege. **UNSAFE_ANONYMOUS_SELECT; release blocker N-0063.** |

Both roles anon/authenticated have SELECT/INSERT/UPDATE/DELETE grants on both
tables. RLS restricts sleep access despite those grants. app_logs additionally
has authenticated owner-only select/insert/update/delete policies, but permissive
SELECT policies combine with OR: the additional owner-only policy cannot repair
the PUBLIC anonymous branch. Two PUBLIC INSERT policies permit owned rows and
user_id NULL rows respectively; those logging requirements need separate review
from the unsafe read branch. No UPDATE policy applies to anon.

The unsafe SELECT clause also exists in
`app/Documentation/SUPABASE_MISSING_TABLES.sql`. No checked-in sleep policy DDL was
found before this node; exact observed policy semantics are now recorded in
`docs/schema/sleep_sessions_policies_observed.sql` (reference only, not applied).
`scripts/inspect_sleep_log_rls.sql` makes the metadata check repeatable.

N-0063 is chartered for source correction, approved live mitigation and synthetic
role-isolation probes. No real rows were read, no migration applied, and no breach
is asserted from metadata alone. N-0019 is not a clean security sign-off and stays
blocked on this live finding. Continue N-0032 and independent wave-2 nodes.

## Executed gates

Policy reference tests 2/2; full verbose **143 files / 906 tests PASS**, 156.64 s,
with the existing 30-second timeout workaround. Typecheck 0, dual-path Git Bash
27/27, catalogue 357/0, wrapper 14/14. Logs local under `.eif/audit/N0019-*.txt`.
These passing source tests do not claim live row-isolation proof or mitigation of
N-0063. Same-agent verification reviewed all overlapping policy/grant metadata;
no independent-person verification is claimed.
