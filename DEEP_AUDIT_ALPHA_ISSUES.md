# Deep Audit: Alpha Launch Issues

This document provides root-cause analysis and proposed fixes for the issues reported. No code changes have been made—approval required before implementation.

---

## Issue 1: Sleep Sync – "Data exists but unable to write to Supabase"

### Symptoms

- Integrations show disconnected after app update
- Connecting takes long, "no new sleep data detected"
- Import slow, "attention needed" on each provider
- Dashboard sync shows error: "data exists but unable to write to Supabase"
- Sleep screen shows last night's data correctly

### Root Cause Analysis

**1a. Incorrect `write_failed` when all sessions are skipped (dedupe)**

**Location:** `app/src/lib/sync.ts` lines 938–946

**Logic today:**

```ts
sleepWriteAttempts = pipelineResult.written + pipelineResult.skipped;
sleepWriteSuccesses = pipelineResult.written;
// ...
if (sleepWriteAttempts > 0 && sleepWriteSuccesses === 0) {
  result.debug.sleepSyncStatus = 'write_failed';
}
```

When Health Connect returns 28 sessions and consolidation produces 11 sessions, all 11 can already exist in Supabase (from a prior sync). The pipeline then skips them: `written = 0`, `skipped = 11`, `attempts = 11`. The condition `attempts > 0 && successes === 0` is treated as `write_failed`, even though the data is already in Supabase and no write error occurred.

**1b. Integrations showing disconnected after update**

**Location:** `app/src/lib/health/integrations.ts` – `reconcileStoredIntegrationStatuses`

On every `getIntegrationsWithStatus()` call, the app runs `reconcileStoredIntegrationStatuses()`. It compares stored state (AsyncStorage) with `getRuntimeConnectionState()` (permissions/SDK). If the runtime check returns `false` while stored says `connected`, it overwrites to disconnected. After an app update:

- OAuth tokens or Health Connect bindings can take a moment to revalidate
- `healthConnectHasPermissions()` or `googleFitHasPermissions()` may fail temporarily
- Reconcile then marks integrations as disconnected even though permissions are still granted

**1c. Cooldown vs. stale results**

Sync coordinator uses cooldowns (e.g. 3 min for `dashboard_foreground`). A sync that returns cached/stale `lastResult` may show `write_failed` from an earlier run instead of the latest outcome.

### Proposed Fixes (in order)

1. **Fix sleep status when all sessions skipped (primary fix)**  
   - In `sync.ts`, when `sleepWriteAttempts > 0`, `sleepWriteSuccesses === 0`, and `sleepWriteErrors.length === 0`, set `sleepSyncStatus = 'synced'` and avoid `saveError`. Only use `write_failed` when there were actual write failures (e.g. `sleepWriteErrors.length > 0` or a pipeline exception).

2. **Soften reconcile on app foreground**  
   - Avoid overwriting stored `connected: true` with `disconnected` solely from a single failed runtime check. Options:  
     - Add retries with backoff before marking disconnected, or  
     - Only reconcile when user explicitly refreshes Integrations, or  
     - Use a short grace period after app launch before treating runtime failure as disconnect.

3. **Clarify sync status semantics**  
   - Introduce an explicit status (e.g. `all_skipped_existing`) when `skipped > 0` and `written === 0` with no errors, so the UI can show “Data up to date” instead of an error.

---

## Issue 2: Training Countdown & Notifications

### Symptoms

- Prep countdown and rest timer don’t advance when app is in background
- Notifications don’t appear on watch
- Phone notifications only show after reopening the app
- Tapping “Done” on notification: first time no effect, second time notification goes away but session doesn’t advance, third time a flood of old/duplicate notifications

### Root Cause Analysis

**2a. Timers don’t run in background**

**Locations:**

- `app/src/components/training/GuidedPrepScreen.tsx` – `setInterval` every 1s for countdown
- `app/src/components/training/RestTimer.tsx` – `setInterval` every 100ms for rest timer

On mobile, JS timers (`setInterval`/`setTimeout`) are throttled or paused when the app is backgrounded. The countdown and rest timer only update when the app is in the foreground.

**2b. Notifications scheduled but not firing in background**

Training flow already schedules `TRAINING_SET` with a `seconds` trigger (delayed). However:

- Expo’s `timeInterval` triggers can be throttled or dropped by the OS when the app is killed
- On Wear OS, the companion app must be in the right state for notifications to surface on the watch
- No fallback exists for “show immediately when app returns” if the scheduled notification was dropped

**2c. Notification response handling when app is backgrounded**

**Location:** `app/src/hooks/useNotifications.ts` lines 625–677

On foreground:

- `addNotificationResponseReceivedListener` fires and `processNotificationResponse` runs
- `getLastNotificationResponseAsync` is used to process any response queued while backgrounded

Problems:

1. If the app was killed, the listener is not active when the user taps. The response is queued and only processed when the app is opened again.
2. `processNotificationResponse` can run before the Training screen / session runtime is mounted. SET_DONE updates runtime state and invalidates queries, but if the session view isn’t mounted, UI may not reflect the update.
3. No explicit “reload session state from DB” after processing a notification response, so stale in-memory state can persist.

**2d. Duplicate / old notifications**

**Location:** `app/src/lib/notifications/NotificationScheduler.ts`, `NotificationIntentStore.ts`

- Intents are stored in AsyncStorage with TTL. When `reconcileNotifications()` runs, it re-schedules from intents.
- `cleanupPastNotifications()` removes past-due notifications, but if reconcile runs before cleanup, or if intents contain stale entries, duplicate or old notifications can be scheduled.
- Each SET_DONE/NEXT_SET can schedule new intents; if responses are processed out of order or multiple times, intents can accumulate and cause a burst of notifications.

