# Run-routes migration source B comparison - 2026-10-30

Branch: `fix/training-confident-ux`; comparison base:
`dc96fb3bc7dc0de1e21748d63575bfb869da1d3f` (published engine A).
Source: `app/supabase/migrations/20260930140000_run_routes.sql`.
Normalized Git blob: `50615053c9ffd144bd520697c477ea869e4082f8`.
The preserved diff is unchanged: 44 insertions / 5 deletions.

## Provenance and scope

The operator supplied the authoritative live-state comparison in this task:
their reviewer inspected Supabase project `bgtosdgrvjwlpqxqjvdf` read-only through
the Supabase connector on 2026-10-30. This agent compared the local file and its
complete diff against that supplied result; it did not independently query the
live database. This supersedes the publication blocker in
[preserved engine evidence](preserved-engine-eligibility-20261030.md#migration-b-publication-blocked).
Only migration source is published. No migration execution, repair, live writes,
Android operation, policy-test weakening or EIF acceptance is claimed.

## Clause-by-clause comparison

| Clause | Preserved source B versus supplied live state | Result |
|---|---|---|
| `run_sessions.training_session_id` | Nullable `text`; no NOT NULL. References `training_sessions.id`, reported as text. Changes the old UUID declaration. | Match |
| `run_sessions.id`, `run_sessions.user_id` | Both UUID, unchanged. | Match |
| `run_routes.run_session_id`, `run_routes.user_id` | Both UUID, unchanged. | Match |
| run_sessions INSERT WITH CHECK | Row owner `auth.uid() = user_id` AND (null training link OR EXISTS training_sessions with matching id AND `ts.user_id = auth.uid()`). | Match |
| run_sessions UPDATE USING | Existing row owner `auth.uid() = user_id`. | Match |
| run_sessions UPDATE WITH CHECK | Same full owner/null-link/owned-training-parent predicate as INSERT. | Match |
| run_routes INSERT WITH CHECK | Row owner `auth.uid() = user_id` AND EXISTS run_sessions with matching id AND `rs.user_id = auth.uid()`. | Match |
| run_routes UPDATE USING | Existing row owner `auth.uid() = user_id`. | Match |
| run_routes UPDATE WITH CHECK | Same full owner/owned-run-parent predicate as INSERT. | Match |
| run_sessions SELECT / DELETE USING | `auth.uid() = user_id` for each policy, unchanged. | Match |
| run_routes SELECT / DELETE USING | `auth.uid() = user_id` for each policy, unchanged. | Match |

The source uses `public.training_sessions ts` / `public.run_sessions rs` and
unqualified correlated link columns `training_session_id` / `run_session_id`;
the supplied comparison spells them as `run_sessions.training_session_id` /
`run_routes.run_session_id`. These express the same outer-row links. Parent-owner
predicates are inside EXISTS; row-owner checks remain outside, joined with AND.
The new comment explains the text ID and has no SQL effect.

**Mismatch: none in the supplied type and policy comparison.** This is not a
byte-for-byte certification of the complete applied SQL. Unchanged home policies,
indexes, other columns, constraints and delete actions are outside the supplied
live-state evidence; they were not modified or claimed independently verified.

## Migration-history blocker

The reviewer reports remote migration history contains only the two
`meds_catalog_match_key` entries. `run_routes` was applied outside migration
tracking. Source parity does not resolve that history drift, and CREATE TABLE IF
NOT EXISTS does not make replay of existing named policies safe.

**No `supabase db push` until a separately approved `migration repair` task.**
That task must reconcile the recorded applied versions with the actual database,
check the rest of the local/remote history and assess pending migrations before
any later deployment is separately authorized. No repair is authorized or run here.
Manual blocker: [HUMAN_CHECKS](../../../eif/HUMAN_CHECKS.md).

## Validation

From `app/`:

```text
npx vitest run src/lib/training/__tests__/runSession.test.ts src/lib/training/__tests__/runningDesign.test.ts --pool=forks --reporter=verbose
npx vitest run src/lib/training/__tests__/runSession.test.ts src/lib/training/__tests__/runningDesign.test.ts --reporter=verbose
npm run typecheck
```

Both focused runs: **2 files / 7 tests passed**, exit 0, including the existing
migration-source test requiring the text link and both linked-owner checks.
Typecheck: exit 0, no errors. No tests, expectations, dependencies or timeout
settings were modified. Source/documentation `git diff --check`: pass.

Required full-suite attempt: `npm test -- --reporter=verbose`, output redirected
through `cmd /c` to a local TEMP file. Completed: **203 files passed / 1 failed;
1,477 tests passed / 1 failed**, exit 1 (507.73 seconds). The sole failure is the
previously documented `weeklyVolumeModel.test.ts` case `clamps a new session when
a tighter cap is supplied`: line 101 expects isolation sets <= 10, receives 15.
The migration-source assertion passes in the full run. The full-suite gate remains
failing; no new failure identity was observed. This supersedes the earlier
incomplete runner result for this attempt, without changing the pending policy.
No SQL execution test or runtime acceptance is claimed. Raw logs are excluded
from the commit.
