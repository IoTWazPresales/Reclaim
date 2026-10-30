# Preserved engine eligibility edit — 2026-10-30

Scoped source checkpoint on `fix/training-confident-ux`, compared with HEAD
`eedb704aba6b5024a1d83b13f8625b9021bb2d95`. Only the preserved engine integration
is proposed for publication. No ranking, prescription, catalogue, test expectation,
live data, Android, EIF acceptance or R12 changes.

## Exact source diff

The literal block retains Git's single-space blank context line; its whitespace
warning is intentional. Production source and resume-note whitespace checks pass.

```diff
diff --git a/app/src/lib/training/engine/index.ts b/app/src/lib/training/engine/index.ts
index 87c56ba..861c8e9 100644
--- a/app/src/lib/training/engine/index.ts
+++ b/app/src/lib/training/engine/index.ts
@@ -21,6 +21,7 @@ import { setsForMajorPattern, setsForSmallMuscle, smallMuscleOf, weeklySmallMusc
 import { warmupSetsForWorkingWeight } from '../warmupSets';
 import { buildBalancedProgramSession } from '../balancedHypertrophy';
 import { buildAllocatedProgramSession } from '../allocatedProgramSession';
+import { evaluateExerciseEligibility } from '../exerciseEligibility';
 import type {
   Exercise,
   MovementIntent,
@@ -352,8 +353,15 @@ function scoreExercise(
   }
 
   // Equipment availability (Task 1 - use new hasEquipment helper)
-  if (!hasEquipment(exercise, constraints.availableEquipment)) {
-    return { exerciseId: exercise.id, score: 0, reasons: ['Required equipment not available'] };
+  const eligibility = evaluateExerciseEligibility(exercise, {
+    goals: goalWeights as TrainingProfileSnapshot['goals'],
+    equipment_access: constraints.availableEquipment,
+    constraints,
+    baselines: userState.estimated1RM,
+    experienceLevel: userState.experienceLevel,
+  }, { allowEnteredRackException: true });
+  if (!eligibility.eligible) {
+    return { exerciseId: exercise.id, score: 0, reasons: eligibility.reasons };
   }
   score += 50;
   reasons.push('Equipment available');
```

Normalized engine blob: `861c8e9d1575da82e36ac961aa3e549b150da811`.
The committed evaluator and its [R03 contract](../R03-contract.md) are unchanged.

## Separate source review: A

Reviewed the complete diff, `scoreExercise`, `chooseExercise`, remaining
`hasEquipment` callers, the evaluator, contract and focused tests. Scoped source
review found no blocking defect. This was a separate review pass by the executing
agent, not a delegated independent-agent approval.

The edit imports and calls the committed evaluator with the existing engine
constraints, goals, experience and own exercise baselines. Rejection reasons now
come from that evaluator. Existing skill/role checks precede it; injury and forbidden
checks remain; `chooseExercise` already excludes disliked candidates. Numeric score
increments, sorting, set allocation, loading and catalogue data are unchanged.

This integrates the full committed eligibility contract, including whitespace and
case normalization, dumbbell(s)/kettlebell(s), explicit ALL/ANY semantics and the
opted-in entered-baseline rack exception. It is not a universal claim of alias-only
behavior versus the old engine gate. The rack exception is pre-existing R03 policy,
requires this exercise's own positive finite baseline and rack-only missing ALL
equipment, and retains pending decision D-P2-06. No fixture below needs that waiver.
The unchanged raw `hasEquipment` helper still serves its other callers; this change
does not claim a repository-wide migration of every equipment check.

## Controlled selection comparison

Bundled the same source closure twice with esbuild: exact committed engine text
from `git show HEAD:app/src/lib/training/engine/index.ts`, and exact working engine
text. Compared every bundled source input with HEAD after CRLF normalization:
**only engine/index.ts differs** (23 source/data inputs). No environment file,
saved profile, session or personal data is an input.

Six deterministic public `buildSession` fixtures use the current committed
small-muscle and weekly-volume test inputs. The leg fixture is advanced, 50/50
muscle/strength, 75 minutes, with barbell, dumbbell(s), bench, rack, cable and leg
machines, and quadriceps/hamstrings frequency two. Pull uses the test's intermediate
51/47/2 muscle/strength/fat mix and barbell/dumbbells/bench/rack/cable/pull-up bar.
Upper uses the intermediate muscle-only weekly-volume fixture with
dumbbells/bench/floor/pull-up bar; tight variants supply the test's 2- and 5-set caps.

| Fixture / slot | HEAD | Preserved edit |
|---|---|---|
| Legs, plural dumbbells, trunk | dragon_flag, accessory / 3 | turkish_get_up, accessory / 3 |
| Legs, plural dumbbells, carry | farmer_walk, accessory / 3 | waiters_walk, accessory / 3 |
| Legs, singular dumbbell | No selection/set changes | Same six rows as plural after integration |
| Pull, carry | farmer_walk, accessory / 2 | waiters_walk, accessory / 2 |
| Upper, horizontal pull | rear_delt_flyes, accessory / 5 | one_arm_row, primary / 3 |
| Upper, total cap 2, second retained row | rear_delt_flyes, accessory / 1 | diamond_push_ups, isolation / 1 |
| Upper, total cap 5, second retained row | rear_delt_flyes, accessory / 2 | diamond_push_ups, isolation / 2 |

All other selected rows, their priorities and working-set counts are unchanged
within each fixture. Both leg variants retain front_squat/4,
romanian_deadlift/4, leg_extensions/4 and leg_curls/4. Upper totals change from
31 to 29 because a different selected exercise receives its existing prescription;
this edit changes no prescription rule. Tight-cap totals remain exactly 2 and 5.

