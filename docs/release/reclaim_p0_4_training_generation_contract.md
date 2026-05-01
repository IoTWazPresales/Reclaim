# P0-4 Training setup / preview / runtime contract (implementation note)

Date: 2026-04-25

## Root cause

Two contract breaks undermined trust:

1. Preview used legacy UI-constraint filtering (`pain|issues`) instead of runtime injury-token mapping, so setup preview and real generation could diverge.
2. Engine had no domain semantics for special-case biceps movement `21s`, and generic isolation set math allowed one-set elbow-flexion outputs that users experienced as nonsensical.

## Contract

- Setup constraints map once from UI IDs to engine contraindication tokens via `mapUiConstraintIdsToEngineInjuries`, and that exact mapping is used by both:
  - profile/program generation runtime path
  - preview dry-run generation path
- Prescription semantics guardrails are domain-owned in engine:
  - `21s` uses fixed `targetReps = 21` and minimum `2` sets
  - elbow-flexion exercises have minimum `2` sets in base session generation
  - adaptation paths respect exercise set floors (do not collapse `21s` below 2 sets)

## Code

- `app/src/lib/training/preview/index.ts`
  - now uses `mapUiConstraintIdsToEngineInjuries` for `constraints.injuries`
- `app/src/lib/training/engine/index.ts`
  - `getExercisePrescriptionOverride`
  - `getExerciseSetFloor`
  - `getExerciseTargetReps`
  - applied in session build loops and adaptation set-reduction logic
- Tests:
  - `app/src/lib/training/preview/__tests__/preview.test.ts`
  - `app/src/lib/training/engine/engine.test.ts`
  - existing `app/src/lib/training/__tests__/setupMappings.test.ts`

## Non-goals (this pass)

- No full training-engine redesign.
- No broad training UI formatting rewrite.
- No changes to unrelated notification/recovery systems.
