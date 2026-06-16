# Runtime State Deletion Map
**Date:** 2026-05-25
**Scope:** runtimeState, guided SQLite snapshot, lookahead chain, optimisticPerformedSets, runtime function callers

---

## 1. Functions That READ from runtimeState

All reads are in two files: `TrainingSessionView.tsx` (TSV) and `guidedExternalSetDoneTransition.ts` (GESDT).

| Function / Context | File | Line(s) | What It Reads |
|---|---|---|---|
| `getEffectiveLoggedSetIndices` | TSV | 303 | `runtimeState?.exerciseStates[item.exercise_id]?.completedSets` |
| `isExerciseFullyLoggedForItem` | TSV | 320 | Calls `getEffectiveLoggedSetIndices` |
| `completedCount` useMemo | TSV | 458 | Calls `isExerciseFullyLoggedForItem` |
| `totalSetsLogged` useMemo | TSV | 469 | Calls `getEffectiveLoggedSetIndices` |
| Guided snapshot useEffect | TSV | 713 | `runtimeState.exerciseStates[currentItem.exercise_id]` |
| Tick runtime useEffect guard | TSV | 1104 | `runtimeState.status !== 'active'` |
| `handleSetComplete` guard | TSV | 1115 | `!runtimeState` null check |
| `handleSetComplete` logSet call | TSV | 1136 | Passed as 1st arg to `logSet(runtimeState, ...)` |
| `handleSetUpdate` guard | TSV | 1558 | `!runtimeState` null check |
| `handleReplaceExercise` guard | TSV | 1714 | `!runtimeState` null check |
| `handleComplete` guard | TSV | 1829 | `!runtimeState` null check |
| `handleComplete` endSession call | TSV | 1872 | Passed as 1st arg to `endSession(runtimeState, ...)` |
| `handleSkip` guard + read | TSV | 2051, 2059 | `runtimeState.exerciseStates[exerciseId]` |
| `autoAdvanceAfterRest` | TSV | 2100, 2127 | `isExerciseFullyLoggedForItem(currentItem, runtimeState, ...)` |
| `handleGuidedExternalRestDone` guard | TSV | 2157 | `!runtimeState` null check |
| `handleGuidedExternalRestDone` evaluateTransition | TSV | 2166 | Passed in `{ runtimeState }` arg object |
| `handleGuidedExternalRestDone` logSet | TSV | 2189, 2197, 2201 | Reads `.exerciseStates[ext.completedExerciseId]`, calls `logSet(runtimeState, ...)` |
| `exerciseCompletionStatuses` useMemo | TSV | 2389 | Calls `getEffectiveLoggedSetIndices` |
| `performedSets` useMemo | TSV | 2446 | Dependency array |
| Progress bar render | TSV | 2606 | Calls `isExerciseFullyLoggedForItem` |
| `getAdjustedSetParams` render | TSV | 2737 | `getAdjustedSetParams(runtimeState, ...)` |
| `getEffectiveLoggedSetIndices` (copy) | GESDT | 51 | `runtimeState?.exerciseStates[item.exercise_id]?.completedSets` |
| `getFirstPendingSetIndexForItem` | GESDT | 66 | Calls local `getEffectiveLoggedSetIndices` |
| `evaluateGuidedExternalRestTransition` | GESDT | 85, 99 | Destructures `runtimeState` from args, passes to `getFirstPendingSetIndexForItem` |

---

## 2. Functions That WRITE to runtimeState

All writes are via `setRuntimeState()` in `TrainingSessionView.tsx`.

| Context | Line | What It Writes |
|---|---|---|
| Initialize/resume useEffect — `resumeRuntime()` | 887 | `setRuntimeState(resumed)` |
| Initialize/resume useEffect — `initializeRuntime()` | 895 | `setRuntimeState(initialized)` |
| Tick runtime useEffect — 1s interval | 1107 | `setRuntimeState(prev => tickRuntime(prev))` |
| `handleSetComplete` — after `logSet()` | 1144 | `setRuntimeState(logResult.state)` |
| `handleEditSet` — update logged set | 1640 | `setRuntimeState(prev => updateLoggedSetInRuntime(prev, ...))` |
| `handleReplaceExercise` — session scope | 1764 | `setRuntimeState(prev => replaceExerciseInRuntime(prev, ...))` |
| `handleReplaceExercise` — program scope | 1797 | `setRuntimeState(prev => replaceExerciseInRuntime(prev, ...))` |
| `handleComplete` — mark completed | 1884 | `setRuntimeState(prev => { ...prev, status: 'completed' })` |
| `handleSkip` — skip set/exercise | 2076 | `setRuntimeState(prev => { ...prev, exerciseStates: { ...modified } })` |
| Guided external SET_DONE useEffect — after `logSet()` | 2206 | `setRuntimeState(logResult.state)` |

