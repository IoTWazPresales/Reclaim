# Stale-session audit (Phase 7 / B1-S-01)

**Date:** 2026-07-15  
**Branch:** `chore/reclaim-uiux-audit-pilot`  
**Finding:** B1-S-01 — overnight in-progress session resumes with a live elapsed clock (e.g. 945+ min) and blocks Today/History.  
**Scope:** Diagnosis only in this document. Part B remediation is additive UI guard only — no `sessionWorkAuthority` internals, no `applySetCompletion`, no notification reconciler, no completion-transition changes.

---

## Verdict (gate for Part B)

**Proceed to Part B.** Timer and “active session” activation live entirely in `TrainingSessionView` / `TrainingScreen` React state. `sessionWorkAuthority` owns **work position** (which exercise/set is next) from DB `performed.sets` + cursor — **not** elapsed time and **not** `activeSessionId`. A stale-session dialog + paused clock can be guarded without modifying `sessionWorkAuthority` internals.

---

## 1. Where the session elapsed timer derives from

### Primary UI timer — `TrainingSessionView`

| Symbol | Location | Role |
|--------|----------|------|
| `elapsedSeconds` / `setElapsedSeconds` | `TrainingSessionView.tsx` (~L316) | Display state for the header clock |
| `startedAtMs` | `TrainingSessionView.tsx` (~L389) | `new Date(session.started_at).getTime()` |
| `endedAtMs` | `TrainingSessionView.tsx` (~L390) | Optimistic or DB `ended_at` |
| `isEnded` | `TrainingSessionView.tsx` (~L388) | `optimisticEndedAt \|\| session.ended_at` |
| Timer `useEffect` | `TrainingSessionView.tsx` (~L470–490) | Wall-clock tick |

**Derivation (not interval-accumulated pause state):**

```text
effectiveStartMs = startedAtMs || (!isEnded ? Date.now() : null)
each tick:
  end      = endedAtMs ?? Date.now()
  diffSec  = max(0, floor((end - effectiveStartMs) / 1000))
  setElapsedSeconds(diffSec)
```

- While active (`!endedAtMs`), a `setInterval(tick, 1000)` keeps recomputing from **`started_at` → wall-clock `Date.now()`**.
- There is **no** separate “paused elapsed” store for the session clock today. Rest timer (`useRestCountdown` / `restTimerPaused`) is independent of session elapsed.
- If `started_at` is missing but the session is not ended, the effect falls back to `Date.now()` as start (timer starts at 0 from mount).

### Shared helper (not what the session header uses)

| Symbol | Location | Role |
|--------|----------|------|
| `deriveElapsedSeconds(startedAt)` | `sessionDerivedState.ts` (~L53–56) | Same formula: `floor((Date.now() - startedAt) / 1000)` |
| `computeSessionSummaryFromItems` | `sessionDerivedState.ts` (~L78–80) | On finish: `endedAt - startedAt` |

The live header clock is the **local effect in `TrainingSessionView`**, not a call into `sessionWorkAuthority`.

### What this is *not*

- Not driven by React Query refetch interval (that only refreshes session payload every 3s while `activeSessionId` is set — `TrainingScreen.tsx` `activeSessionQ`).
- Not owned by `sessionWorkAuthority.deriveActiveWorkTarget` (set/exercise position only).

---

## 2. What determines a session is “active” on app launch / TrainingScreen mount

### Authority for “show session UI”: `activeSessionId` in `TrainingScreen`

| Symbol | Location | Role |
|--------|----------|------|
| `activeSessionId` / `setActiveSessionId` | `TrainingScreen.tsx` (~L167–169) | **Local React state** — sole gate for rendering `TrainingSessionView` |
| `activeSessionIdRef` | `TrainingScreen.tsx` (~L168–169) | Mirror for effect guards |
| `inProgressSession` | `TrainingScreen.tsx` (~L322–326) | First row from `listTrainingSessions(50)` with `started_at && !ended_at` |
| DB resume `useEffect` | `TrainingScreen.tsx` (~L335–352) | Cold start / mount: if `inProgressSession` and not dismissed → `setActiveSessionId(inProgressSession.id)` |
| Notification deep-link effect | `TrainingScreen.tsx` (~L354–372) | Sets `activeSessionId` from `notif.sessionId` or falls back to `inProgressSession` |
| Early return | `TrainingScreen.tsx` (~L940–962) | `if (activeSessionId && activeSessionQ.data) return <TrainingSessionView … />` |

