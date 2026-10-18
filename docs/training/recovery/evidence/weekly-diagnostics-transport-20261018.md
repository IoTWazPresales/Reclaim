# Weekly diagnostic source transport — 2026-10-18

Scope: source transport only on `fix/training-confident-ux`. No rendered component,
Android operation, live-data access/write, saved-session change, scientific policy
change, EIF transition/acceptance or R12 work. Existing unrelated working-tree
changes, including the engine and route migration, are preserved and excluded
from this correction's commit.

## Contract and trace

`validateProgrammeWeek` already returns `valid | unresolved | invalid`, full
`ProgrammeValidationIssue` objects and coverage. Previously
`programmeWeekProposal` discarded that result unless invalid. Each compiled-week
proposal now carries optional `SessionPlan.weeklyValidation`: the unchanged full
result plus its week index, policy version and strategy ID. Every proposal for
that week references the same result. Issues retain message, provenance, severity,
code, week/day/slot/requirement location and exercise identity. Coverage is retained.
No issue is synthesized, filtered or reduced to an exercise/code pair.

Daily `programmeValidation` remains `feasible | infeasible | legacy`. Existing
invalid-week propagation to infeasible daily proposals is unchanged.
`assertStartableProgramme` is unchanged: infeasibility or a daily error blocks;
warning-only weekly results do not block. The materialization boundary retains
that guard. External-load zero remains unspecified, with its actual warning;
neither load inference nor calibration changes.

`dryRunTrainingGeneration` returns the projected `SessionPlan` intact. Setup's
confirmation checks every projected proposal with the existing guard.
TrainingScreen's `plansByDate`/pending-plan path uses `programmeWeekProposal`;
SessionPreviewModal receives `pendingPlan` as `SessionPlan`. No consumer needs to
revalidate or reconstruct diagnostic provenance. `computePreviewSummary` and the
modal currently omit diagnostics; their presentation is unchanged here.

`weeklyProgrammeDiagnostics(entries)` is the typed weekly-summary companion to
`weeklyProgrammeSummary`. For one programme it returns one result per
`[weekIndex, policyVersion, strategyId]`, even after JSON transport breaks shared
object identity. It preserves all issue occurrences within each result: two
exposures of one exercise remain two occurrences. It does not sum five copies of
one weekly result. Call separately for different programmes or profile revisions;
do not mix stale and fresh proposals for the same week. The existing volume
summary string is unchanged.

True historical plans without compilation and old snapshots without this field
remain supported; missing diagnostics mean unknown, not valid. Versioned plans
missing compilation still fail through existing daily errors; no weekly result
is fabricated when validation did not execute. Compiled legacy-policy weeks
still receive the actual validator result, including pending-policy warnings.

Frozen summary entries (including empty arrays) are excluded from the current
diagnostic selector. `frozenSessionProjection` clears current weekly diagnostics
when projecting stored items: current-profile checks are not historical
validation. Stored prescriptions, canonical performed work and the existing
started/guided snapshot selection are unchanged.

## Offline corrected diagnostic

Run `node docs/training/recovery/evidence/replay-weekly-diagnostics.cjs`.
The network-free script verifies the private capture hashes, replays captured
module factories and first exactly reproduces the prior corrected four-week
output with the corrected validator. It then replaces only the proposal and
projection factories with current transpiled source. Other captured factories,
including the retained engine edit, remain unchanged. It compares declarations,
validation results, coverage, generated plan, and every prior proposal field.
Only the new diagnostic property is removed for proposal comparison.

All four weeks remain **unresolved**, each with **five feasible daily proposals**,
**19 load-confirmation warnings and one leg-press incomplete-history warning**.
All 20 daily proposals remain feasible, all 20 issues per week survive exactly,
and the summary returns one result per week. The selector does not multiply the
20 issues into 100 independent problems. No underlying issue is deduplicated.

The sanitized [replay receipt](weekly-diagnostics-replay-20261018.json) contains
hashes, source paths and aggregate results only. Original personal inputs,
captured runtime source and full output remain in their existing private local
directory. The script does not publish or overwrite them. This establishes
offline source transport, not loaded Android source or rendered behavior.

## Presentation follow-up (not implemented)

