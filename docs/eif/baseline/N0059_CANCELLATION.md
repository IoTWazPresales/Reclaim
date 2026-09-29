# N-0059 — notification cancellation authority

Status: source-validated on 2026-09-29. Not complete.
OS cancellation on a device is not proven. N-0066 still owns rest-timer identity.

## What changed

`NotificationScheduler` is the only application caller of
`scheduleNotificationAsync` and `cancelScheduledNotificationAsync`.
`cancelAllScheduledNotificationsAsync` is not called anywhere under `app/src`.

`cancelRemindersForMed` clears `med:{id}:` intents and reconciles. A test with
the real store and reconciler shows the other medication, the sleep intent, and
a pending `training_at` prompt remain, and the reconciler cancels the removed
medication's scheduled row only.

`cancelAllReminders` clears saved reminder intents and reconciles. It leaves
`training_now`, `training_at`, `training_stale`, `training_active`,
`mindfulness_session_active`, and `meditation_session_active`. Daily reminders
that come from notification settings are rebuilt by reconcile. The two Settings
buttons now say "Clear reminder notifications" and the alert says saved
reminders were cleared, settings still control daily reminders, and open
session guidance stays.

`cleanupPastNotifications` is removed. Past medication intents already leave the
reconcile plan, and the reconciler cancels those scheduled rows.

Guided clear helpers dismiss a presented tile, clear intents, and call
`reconcileNotifications`. They do not cancel scheduled rows themselves.
`applySetCompletion` is unchanged. The one health foreground service is unchanged.

`dismissNotificationAsync` remains outside the scheduler. It removes a tile
that is already showing. N-0066 still has to stop a stale rest completion from
dismissing a newer now-slot prompt.

## Proof

- Focused: `notificationCancellation.test.ts` 5/5, plus intent-race and rest-timer
  files, 25/25.
- `npm run typecheck`: 0 errors.
- Git Bash `npm run audit:training-dual-paths`: 27/27.
- `npm run med-catalog-qa`: 357 rows, 0 governance issues. An earlier run under
  typecheck contention exited 1 after printing that same report because the
  thread runner timed out starting; the quiet re-run exited 0.
- Default `npm test -- --reporter=verbose`: 154 files, 967 passed, 3 failed
  (970) in 422.06s. All three failures are 5000ms timeouts in
  `readCacheRepository`, `smallModuleMirrors.read`, and
  `moodService.deviceFirst`. Those files do not import the cancellation change.
  Isolated re-run: 3 files / 10 tests PASS. The `--testTimeout=30000` full
  retry passed 154 files / 970 tests in 242.88s. The default timeouts stay
  N-0052. Two earlier default runs and one 30-second run stalled with a flat
  process and were discarded. They are not results.

Local logs: `.eif/audit/N0059-vitest-default.txt`.

No guided, rest, Done, Doze, lock-screen, or Wear journey was run. N-0017 and
N-0061 stay non-compliant. N-0066 is still proposed.
