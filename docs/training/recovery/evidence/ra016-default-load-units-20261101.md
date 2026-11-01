# RA-016: defaults must have the exercise's load unit ? 2026-11-01

Source baseline: `6403453` on `fix/training-confident-ux` (product source identical to `0cecd15`). This scoped correction follows the [operator finding](../../../../.eif/audit/N-0070/android-20261101/operator-accepted-result.md) and the [9 October load-unit decisions](../../ROUTINE_AUDIT.md). A different unit never copies a barbell kilogram. No new load values, conversion ratios, catalogue metadata or scientific recommendations were introduced.

## Result and boundaries

New builds retain the existing total-bar experience defaults, the existing cable-stack defaults and the explicit per-hand carry default. Other units require own evidence or confirmation. An undefined source emits `load_requires_confirmation` and `loadRequiresConfirmation`; the existing internal zero sentinel is not displayed as a prescribed kilogram. Genuine bodyweight zero and qualified own zero-added-load history remain valid. No migration is needed: the optional marker travels in existing planned-set JSON.

No started, guided, frozen or historical session is rebuilt. Old unmarked prescriptions retain their numbers and presentation. Session completion still uses the canonical authority and `applySetCompletion`. An unknown-load notification Done consumes its response key and opens the app without recording a set, preventing replay against later work.

## Default and population path inventory

Paths are relative to `app/src/lib/training/` unless stated otherwise.

| Path | Source unit and behavior |
| --- | --- |
| `engine/index.ts`: `suggestLoading`, experience table | `freeWeight` is total-bar kg; machine population source is cable-stack kg (existing lat-pulldown/cable-row source). Guard checks own `loadDisplayMode` before anchor inference. Per-dumbbell, machine-total, per-hand and unspecified modes cannot inherit either table. |
| `suggestLoading`: own history and baseline | Qualified history must match the same exercise's unit; own entered baseline uses that exercise's declared unit. These take precedence and remain supported. They are not population defaults. |
| `suggestLoading`: carry | Existing `NOVICE_CARRY_KG_PER_HAND` applies only to `per_hand`. Carries whose metadata does not define that unit require confirmation. |
| `suggestLoading`: thruster blend | Existing coefficients unchanged; blend inherits its population source unit and passes the same guard. No DB conversion is invented. |
| `suggestLoading`: generic missing-intent fallback | No defined starting-load source: confirmation, rather than promoting a minimum into a default. Bodyweight remains zero. |
| `progression.ts`: `getMinimumWeight` | Existing floors only for matching total-bar/barbell, per-dumbbell/dumbbells and cable-stack/machine modes. Other modes have no positive generic floor. Floors are not evidence for starting prescriptions. |
| `anchorLoad.ts`: family anchor | Existing total-bar inference stays within total-bar. No barbell anchor supplies another unit. Existing cited same-unit coefficient unchanged. |
| `engine/index.ts`: generic primary, optional and small-muscle assistant rows | Every load comes through `suggestLoading`; no separate small-muscle starting-load constant. New output annotated once. |
| `balancedHypertrophy.ts`: standard/follow-up and small-muscle rows | Uses supplied shared `suggestLoading`; existing own-evidence logic preserved. New output annotated, including isolated follow-ups without own calibration. |
| `allocatedProgramSession.ts` / allocated engine path | Shared loading resolver for allocated exercises; new output annotated. Single programme writer and `buildProgramDaySession` boundary retained. |
| `exerciseSubstitution.ts` | Only replacement exercise's own qualified evidence is eligible. No old weight transfers between units; unknown replacement sets carry confirmation. |
| `preview/index.ts`, `loadDisplayFormat.ts` | Shared marker suppresses the number, including carry/time displays and example summaries. Preview does not independently populate loads. |
| `api.ts`, started session / work-chain | Planned JSON preserves marker through save/start. Work-chain propagates it only while effective load is unknown; a positive saved adjustment clears transient confirmation without rewriting the frozen plan. No default recomputation on read. |
| Focus, rest, overlay, edit dialog and guided notification | New unknown sets show Choose a weight / weight confirmation required. Unconfirmed Done/Log is blocked. Existing unmarked frozen sets retain display. Carry hint cannot claim unknown load is bodyweight. |

## Whole catalogue comparison