### Proposed Fixes (in order)

1. **Use scheduled notifications instead of in-app countdown for prep**  
   - When user taps “Start” after prep, schedule the first-set notification immediately (as today).  
   - For the prep countdown: schedule a single notification for “Prep complete – start now” at `now + secondsTotal`.  
   - Show a non-live UI message like “Close or lock your phone. You’ll be notified in X seconds” instead of a live countdown that depends on JS timers.

2. **Don’t rely on in-app rest timer for notifications**  
   - When rest starts, schedule `TRAINING_SET` with `seconds = restSeconds` (already done).  
   - Treat the notification as the source of truth. When the user returns to the app, load session state from DB/runtime and ignore stale in-memory timer state.  
   - Optionally: when app returns to foreground during rest, compare current time vs. rest start time and, if rest is over, auto-advance.

3. **Robust notification response handling**  
   - When `processNotificationResponse` handles SET_DONE/NEXT_SET, invalidate training queries and, if the Training screen is mounted, explicitly refetch session state from DB.  
   - Ensure SET_DONE handler is idempotent (e.g. by set index) to avoid double-processing.  
   - After processing, clear or update the relevant intent so it isn’t re-scheduled.

4. **Intent cleanup and deduplication**  
   - When scheduling a new TRAINING_SET/TRAINING_REST intent, remove older intents for the same session/exercise/set to avoid duplicates.  
   - Run `cleanupPastNotifications()` before `reconcileNotifications()` on app start.  
   - Ensure reconcile uses a stable fingerprint so it doesn’t repeatedly add the same notifications.

---

## Issue 3: ReclaimLogo / Splash Screen

### Symptoms

- Center appears as a plain blue circle with no “R”
- Rings don’t line up with the logo; they don’t pass through the orb
- Outside orbs follow their path correctly
- Overall shape doesn’t match the intended logo

### Root Cause Analysis

**3a. Skia `Text` “R” not rendering**

**Location:** `app/src/components/ReclaimLogo.tsx` lines 137–138, 173

```tsx
<Text x={textX} y={textY} text="R" font={font} color={R_BLUE} />
```

- Skia’s `Text` uses `matchFont({ fontFamily: 'System', ... })`. On Android, `'System'` may not resolve to a font that Skia can render.
- `measureText` / `getSize` can be undefined, leading to wrong `textX`/`textY` and the “R” being off-screen or invisible.
- Some Skia/React Native Skia versions have known issues with `Text` on Android.

**3b. Ring alignment**

**Location:** `ReclaimLogo.tsx` lines 21–24, 51–68

Rings are ellipses with `rx: 42`, `ry: 28`, rotations 0°, -38°, 38°. The design assumes they intersect at the center like the reference logo. Current values may have been chosen without matching a reference image, so the rings don’t cross the central orb as intended.

**3c. Drawing order**

The “R” is drawn last (after orbs). If it doesn’t render, the center will look like a plain blue circle from the glow only.

### Proposed Fixes (in order)

1. **Replace Skia `Text` with a path-based “R”**  
   - Convert the “R” into an SVG-like path and render it with Skia `Path` instead of `Text`. This avoids font resolution issues and works consistently across platforms.

2. **Use a raster asset as fallback**  
   - Use the existing `splash.png` (or equivalent) as the center “R” asset via Skia `Image` or React Native `Image`. This guarantees visual consistency with the intended logo.

3. **Align rings with reference logo**  
   - Obtain exact ring radii, rotations, and positions from the reference asset. Update `RING_1`, `RING_2`, `RING_3` so they intersect at the center and match the splash/logo.

4. **Validate layout**  
   - Log or assert `font.measureText('R')` and `font.getSize()` during development. If they are undefined, avoid using them and switch to a path or image-based “R”.

---

## Summary of Files to Change

| Area | File(s) | Change |
|------|---------|--------|
| Sleep status | `app/src/lib/sync.ts` | Treat `skipped > 0`, `written === 0`, no errors as success, not `write_failed` |
| Integrations | `app/src/lib/health/integrations.ts` | Make reconcile less aggressive (retries/grace period) |
| Sleep UI | `app/src/screens/Dashboard.tsx`, `SleepScreen.tsx`, `IntegrationsScreen.tsx` | Use new status semantics for messages |
| Prep countdown | `app/src/components/training/GuidedPrepScreen.tsx` | Replace live countdown with scheduled notification + static message |
| Rest timer | `app/src/components/training/RestTimer.tsx`, `TrainingSessionView.tsx` | Rely on DB/notification for rest completion; refetch on foreground |
| Notification handling | `app/src/hooks/useNotifications.ts` | Refetch session state, ensure idempotency, clear intents after use |
| Intent cleanup | `app/src/lib/notifications/NotificationScheduler.ts`, `NotificationIntentStore.ts` | Dedupe and prune training intents; run cleanup before reconcile |
| ReclaimLogo | `app/src/components/ReclaimLogo.tsx` | Replace `Text` with path or image, correct ring geometry from reference |

---

## Test Plan (Post-Fix)

1. **Sleep:** Connect Health Connect, sync, close app, reopen, sync again. Should show “synced” or “up to date”, not “write failed”.
2. **Integrations:** Update app, reopen. Integrations that were connected should remain connected unless permissions were actually revoked.
3. **Training:** Start guided session, background during prep, then during rest. Verify notifications fire and “Done” advances the session.
4. **Logo:** Verify “R” and rings on loading screen on both Android and iOS.
