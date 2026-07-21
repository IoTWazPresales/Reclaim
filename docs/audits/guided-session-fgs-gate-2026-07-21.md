# Guided-session FGS — Gate 1 / Gate 2 checklist (2026-07-21)

**Branch:** `fix/training-confident-ux`  
**Locks:** FGS type `health` (Android fitness best practice) · action queue YES · Expo sticky REMOVED · signal chart Unit B after device Gate 3

## What replaced what

| Removed | Replaced by |
|---------|-------------|
| Expo `TRAINING_SESSION_ACTIVE` sticky intent / LOW channel tile | Native FGS via `react-native-background-actions` (`guidedSessionFgs.ts`) — ongoing system notification |
| “Last OS response only” drain | Durable FIFO `guidedNotificationActionQueue` |

| Unchanged (frozen) |
|--------------------|
| `applySetCompletion` / `sessionWorkAuthority` / `setIntent`+`reconcile` |
| Wear still uses notification actions (`SET_DONE` / `NEXT_SET`) — not Wear companion |

## Gate 1 — static / native (agent)

- [x] Config plugin `plugins/withGuidedSessionForegroundService.js` adds `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_HEALTH`, `ACTIVITY_RECOGNITION`, service `RNBackgroundActionsTask` with `foregroundServiceType=health`
- [x] `app.config.ts` permissions + plugin registered
- [x] `scheduleTrainingSessionActive` removed; reconciler skips leftover `TRAINING_SESSION_ACTIVE`
- [x] FGS start: `scheduleGuidedTrainingSessionStart` + `startGuidedSessionRuntime`
- [x] FGS stop: `clearTrainingIntentsForSession` + `stopGuidedSessionRuntime`
- [x] `npm run typecheck` green
- [x] Focused vitest green (session start, queue, cursor after-persist)

## Gate 2 — process-flow proof (agent, pre-smoke)

Expected call chain:

1. Start guided session → `startGuidedSessionFgs` → OS ongoing “Reclaim training in progress”
2. Wear Done → enqueue → `handleGuidedTrainingNotificationAction` → `applySetCompletion` → after-persist rest/next
3. Finish/clear → `stopGuidedSessionFgs` → ongoing gone

DEV log markers: `[GUIDED_FGS] started|stopped`, `[GUIDED_ACTION_QUEUE] enqueued|drain done`

## Gate 3 — Human device smoke (required before Unit B / claiming Wear fixed)

New EAS **preview** build required (native module + manifest). OTA alone is insufficient.

1. Install new APK; grant Activity Recognition if prompted at session start
2. Start guided session → confirm **system ongoing** FGS tile (not the old quiet Expo sticky)
3. Phone locked / screen off → Wear Done on **early** sets (not only last 2) → rest tile appears without unlock
4. Multiple Dones without opening phone → all sets advance in order (queue), no ghost first-exercise complete on open
5. Finish session → FGS ongoing clears

**If Gate 3 fails:** STOP. Do not revive Expo sticky. Report OEM class; options = FGS policy fix or honest best-effort product call.

## Unit B (signal chart) — code complete 2026-07-21

Combined Home chart: mood + sleep + `training.sessionsThatDay` + `meds.adherencePct7d`; analysis strip; day scrub. Ships with Unit A APK; does not substitute for Wear Gate 3.