Reproducible comparator: `scripts/audit_training_default_units.cjs BASELINE_ROOT OUTPUT_JSON [PRIVATE_HISTORY]`. Baseline is a read-only `git archive 6403453 app/src/lib/training` extraction. All **137 exercises**, all three experience levels, empty own baselines/history, target seven reps. This enumerates raw default paths; it does not claim every exercise is selected in an allocated programme. Full before/after display strings and unchanged rows are in [catalogue-defaults.json](../../../../.eif/audit/N-0070/ra016-20261101/catalogue-defaults.json).

**35 exercises change numeric default to confirmation**, grouped by own unit below. Values are old beginner/intermediate/advanced kg in that unit's display; none is a recommendation. New default is no displayed number for every row.

| Unit | Exercise | Old B / I / A kg | New |
| --- | --- | --- | --- |
| per_dumbbell | Dumbbell Bench Press (`dumbbell_bench_press`) | 20 / 60 / 100 | Confirmation |
| per_dumbbell | Dumbbell Shoulder Press (`dumbbell_shoulder_press`) | 15 / 40 / 70 | Confirmation |
| per_dumbbell | Romanian Deadlift (`romanian_deadlift`) | 40 / 100 / 180 | Confirmation |
| per_dumbbell | Dumbbell Curl (`dumbbell_curl`) | 8 / 15 / 25 | Confirmation |
| per_dumbbell | Dumbbell Flyes (`dumbbell_flyes`) | 8 / 12 / 16 | Confirmation |
| per_dumbbell | Lateral Raises (`lateral_raises`) | 8 / 12 / 16 | Confirmation |
| machine_total | Leg Curls (`leg_curls`) | 8 / 12 / 16 | Confirmation |
| per_dumbbell | Walking Lunges (`lunges`) | 30 / 80 / 140 | Confirmation |
| per_dumbbell | Bulgarian Split Squat (`bulgarian_split_squat`) | 30 / 80 / 140 | Confirmation |
| per_dumbbell | Overhead Tricep Extension (`overhead_tricep_extension`) | 15 / 25 / 40 | Confirmation |
| per_dumbbell | Hammer Curl (`hammer_curl`) | 8 / 15 / 25 | Confirmation |
| unspecified | Kettlebell Swing (`kettlebell_swing`) | 40 / 100 / 180 | Confirmation |
| per_dumbbell | Arnold Press (`arnold_press`) | 15 / 40 / 70 | Confirmation |
| per_dumbbell | Front Raises (`front_raises`) | 15 / 40 / 70 | Confirmation |
| per_dumbbell | Rear Delt Flyes (`rear_delt_flyes`) | 8 / 12 / 16 | Confirmation |
| total_bar | T-Bar Row (`t_bar_row`) | 25 / 45 / 75 | Confirmation |
| per_dumbbell | Chest Supported Row (`chest_supported_row`) | 20 / 50 / 90 | Confirmation |
| per_dumbbell | One-Arm Row (`one_arm_row`) | 20 / 50 / 90 | Confirmation |
| per_dumbbell | Goblet Squat (`goblet_squat`) | 30 / 80 / 140 | Confirmation |
| machine_total | Leg Extensions (`leg_extensions`) | 8 / 12 / 16 | Confirmation |
| per_dumbbell | Step-ups (`step_ups`) | 30 / 80 / 140 | Confirmation |
| per_dumbbell | Reverse Lunges (`reverse_lunges`) | 30 / 80 / 140 | Confirmation |
| unspecified | Trap Bar Deadlift (`trap_bar_deadlift`) | 40 / 100 / 180 | Confirmation |
| per_dumbbell | Single Leg Romanian Deadlift (`single_leg_rdl`) | 40 / 100 / 180 | Confirmation |
| per_dumbbell | Skull Crushers (`skull_crushers`) | 20 / 20 / 35 | Confirmation |
| per_dumbbell | Concentration Curl (`concentration_curl`) | 8 / 15 / 25 | Confirmation |
| per_dumbbell | Turkish Get-up (`turkish_get_up`) | 15 / 40 / 70 | Confirmation |
| per_dumbbell | Clean and Press (`clean_and_press`) | 40 / 100 / 180 | Confirmation |
| per_dumbbell | Calf Raises (`calf_raises`) | 8 / 12 / 16 | Confirmation |
| machine_total | Seated Calf Raise (`seated_calf_raise`) | 8 / 12 / 16 | Confirmation |
| per_dumbbell | Shrugs (`shrugs`) | 20 / 20 / 20 | Confirmation |
| per_dumbbell | Upright Row (`upright_row`) | 20 / 40 / 70 | Confirmation |
| total_bar | Chest Supported T-Bar Row (`chest_supported_t_bar_row`) | 25 / 45 / 75 | Confirmation |
| bodyweight | Sandbag Carry (`sandbag_carry`) | 15 / 15 / 15 | Confirmation |
| bodyweight | Yoke Walk (`yoke_walk`) | 15 / 15 / 15 | Confirmation |

