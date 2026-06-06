# CONTEXT.md

## 2026-06-06 — Training session second-system removal (branch: feat/meds-catalog-governance)

**Status:** Implemented locally, not committed.

**What changed:** Removed parallel optimistic position authority from guided training UI. Single source of truth is DB `performed.sets` + `current_exercise_index`, read via React Query and `sessionWorkAuthority.ts`. Writes go through `applySetCompletion()` with RQ cache patches (`sessionQueryPatch.ts`) for instant UI only.

**Key files:** `TrainingSessionView.tsx`, `sessionWorkAuthority.ts`, `applySetCompletion.ts`, `sessionQueryPatch.ts`, `sessionDerivedState.ts`, `guidedNotificationRoute.ts`, `guidedExternalSetDoneTransition.ts`.

**Validation:** `npm run typecheck` pass; 54/54 training vitest tests pass.

**Next:** Optional — route `guidedTrainingNotificationActions.ts` through `applySetCompletion` for one persistence module; commit when user requests.

**Audit:** `docs/audits/second-system-removal-verification.md`
