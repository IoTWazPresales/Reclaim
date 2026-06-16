# Overlay and Dual-System Audit — Guided Training Set/Exercise Position

**Date:** 2026-05-07  
**Mode:** Read-only trace (no code changes)  
**Branch context:** Post–runtime-state migration; DB `performed.sets` intended as source of truth, with documented UI layers still present.

---

## Executive summary

The confirmation overlay is **`SetFocusOverlay`** (`app/src/components/training/SetFocusOverlay.tsx`), mounted only from **`TrainingSessionView`**. It is **not** the same component as the main inline **`SetFocusCard`**, and they can show **different set numbers at the same time** because they read from **different state variables** (`focusOverlaySetIndex` vs `firstPendingSetIndex`).

Despite removing `runtimeState` and the guided SQLite snapshot, the session UI still runs a **second positioning layer**:

1. **`optimisticPerformedSets`** (React state) merged with DB `item.performed.sets` for “what’s done / what’s next.”
2. **`currentExerciseIndex`** (React state) merged with, but not continuously synced to, DB `training_sessions.current_exercise_index`.
3. **Notification lookahead payloads** (`setIndex`, `nextSetIndex`, `exerciseId`) precomputed at schedule time and replayed on tap — can disagree with DB-derived “first pending set” until refetch/optimistic catch-up.

**Named second system:** **Optimistic + notification-payload cursor** (vs **DB performed + DB session cursor**).

---

## PART 1 — The confirmation overlay (`SetFocusOverlay`)

### 1. Component, file, and what triggers it

| Item | Detail |
|------|--------|
| **Component** | `SetFocusOverlay` |
| **File** | `app/src/components/training/SetFocusOverlay.tsx` |
| **UI** | Modal (`Portal` + `Modal`) with exercise name, **Set N of M**, planned load, **Done / Adjust / Close** (or rest countdown + Close when `isResting`) |
| **State owner** | `TrainingSessionView.tsx`: `showSetFocusOverlay`, `focusOverlaySetIndex` (lines ~306–307) |

**Triggers that set `showSetFocusOverlay = true`:**

| # | Location | Condition | Sets `focusOverlaySetIndex` from |
|---|----------|-----------|----------------------------------|
| A | `TrainingSessionView.tsx` ~2057–2095 | `notificationAction` present, **no** `guidedExternalSetDone`, `guidedNotificationOverlayChoice(...) === 'focus'` | `notificationAction.setIndex ?? firstPendingSetIndex` |
| B | `TrainingSessionView.tsx` ~1901–1903 | `guidedExternalSetDone` path, `restSecondsAfterCompleted <= 0`, and **`suppressDuplicateCompletionOverlay === false`** | `ext.nextSetIndex` |

**Path B is effectively dead in production:** `guidedTrainingNotificationActions.ts` always navigates with `suppressDuplicateCompletionOverlay: true` (~590). Only a manual/test payload with `false` would open the overlay after watch/phone SET_DONE.

**`guidedNotificationOverlayChoice`** (`app/src/lib/training/guidedNotificationRoute.ts`):

- `edit_set` → edit dialog, not overlay.
- `fromRestNextSet` → **focus** overlay (even if `isPerformed` is true — stale performed guard).
- Otherwise: `isPerformed ? 'edit' : 'focus'`.

**Not an overlay trigger:** In-app **`SetFocusCard` Done** does **not** open `SetFocusOverlay`; it calls `handleSetComplete` directly (~2394–2396).

### 2. What set index the overlay displays and where it comes from

- **Displayed:** `Set {setIndex} of {totalSets}` — props `setIndex` / `totalSets` (~88–89 in `SetFocusOverlay.tsx`).
- **Passed from** `TrainingSessionView` ~2457–2461:
  - `setIndex={focusedSet.setIndex}` where `focusedSet = plannedSets.find(s => s.setIndex === focusOverlaySetIndex)`.
- **Source of truth for overlay index:** React state **`focusOverlaySetIndex`**, **not** `firstPendingSetIndex`.

**Important:** The main set view (`SetFocusCard`) uses **`firstPendingSetIndex`** (~2048–2054, ~2330–2341), derived from merged DB + optimistic performed sets. The overlay uses **`focusOverlaySetIndex`**, often from **notification route params** (`TrainingScreen` → `pendingNotificationAction` → `notificationAction.setIndex`). These **can disagree** while optimistic state and React Query refetch are catching up.