**Total: 10 write sites, 1 useState declaration (line 388).**

---

## 3. Imports of runtimeState-Related Types and Functions

### Production files

| File | Line(s) | Imports |
|---|---|---|
| `src/components/training/TrainingSessionView.tsx` | 28–37 | `resumeRuntime, initializeRuntime, logSet, updateLoggedSetInRuntime, replaceExerciseInRuntime, endSession, getAdjustedSetParams, tickRuntime` from `@/lib/training/runtime` |
| `src/components/training/TrainingSessionView.tsx` | 47 | `buildSetLogPayload, buildSetLogQueuePayload` from `@/lib/training/runtime/payloadBuilder` |
| `src/components/training/TrainingSessionView.tsx` | 49–55 | `type SessionRuntimeState, SessionPlan, PlannedExercise, SetLogEntry, DecisionTrace` from `@/lib/training/types` |
| `src/lib/training/guidedExternalSetDoneTransition.ts` | 7 | `type SessionRuntimeState` from `@/lib/training/types` |
| `src/lib/training/guidedPhoneRestTransition.ts` | 6 | `getAdjustedRestTime` from `@/lib/training/runtime/autoregulation` |
| `src/lib/notifications/guidedTrainingNotificationActions.ts` | 23 | `buildSetLogPayload, buildSetLogQueuePayload` from `@/lib/training/runtime/payloadBuilder` |
| `src/lib/training/runtime/sessionRuntime.ts` | 28 | `applyAutoregulation, detectSessionFatigue` from `./autoregulation` (internal) |
| `src/lib/training/runtime/index.ts` | 7–27 | Re-exports all of `sessionRuntime`, `autoregulation`, `payloadBuilder` |

### Test files

| File | Line(s) | Imports |
|---|---|---|
| `src/lib/training/runtime/__tests__/integration.test.ts` | 9 | `initializeRuntime, logSet, advanceExercise` |
| `src/lib/training/runtime/__tests__/integration.test.ts` | 12 | `type SessionPlan, SessionRuntimeState, PlannedExercise` |
| `src/lib/training/runtime/__tests__/sessionRuntime.test.ts` | 12–21 | `initializeRuntime, logSet, updateLoggedSetInRuntime, advanceExercise, skipExercise, endSession, getAdjustedSetParams, getSessionStats` |
| `src/lib/training/runtime/__tests__/autoregulation.test.ts` | 14–17 | `applyAutoregulation, detectSessionFatigue, getAdjustedRestTime` |
| `src/lib/training/runtime/__tests__/autoregulation.test.ts` | 18 | `type SetLogEntry, PlannedSet` |
| `src/lib/training/__tests__/guidedExternalSetDoneTransition.test.ts` | 8 | `type SessionRuntimeState` |

---

## 4. Guided SQLite Snapshot — WRITE Sites

Storage: `reclaim_async_blob_mirror` table, domain `guided_active_session`.

| # | File | Line(s) | Trigger | Function Called |
|---|---|---|---|---|
| 1 | `TrainingSessionView.tsx` | 729 | 400ms debounced periodic save during active guided session | `scheduleGuidedActiveSessionSnapshotSave(uid, snapshot)` |
| 2 | `TrainingSessionView.tsx` | 2247 | After external notification SET_DONE completes and advances to next work | `scheduleGuidedActiveSessionSnapshotSave(uid, snap)` |
| 3 | `guidedTrainingNotificationActions.ts` | 568 | After notification SET_DONE action is accepted and set logged to DB | `await saveGuidedActiveSessionSnapshot(uid, snap)` |
| 4 | `TrainingSessionView.tsx` | 693 | Entering guided session UI (clear stale) | `scheduleClearGuidedActiveSessionSnapshot(uid)` |
| 5 | `TrainingSessionView.tsx` | 699 | Session ends or guided mode turns off | `scheduleClearGuidedActiveSessionSnapshot(uid)` |
| 6 | `TrainingSessionView.tsx` | 2013 | User cancels & deletes session | `scheduleClearGuidedActiveSessionSnapshot(uid)` |
| 7 | `TrainingScreen.tsx` | 680 | User deletes session from history | `await clearGuidedActiveSessionSnapshot(uid)` |