For each fixture, compared old `hasEquipment` against shared eligibility across the
entire actual catalogue. Every differing decision is reproduced by normalizing
only equipment aliases. A stronger control loads a third copy of the **HEAD
engine**, normalizes only equipment tokens in its in-memory catalogue and supplied
equipment, and reproduces the edit's complete ID/intent/priority/set rows for **all
six fixtures**. Repository catalogue files are never modified. Thus every observed
selection change above is attributable to the R03 alias contract interacting with
unchanged scoring/allocation, not a new ranking or dosage policy.

The old diagnoses remain historical evidence, not current results:
[small-muscle diagnosis](small-muscle-diagnosis-20261019.md) and
[volume-cap diagnosis](volume-cap-diagnosis-20261019.md). HEAD already contains the
eligible-carry assertion correction and the session-total top-up repair. The
remaining priority isolation-cap interpretation is still pending; no expectation
or policy is changed here. These are observed test prescriptions, not new science
claims; existing policy provenance is [ROUTINE_AUDIT](../../ROUTINE_AUDIT.md).

## Validation

Focused command (from `app/`):

```text
npx vitest run src/lib/training/engine/engine.test.ts src/lib/training/__tests__/exerciseEligibility.test.ts src/lib/training/__tests__/smallMuscleVolume.test.ts src/lib/training/__tests__/weeklyProgrammeValidator.test.ts src/lib/training/__tests__/weeklyVolumeModel.test.ts --pool=forks --reporter=verbose
```

Result: **231 passed / 1 failed** across five files. Engine, shared eligibility,
small-muscle and weekly programme validator pass. The only failure is
`weeklyVolumeModel.test.ts`, `clamps a new session when a tighter cap is supplied`,
line 101: expected isolation sets <= 10, received 15. This is the explicitly
expected pending policy assertion. Frozen-session/custom-total-cap case passes.

`npm run typecheck`: exit 0. Git Bash `npm run audit:training-dual-paths`:
31 passed / 0 failed. `npm run med-catalog-qa`: 357 rows / 0 governance issues,
exit 0. `git diff --check` for engine, migration and resume notes: pass.

**Full-suite gate: INCOMPLETE.** No attempted full run produced a final summary;
the runner stalls/crashes are reported as new verification failures. Only the
expected isolation assertion was observed in completed cases, but unexecuted
cases cannot be claimed passing. The unchanged 30-second
test timeout applies throughout. Sandbox startup EPERM failures are not test
results; approved retries were used. The initial configured thread-focused run
stalled before any cases; the completed focused result above uses the fork pool.
Raw logs, the local probe and its machine output remain uncommitted.

Additional full-run recovery evidence: the configured mixed-tree thread run
stopped producing results after 47 test files and was interrupted. A fork-pool
full run crashed with `ERR_IPC_CHANNEL_CLOSED` after weekly-volume and mood tests;
a single-fork-worker retry stalled before cases and was interrupted. These are
new runner failures relative to the requested single expected assertion, not
passing runs and not evidence of an application regression.

A fresh `git archive HEAD app scripts docs AGENTS.md CONTEXT.md` snapshot, with
installed dependencies shared by junction and both preserved files overlaid,
reproduces the working-tree inputs without environment files. Compared **998
tracked app files** after newline normalization (excluding Supabase CLI temp
metadata): snapshot equals working tree; only A and B differ from HEAD. The full
fork run reproduces the same IPC crash in that snapshot. An unchanged configured
thread run in the snapshot was the final full-suite attempt: it stopped producing
results after the weekly-volume file and was interrupted. The canonical command
was `npm test -- --reporter=verbose`, with output redirected to a local file through
`cmd /c`; retry variations added only `--pool=forks` and `--maxWorkers=1`. No
test timeout, source, expectation, dependency or repository harness was changed.
This checkpoint does not claim a completed full suite or runtime acceptance.

## Migration B: publication blocked

Separate source review found the preserved migration edit is **not type-only**:
it also changes insert/update RLS policies for both run_sessions and run_routes.
The added checks require the authenticated user to own the linked training session
(or allow a null link) on run-session insert/update, and to own the parent run
session on route insert/update. Existing row-owner `USING` clauses, delete/select
policies, table/index creation and foreign-key delete actions remain unchanged.
These are additional security semantics, not implied by changing a column type.
Source inspection does not prove that those policies or the text column were
applied, nor that the complete preserved file equals the applied migration.
Review outcome: **BLOCKED for publication**, pending the required read-only applied
SQL comparison; no claim of live verification or SQL execution testing.

No connected read-only `list_migrations` tool is available; plugin discovery
confirmed Supabase is not connected. Applied SQL/live schema parity cannot be
established. B remains untouched and uncommitted under the user's stop condition.
No migration apply, re-apply, SQL execution or other live write was attempted.

**Additional publication dependency found:** committed `runSession.test.ts`
contains a source-text assertion requiring all three B changes: a text foreign-key
link, `ts.user_id = auth.uid()`, and `rs.user_id = auth.uid()`. `git show HEAD` of
the migration has none of those fragments and still has the UUID link. Thus
publishing A alone leaves that pre-existing committed migration assertion unmet,
in addition to the isolation policy assertion. A full working-tree result with B
overlaid cannot be described as the result of the A-only committed branch. This
newly identified dependency does not authorize publishing unverified migration
source or weakening the test. B's read-only verification remains the next step.
