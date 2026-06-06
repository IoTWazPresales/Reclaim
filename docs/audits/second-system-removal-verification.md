# Second-system removal verification (2026-06-06)

## Goal

Remove the parallel **optimistic position authority** (`optimisticPerformedSets`, `focusOverlaySetIndex`, local `currentExerciseIndex` useState) and unify in-session work position on **DB-shaped session query data** plus a single write path.

## Architecture (current)

```
User / notification action
  → applySetCompletion()           (canonical persistence)
  → patchSessionItemPerformedInCache / patchSessionCursorInCache  (RQ speed layer only)
  → UI reads position via sessionWorkAuthority (performed.sets + current_exercise_index)
```

| Layer | Module | Role |
|-------|--------|------|
| Authority | `sessionWorkAuthority.ts` | `deriveActiveWorkTarget`, `getFirstPendingSetIndexOnItem`, `resolveNotificationPresentation` |
| Persistence | `applySetCompletion.ts` | Single set-completion write (online / offline queue) |
| Cache patch | `sessionQueryPatch.ts` | Mirrors DB shape in React Query — not a second cursor |
| Presentation | `guidedNotificationRoute.ts` | focus / edit / none — hints only |

## Removed from runtime (grep clean)

- `optimisticPerformedSets` — **0** references in `app/src` (deprecated type stub only in `sessionDerivedState.ts`)
- `focusOverlaySetIndex` — **0** references
- `setCurrentExerciseIndex` — **0** references
- `getEffectiveLoggedSetIndices(item, optimistic…)` — callers updated to `getLoggedSetIndices` / `getPerformedSetsFromItem`

## TrainingSessionView changes

- `currentExerciseIndex` derived from `session.current_exercise_index` via `resolveExerciseIndexFromSession`
- `activeWorkTarget` from `deriveActiveWorkTarget`
- `goToExerciseIndex()` patches RQ cache + `updateSessionCursorState`
- `handleSetComplete` / skip: `patchSessionItemPerformedInCache` + `applySetCompletion`
- Notification overlay: `showNotificationFocusOverlay` + canonical `activeWorkTarget` (not notification `setIndex`)
- `SetFocusCard` hidden while notification overlay is open

## Tests run

```text
npm run typecheck                          — pass
npx vitest run sessionWorkAuthority        — 4 pass
npx vitest run guidedNotificationRoute     — 3 pass
npx vitest run guidedTransitionTrace       — 2 pass
```

## Intended workflow

1. **In-app Done** — cache patch → `applySetCompletion` → rest timer / notifications from planned sets.
2. **Watch/notification Done** — notification handler persists to DB; UI effect patches cache if needed, aligns cursor via `goToExerciseIndex`, overlay shows **canonical** pending set from `resolveNotificationPresentation`.
3. **SetFocusCard & overlay** — both resolve pending work from the same `performed.sets` on session items (overlay uses `activeWorkTarget` after cursor alignment).

## Follow-ups (out of scope)

- `guidedTrainingNotificationActions.ts` still uses inline `logTrainingSet` + merge — could call `applySetCompletion` for one write module everywhere.
- Historical docs (`TRAINING_FIXES_SUMMARY.md`, older audit) still mention optimistic maps — informational only.
