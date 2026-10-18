# Incomplete history validation correction — 2026-10-18

Scoped correction to `weeklyProgrammeValidator.ts`; no planner, engine, adapter,
scientific policy, saved/guided session, live row, EIF acceptance or R12 changes.
The pre-existing engine edit and all other unrelated work are preserved.

The validator now checks canonical history structure before classifying it.
Qualified load anchors must pass the existing R06 qualification function as well
as strict identity, plan, numeric and timestamp checks. Structurally sound
incomplete/unsupported entries retain explicit, consistent rejection reasons and
never count as load anchors. Empty performed sets are permitted only in that
rejected category. Missing/contradictory metadata and malformed evidence still
emit `invalid_load_evidence`, even when a baseline exists. A positive no-inference
load requires an own baseline or qualified performance. Baseline ceilings,
eligibility, weekly objectives and load-confirmation warnings are unchanged.

When a recent map is supplied, its first entry must agree with last history on
the contract's identity, date, sets and qualification fields. A newer incomplete
entry cannot expose an older qualified load through an inconsistent last map.
No older entry is searched. Last-only qualified history remains compatible when
the recent map is absent.

The prior validator test that permitted bare numeric history with positive
unanchored load was updated to require rejection; this is the changed contract,
not one of the four established full-suite failures. Those four tests and their
expectations remain untouched.

## Exact captured case

The offline replay verifies all original private-artifact hashes before use.
It executes the captured bundle's 3,619 Metro definitions and exactly reproduces
the original plan and every returned field of all four weeks. For the corrected
replay, only the validator factory is replaced with transpiled corrected source.
Its dependencies still resolve to captured executed factories. A transparent
function wrapper observes calls/results; it changes no validation argument or
return. Captured creation-clock values are replayed in both runs. The full
94-source manifest is checked: 93 unchanged source matches, with only the validator
intentionally changed. The retained engine source fingerprint remains
`3ba8cb793eb9da34a5d21ac14fd4ed65e5117776eb63adc76e72496cdf82dc48`.

| Result (each of weeks 1–4) | Before | After |
| --- | --- | --- |
| Weekly status | invalid | unresolved |
| Hard errors | 1: `leg_press: invalid_load_evidence` | 0 |
| Weekly warning occurrences | 25 | 20 |
| Daily proposal statuses | 5 infeasible | 5 feasible |
| Generated plan, prescriptions, declarations and coverage | captured baseline | identical |
| Canonical last/recent history | captured baseline | identical |

Daily feasibility is the existing projection's observed result after removing
the weekly hard error; it was not imposed as an acceptance target. No claim is
made that the retained installed app has loaded the correction or that any
programme was saved. Weekly status remains unresolved, never valid.

Every remaining warning is listed below; counts are **per week** and identical
across all four weeks:

| Warning | Exercise | Occurrences |
| --- | --- | --- |
| `load_requires_confirmation` | dumbbell_flyes | 1 |
| `load_requires_confirmation` | lat_pulldown | 1 |
| `load_requires_confirmation` | hack_squat | 1 |
| `load_requires_confirmation` | romanian_deadlift | 2 |
| `load_requires_confirmation` | calf_raises | 6 |
| `load_requires_confirmation` | cable_chest_flyes | 1 |
| `load_requires_confirmation` | face_pulls | 3 |
| `load_requires_confirmation` | rear_delt_flyes | 3 |
| `load_requires_confirmation` | leg_press | 1 |
| `history_evidence_unverified` | leg_press | 1 |

Six old `history_evidence_unverified` warnings per week (five exercises,
including two lateral-raise exposures) disappear because those entries actually
pass R06 qualification. A truthful leg-press barrier warning is added instead.
All 19 load-confirmation occurrences remain unchanged.

Negative controls on the same captured four-week input: falsely qualified empty
work, mismatched exercise identity, missing qualification metadata and malformed
numeric values each remain invalid in all four weeks with leg-press
`invalid_load_evidence`. A positive external load substituted into the legitimate
incomplete leg-press prescription remains invalid with `unanchored_external_load`
and no malformed-history error. No history is deleted or rewritten.

Raw profiles, identities, dates, measurements, original rows, loaded bundle and
full replay outputs remain outside the repository under the original
`LOCALAPPDATA/ReclaimDiagnostics/programme-exact-20261018` directory. The checked-in
[replay receipt](incomplete-history-replay-20261018.json) contains only source
fingerprints, statuses, issue categories/exercise IDs and aggregate counts.
[Replay script](replay-incomplete-history.cjs) is network-free and requires those
local artifacts; it publishes no raw personal data.

## Review and remaining gates

The [independent review](incomplete-history-review-20261018.md) approves the exact
corrected validator/test fingerprints after 55 separate synthetic assertions,
repeated against an isolated HEAD archive with only the two corrected files.
The reviewer found weak qualified identity/timestamp screening, rejection of
duplicate-item barriers and a last/recent-map inconsistency bypass, withheld
approval on each affected candidate, and independently confirmed the fixes. The
author's sparse-array finding was also independently verified. Earlier reviews
and fingerprints remain explicitly superseded in the review receipt. No reviewer
authored application changes.

The four established committed-baseline assertions are reported independently:

| Test | Established failure |
| --- | --- |
| `routineVolumeMeasurement.test.ts` — two-pass goals/days/equipment/frequency measurement | expected 18 exercises, received 31 |
| `weeklyVolumeModel.test.ts` — tighter supplied cap | expected ≤10, received 15 |
| `weeklyVolumeModel.test.ts` — later build cap with frozen started snapshot | expected ≤2, received 6 |
| `runSession.test.ts` — route-migration text session link | required text/FK declaration absent from committed migration |

The working tree separately contains the pre-existing engine eligibility edit
and route-migration edit. Its small-muscle test (`a 50/50 advanced leg day does
not put 8 working sets on one lift`) fails expecting 3 but receiving undefined;
that test directly imports `buildSession` from the engine and never invokes the
weekly validator. Conversely its route-migration assertion passes. This mixed
working-tree outcome must not be described as the same four baseline identities.
Those unrelated files and all these expectations are preserved.

Final focused tests: **156/156**. Independent root/isolated review: **55/55** each.
Both final typechecks pass; Git Bash source audit **31/31**, catalogue **357 rows /
0 governance issues**, wrapper **3/3**, and exact replay pass.

The final normal working-tree full suite completed: **200 files, 1,429 passed /
4 failed**, with the mixed-tree identities described above. The latest isolated
final-source full attempt stalled after **64 files with outcomes, 663 passed /
the four established failures**; its owned runner was stopped after over four
minutes without output. That isolated full-suite gate is **INCOMPLETE**, not
passed. Earlier-candidate supplementary coverage reached all 200 files and only
the four established failures; its separate fingerprints and results are retained
as historical evidence, not represented as final-source full-suite completion.
No expectation in the four baseline failures or the unrelated engine test was
rewritten.

Commands, log hashes and source/index fingerprints are recorded in the
[checks receipt](incomplete-history-checks-20261018.json). Android presentation/start/save and persistence of a newly built
programme remain unverified; saved/guided prescriptions were never changed.
The four established full-suite assertions remain a separate gate. Source
correction/replay does not resolve pending scientific policy or grant EIF/node
acceptance. No approval queue or node state is advanced by this task.