**Load display mismatch:** Overlay uses raw **`focusedSet.suggestedWeight` / `focusedSet.targetReps`** (~2462–2463). `SetFocusCard` uses **`getAdjustedSetParams(..., localAdjustments)`** (~2334–2338). Same set number can show different weight/reps.

### 3. Does overlay Done write set completion? Same path as inline Done?

**Yes, it writes completion** via the same handler:

```text
SetFocusOverlay onDone (~2468–2470)
  → handleSetComplete(focusedSet.setIndex, focusedSet.suggestedWeight, focusedSet.targetReps)
```

**Inline path:**

```text
SetFocusCard onDone (~2394–2396)
  → handleSetComplete(focusSet.setIndex, weight, reps, rpe)  // user-edited weight/reps + optional RPE
```

**Same function** (`handleSetComplete`, ~859–1310), **different inputs** (overlay skips user edits and RPE; uses planned defaults only).

**Persistence inside `handleSetComplete`:**

1. `setOptimisticPerformedSets` (immediate UI)
2. `logTrainingSet` or offline queue / write buffer
3. `replacePerformedSetsForSessionItem` (full replace of `performed.sets` from DB slice + optimistic merge)

**Notification SET_DONE path (before overlay opens):** `guidedTrainingNotificationActions.ts` ~335–376 uses `logTrainingSetWithRetry` + **`mergePerformedSetsIntoSessionItemFromDb`** (incremental merge), then navigates with `guidedExternalSetDone`. If overlay later opens (path A) and user taps Done again, `handleSetComplete` runs a **second** write; mitigated by idempotent set-log id and `loggingInFlight` guard, but still a **duplicate code path**.

### 4. `suppressDuplicateCompletionOverlay` — references and behavior

| File | Usage |
|------|--------|
| `guidedExternalSetDoneTransition.ts` ~24 | Optional field on `GuidedExternalSetDonePayload` |
| `guidedTrainingNotificationActions.ts` ~561, ~590 | Trace note; **always set `true`** on navigate after SET_DONE |
| `TrainingSessionView.tsx` ~1901–1924 | If **`false`**, opens overlay for `ext.nextSetIndex`; if **`true`** (default), traces `OVERLAY_SUPPRESS` and does **not** open overlay |

**Conclusion:** Flag **does** suppress the overlay on the authoritative watch/phone SET_DONE path. It is **not** referenced for path A (generic notification deep-link overlay).

### 5. Every place the overlay is rendered / mounted

**Only one mount site:**

- `app/src/components/training/TrainingSessionView.tsx` ~2450–2494 (conditional render inside `ScrollView` when `focusOverlaySetIndex !== null`).

No other imports of `SetFocusOverlay` in `app/src`.

**Simultaneous UI:** `SetFocusCard` remains rendered **under** the modal (~2378–2403). User can see **SetFocusCard “Set X”** and **overlay “Set Y”** if `firstPendingSetIndex !== focusOverlaySetIndex`.

---

## PART 2 — Hunt for the second system

### 6. Every place that determines “which set is current / next”

