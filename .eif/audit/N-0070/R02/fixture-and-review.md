# R02 setup contract fixture and review

Scope: [R02 brief](../../../../docs/training/recovery/tasks/R02-setup-contract.md), audit R5 / PA-04, N-0070 C1 only. N-0070 remains open for R06–R09 and runtime acceptance.

## Before and after fixture

Fixture: Strength, Monday/Wednesday/Friday, barbell/bench/rack, bench press 60 kg × 8 reps, Advanced, skill work enabled, twice weekly frequency. Accepted Epley estimate is `weight × (1 + reps / 30)`.

| Output | Before R02 (source behavior) | After R02 (focused test and shared adapter) |
|---|---|---|
| Preview bench estimated 1RM | 70 kg (hardcoded 5 reps) | 76 kg (entered 8 reps) |
| Confirmation bench estimated 1RM | 76 kg | 76 kg |
| Preview experience | Omitted | Advanced |
| Saved programme skill preference | Omitted | Enabled in `constraints.preferences` |
| Reopened profile lift entry | Reconstructed as 5 reps | Entered 60 kg × 8 reps preserved in `constraints.baselineInputs` |

The setup serializer also maps UI weekdays to planner weekdays, normalizes equipment/restrictions/goals, applies the existing frequency feasibility rule, and carries running/hybrid mode and distance fields. Time preference is stored on the profile but does not alter this plan; the screen labels that limit. Running distance does not prescribe pace or session duration; the final preview labels that limit.

`setupContract.test.ts` uses `prepareTrainingSetup`, the adapter called by both `preview/index.ts` and `TrainingSetupScreen.tsx`, for novice/advanced, 5/8/10-rep baselines, restrictions, one-day frequency fallback, running and hybrid. It compares the generated preview and confirmed proposal after excluding generated ID and timestamp. `preview.test.ts` no longer reconstructs the old, incomplete normalizer.

## Independent review

Read-only reviewer `/root/r02_review` inspected the final diff and reran focused preview/setup tests (23/23). The reviewer found and required fixes for final-step preview visibility, Skip baselines saving stale state, and Save retaining a stale callback draft. Final receipt: setup/preview/confirmation source parity approved, subject to repository gates; full suite and Android runtime were outside the review. No reviewer edits were made.

## Repository gates

Focused R02 checks: 31/31 passed. Typecheck: 0 errors. Dual-path audit: 31/31. Medication catalogue QA: 357 rows, 0 governance issues. EIF wrapper tests: 3 passed. Full mixed-worktree verbose suite: **6 failed, 1092 passed across 186 files**, exit 1; see local `full-vitest.txt`. Three failures (`routineVolumeMeasurement`, two `weeklyVolumeModel`) match the committed baseline in [R01 isolation](../../../../docs/eif/phase2-controls/R01-isolation.md). The other three (`balancedHypertrophy`, `smallMuscleVolume`, `wednesdayPushShape`) were already present in the pre-R02 Phase 2 worktree documented there and lie outside the R02 change set. The R02 preview-equivalence and experience-level failures from that earlier worktree now pass. The uncommitted migration removes the fourth isolated-baseline run-session assertion.

The exact staged R02 patch was applied to a detached checkout of `5f29215` at `C:\Reclaim-R02-verify`, with a junction to the existing `app/node_modules`. Its typecheck and focused R02 tests pass (31/31); its full verbose suite is **4 failed, 1089 passed across 185 files**, exit 1. The four are exactly the committed-baseline failures documented in R01 isolation: `routineVolumeMeasurement`, two `weeklyVolumeModel` cases, and `runSession` migration assertion. No new full-suite failure appears in the isolated R02 patch. Local output is `C:\Reclaim-R02-verify\R02-isolated-vitest.txt`. Allocator `allocation` forwarding in the mixed worktree's three preview/test files belongs to later Phase 2 work; it was preserved there and excluded from the R02 checkpoint. This is a scoped source checkpoint, not full-suite or EIF acceptance.

Android UI and saved-profile journey: UNABLE_TO_VERIFY locally, see `android-check.md`.
