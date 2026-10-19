# Incomplete-history correction revalidation — 2026-10-19

The requested correction already exists in pushed commit
`2480d09d4c19712ee87a0c1312c05e6a326be2aa`. Current validator and tests match that
commit after CRLF normalization. This session changes no application code or
test expectations. Checked on `fix/training-confident-ux` at parent
`3a756a9bb698c6592f63dfa496b794df16597d0b`; remote ancestry verified.

## Exact captured four-week reproduction

Re-executed the committed `replay-incomplete-history.cjs` offline. A separate
workspace outside the repository was reconstructed from all 94 captured source-map
entries, each verified against its original SHA256. Only the validator source was
replaced with the current correction. Actual execution uses the captured bundle's
3,619 Metro factories and the corrected validator; all private-artifact hashes,
canonical history, clock-controlled baseline outputs and source fingerprints pass.
The first attempt against an older archive correctly failed its catalogue byte
fingerprint (line endings); no assertion was relaxed. Reconstruction resolved it.

Fresh sanitized replay receipt is byte-identical to the committed
`incomplete-history-replay-20261018.json`, SHA256
`912d62bd47835468205b7ef51c06bd3fabef3c1f73282dc6894c31d48e6e6a19`.
Raw personal inputs and complete outputs remain outside the repository.

| Per week, all four weeks | Before | After |
| --- | --- | --- |
| Weekly status | invalid | unresolved |
| Hard errors | leg_press: invalid_load_evidence | none |
| Warning occurrences | 25 | 20 |
| Daily proposal feasibility | five infeasible | five feasible |

Observed feasibility is the existing projection's result, not an imposed target
or proof of runtime Start/save behavior. Plans, generated prescriptions,
declarations, coverage and history remain identical. Five negative controls
still fail in all four weeks: falsely qualified empty work, exercise mismatch,
missing metadata and malformed numeric values retain `invalid_load_evidence`;
positive unanchored load retains `unanchored_external_load`.

Every remaining warning, identical per week:

| Warning | Exercise | Count |
| --- | --- | --- |
| load_requires_confirmation | dumbbell_flyes | 1 |
| load_requires_confirmation | lat_pulldown | 1 |
| load_requires_confirmation | hack_squat | 1 |
| load_requires_confirmation | romanian_deadlift | 2 |
| load_requires_confirmation | calf_raises | 6 |
| load_requires_confirmation | cable_chest_flyes | 1 |
| load_requires_confirmation | face_pulls | 3 |
| load_requires_confirmation | rear_delt_flyes | 3 |
| load_requires_confirmation | leg_press | 1 |
| history_evidence_unverified | leg_press | 1 |

## Independent review

Fresh separate reviewer `/root/history_review` approves the scoped correction;
no material bypass or regression found. Reviewer independently ran validator and
performance-history suites: 156/156 pass. Twelve fresh Node/esbuild adversarial
probes all fail closed with invalid history and unanchored external load:
null history, non-string date, string weight, boolean reps, infinite plan count,
negative set index, fractional planned index, unknown status, non-array reasons,
duplicate reasons, unknown empty rejection reason and false completion metadata.
Probe source SHA256:
`527986d5cc971a36d1a9edec0c986ae1dad08055d49b26c03b0e43c338771d77`.

Reviewed committed SHA256 (current bytes differ only by CRLF):

- Validator: `44385538752ee04875656bf4e50deaa1f72354ae1d20ecca2ffc7b707bf67984`.
- Tests: `2227bf5deb8a65f2966f49250bab55e72ab2c7cc8eb1ef19dc10c7dc9f095b36`.

The original 55-case independent review and 156 focused regressions remain in
`incomplete-history-review-20261018.md` and the committed validator tests.
Review confirms incomplete recent work cannot establish load, progress, deload
or expose older qualified performance. Existing ceilings, eligibility, objectives,
load confirmation and genuine error handling remain intact.

## Harness and remaining gates

Fresh primary focused validator/performance tests: 156/156 pass. Typecheck:
zero errors. Git Bash dual-path audit: 31/31 pass. Medication catalogue:
357 rows, zero governance issues (CLI test passes). Wrapper: 3/3 pass.

The four established committed-baseline failures remain separately documented:

| Test | Established assertion failure |
| --- | --- |
| routineVolumeMeasurement.test.ts | expected 18 exercises, received 31 |
| weeklyVolumeModel.test.ts — supplied cap | expected at most 10, received 15 |
| weeklyVolumeModel.test.ts — frozen started snapshot | expected at most 2, received 6 |
| runSession.test.ts — migration text session link | committed migration lacks required declaration |

Fresh full suite (`npm test -- --reporter=verbose`): **1,449 passed / 4 failed**,
202 files (199 passed / 3 failed), exit 1, 498.81 seconds. Its
pre-existing migration edit makes the route assertion pass; its separate engine
edit instead fails `smallMuscleVolume.test.ts` (advanced 50/50 leg day: expected
3, received undefined). Neither edit nor any established expectation is changed.

Android loaded-source, new-build Start/save and persistence remain unverified.
The full-suite gate, unresolved warnings and pending policy decisions remain
separate. No live-data writes, historical rewrites, saved/guided session changes,
scientific-policy changes, EIF mutation/acceptance or R12. Stop after revalidation.

Fresh full-suite failures are exactly `routineVolumeMeasurement.test.ts`, the
two listed `weeklyVolumeModel.test.ts` assertions and the pre-existing
`smallMuscleVolume.test.ts` assertion. No new failure identity; gate remains failing.
This session did not repeat an isolated full suite; its historical incomplete
runner gate remains explicitly documented in the original correction evidence.

Local log SHA256 (logs remain untracked):

- focused: `f0cad32fe843a4606dae46cc298ab2fe89c8eb62dbfc26ec3e984a6970a507f1`.
- types: `cd35ebdba9e12b61678eec835bf92424979bd88f78501689ba82b1dffbf391cc`.
- catalogue: `bc07f328df6f104c05336d033e061d59ae7ce0631505a4a0733ffdd5f09a3ec1`.
- full: `c5dc1f0bcd0924e99e7f8040cff34daffdc8b8f1526ee209dc8f14bdf86b0b77`.
