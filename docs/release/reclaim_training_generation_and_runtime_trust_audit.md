# Reclaim Training Generation and Runtime Trust Audit

Date: 2026-04-24
Scope: setup logic, planner/engine, runtime progression, replace/editability, guided action coherence, weight increments.

## Training trust verdict

- Program generation core (`programPlanner` + `engine`) is **partially trustworthy**.
- End-to-end training experience is **not fully trustworthy** due to confirmed authority divergence between guided actions, runtime state, and preview/runtime generation semantics.

## A) Setup logic audit

### Confirmed

1. Setup save/generation now maps UI constraints to engine contraindication tokens via `mapUiConstraintIdsToEngineInjuries`.
- Evidence: `app/src/screens/training/TrainingSetupScreen.tsx`, `app/src/lib/training/setupMappings.ts`.

2. Program day generation and session generation are deterministic from goals/split/intent rules.
- Evidence: `app/src/lib/training/programPlanner.ts`, `app/src/lib/training/engine/index.ts`.

### Confirmed trust break

3. Preview generator still uses old string-filter injury mapping (`pain|issues`) instead of engine-token mapping.
- Evidence: `app/src/lib/training/preview/index.ts`.
- Consequence: preview and real generation can disagree.
- Classification: launch-blocking trust defect.

## B) Goals / reps / sets / exercise selection audit

### How current generation works

- Day split selected from frequency + goal bias in `determineSplit` (`programPlanner.ts`).
- Session builder chooses required intents first, then optional intents (`engine/index.ts`).
- Reps are midpoint of rule range: `Math.floor((min+max)/2)`.
- Sets come from rules by priority (`primary`/`accessory`/`isolation`).

### Why outputs like "x12" and "1 set" can occur

1. **x12 is structurally expected** when midpoint of selected rep range lands at 12.
- Evidence: `engine/index.ts` planned-set creation.

2. **1 set for isolation can occur by design**:
- Rules can already produce lower isolation set counts.
- `adaptSession` can aggressively reduce isolation/accessory sets under fatigue/time pressure, with floor 1 set.
- Evidence: `engine/index.ts` (`adaptSession` set slicing logic).

3. **Special exercise 21s lacks dedicated prescription logic**.
- `21s` exists in catalog as normal `elbow_flexion`; no special casing for 7-7-7 style representation.
- Evidence: `app/src/lib/training/catalog/exercises.v1.json`, no special handler in engine/runtime.
- Result: UI can show standard `targetReps` (e.g., 12), which conflicts with user expectation for that exercise archetype.

Conclusion:
- Nonsensical-feeling prescriptions are not random; they are explainable by current generic planning + missing exercise-specific semantics.

## C) Runtime progression/editability/replace behavior

### Confirmed strengths

- In-session set logging path updates runtime and attempts DB persistence with offline queue fallback.
- Edit paths and replace paths exist and are not removed.

### Confirmed runtime trust risks

1. Runtime resume builds from `item.performed.sets`, not full authoritative set log stream.
- Evidence: `TrainingSessionView.tsx` `existingSetLogs` logic.

2. Guided notification actions (`SET_DONE`, `NEXT_SET`) do not directly update active in-memory runtime state.
- Evidence: `guidedTrainingNotificationActions.ts` vs `TrainingSessionView.tsx` runtime reducer path.

3. Cursor authority split (`currentExerciseIndex` state vs runtime cursor) can drift.
- Evidence: `TrainingSessionView.tsx` local state + runtime state usage.

4. Replace in program scope is not full template rewrite and can surprise users.
- Evidence: `TrainingSessionView.tsx` comments/flow around replace scope.

## D) Weight increment and persistence audit

### Confirmed

- Exercise-aware step exists via `getWeightStep` and is used in key runtime surfaces.
- Lower-body step default 5kg, upper 2.5kg (`progression.ts`).

### Confirmed inconsistency

- `ExerciseCard` edit controls still hard-code +/-2.5 regardless of exercise/equipment in that flow.
- Evidence: `app/src/components/training/ExerciseCard.tsx`.
- User report is valid.

## E) Calories at end-of-session audit

- Session summary only includes calories when HC window energy is available and positive.
- Evidence: `mergeHealthConnectActiveEnergyIntoTrainingSummary` in `healthConnectService.ts`.
- This is a capability/scope constraint, not just rendering failure.

## F) Repairability decision for training subsystem

- Core planner/engine: **TARGETED REPAIR** (not rewrite).
- Training runtime and guided action coherence: **FOCUSED RE-ARCHITECTURE** (shared completion contract + single cursor authority).
- Special exercise semantics (21s): **TARGETED REPAIR** with explicit special-case representation policy.

## Not fully verified

- Exact device-side symptom frequency for each divergence branch.
- Whether all perceived setup nonsense comes from preview mismatch vs catalog/rules semantics vs UI text composition in specific screens.