1. Weekly summary callers should pass the same current proposal/frozen entries
   to `weeklyProgrammeDiagnostics`, scoped to one programme. Show the returned
   weekly status once and count severity from each returned issue array once.
   Keep daily feasibility and completed/frozen/future volume separate.
2. Preview should read `plan.weeklyValidation.status` and its complete `issues`.
   Show unresolved as unresolved even when the day is feasible; do not mark the
   day infeasible or change Start based on warning presence. Absent diagnostics
   mean unavailable/legacy. Existing daily hard errors still need review.
3. Exercise guidance should match issue `dayKey` and `exerciseId` (plus `slotId`
   when supplied), rather than borrowing another day's warning for the same
   exercise. Preserve exact code, severity, message and provenance. Week-level
   warnings without exercise location belong to the week. Retain genuine repeated
   exposures; deduplicate weekly references, not issue identities.
4. Present `load_requires_confirmation` as an unspecified load requiring user
   confirmation; do not invent a completed confirmation state. External-load zero
   is not calibrated 0 kg.
   Keep `history_evidence_unverified` visible as the incomplete-history barrier;
   it does not qualify performance or justify progression/deload.
5. Frozen sessions must use stored prescriptions and historical guidance; never
   infer a historical validation result from a current-profile projection.

Android follow-up still needs loaded-source proof, corrected weekly/preview and
exercise renders, truthful load formatting, separate actual-render review and
runtime start/save verification under the previously documented constraints.
The prior ANR/policy-blocked recovery remains unresolved; this task makes no
Android verification claim.

## Verification

Separate [source review](weekly-diagnostics-review-20261018.md): **APPROVED**.
The reviewer independently passed the final seven transport cases, the existing
135 validator and six persistence cases, and the exact private-input replay.
It records and resolves the frozen-diagnostic leakage and an incorrect legacy
test assumption, and binds approval to exact source/test/replay hashes.

| Check | Result |
| --- | --- |
| Final focused validator, transport, persistence, programme acceptance and preview tests | 205 passed across five files |
| Typecheck | 0 errors |
| Git Bash dual-path audit | 31 passed / 0 failed |
| Catalogue QA | 357 rows / 0 governance issues; CLI test passes |
| Ledger-wrapper tests | 3 passed; no ledger mutation |
| Corrected four-week replay | Exact original fields retained; 20 feasible proposals, 20 warnings/week |
| Full required suite | 201 files: 198 passed / 3 failed; 1,436 tests passed / 4 failed; exit 1 |

Focused command (from `app/`):
`npx vitest run src/lib/training/__tests__/weeklyDiagnosticsTransport.test.ts src/lib/training/__tests__/weeklyProgrammeValidator.test.ts src/lib/training/__tests__/programmePersistence.integration.test.ts src/lib/training/__tests__/programmeAcceptance.test.ts src/lib/training/preview/__tests__/preview.test.ts --pool=forks --maxWorkers=1 --reporter=verbose`.
Earlier default-thread focused attempts stalled and their specifically identified
owned runners were stopped. The constrained fork run completed in 25.06 seconds;
the repository's 30-second per-test budget was not shortened. The full suite used
the normal repository command and default pool, completing in 444.75 seconds.

The four failures match the established **mixed working-tree** identities in
the previous correction report; this is a failing full-suite gate, not a pass:

| Test | Existing assertion failure |
| --- | --- |
| `routineVolumeMeasurement.test.ts`, two-pass matrix | Expected 18 exercises, received 31 |
| `smallMuscleVolume.test.ts`, advanced 50/50 leg day | Expected 3, received undefined |
| `weeklyVolumeModel.test.ts`, tighter cap | Expected at most 10, received 15 |
| `weeklyVolumeModel.test.ts`, later capped build/frozen snapshot | Expected at most 2, received 6 |

These files/expectations were not edited. The unrelated working-tree engine and
migration edits remain excluded from the commit. This working-tree run is not
misreported as the committed-baseline failure set: that baseline separately has
the route-migration assertion instead of the small-muscle assertion. No clean
baseline full-suite rerun is claimed in this task.

The [checks receipt](weekly-diagnostics-checks-20261018.json) records commands,
exit results and hashes of local logs, which remain uncommitted. Only sanitized
source/evidence is published. Required progress/context pointers are updated;
the existing EIF node table and acceptance state are unchanged. Stop here after
publication; presentation and Android verification remain pending.