**Definition of in-progress (DB / list):**

```ts
// TrainingScreen.tsx — inProgressSession
sessionsQ.data.find((s) => s.started_at && !s.ended_at)
```

No age check. No “last set within N hours” check. Presence of open `started_at` + null `ended_at` is enough.

**Dismiss-without-end:** `onCancel` from session view sets `dismissedResumeSessionIdRef` and clears `activeSessionId` (~L957–960). Auto-resume is skipped for that id until AppState returns to `active` (ref cleared ~L328–332). That path **minimizes** UI; it does **not** end the session or stop the overnight clock on next full resume.

### What `sessionWorkAuthority` does *not* hold

| Symbol | Role |
|--------|------|
| `deriveActiveWorkTarget` | Next pending set from `performed.sets` + cursor |
| `resolveExerciseIndexFromSession` | Clamp `current_exercise_index` |
| `getPerformedSetsFromItem` / `completedAt` | Logged-set slices for work position |

**`activeSessionId` is not in `sessionWorkAuthority`.** Activation is 100% `TrainingScreen` state + sessions list query.

---

## 3. Why an overnight session resumes with a running clock

Causal chain:

1. User leaves a session open (`started_at` set, `ended_at` null) — e.g. overnight.
2. Next open of Training: `sessionsQ` loads → `inProgressSession` matches that row.
3. Resume effect (~L343–345) sets `activeSessionId` **silently** (no prompt for age).
4. Early return mounts `TrainingSessionView` with that session’s `started_at` from yesterday.
5. Timer effect (~L470–490) starts `setInterval` immediately:  
   `elapsed = now - started_at` → **900+ minutes** (audit evidence: `docs/audits/evidence/training-today-loaded.png`, finding B1-S-01).

There is **no** stale threshold on the UI path today. (Notification scheduling has a separate 12h stale cutoff in `trainingNotificationScheduler.ts` — unrelated to the session header clock and out of scope for this guard.)

---

## 4. What prevents Today / History tabs from rendering while a session is “active”

**Early return in `TrainingScreen` before the tabbed shell:**

```ts
// TrainingScreen.tsx ~L940
if (activeSessionId && activeSessionQ.data) {
  return <TrainingSessionView ... />;
}
```

While that condition holds, the component never reaches the Today / History tab UI further down the same file. Tabs are not hidden by a flag inside the session view — they are **unmounted / never rendered** because the screen returns the session view exclusively.

Minimizing (`onCancel` → clear `activeSessionId` without ending) restores the tab shell; auto-resume can take over again after AppState foreground clears the dismiss ref.

---

## 5. Finish / abandon paths (for Part B Discard wiring)

| User action | Handler | Termination |
|-------------|---------|-------------|
| **Finish session** (confirm dialog) | `handleComplete` → `finalizeTrainingSessionAndCleanup` | Ends session (`ended_at`), celebration / mood prompt — **canonical finish** |
| **Cancel & delete session** | `handleCancelSession` → `deleteTrainingSession` | Hard delete — **not** Finish |
| Alert “End & save” when starting another day | `endInProgressSessionWithOptionalEnergySummary` → same finalize helper | Finish-equivalent from list/day-press |

**Part B Discard must invoke the same path Finish uses** (`handleComplete` / `finalizeTrainingSessionAndCleanup`) — no new termination routine, no delete-as-discard.

---

## 6. Part B design constraints (from this audit)