Totals: per-dumbbell 26; machine-total 3; total-bar 2; unspecified 2; bodyweight-classified carries 2. The two total-bar rows previously took stack defaults; unit matching removes those too. Sandbag Carry and Yoke Walk have ambiguous existing bodyweight metadata and carry prescriptions: they cannot inherit per-hand carry kilograms. Metadata was not reclassified.

Two additional display-only changes: assisted pull-ups (`assisted_pull_ups`) and assisted dips (`dips_assisted`) now explicitly require confirmation for their unknown zero instead of presenting it as an assistance prescription. Valid existing stack/barbell defaults and explicit per-hand carries remain unchanged.

## Read-only operator history

A bounded, owner-filtered PostgREST GET read scanned **23 item rows across 3 sessions**. No insert, update, deletion or historical recomputation was performed. CLI project-key listing was read-only; credentials stayed in memory. Raw personal rows remain outside the repository in the local diagnostics directory; this receipt excludes user/session/row identifiers.

Seven per-dumbbell rows numerically match old affected population defaults:

| Exercise | Stored planned kg | Stored performed kg | Old matching level |
| --- | --- | --- | --- |
| shrugs | 20 | 20 | beginner, intermediate, advanced |
| lateral_raises | 12 | 12 | intermediate |
| dumbbell_curl | 15 | 15 | intermediate |
| bulgarian_split_squat | 80 | No performed sets | intermediate |
| dumbbell_shoulder_press | 70 | 70 | advanced |
| front_raises | 70 | 70 | advanced |
| lateral_raises | 16 | 16 | advanced |

**Origin is inconclusive.** None records an explicit default-source trace. A numerical match cannot prove that a stored per-dumbbell load came from a barbell default; nor can this read prove absence of past contamination. Planned and performed values are reported separately. History remains unchanged.

## Validation and review

Final gate: **1519/1519 tests, 207/207 files passed**, unsharded (`npm test -- --reporter=verbose`, 425.01 seconds, exit 0). Typecheck exit 0; Git Bash dual-path **31/31**; medication catalogue **357 rows / 0 governance issues**; wrapper **3/3**. Focused pre-follow-up **231/231 across 10 files**; final focused **82/82 across 8 files**; independent final focused **31/31 across 3 files**. Final source gate passed after the copy/carry-hint correction. [Machine-readable gate receipt and local log hashes](../../../../.eif/audit/N-0070/ra016-20261101/gate-results.json). Initial full-suite attempts were not passes: first 1510 pass/4 fail (old lateral-load expectation plus three intentionally changed load snapshots); second 1517 pass/1 fail (an existing explanation-copy assertion). Expectations now reflect unit confirmation; explanation retains the established phrase ?choose a load?. No test was excluded or timeout shortened.

Snapshot comparison independently checks three snapshots, 24 exercise entries and 86 working sets: identities/order/priorities/counts/reps/rest are unchanged; 56 invalid cross-unit working loads become confirmation, and three warmup sequences derived from those invalid loads disappear. [Snapshot receipt](../../../../.eif/audit/N-0070/ra016-20261101/snapshot-check.json).

Separate source review, including resolved findings and final source fingerprint: [review receipt](ra016-source-review-20261101.md). Source/component renders are automated tests, not Android visual acceptance.

No Android commands, live writes, migrations, EAS changes or EIF acceptance occurred. Android renders are **UNABLE_TO_VERIFY** because the operator excluded Android; no Android capture methods were attempted. Visible changes and deferred verification are recorded in AWAITING_APPROVAL and HUMAN_CHECKS. The earlier OTA-enabled/missing-channel release finding remains unchanged.

The full routine-volume test regenerates `docs/training/ROUTINE_VOLUME_BASELINE.md`; this file was already dirty at task start. It is excluded from this scoped commit, as are unrelated work, raw logs, extracted baseline and private captures.