---

## 5. Guided SQLite Snapshot — READ Sites

| # | File | Line(s) | Purpose |
|---|---|---|---|
| 1 | `TrainingScreen.tsx` | 407–428 | Auto-resume: load snapshot, validate age/session match, decide whether to resume or clear |
| 2 | `guidedActiveSessionResume.ts` | 33–109 | `evaluateGuidedActiveSessionResume()` — validates snapshot existence, age (<7d), session ID match, guided mode, not-ended |
| 3 | `guidedActiveSessionSnapshot.ts` | 90–141 | `parseGuidedActiveSessionSnapshot()` — strict schema validation on load (version, types, ranges, dates) |
| 4 | `smallModuleMirrors.ts` | 183–199 | `loadBlobMirrorForUser()` — raw SQL SELECT, returns `payload_json` or null |

---

## 6. Lookahead Chain (nextAfter / nextNextAfter) — Build and Read Sites

### Build sites (chain constructed from items/planned sets)

| # | File | Line(s) | Context |
|---|---|---|---|
| 1 | `TrainingSessionView.tsx` | 935–1077 | First-set notification scheduling — builds 3-level lookahead across sets and exercises |
| 2 | `TrainingSessionView.tsx` | 1195–1352 | In-session set completion — rebuilds lookahead for next TRAINING_SET notification |
| 3 | `guidedExternalSetDoneTransition.ts` | 176–330 | External SET_DONE handler — builds lookahead for re-scheduled notification after notification-driven completion |
| 4 | `guidedTrainingNotificationActions.ts` | 436–465 | Deserializes lookahead from notification payload data fields back into `TrainingNotificationNext` objects |

### Read/consume sites (chain serialized into notification payloads)

| # | File | Line(s) | Context |
|---|---|---|---|
| 1 | `TrainingSessionView.tsx` | 601–602 | Passes `ctx.nextAfter` and `ctx.nextNextAfter` into TRAINING_SET notification context |
| 2 | `TrainingSessionView.tsx` | 631–633 | Passes into TRAINING_REST notification: `next: ctx.nextAfter, nextAfter: ctx.nextNextAfter` |
| 3 | `trainingNotificationScheduler.ts` | 165–180 | `scheduleTrainingFirstSet()` — serializes chain into payload fields |
| 4 | `trainingNotificationScheduler.ts` | 228–243 | `scheduleTrainingSet()` — serializes chain into payload fields |
| 5 | `trainingNotificationScheduler.ts` | 309–330 | `scheduleTrainingRest()` — serializes chain into payload fields |
| 6 | `NotificationScheduler.ts` | 488–553 | Copies lookahead fields between notification objects during scheduling |
| 7 | `guidedTrainingNotificationActions.ts` | 674–730 | Reads deserialized lookahead to build re-scheduled notification after SET_DONE |

### Type definitions

| # | File | Line(s) |
|---|---|---|
| 1 | `TrainingSessionView.tsx` | 380–382 |
| 2 | `guidedExternalSetDoneTransition.ts` | 135–136 |
| 3 | `trainingNotificationScheduler.ts` | 100–102, 124–126, 272–273 |
| 4 | `guidedTrainingNotificationActions.ts` | 53–66, 83–96 |

---

## 7. optimisticPerformedSets — All Callsites

### useState declaration

| File | Line |
|---|---|
| `TrainingSessionView.tsx` | 418 |

### Write sites (setOptimisticPerformedSets)