| Constraint | Implication |
|------------|-------------|
| Guard without `sessionWorkAuthority` internals | Evaluate stale in `TrainingSessionView` (and/or before silent resume in `TrainingScreen`); use `session.started_at` + max `performed.sets[].completedAt` via existing `getPerformedSetsFromItem` **as a read**, not by changing authority |
| Pause clock until choice | Gate the timer `useEffect` so interval does not run while prompt is pending; show frozen `deriveElapsedSeconds(started_at)`-style value (wall age at pause) or hold last tick without live interval |
| Constants home | New module `app/src/lib/training/sessionUiConstants.ts` — session **UI** thresholds (not work-position authority) |
| Production threshold | `STALE_SESSION_HOURS = 6` |
| DEV simulate | `__DEV__` override minutes (documented below) — restore production 6h when override unset |
| Instrumentation | `logger.debug` with a dedicated tag consistent with existing session tags (e.g. `[STALE_SESSION]`) or `[GUIDED_TRACE]`-style payload when guided instrumentation is on — do not invent a second completion pipeline |
| Out of scope | `applySetCompletion`, `guidedSetCompletionCanonical`, `sessionWorkAuthority` body, notification reconciler, completion transition semantics |

### Stale predicate (Part B)

Session is **stale** when **both**:

1. `started_at` is older than `STALE_SESSION_HOURS` (or DEV minute override), **and**
2. No performed set has `completedAt` within that same window (no recent logging activity).

If either fails (recent start, or a set logged inside the window), resume current behavior (live clock, no dialog).

### Simulate / test (DEV)

| Method | How |
|--------|-----|
| **Preferred** | Set `EXPO_PUBLIC_STALE_SESSION_MINUTES` (e.g. `1` or `5`) in local `.env` / Metro env. When set in `__DEV__`, threshold = that many **minutes** instead of 6 hours. Unset → production 6h. |
| Manual alternate | Leave a session open with `started_at` > 6h ago and no sets (or only old `completedAt`), reopen Training — expect “Resume this session?” with paused clock. |
| Discard | Confirm → same finalize path as Finish. |
| Resume | Confirm → live interval from `started_at` → now (current behavior). |

---

## 7. STOP condition check

| Question | Answer |
|----------|--------|
| Does timer/activation logic live inside `sessionWorkAuthority` internals in a way that cannot be guarded without modifying those internals? | **No.** |
| Part B allowed? | **Yes** — additive UI in `TrainingSessionView` (+ constants module; optional TrainingScreen coordination only if needed without changing authority). |

---

## Citations index

| Topic | File / symbol |
|-------|----------------|
| Live elapsed clock | `TrainingSessionView.tsx` — `elapsedSeconds`, timer `useEffect` (~L470–490) |
| `started_at` / `ended_at` | `TrainingSessionView.tsx` — `startedAtMs`, `endedAtMs`, `isEnded` |
| Active session id | `TrainingScreen.tsx` — `activeSessionId` |
| In-progress detection | `TrainingScreen.tsx` — `inProgressSession` |
| Auto-resume on mount | `TrainingScreen.tsx` — DB resume `useEffect` (~L335–352) |
| Tabs blocked | `TrainingScreen.tsx` — early return (~L940) |
| Work position (not timer) | `sessionWorkAuthority.ts` — `deriveActiveWorkTarget`, `getPerformedSetsFromItem` |
| Finish path | `TrainingSessionView.tsx` — `handleComplete` → `finalizeTrainingSessionAndCleanup` |
| Audit evidence | `docs/audits/ui-audit-batch-1.md` B1-S-01; `docs/audits/evidence/training-today-loaded.png` |

---

## Part B remediation notes (implemented after this audit)

| Item | Detail |
|------|--------|
| Constants | `app/src/lib/training/sessionUiConstants.ts` — `STALE_SESSION_HOURS = 6`, `getStaleSessionThresholdMs()` |
| Predicate | `app/src/lib/training/staleSessionGuard.ts` — `isSessionStaleForResume` |
| UI | `TrainingSessionView` — Dialog on mount when stale; `staleResumePrompt === 'pending'` freezes timer (no interval) |
| Discard | `handleComplete` → `finalizeTrainingSessionAndCleanup` (Finish path) |
| DEV override | `EXPO_PUBLIC_STALE_SESSION_MINUTES` (positive) in `__DEV__` only |
| Log tag | `[STALE_SESSION]` |
| Untouched | `applySetCompletion`, `guidedSetCompletionCanonical`, `sessionWorkAuthority` internals, notification reconciler |