| # | File:line (approx) | Mechanism | Data source |
|---|-------------------|-----------|-------------|
| S1 | `sessionDerivedState.ts:13–21` | `getEffectiveLoggedSetIndices` | DB `item.performed.sets` ∪ `optimisticPerformedSets[item.id]` |
| S2 | `sessionDerivedState.ts:32–37` | `getNextSetIndex` → `logged.length + 1` | Same merge (**unused** in app — no callers outside definition) |
| S3 | `TrainingSessionView.tsx:2048–2054` | `firstPendingSetIndex` | First planned set not in `performedSets` merge (S1-style per current item) |
| S4 | `TrainingSessionView.tsx:2019–2041` | `performedSets` useMemo | DB `currentItem.performed.sets` merged with `optimisticPerformedSets` |
| S5 | `TrainingSessionView.tsx:2066` | `targetSetIndex` for notification UX | `notificationAction.setIndex ?? firstPendingSetIndex` (S3) |
| S6 | `TrainingSessionView.tsx:2078` | `isPerformed` for overlay routing | `performedSets` (S4) only for **current** exercise |
| S7 | `guidedNotificationRoute.ts:17–22` | overlay vs edit | `isPerformed` (S6), `fromRestNextSet`, `action` |
| S8 | `guidedExternalSetDoneTransition.ts:27–34` | `getFirstPendingSetIndexForItem` | Planned sets vs S1 merge |
| S9 | `guidedExternalSetDoneTransition.ts:60–82` | `evaluateGuidedExternalRestTransition` | Compares `payload.nextSetIndex` to S8 |
| S10 | `TrainingSessionView.tsx:1902` | overlay after external done | `ext.nextSetIndex` from notification payload |
| S11 | `guidedTrainingNotificationActions.ts:279–355` | SET_DONE handler | `data.setIndex` from notification payload |
| S12 | `trainingNotificationScheduler.ts` (multiple) | Schedule payloads | Precomputed `setIndex`, `nextSetIndex`, lookahead chain |
| S13 | `TrainingSessionView.tsx:1280–1281` | post-complete local logic | `setIndex + 1` arithmetic |
| S14 | `TrainingSessionView.tsx:963+` | rest notification context | `setIndex + 1`, `+2`, `+3` planned lookups |
| S15 | `TrainingSessionView.tsx:2254–2256` | `RestCountdownCard` next set | Independent `plannedSets.find` vs `performedSets` |
| S16 | `TrainingSessionView.tsx:2268–2275` | rest card cross-exercise | `currentExerciseIndex + 1`, first planned set of next item |
| S17 | `restNotificationContextRef` ~1116, ~1945+` | guided rest scheduling | Lookahead `next?.setIndex` from in-app completion math (S14) |
| S18 | `ExerciseCard.tsx:100–103` | first pending (legacy) | Own find in `performedSets` — **component unused** (no `<ExerciseCard` in repo) |
| S19 | `ExerciseCard.tsx:349` | `isCurrentSet` highlight | Prop `currentSetIndex` — **unused** |

**Pairs that can disagree (root cause candidates):**

| A | B | Why |
|---|---|-----|
| S3 `firstPendingSetIndex` | S5/S10 notification `setIndex` / `nextSetIndex` | Payload baked at schedule time; DB/optimistic may have advanced or lagged |
| S3 | S8 on **next** exercise item | External transition validates next item pending vs payload; UI may still show overlay for payload index (path A) |
| S4 (current item only) | S11 completed set on **same** item via notification | Before optimistic patch (~1861–1876), `isPerformed` false → focus overlay for already-logged set |
| S15 rest card next | S3 focus card | Rest card recomputes; different code path from `firstPendingSetIndex` |
| S2 `getNextSetIndex` | S3 | If ever used: `length+1` ≠ first gap in non-contiguous indices |

### 7. Every place that determines “which exercise is current”

| # | File:line (approx) | Mechanism | Data source |
|---|-------------------|-----------|-------------|
| E1 | `TrainingSessionView.tsx:294` | `currentExerciseIndex` useState | React state (primary UI cursor) |
| E2 | `TrainingSessionView.tsx:402` | `currentItem` | `itemsWithOverrides[currentExerciseIndex]` |
| E3 | `TrainingSessionView.tsx:668–669` | Init on session load | DB `session.current_exercise_index` (**only** when `session.id` changes) |
| E4 | `TrainingSessionView.tsx:1730–1731` | `handleNext` | Increments E1, writes E3 to DB |
| E5 | `TrainingSessionView.tsx:2072–2075` | Notification deep-link | `notificationAction.exerciseId` → index in `itemsWithOverrides` |
| E6 | `TrainingSessionView.tsx:1878–1879` | External SET_DONE | `completedSessionItemId` → `completedIdx` |
| E7 | `TrainingSessionView.tsx:1895–1898` | External SET_DONE, no rest | `nextSessionItemId` → `nextIdx` |
| E8 | `TrainingSessionView.tsx:2203` | Progress bar highlight | `idx === currentExerciseIndex` (E1) |
| E9 | `TrainingSessionView.tsx:2172` | Header “Exercise N/M” | `currentExerciseIndex + 1` (E1) |
| E10 | `FullSessionPanel.tsx:77–81` | “CURRENT” chip / done inference | Prop `currentExerciseIndex` (E1); `isFullyDone` from completion statuses |
| E11 | `TrainingSessionView.tsx:2591–2595` | Full plan “jump to” | Sets E1 + DB write |
| E12 | `TrainingScreen.tsx:422–423` | Notification route | Sets `activeSessionId` from `notif.sessionId` (session, not exercise) |

**Pairs that can disagree:**

| A | B | Why |
|---|---|-----|
| E1 React `currentExerciseIndex` | E3 DB `current_exercise_index` | Init runs once per session id; later DB updates from other devices/tabs not re-read; local navigation may fail to persist |
| E1 | E5 notification `exerciseId` | Race: notification effect sets exercise index while external SET_DONE effect also sets E6/E7 — order depends on effect scheduling |
| E6 completed exercise | E7 next exercise | External path sets completed idx then may set next idx when `restSeconds <= 0`; rest path leaves cursor on **completed** exercise during rest (~1878) while UI shows rest for that item |
| E10 “CURRENT” chip | E1 | Same prop — consistent **unless** `completionStatuses` implies done while E1 still points there |

### 8. Components that render set numbers — and which source (#6) they use

| Component | File | Set display | Index source |
|-----------|------|-------------|--------------|
| `SetFocusCard` | `SetFocusCard.tsx:111` | Set {setIndex} of {totalSets} | Parent passes `focusSet.setIndex` from **S3** `firstPendingSetIndex` |
| `SetFocusOverlay` | `SetFocusOverlay.tsx:89` | Set {setIndex} of {totalSets} | **S5/S10** via `focusOverlaySetIndex` |
| `RestCountdownCard` | `RestCountdownCard.tsx:110` | Set {nextSetIndex} of {nextTotalSets} | **S15/S16** local compute in `TrainingSessionView` |
| Logged sets list | `TrainingSessionView.tsx:2439` | Set {s.setIndex} | **S4** `performedSets` |
| `EditSetDialog` | `TrainingSessionView.tsx:146, 2504` | Edit/Log Set {setIndex} | `pendingEditSetIndex` (**S5** or edit routing) |
| `FullSessionPanel` | `FullSessionPanel.tsx:84` | `{completed}/{total} sets done` | `exerciseCompletionStatuses` → **S1** per item |
| Session header | `TrainingSessionView.tsx:2172` | Exercise N/M | **E1** (exercise, not set) |
| Progress bar | `TrainingSessionView.tsx:2201–2224` | (visual only) | **E1** + `isExerciseFullyLoggedForItem` (**S1**) |
| `ExerciseCard` | `ExerciseCard.tsx` | Per-set rows + highlight | **S18/S19** — **not mounted** |
| `SessionDetailModal` / `ExerciseDetailsModal` | modals | Historical sets | DB session history (out of active session) |

### 9. Set completion write paths — multiple paths and index agreement

| Path | Entry | DB write | `performed.sets` update | Set index source |
|------|-------|----------|-------------------------|------------------|
| P1 In-app Done | `SetFocusCard` → `handleSetComplete` | `logTrainingSet` / queue / buffer | **`replacePerformedSetsForSessionItem`** (full merge replace) | **S3** / user-edited values on card |
| P2 Overlay Done | `SetFocusOverlay` → `handleSetComplete` | Same as P1 | Same as P1 | **`focusOverlaySetIndex`** (often **S5/S10**, not S3) |
| P3 Edit dialog new set | `EditSetDialog` → `handleSetComplete` | Same as P1 | Same as P1 | `pendingEditSetIndex` |
| P4 Edit dialog update | `EditSetDialog` → `handleSetUpdate` | Updates existing log row | Replace path via update flow | `pendingEditSetIndex` |
| P5 Notification SET_DONE | `guidedTrainingNotificationActions.ts` | `logTrainingSetWithRetry` | **`mergePerformedSetsIntoSessionItemFromDb`** | **`data.setIndex`** from notification payload (**S11**) |
| P6 Skip set | `handleSkip` | Event only; optimistic performed | No full replace shown in skip path | `max(logged)+1` from **S1** (~1749–1750) |
| P7 Offline sync replay | `offlineSync.ts` | `logTrainingSet` + merge | `mergePerformedSetsIntoSessionItemFromDb` | Queued operation payload |

**Index agreement:**

- P1/P2/P3 agree when `focusOverlaySetIndex === firstPendingSetIndex`.
- P5 index is **`data.setIndex`** at action time; guarded by `isSetAlreadyPerformedOnItem` (DB only, ~305–330) — **does not read optimistic layer**.
- P1 uses **replace**; P5 uses **merge** — same end state if consistent, but different read-modify-write timing → transient divergence during refetch.
- P2 can re-log a set P5 already logged if overlay opens via path A with stale `isPerformed` (S6).

---

## Sources of set/exercise position truth

| Source | File:line | Reads from | Used by which UI |
|--------|-----------|------------|------------------|
| DB `training_session_items.performed.sets` | API / React Query `items` | Postgres | Refetch-driven UI; notification stale check (**DB only**) |
| **`optimisticPerformedSets`** (React) | `TrainingSessionView.tsx:367–373, 936–944 | Local state after Done | **S1/S3/S4**, `SetFocusCard`, progress, logged list, overlay `isPerformed` |
| **`firstPendingSetIndex`** | `TrainingSessionView.tsx:2048–2054` | S3 merge on current item | **`SetFocusCard`**, fallback for notification overlay |
| **`focusOverlaySetIndex`** | `TrainingSessionView.tsx:307, 2093, 1902` | Notification params or `ext.nextSetIndex` | **`SetFocusOverlay` only** |
| Notification payload `setIndex` / `nextSetIndex` | `trainingNotificationScheduler.ts`, `guidedTrainingNotificationActions.ts` | Lookahead at schedule / tap time | Deep link → `TrainingScreen` → `notificationAction`; SET_DONE handler |
| **`guidedExternalSetDone` payload** | `guidedExternalSetDoneTransition.ts`, notif handler | Completed + next indices from notification | External rest effect; suppresses overlay when `suppressDuplicateCompletionOverlay: true` |
| **`getFirstPendingSetIndexForItem`** | `guidedExternalSetDoneTransition.ts:27–34` | S1 merge | Accept/reject external rest transition only |
| Rest card next-set compute | `TrainingSessionView.tsx:2253–2290` | S15/S16 | **`RestCountdownCard`** |
| DB `training_sessions.current_exercise_index` | `api.ts:2328+`, init ~668 | Postgres | Initial carousel position only (per session id) |
| **`currentExerciseIndex`** (React) | `TrainingSessionView.tsx:294` | E1 local | Header, progress bar, `SetFocusCard` exercise context, `FullSessionPanel` CURRENT |
| Notification `exerciseId` | `TrainingScreen.tsx:410–427`, TSV ~2071 | Route params | Moves **E1** on tap |
| `localAdjustments` | `TrainingSessionView.tsx:337` | React + DB autoreg | **SetFocusCard** load only (not overlay) |