| # | File | Line | Context |
|---|---|---|---|
| 1 | `TrainingSessionView.tsx` | 847 | Replay DB items on `items` prop change — seeds from `item.performed?.sets` |
| 2 | `TrainingSessionView.tsx` | 1161 | `handleSetComplete` — optimistic add after `logSet()` |
| 3 | `TrainingSessionView.tsx` | 1483 | `handleSetComplete` error revert — removes set on queue failure |
| 4 | `TrainingSessionView.tsx` | 1541 | `handleSetComplete` catch revert — removes set on `logSet()` failure |
| 5 | `TrainingSessionView.tsx` | 1650 | `handleEditSet` — updates weight/reps/rpe in optimistic set |
| 6 | `TrainingSessionView.tsx` | 2064 | `handleSkip` — adds skipped set marker |
| 7 | `TrainingSessionView.tsx` | 2217 | Guided external SET_DONE — optimistic add after external completion |

### Read sites (optimisticPerformedSets)

| # | File | Line | Context |
|---|---|---|---|
| 1 | `TrainingSessionView.tsx` | 300 | `getEffectiveLoggedSetIndices` — merges with runtimeState completedSets |
| 2 | `TrainingSessionView.tsx` | 320 | `isExerciseFullyLoggedForItem` — passed to `getEffectiveLoggedSetIndices` |
| 3 | `TrainingSessionView.tsx` | 458 | `completedCount` useMemo |
| 4 | `TrainingSessionView.tsx` | 469 | `totalSetsLogged` useMemo |
| 5 | `TrainingSessionView.tsx` | 843 | Items prop change useEffect — reads existing optimistic sets |
| 6 | `TrainingSessionView.tsx` | 2100 | `autoAdvanceAfterRest` — checks if current exercise fully logged |
| 7 | `TrainingSessionView.tsx` | 2127 | `handleNext` — checks if exercise fully logged for auto-advance |
| 8 | `TrainingSessionView.tsx` | 2167 | `handleGuidedExternalRestDone` — passed in arg object |
| 9 | `TrainingSessionView.tsx` | 2389 | `exerciseCompletionStatuses` useMemo |
| 10 | `TrainingSessionView.tsx` | 2436 | `performedSets` useMemo — current item's optimistic sets for render |
| 11 | `TrainingSessionView.tsx` | 2606 | Progress bar render — `isExerciseFullyLoggedForItem` |
| 12 | `guidedExternalSetDoneTransition.ts` | 48 | `getEffectiveLoggedSetIndices` — reads `optimisticPerformedSets[item.id]` |
| 13 | `guidedExternalSetDoneTransition.ts` | 66 | `getFirstPendingSetIndexForItem` — passes to `getEffectiveLoggedSetIndices` |
| 14 | `guidedExternalSetDoneTransition.ts` | 85 | `evaluateGuidedExternalRestTransition` — destructures from args |

---

## 8. Caller Confirmation — Runtime Functions

| Function | Only in TSV? | Other Callers |
|---|---|---|
| `initializeRuntime` | **YES** | Line 890 (+ tests) |
| `resumeRuntime` | **YES** | Line 879 (+ no tests) |
| `logSet` | **YES** | Lines 1136, 2201 (+ tests) |
| `tickRuntime` | **YES** | Line 1107 (+ no tests) |
| `updateLoggedSetInRuntime` | **YES** | Line 1642 (+ tests) |
| `replaceExerciseInRuntime` | **YES** | Lines 1765, 1798 (+ no tests) |
| `endSession` | **YES** | Line 1872 (+ tests) |
| `getAdjustedSetParams` | **YES** | Line 2737 (+ tests) |

**All 6 target functions (+ endSession, getAdjustedSetParams) are exclusively called from TrainingSessionView.tsx.** No flags.

---

## 9. Functions That Exist Solely to Support runtimeState

These would have no purpose after runtimeState is deleted:

### sessionRuntime.ts — full file deletion candidates

