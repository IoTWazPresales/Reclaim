# Mixed-goal exposures, accessory dose and split preference — 2026-11-04 (N-0072)

Scope: weekly policy `weekly-20261104-v4` for **new builds only**. Saved v3 programmes are declared/validated with the v3 rules (hand-reviewed v3 R05 fixture still passes unchanged). Started/guided sessions, `performed.sets`, `applySetCompletion`, load formulas (`progression.ts`), notifications, Health Connect: untouched. No schema change, migration, live write or setup Save. Policy text and citations: [ROUTINE_AUDIT.md — Mixed-goal exposures and accessory dose](../../ROUTINE_AUDIT.md#mixed-goal-exposures-and-accessory-dose-2026-11-04).

## Package 1 — engine policy

| Item | Change |
| --- | --- |
| 1 Accessory dose | `exposureDose` uses `slot.priority` for sets/reps/rest (weekly compiler); legacy `buildBalancedProgramSession` uses `setsForSlot` + priority blend. Fly stays isolation. |
| 2 Stable blend | `normaliseGoalWeights` rounds shares to 0.05 before blending (0.5037/0.4963 → 0.50/0.50, heavy 3 → 4 sets). |
| 3 Exposures | Both goals ≥ 0.3: first own-load heavy exposure = strength (3–6, target 5, 180 s); repeat + no-own-load heavy variants = hypertrophy (6–12, target 8, 90 s). Declared per exposure (`exposureSetCounts`, `repRange`, `exposure`); targetSets = sum. Declared range reaches `suggestPrescription` and R05 progression checks. |
| 4 Ranking | Slot candidate order before baseline; listed lifts held by another requirement rank below unused listed lifts; off-list fills never outrank the list, never take a lift another requirement lists, lead with the owner muscle, then rank by movement role. |
| 5 Region line | Each exercise adds its sets once per distinct bucket. |
| 6 Preview copy | Codes/ids/source paths only with developer details (`__DEV__`); identical warnings once; all load confirmations → "Set starting weights for N exercises" + names. |

## Probe — operator profile (read-only SELECT of training_profiles; no writes)

Advanced, Mon–Fri, goals build_muscle 0.5037 / build_strength 0.4963, e1RM bench 122.5, OHP 105, squat 116.67, deadlift 128.33, barbell_row 87.5; saved equipment (no leg-curl / leg-extension machine). esbuild bundle of `buildFourWeekPlan` → `programmeWeekProposal` (week 1, baselines only, no history). `0kg` = weight confirmation required (no copied load).

### Before (HEAD 4e14245, policy v3)

```
Mon — Upper (Chest/Back) (16 sets, est 43 min)
  Barbell Bench Press          3x7       rest 135s  load 92.5kg  [bench primary]
  Dumbbell Flyes               2x12      rest  50s  load 0kg  [fly isolation]
  Barbell Row                  3x7       rest 135s  load 65kg  [row-heavy primary]
  Lat Pulldown                 2x12      rest  50s  load 0kg  [pulldown accessory]
  Lateral Raises               3x12      rest  50s  load 0kg  [lateral isolation]
  Barbell Curl                 3x12      rest  50s  load 25kg  [curl isolation]

Tue — Lower (Squat) (13 sets, est 45 min)
  Barbell Back Squat           3x7       rest 135s  load 85kg  [squat primary]
  Hack Squat                   2x12      rest  50s  load 0kg  [quadFollow accessory]
  Conventional Deadlift        3x7       rest 135s  load 95kg  [hingeHeavy primary]
  Romanian Deadlift            2x12      rest  50s  load 0kg  [hingeFollow accessory]
  Calf Raises                  3x12      rest  50s  load 0kg  [calf isolation]

Wed — Push (Chest/Shoulders) (17 sets, est 38 min)
  Barbell Bench Press          3x7       rest 135s  load 92.5kg  [bench primary]
  Cable Chest Flyes            2x12      rest  50s  load 0kg  [fly isolation]
  Overhead Press               3x7       rest 135s  load 80kg  [ohp primary]
  Lateral Raises               3x12      rest  50s  load 0kg  [lateral isolation]
  Tricep Pushdown              3x12      rest  50s  load 40kg  [pushdown isolation]
  Face Pulls                   3x12      rest  50s  load 0kg  [face isolation]

Thu — Pull (Back/Arms) (14 sets, est 35 min)
  Pull-ups                     3x7       rest 135s  load 0kg  [pullUp primary]
  Barbell Row                  2x12      rest  50s  load 57.5kg  [row-follow accessory]
  Dumbbell Curl                3x12      rest  50s  load 0kg  [curl isolation]
  Rear Delt Flyes              3x12      rest  50s  load 0kg  [face isolation]
  Shrugs                       3x12      rest  50s  load 0kg  [shrug isolation]

Fri — Lower (Deadlift) (16 sets, est 48 min)
  Conventional Deadlift        3x7       rest 135s  load 95kg  [deadlift primary]
  Romanian Deadlift            2x12      rest  50s  load 0kg  [hingeFollow accessory]
  Barbell Back Squat           3x7       rest 135s  load 85kg  [quadHeavy primary]
  Leg Press                    2x12      rest  50s  load 0kg  [quadFollow accessory]
  Calf Raises                  3x12      rest  50s  load 0kg  [calf isolation]
  Overhead Tricep Extension    3x12      rest  50s  load 0kg  [pushdown isolation]

Owner-muscle weekly sets: {"pectorals":10,"lats":10,"lateral_deltoids":6,"biceps":6,"quadriceps":10,"hamstrings":10,"calves":6,"anterior_deltoids":3,"triceps":6,"rear_deltoids":6,"traps":3}
Region line: Chest 10 · Back 40 · Shoulders 29 · Arms 26 · Legs 46
```

### After (policy v4)

```
Mon — Upper (Chest/Back) (19 sets, est 43 min)
  Barbell Bench Press          4x5       rest 180s  load 97.5kg  [bench strength primary]
  Dumbbell Flyes               2x12      rest  55s  load 0kg  [fly isolation]
  Barbell Row                  4x5       rest 180s  load 70kg  [row-heavy strength primary]
  Lat Pulldown                 3x9       rest  90s  load 0kg  [pulldown accessory]
  Lateral Raises               3x12      rest  55s  load 0kg  [lateral isolation]
  Barbell Curl                 3x12      rest  55s  load 25kg  [curl isolation]

Tue — Lower (Squat) (17 sets, est 45 min)
  Barbell Back Squat           4x5       rest 180s  load 90kg  [squat strength primary]
  Hack Squat                   3x9       rest  90s  load 0kg  [quadFollow accessory]
  Sumo Deadlift                4x8       rest  90s  load 0kg  [hingeHeavy hypertrophy primary]
  Romanian Deadlift            3x9       rest  90s  load 0kg  [hingeFollow accessory]
  Calf Raises                  3x12      rest  55s  load 0kg  [calf isolation]

Wed — Push (Chest/Shoulders) (19 sets, est 38 min)
  Barbell Bench Press          4x8       rest  90s  load 90kg  [bench hypertrophy primary]
  Cable Chest Flyes            2x12      rest  55s  load 0kg  [fly isolation]
  Overhead Press               4x5       rest 180s  load 85kg  [ohp strength primary]
  Lateral Raises               3x12      rest  55s  load 0kg  [lateral isolation]
  Tricep Pushdown              3x12      rest  55s  load 40kg  [pushdown isolation]
  Face Pulls                   3x12      rest  55s  load 0kg  [face isolation]

Thu — Pull (Back/Arms) (16 sets, est 35 min)
  Pull-ups                     4x5       rest 180s  load 0kg  [pullUp strength primary]
  T-Bar Row                    3x9       rest  90s  load 0kg  [row-follow accessory]
  Dumbbell Curl                3x12      rest  55s  load 0kg  [curl isolation]
  Rear Delt Flyes              3x12      rest  55s  load 0kg  [face isolation]
  Shrugs                       3x12      rest  55s  load 0kg  [shrug isolation]

Fri — Lower (Deadlift) (20 sets, est 48 min)
  Conventional Deadlift        4x5       rest 180s  load 100kg  [deadlift strength primary]
  Romanian Deadlift            3x9       rest  90s  load 0kg  [hingeFollow accessory]
  Leg Press                    4x8       rest  90s  load 0kg  [quadHeavy hypertrophy primary]
  Walking Lunges               3x9       rest  90s  load 0kg  [quadFollow accessory]
  Calf Raises                  3x12      rest  55s  load 0kg  [calf isolation]
  Overhead Tricep Extension    3x12      rest  55s  load 0kg  [pushdown isolation]

Owner-muscle weekly sets: {"pectorals":12,"lats":14,"lateral_deltoids":6,"biceps":6,"quadriceps":14,"hamstrings":14,"calves":6,"anterior_deltoids":4,"triceps":6,"rear_deltoids":6,"traps":3}
Region line: Chest 12 · Back 27 · Shoulders 28 · Arms 31 · Legs 34
(old per-tag rule on this same week: Chest 12 · Back 48 · Shoulders 32 · Arms 31 · Legs 66)
R05: unresolved (warnings only: load_requires_confirmation), 0 errors
```

### Loads vs expected (5 reps RPE 8 = reps + 2 in Epley, floored to the exercise increment)

| Lift | Expected | Actual | Note |
| --- | --- | --- | --- |
| Bench strength 4×5 | 97.5 | 97.5 | 122.5 / 1.2333 = 99.3 → 2.5 step |
| Bench hypertrophy 4×8 | 90 | 90 | 122.5 / 1.3333 = 91.9 |
| OHP 4×5 | 85 | 85 | 85.1 |
| Barbell row 4×5 | 70 | 70 | 70.9 |
| Squat 4×5 | 92.5 | **90** | 94.6; existing lower-body barbell increment is **5 kg** (`getExerciseIncrementKg`), unchanged by instruction |
| Deadlift 4×5 | 102.5 | **100** | 104.1; same 5 kg increment |

Allocation deviations: Tuesday heavy hinge is **Sumo Deadlift 4×8**, not RDL — the operator has no leg-curl machine, so RDL is the only eligible hinge follow-up and takes that slot; giving RDL to the heavy slot would leave the follow-up empty (infeasible). With a leg-curl machine the test shows RDL heavy + leg curl follow. Conventional deadlift ×1 (Fri), back squat ×1 (Tue), Thu row follow = T-Bar Row, Fri quad heavy = Leg Press (hack squat is held by Tuesday's quad follow-up).

## Gates (Package 1)

- `npm run typecheck`: 0 errors.
- Focused: weeklyExposurePolicy 61, weeklyProgrammeValidator 137, weeklyProgrammeAllocation 21, programmeAcceptance 42, defaultLoadUnits 21, SessionPreviewModal 15, muscleTaxonomy 7 — all pass.
- Full `npm test -- --reporter=verbose`: **1613 passed / 210 files**, exit 0.
- `audit:training-dual-paths` (Git bash; bundled ripgrep on PATH for the run): **31 passed, 0 failed**.
- `med-catalog-qa`: pass. Ledger wrapper pytest: 3 passed.

Deferred: session-only exercise replacement still uses priority × goal range (not the replaced exposure's declared range).
