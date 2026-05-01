# P0-2 Notification replay / first-set refire (implementation note)

Date: 2026-04-24

## Root cause

`reconcileNotifications` short-circuited when the plan **fingerprint** matched the last run **only if** every merged `logicalKey` appeared in `getAllScheduledNotificationsAsync()`.

**Immediate** notifications (`trigger: null` → Expo delivers once) usually **do not** remain in the scheduled list after delivery. Guided **first set** (`training_first:*` with no prep delay), **TRAINING_REST**, and **immediate TRAINING_SET** (`seconds: 0`) therefore looked “missing” on every startup/foreground reconcile, forcing a **re-schedule** and a **refire** of stale state.

## Contract

- **Native-queue presence** is only required for planned entries whose trigger is **not** immediate (interval, date, daily, etc.).
- **Immediate** planned entries are satisfied by a stable fingerprint alone; they must not drive “missing keys → reschedule” when the plan has not changed.

## Code

- Pure helpers: `app/src/lib/notifications/notificationPlanTrigger.ts` — `plannedNotificationExpectsNativeScheduledEntry`, `mergedPlanSatisfiesNativeScheduledPresence` (no Expo — testable)
- Reconcile fast-path: `app/src/lib/notifications/NotificationScheduler.ts` (`runReconcileImmediate`)
- Tests: `app/src/lib/notifications/__tests__/notificationSchedulerPresence.test.ts`

## Non-goals (this pass)

- P0-3 `logicalKey` ownership across non-training families unchanged.
- No change to intent TTL or `scheduledAt`-past intent garbage collection (would need careful SET_DONE parity).
