# Weekly policy v5 — 2026-11-05 (N-0073)

Scope: `weekly-20261105-v5` for **new builds only**. Saved v2/v3/v4 programmes and started/guided sessions are unchanged. Policy text, constants and citations: [ROUTINE_AUDIT.md, Weekly policy v5 (2026-11-05)](../../ROUTINE_AUDIT.md). D-P2-01 amendment: [DECISIONS_PENDING.md](../../../eif/phase2-controls/DECISIONS_PENDING.md) (Warren-approved 2026-11-05).

## What changed (source)

| Item | Where |
| --- | --- |
| Version | `WEEKLY_POLICY_VERSION = 'weekly-20261105-v5'`; `V4_WEEKLY_POLICY_VERSION` frozen; `usesV5WeeklyPolicy()` (`weeklyProgrammeTypes.ts`). `buildFourWeekPlan(..., { policyVersion })` and `compileProgrammeWeek(..., policyVersion)` compile a frozen version on request (tests/probe). |
| v5 tables and constants | One section of `weeklyProgrammePolicy.ts`: `V5_SLOT_POLICIES`, `V5_BALANCED_WEEKLY_OBJECTIVES` (2–6), `V5_UPPER_LOWER_WEEKLY_OBJECTIVES`, `DEADLIFT_VARIANT_IDS`, `V5_SESSION_CAPS`, `V5_HYPERTROPHY_EXPOSURE_REST_SECONDS`, `V5_ORDER_TIERS`, `V5_DURATION_ESTIMATE`, core lists. v2–v4 tables untouched. |
| Hinge / variants (V5-1) | Explicit-only hinge lists; `compatible()` refuses deadlift variants outside `deadlift` (v5); R05 declaration carries `excludedExerciseIds` and the validator rejects `deadlift_variant_misplaced`. Empty follow-up folds into that day's heavy hinge (≤5) with warning `hinge_follow_folded`. |
| Caps (V5-2) | Compiler, `allocatedProgramSession` and R05 skip session minute/total budgets for v5; `capNewSession(..., ownerCaps)` applies only per-exercise ≤5 / per-owner ≤10. v2–v4 and the generic engine path unchanged. |
| Estimate (V5-5) | `sessionDurationEstimate.ts`; v5 `estimatedDurationMinutes` = `timeBudgetMinutes` = realistic estimate. UI: "about N min" (Session Preview, Training next-session card). |
| Roles/rest/order (V5-3/4/7) | Hypertrophy compound exposure 120 s; v5 slots sorted by `v5OrderTier` after matching; pull-ups strength only with an entered eligible `weighted_pull_ups`. |
| Core (V5-6) | `core-flexion` / `core-antirotation` requirements (owner `core`), explicit lists, placements per table. Taxonomy already maps core/rectus_abdominis to Core (RA-008): no change needed. |
| Two-day (V5-8) | New 2× full body for Auto and Full body; new Upper/Lower; `UPPER_LOWER_TWO_DAY_NOTE` updated. |
| Per side | `repsPerSide: true` on 17 catalogue rows: lunges, bulgarian_split_squat, dead_bug, one_arm_row, step_ups, reverse_lunges, single_leg_rdl, concentration_curl, pallof_press, suitcase_carry, waiters_walk, turkish_get_up, pistol_squat, cossack_squat, meadows_row, archer_pull_ups, landmine_press. `formatRepTarget` drives Session Preview / FullSessionPanel lines; guided `SetFocusCard` label "Reps per side". No id checks in UI; logged data unchanged. |
| Replacement | `prescribeReplacement` inherits planned reps, rep range (`prescriptionContext.repRange`) and rest for rep-based replacements; a replacement's own earned progression keeps its reps/load pair together. |

## Probe (product path: `buildFourWeekPlan` → `programmeWeekProposal`)

Operator profile read-only from `training_profiles` (SELECT only, 2026-11-05): advanced, strength, Mon–Fri, goals build_muscle 0.5037 / build_strength 0.4963, saved equipment (no leg-curl machine), e1RM bench 122.5, OHP 105, squat 116.67, deadlift 128.33, barbell_row 87.5. Fixture: `app/src/lib/training/__tests__/fixtures/operatorProfile.ts` (tests only). Full output: `.eif/audit/N-0073/probe/v5-week.txt` (re-run: `RECLAIM_PROBE_OUT=<file> npx vitest run src/lib/training/__tests__/weeklyPolicyProbe.test.ts`).