### Explicit second-system naming

| Primary (intended) | Secondary (competing) |
|--------------------|------------------------|
| DB `performed.sets` + DB `current_exercise_index` | **`optimisticPerformedSets` + `currentExerciseIndex` React cursors** |
| DB-derived first pending set (**S3**) | **Notification lookahead indices + `focusOverlaySetIndex`** |

When **`firstPendingSetIndex` ≠ `focusOverlaySetIndex`**, or **`currentExerciseIndex` ≠ DB cursor / notification `exerciseId`**, the user sees backwards indexing, duplicate Done prompts, or wrong CURRENT marker.

---

## Additional observations (migration gaps)

1. **`ExerciseCard` is orphaned** — no imports; any doc referring to multi-set carousel UI is stale.
2. **`getNextSetIndex` (`logged.length + 1`) is dead** — dangerous if reintroduced (non-contiguous set indices).
3. **DB `phase` / `rest_started_at` written but not restored** on session remount — rest is React-only (`restTimer`); reload can desync rest UI from DB cursor.
4. **`current_exercise_index` init** (`useEffect` deps `[sessionData?.session?.id]` only) does not re-sync if DB cursor changes while the same session stays mounted.
5. **Overlay and `SetFocusCard` stack** — overlay does not hide the main card; dual set numbers are visible behind the modal.
6. **CLAUDE.md / `runtime-state-deletion-map.md`** still describe `runtimeState` reads in `TrainingSessionView` — **out of date** vs current code (optimistic layer replaced runtime for reads).

---

## Manual QA implications (for trace export follow-up)

Reproduce bugs with Guided Trace Viewer by logging:

- `OVERLAY_OPEN` / `OVERLAY_SUPPRESS` vs `SET_DONE` / `EXTERNAL_REST_APPLY`
- Compare trace fields `setIndex`, `nextCurrentSetIndex`, `snapshotCurrentSetIndexBefore/After` (if present) against UI labels on `SetFocusCard` vs `SetFocusOverlay` vs `RestCountdownCard`.

---

*End of audit.*
