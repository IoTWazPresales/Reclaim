# Android verification after overhead-press update - 2026-11-01

**Result: setup saved and read back; all five day inventories recorded; STOP before session start on the strict rounded-ceiling check. No source change, migration or EIF acceptance.**

## Installed release and provenance

Retained release installed in the preceding checkpoint via adb install -r. Installed base.apk SHA256 matched `7407978a5afd3d35b52134ebf934626bdf6e34427202386d32531084c674cf0a`, source bd69229. This continuation made no source/native/package change or reinstall. Provenance basis remains operator-accepted elimination: no published runtime1.0.5 update, embedded bundle only. No new selected-bundle identity claim or EAS operation.

## Saved setup

Operator explicitly changed Overhead press to90kg x8, resolving the previous seven-rep entry blocker for this journey. Entered weights and reps through actual setup UI and tapped Save once. Reopened setup, observed retained choices, then Exit without another Save. Read-only owner-filtered PostgREST GET additionally confirms the active programme snapshot:

| Field | Stored/read-back value |
| --- | --- |
| Mode / experience | Strength / Advanced |
| Weekdays | Monday-Friday; weekends unselected |
| Goals | Build Muscle40 / Build Strength40 / Lose Fat10 / Get Fitter10 |
| Bench press | 105kg x8 |
| Squat | 100kg x5 |
| Deadlift | 100kg x5 |
| Overhead press | 90kg x8 |
| Barbell Row | blank, unchanged |

Snapshot baselineInputs preserve the entered weights/reps separately from estimated1RM (Bench133, Squat/Deadlift116.66666666666667, OHP114). There is one active programme and20 persisted day rows. Equipment/constraints/skill-work/advanced options retained. `saved-setup.json` omits account/program/session identifiers.

## Five-day inventory and review

[five-day-prescriptions.md](five-day-prescriptions.md) records all28 exercise rows: sets, target reps, unit, working weight, rounded ceiling and warnings. [android-replay-comparison.json](android-replay-comparison.json) confirms all28 Android accessibility rows match the canonical source replay. Day totals16/13/17/14/16 =76sets. This is the displayed Week1, dated Monday26-Friday30October; no claim of four-week parity.

Actual programme review renders unresolved/30warnings/0errors. Completed0 and frozen planned0 are distinct from provisional totals Chest10/Back40/Shoulders27/Arms26/Legs46. Session Preview renders mode/template/top lifts/goals/week summary and exercises with units. Unknown loads show weight confirmation required without numeric kilograms. Leg Press explicitly warns incomplete/unsupported history is a progression barrier, not qualified load evidence, and requires confirmation. The preview's per-set repeated warning text is recorded as observed, not independently classified as a defect.

## Stop finding and limit of the conclusion

The requested comparison says EVERY working weight must be below its ceiling. Source replay from the current stored programme plus freshly read canonical performed history yields:

| Day | Exercise | Working kg | Rounded Epley ceiling kg at13reps | Result |
| --- | --- | --- | --- | --- |
| Monday | Lateral Raises, per dumbbell | 11 | 11 | equal |
| Monday | Barbell Curl, total bar | 17.5 | 17.5 | equal |
| Wednesday | Lateral Raises, per dumbbell | 11 | 11 | equal |
| Thursday | Dumbbell Curl, per dumbbell | 14 | 14 | equal |

Android preview working values match. The ceiling numbers/explanations above come from an executed same-input source replay; Session Preview does not display that explanation field. No false rendered-ceiling claim is made. The current code floors both the target-rep ceiling and the target+2 RPE8 working limit to the existing increment; they can coincide. The strict rounded comparison therefore fails for4rows. **All evidence-backed positive external loads remain strictly below their raw target-rep Epley ceiling.** This is a rounding/criterion conflict, not proof of exceeding capacity or an unsafe load. Fixing strict numerical separation would need a code/policy decision; no correction or replacement load was proposed or applied.

Additionally Tricep Pushdown uses a same-unit cable-stack population default40kg; no own governing ceiling was returned, so below-own-ceiling status is UNVERIFIED. Bodyweight Pull-ups are not an external-kg ceiling comparison. Confirm-required loads are not prescribed zeros. No cross-unit number inheritance observed: exercise-specific history retains its declared mode, and entered primary baselines are total-bar. No generalized clinical interpretation is made.

Per stop-on-code-finding instruction, STOPPED immediately after the replay exposed equality. No session started, no set logged, no Cancel & delete needed. Frozen-prescription parity, guided notification/FGS, one-set persistence and deletion journey remain NOT RUN. App retained on unstarted Friday preview. This report is not full Android verification or acceptance.

## Read-only evidence method

Bounded owner-filtered GETs read training_profiles, active training_program_instances, its20 training_program_days and5 existing training_sessions. A separate GET read14 training_session_items across2 sessions (including their joined session start/end metadata). Raw personal rows remain outside the repository in the local diagnostics directory. API-key discovery was read-only, credentials remained in memory, no secret values were printed or persisted to repository evidence. No direct API/DB write used; authorized setup save was through UI.

Read-only esbuild source replay invokes completedPerformanceHistory(items,3), hydrates the same TrainingProfileSnapshot seed fields used by withTrainingPerformanceSeed, then programmeWeekProposal(savedPlan,1,profile,{adaptiveTrainingEnabled:true}). All28 UI rows match. `stored-programme-replay.json` records sanitized plans, explanations, raw/rounded comparisons and warnings. No API calls or mutations from replay. Product sources have no diff; no source harness rerun for this runtime/evidence-only task. Renders were personally inspected where stated, with accessibility captures supplying full inventory; no independent reviewer or all-row pixel-review claim.

## Requested checks accounting

| Check | Outcome |
| --- | --- |
| Release install / SHA | PASS from preceding checkpoint, retained |
| Save / stored values | PASS; UI reopen and read-only active snapshot agree |
| Five-day exercise/set/working/ceiling/warnings | Recorded all28; strict rounded comparison FAIL4rows; one population ceiling unavailable |
| Unit separation / confirmation | Observed; no borrowed cross-unit numeric load |
| Preview / weekly review / leg press | Observed; ceiling explanation is replay evidence, not preview pixels |
| Start / frozen / guidance / one-set / delete | NOT RUN after stop; zero test sessions/sets |
| Queue / commit / push | Recorded after execution below; no acceptance |

Public wrapper lease/await-approval/automatic-release succeeded at20:06UTC under R20261101RELEASEVERIFY; twelve scoped renders hashed. Existing N-0070 queue heading retained; AWAITING_APPROVAL has a new scope note. No acceptance/evidence-add/complete command. Evidence committed and pushed in the following documentation checkpoint.