| Function | Line | Purpose | Notes |
|---|---|---|---|
| `initializeRuntime` | 34 | Creates initial `SessionRuntimeState` | No purpose without runtimeState |
| `resumeRuntime` | 73 | Restores `SessionRuntimeState` from persisted data | No purpose without runtimeState |
| `tickRuntime` | 130 | Increments `elapsedSeconds` on state | No purpose without runtimeState |
| `logSet` | 147 | Logs set into `exerciseStates`, returns new state + autoregulation | Autoregulation logic would need to be extracted or reimplemented against DB |
| `advanceExercise` | 277 | Advances current exercise in state | Only used in tests; no production callers |
| `skipExercise` | 312 | Marks exercise skipped in state | Only used in tests; no production callers |
| `updateLoggedSetInRuntime` | 366 | Updates already-logged set in state | No purpose without runtimeState |
| `replaceExerciseInRuntime` | 408 | Replaces exercise in state | No purpose without runtimeState |
| `endSession` | 442 | Computes final summary from state | Would need reimplementation against DB data |
| `getCurrentExercise` | 529 | Gets current exercise from state | Only used in tests; no production callers |
| `getAdjustedSetParams` | 540 | Gets autoregulated set params from state | Would need reimplementation against DB `autoregulation_adjustments` |
| `getSessionStats` | 597 | Gets session statistics from state | Only used in tests; no production callers |

### autoregulation.ts — partial survival

| Function | Line | Survives? | Why |
|---|---|---|---|
| `applyAutoregulation` | 75 | **MAYBE** | Called internally by `logSet()`. If autoregulation moves to DB writes, the pure logic may be reusable |
| `detectSessionFatigue` | 375 | **MAYBE** | Called internally by `logSet()`. Same situation |
| `getAdjustedRestTime` | 449 | **YES** | Called from `guidedPhoneRestTransition.ts:25` — independent of runtimeState |

### payloadBuilder.ts — survives

| Function | Survives? | Why |
|---|---|---|
| `buildSetLogPayload` | **YES** | Called from `guidedTrainingNotificationActions.ts:340` and TSV. Builds DB insert payloads — independent of runtimeState |
| `buildSetLogQueuePayload` | **YES** | Called from `guidedTrainingNotificationActions.ts:151` and TSV. Builds offline queue payloads — independent of runtimeState |

### TrainingSessionView.tsx — internal helpers that die with runtimeState

| Function / Variable | Line | Purpose |
|---|---|---|
| `getEffectiveLoggedSetIndices` | 293 | Merges runtimeState completedSets with optimisticPerformedSets — replaced by DB query |
| `isExerciseFullyLoggedForItem` | 314 | Uses `getEffectiveLoggedSetIndices` — replaced by DB `performed` column |
| `runtimeState` useState | 388 | The state variable itself |
| `setRuntimeState` | 388 | The setter itself |

### guidedExternalSetDoneTransition.ts — internal helpers that die

| Function | Line | Purpose |
|---|---|---|
| `getEffectiveLoggedSetIndices` (copy) | 41 | Duplicate of TSV's helper — same fate |
| `getFirstPendingSetIndexForItem` | 62 | Depends on `getEffectiveLoggedSetIndices` — would need reimplementation against DB |

### runtime/index.ts — barrel file

Would need trimming to only re-export survivors: `buildSetLogPayload`, `buildSetLogQueuePayload`, `getAdjustedRestTime`, and possibly `applyAutoregulation`/`detectSessionFatigue` if extracted.

### Test files that die

| File | Reason |
|---|---|
| `runtime/__tests__/integration.test.ts` | Tests `initializeRuntime`, `logSet`, `advanceExercise` |
| `runtime/__tests__/sessionRuntime.test.ts` | Tests all sessionRuntime functions |
| `__tests__/guidedExternalSetDoneTransition.test.ts` | Tests `evaluateGuidedExternalRestTransition` with `runtimeState` param |

`runtime/__tests__/autoregulation.test.ts` **survives** — tests pure autoregulation logic.

---

## Summary

- **runtimeState** is read from 2 files, written from 1 file (TrainingSessionView.tsx)
- **All 6 target runtime functions** are exclusively called from TrainingSessionView.tsx
- **12 functions** in `sessionRuntime.ts` exist solely to support runtimeState (all deletable, but `endSession` and autoregulation logic need reimplementation)
- **Guided SQLite snapshot** has 7 write sites and 4 read sites across 4 files
- **Lookahead chain** is built in 3 files (4 sites) and consumed in 4 files (7 sites) — deeply coupled to notification payloads
- **optimisticPerformedSets** has 7 write sites and 14 read sites across 2 files — could be replaced by polling `performed` from DB with the new 3s refetchInterval
- **payloadBuilder.ts** and **getAdjustedRestTime** survive deletion — they are runtimeState-independent