### 5-day (Mon–Fri) — about 60 / 49 / 59 / 43 / 56 min

```
Mon  Bench 4x5 @97.5 S 180s (3 warm-ups) · Barbell row 4x5 @70 S 180s · Lat pulldown 3x9 acc 90s · DB fly 2x12 · Lateral 3x12 · Barbell curl 3x12 @25 · Cable crunch 3x12   [22 sets]
Tue  Squat 4x5 @90 S 180s (3 warm-ups) · RDL 4x8 H 120s · Hack squat 3x9 · Single-leg RDL 3x9 per side · Calf 3x12   [17 sets]
Wed  OHP 4x5 @85 S 180s (3 warm-ups) · Bench 4x8 @90 H 120s · Cable fly 2x12 · Lateral 3x12 · Pushdown 3x12 @40 · Face pull 3x12 · Pallof 3x12 per side   [22 sets]
Thu  Pull-ups 4x8 bodyweight H 120s · T-bar row 3x9 · DB curl 3x12 · Rear-delt fly 3x12 · Shrugs 3x12 · Hanging leg raise 3x12   [19 sets]
Fri  Deadlift 4x5 @100 S 180s (3 warm-ups) · Leg press 4x8 H 120s · Hip thrust 3x9 · Lunges 3x9 per side · Calf 3x12 · OH triceps ext 3x12   [20 sets]
Owner sets: chest 12, lats 14, quads 14, hamstrings 14, core 9 (anterior delts 4, biceps 6, calves 6, lateral delts 6, rear delts 6, traps 3, triceps 6)
Region line: Chest 12 · Back 27 · Shoulders 28 · Arms 31 · Legs 37 · Core 9
R05: unresolved (warnings only: starting-weight confirmations, rack exception), 0 errors; compile feasible
```

### 5-day + leg_curl_machine — Mon/Wed/Thu identical; Tue 47 min, Fri 58 min

```
Tue  … RDL 4x8 H · Hack squat 3x9 · Leg curls 3x9 · Calf
Fri  … Leg press 4x8 H · Single-leg RDL 3x9 per side · Lunges 3x9 per side · …
Owner sets unchanged (chest 12, lats 14, quads 14, hamstrings 14, core 9)
```

### 2-day Full body (Mon, Thu) — identical to 2-day Auto — about 72 / 68 min

```
Mon  Squat 4x5 @90 S (3 warm-ups) · Bench 4x5 @97.5 S · Barbell row 4x5 @70 S · RDL 4x8 H 120s · Lateral 3x12 · Barbell curl 3x12 @25 · Cable crunch 3x12   [25 sets]
Thu  Deadlift 4x5 @100 S (3 warm-ups) · Bench 4x8 @90 H 120s · Hack squat 4x8 H 120s · Pull-ups 4x8 bodyweight H 120s · DB fly 2x12 · Pushdown 3x12 @40 · Pallof 3x12 per side   [24 sets]
Owner sets: chest 10, lats 8, quads 8, hamstrings 8, core 6; R05 0 errors
```

### 2-day Upper/Lower (Mon, Thu) — about 73 / 58 min

```
Upper  Bench 4x5 @97.5 S (3 warm-ups) · Barbell row 4x5 @70 S · OHP 4x5 @85 S · Pulldown 3x9 · DB fly 2x12 · Lateral 3x12 · Barbell curl 3x12 @25 · Cable crunch 3x12   [26 sets]
Lower  Squat 4x5 @90 S (3 warm-ups) · RDL 4x8 H 120s · Hack squat 3x9 · Single-leg RDL 3x9 per side · Calf 3x12 · Pallof 3x12 per side   [20 sets]
Owner sets: chest 6, lats 7, quads 7, hamstrings 7, core 6; no conventional deadlift; R05 0 errors
```

3-day (60 / 58 / 74 min) and 4-day (60 / 49 / 71 / 56 min) weeks compile feasible with 0 R05 errors; see the probe file.

## Deviations from the verification target (general rules, not special-cased)

