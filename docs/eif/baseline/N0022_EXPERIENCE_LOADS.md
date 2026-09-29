# N-0022 — experience level and per-exercise Epley ceilings

Status: source-validated. Visible setup chips were captured on emulator-5554 and are awaiting approval. This node does not make the routine scientifically correct. Weeks 1–4 are still copies, there is still no weekly set budget, accessories can still occupy compound slots, and progression history still covers 18 lifts. `docs/training/ROUTINE_AUDIT.md` stays the audit of that generator. N-0011, N-0023, and N-0024 own the remaining routine changes.

Executor: Grok 4.7.

## Column mapping

No new SQL column and no live migration.

| Store | Field | Before a new build | After a new build |
|---|---|---|---|
| `training_profiles.constraints` | JSON `experienceLevel` | not written by setup | `beginner`, `intermediate`, or `advanced` on save |
| `training_programs.profile_snapshot` | JSON `experienceLevel` | optional; a missing value was treated as `intermediate` inside the engine | `resolveExperienceLevel`: a stored level is kept; missing or unknown becomes `beginner` |
| suggested load | existing planned-set weight | history `nextWeight` was not capped by that exercise's 1RM | when `estimated1RM[exercise.id]` is a positive number and the exercise is not bodyweight, the suggested weight is `min(weight, Epley working ceiling)` |
| started or guided session | `training_session_items.performed.sets` | frozen by N-0021 | unchanged |

The Epley working ceiling for one exercise is `round(oneRM / (1 + plannedReps / 30) / step) * step`, using that exercise's own increment. Bodyweight stays 0. An exercise with no 1RM is not capped, so intent-table defaults stay as they were. Capping history at a stale setup 1RM can hold a later load at that baseline. That ceiling is the accepted behaviour for this node.

A program that already exists keeps its stored snapshot until the person saves setup again. A new session build that reads a snapshot without `experienceLevel` now resolves beginner. A session that has already started keeps the planned sets written at start.

## Setup

Constraints step shows Beginner, Intermediate, and Advanced. Copy: "Training experience sets starting loads. Beginner is used until you choose otherwise." The running profile had no stored level, so the screen opened with Beginner selected. Intermediate was selected on screen and Exit was used, so that choice was not saved and the existing program was not rewritten.

Renders: `.eif/audit/N-0022/constraints.png` (Beginner selected) and `.eif/audit/N-0022/experience-intermediate.png` (Intermediate selected, then Exit).

## Remeasure

`docs/training/ROUTINE_VOLUME_BASELINE.md` was regenerated because the harness does not set `experienceLevel`, so omitted experience is now beginner (`maxExercises` 6 rather than the old implicit intermediate 8). Headline movement on the same 100 scenarios:

| Claim | N-0021 | N-0022 |
|---|---|---|
| Weeks 1–4 identical | 100/100 | 100/100 |
| History seed ids | 18 | 18 |
| Share of weekly sets in that seed | 35.7% | 37.7% |
| Accessory in a required compound slot | 50/100 | 50/100 |
| Estimated duration over 60 min | 28/100 | 0/100 |

The duration drop is the shorter beginner session, not a new time model. The golden history test that needs a squat now sets `experienceLevel: 'intermediate'` so it still tests history, not the new default.

## Proof

- Focused: `experienceLevelLoads.test.ts` 4/4, golden quality, and the volume harness.
- `npm run typecheck`: 0 errors.
- Git Bash dual-path audit: 29/29.
- Catalogue QA: 357 rows, 0 governance issues.
- Default full Vitest: 159 files, 993 passed / 994 tests, 266.66s. The one failure was a 5-second timeout in `smallModuleMirrors.read` (`dedupes duplicate local_id rows`). That default run is not a pass. It is N-0052.
- Full retry, default pool, `--testTimeout=30000`: 159 files / 994 tests PASS in 178.77s.
