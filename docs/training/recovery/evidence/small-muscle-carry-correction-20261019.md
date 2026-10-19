# Small-muscle carry assertion correction ? 2026-10-19

Scope: test-only correction on `fix/training-confident-ux`, based on HEAD
`0104668be96d4ee685c5e9d95c31a55f3573db48` and the local
[diagnosis](small-muscle-diagnosis-20261019.md). That pre-existing diagnosis is
context, not an artifact added by this publication.

## Correction

The advanced 50/50 leg-day case identifies the planned carry through its `carry`
intent, requires exactly one such item, checks the catalogue exercise also has
that intent, verifies shared `evaluateExerciseEligibility` for the actual fixture
and carry selection intent, and requires exactly three working `plannedSets`.
Warmup sets are separate. No carry ID or ranking is prescribed by the assertion.

One additional parameter row uses the existing singular `dumbbell` equipment
alias. The original plural fixture remains. This is sufficient to exercise both
valid carry choices against the same assertions without adding a selection policy.
The original knee, hinge, quad/hamstring isolation and per-exercise cap assertions
are preserved. The unchanged complete goal literal is shared between generation
and eligibility so the evaluator receives fully defined goal weights.

No production source, eligibility policy, ranking, catalogue, prescription,
scientific policy or unrelated test expectation was changed.

## Controlled final verification

A fresh `git archive HEAD app` was extracted outside the repository. Only installed
`node_modules` was shared through a junction. No mixed source, `.env`, saved data
or unrelated migration edit was copied into the archive. The final corrected test
was overlaid. The second state differs only by the exact preserved working-tree
`engine/index.ts` edit. The temporary archive is retained locally.

Final reviewed test Git blob: `df49290a0dcddb53d4f0cfdd05ff96dee4cd20fc`.
Engine blobs after Git line-ending normalization:

- HEAD: `63c360f29e87574dd481cef38b8c6cf5d3774184`.
- Preserved overlay: `901408f379e782596875f734f82430f6c6be32a2`.

Command from each isolated `app/`:

```text
node node_modules/vitest/vitest.mjs run src/lib/training/__tests__/smallMuscleVolume.test.ts --reporter=verbose
```

| State | Final result | Duration |
| --- | --- | --- |
| HEAD + corrected test | 5 passed, exit 0 | 13.58 s |
| HEAD + corrected test + preserved engine edit | 5 passed, exit 0 | 14.22 s |

Separate temporary observation tests copied the reviewed test and added only a
console observation after its three-set assertion. Each ran only the two advanced
leg-day rows: 2 passed / 3 skipped, exit 0 in both states. The probe was removed
from the archive after each run; it is not regression source being published.

| Equipment spelling | HEAD carry / sets | Overlay carry / sets |
| --- | --- | --- |
| `dumbbells` | `farmer_walk` / 3 | `waiters_walk` / 3 |
| `dumbbell` | `waiters_walk` / 3 | `waiters_walk` / 3 |

Final working-tree `npm run typecheck`: exit 0, zero errors.
`git diff --check` for the corrected test: exit 0.
The existing Vitest 30-second test budget was preserved throughout.

## Remaining failures and unsuccessful attempts

A focused working-tree run of `smallMuscleVolume.test.ts`,
`routineVolumeMeasurement.test.ts` and `weeklyVolumeModel.test.ts` returned
9 passed / 3 failed, exit 1, 10.78 s. It ran before the final shared-goal-literal
typing correction; the subsequent isolated runs and typecheck above verify the
final test source. The three remaining assertions are unchanged:

| Test | Failure |
| --- | --- |
| routineVolumeMeasurement: two-pass matrix | Expected 18 exercises, received 31 |
| weeklyVolumeModel: tighter cap | Expected at most 10 isolation sets, received 15 |
| weeklyVolumeModel: later capped build / frozen snapshot | Expected at most 2 total sets, received 6 |

The initial working-tree carry-only attempt exited 1 with a thread-runner startup
timeout, despite later emitting passing assertion lines; it is excluded from pass
evidence. The first typecheck found that `session.goals` has optional weights; the
shared complete fixture literal corrected this without a cast. All final evidence
above follows that correction. No full suite was repeated and no repository-wide
passing gate is claimed. The previously documented committed-baseline migration
failure was not rerun or changed by this narrow task.

## Separate source review and preservation

A separate agent context applied the local implementation-reviewer skill and
reviewed final blob `df49290a0dcddb53d4f0cfdd05ff96dee4cd20fc` against HEAD.
Verdict: **APPROVE ? no findings**. It confirmed carry identification, shared
eligibility, three working sets, minimal alias coverage, all other assertions
preserved and no production changes. This was a separate same-model source
review, not external-model review or approval of the preserved engine integration.

SHA-256 checks of every initially modified unrelated tracked file were unchanged
after execution, including the engine, migration and generated volume report.
Only the test and this sanitized evidence are intended for staging. Existing
untracked artifacts remain excluded. No Android, live-data write, EIF operation,
acceptance, deployment or R12 work was performed.

## Local raw-log fingerprints

Raw logs remain local and are not published. SHA-256:

- `head-focused-final.txt`: `e583e928a6571eefd07b3ecd9025dd350aaea7510b842bf1fd49fddbba9294ca`.
- `overlay-focused-final.txt`: `164a3109799b200a48b2f27de41935890254f9b92ea0643144dd656921aa9ae1`.
- `head-observation.txt`: `a5e8ee51fcdb6a4361c5dbcf26a221963be164869463131360c54e0b210414f8`.
- `overlay-observation.txt`: `ea231f1e8a10bfb63c0289e117d7af1f3afb41863cf6c4665f5106edf31d0def`.
- `typecheck-final`: `cd35ebdba9e12b61678eec835bf92424979bd88f78501689ba82b1dffbf391cc`.
