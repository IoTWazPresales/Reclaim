# N-0016 — Stale session timer source-of-truth

**Date:** 2026-09-20  
**Branch:** `fix/training-confident-ux`  
**Class:** discovery. Fix is UI-only; **did not** edit `sessionWorkAuthority` or `applySetCompletion`.

## Reported bug

Overnight guided session shows ~945 min and a non-dismissable “Resume this session?” dialog that traps tab/drawer navigation.

## Source-of-truth map (VERIFIED)

| Concern | SoT | Layer |
|---|---|---|
| Sets completed | `training_session_items.performed.sets` via `getPerformedSetsFromItem` | DB / sessionWorkAuthority **read** |
| Session start | `training_sessions.started_at` | DB |
| Session end | `finalizeTrainingSessionAndCleanup` → `ended_at` | DB write (not this node) |
| Stale **decision** | `isSessionStaleForResume(started_at, items.completedAt, now, 5h)` | UI guard |
| Live **display** timer | `TrainingSessionView` `elapsedSeconds` local state, tick `now - started_at` | UI only |
| Frozen **display** while prompt pending | `freezeElapsedSecondsFromStartedAt(started_at)` | UI only |
| Duration persisted on finish | `finalizeTrainingSessionAndCleanup({ startedAt })` | not the header clock |

**Not writers of the header clock:** notifications, FGS, Wear actions, `applySetCompletion`.

`getPerformedSetsFromItem` is imported as a **reader**. Changing it, or `applySetCompletion`, is out of scope.

## Ranked hypotheses

| # | Hypothesis | Verdict |
|---|---|---|
| H1 | Header clock is wall-clock from `started_at`, so overnight sleep is counted as workout time | **CONFIRMED** (`freezeElapsedSecondsFromStartedAt` + live tick `end - startedAtMs`) |
| H2 | Stale dialog is `dismissable={false}` Portal Dialog, so it covers the whole app including tabs | **CONFIRMED** (`TrainingSessionView.tsx` Dialog) |
| H3 | Stale **decision** ignores last logged set | **REFUTED** — `isSessionStaleForResume` already treats a `completedAt` inside the 5h window as not stale |
| H4 | 5h threshold itself is wrong | **ASSERTED** as product policy (`STALE_SESSION_HOURS = 5`); not the 945 min mechanism |
| H5 | Fix requires rewriting `started_at` or set completion | **REFUTED** as necessary — display origin is local state |

## Race / stale-state / data-loss

- AppState `active` re-sets `staleResumePrompt` to `unevaluated`, so returning from background can re-show the trap. **Race:** a just-resumed user backgrounds and gets the modal again if still past 5h.
- Minimize (`onCancel`) already leaves the DB session intact. Dialog had no path to that, so the only exits were Resume (live 15h clock) or Save & close (finalize).
- Resetting the **display** clock on Resume does not change `started_at`. Finish duration still uses DB `started_at` → `ended_at` (honest wall-clock of the open session). Do not silently rewrite `started_at`.

## Fix in this node (UI only)

1. While the prompt is pending, show **Paused**, not wall-clock from `started_at`.
2. Dialog is dismissable; **Minimize** uses existing `onCancel` (does not end the session).
3. Resume starts a **display bout clock** from now. `started_at` unchanged.

Visual: listed in `docs/eif/AWAITING_APPROVAL.md`.