1. **Leg-curl machine, Friday follow-up.** Target: leg curls in both follow-up slots. Actual: Tuesday leg curls, Friday single-leg RDL. Reason: the existing accessory-variety rule in `compileProgrammeWeek` (`reuse()` ranks a repeat of the same no-own-load requirement below unused listed candidates). Unchanged; a rule decision for review.
2. **Wednesday warm-ups move to OHP.** The order rule puts the OHP strength exposure first; the existing first-exercise warm-up rule gives it the ramp sets and the bench repeat has none.
3. **Core requirement naming.** Two requirements, `core-flexion` and `core-antirotation`, both owner `core`, because each placement uses a different explicit list. Weekly core sets: 9 (5-day).
4. **Upper/Lower core on both days.** Brief: two-day = one core slot per day, so `core` is the only owner trained twice in Upper/Lower.
5. **Pull-ups without load path for pure goals.** A bodyweight-led own-load lift with no entered added-load variant is a hypertrophy exposure for every goal mix (not only ≥ 0.3/0.3), so pure-strength users also get 8-rep pull-ups instead of a strength rep target with no load.
6. **Replacement with own progression.** Inherits reps/rest/range, except a replacement with its own earned progression decision keeps that decision's reps/load pair (inside the inherited range).
7. **`weighted_pull_ups` catalogue load mode is `bodyweight`.** With a weighted pull-up baseline the slot selects it with a strength role (tested), but the catalogue's load mode means no added load is displayed or validated as external. Catalogue correction is outside this node.
8. **Session estimates exceed 60 min** on several days (by design under V5-2), up to 74 min (3-day Wednesday).

## v4 frozen identity

- `frozenPolicyReplay.test.ts` (21 tests): fixtures captured at 804a1b5 before any change, operator fixture 2/3/4/5 days + 2-day Upper/Lower. v4 compile hash (`buildFourWeekPlan(..., { policyVersion: v4 })`) byte-identical for all five; v4/v3/v2 saved-programme replays (`programmeWeekProposal`) byte-identical after removing only the new display-only catalogue key `repsPerSide` from embedded catalogue rows (verified: without that key all 15 replay hashes match; 4- and 5-day weeks contain lunges).
- Probe on v4: `.eif/audit/N-0073/probe/v4-before.txt` vs `v4-after.txt` differ only in three "3x9" → "3x9/side" display markers on Walking Lunges; every exercise, set count, rep, rest, load, warm-up and role line is identical.

## Gates

- Typecheck (`npm run typecheck`): 0 errors.
- Full suite, canonical sequential shards (`npx vitest run --shard k/4 --reporter=verbose`): shard 1 405/54 files, shard 2 386/54, shard 3 565/53, shard 4 338 + 1 skipped/53 → **1,694 passed, 1 skipped (the env-gated probe), 0 failed, 214 files**. The first shard-2 attempt produced no output for 12 minutes after `moodOutbox` (known runner stall; an orphaned focused run from this session was also alive) and was stopped; shards 2-4 were re-run with the same command, all exit 0. Logs: `.eif/audit/N-0073/gates/`.
- Focused: `weeklyPolicyV5.test.ts` 43, `frozenPolicyReplay.test.ts` 21, training + components suites green.
- `npm run audit:training-dual-paths` (Git bash): **31 passed, 0 failed**. `rg` is not on PATH on this host; the run used Cursor's bundled ripgrep (`…/cursor/resources/app/node_modules/@vscode/ripgrep/bin/rg.exe`) prepended to PATH.
- `python -m pytest scripts/test_eif_node.py -q`: 3 passed.
- Updated tests (frozen v4 behaviour pinned explicitly, v5 expectations where new builds changed): weeklyExposurePolicy, splitPreference, weeklyProgrammeValidator (public integration pinned to v4), weeklyProgrammeAllocation, programmeAcceptance (R10 oracle gains a hand-authored `balancedHalfMuscleHalfStrengthV5` section in `R10-requirements.json`), exerciseSubstitution (replacements now inherit planned reps/rest).

## Friend's beta account

Read-only: the two non-operator `training_profiles` rows (only first 8 id characters read) both have `trainingMode = strength`. Whichever is the friend's, the mode is strength, so the Upper/Lower option is offered on 2 and 4 days.
