# P0-1 Set completion contract (implementation note)

Date: 2026-04-24

## Contract

After a training set is marked done, **both** must hold before advancing guided UX that depends on server truth:

1. A row exists in `training_set_logs` for that session item + set index (or is durably queued with the same idempotency rules).
2. `training_session_items.performed` reflects that completion (merge-by-`setIndex` for external/offline paths; full replace from runtime for in-app completion).

## Code

- Shared helpers: `app/src/lib/training/trainingSetCompletionPersistence.ts`
- Read path: `getTrainingSessionItemById` in `app/src/lib/api.ts` (+ repository seam)
- External `SET_DONE`: `app/src/lib/notifications/guidedTrainingNotificationActions.ts` — persist + merge **before** intent clear / schedule / navigate; invalidates `training:set_logs`
- In-app: `app/src/components/training/TrainingSessionView.tsx` — uses `replacePerformedSetsForSessionItem` after successful `logTrainingSet`
- Offline replay: `app/src/lib/training/offlineSync.ts` — after `insertSetLog`, merge performed slice
