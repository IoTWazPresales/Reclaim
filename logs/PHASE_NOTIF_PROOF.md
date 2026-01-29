# PHASE 3 — Notification reliability proof

## Where logs are

| File | Log tags | When |
|------|----------|------|
| `app/src/lib/notifications/NotificationManager.ts` | `[NOTIF_PLAN]`, `[NOTIF_ACTUAL]` | After `reconcile` runs (post–auth/onboard gating). `plannedCount` from `buildNotificationPlan`; `scheduledCount` from `getNotificationDiagnostics`. `missing` / `extra` compare `logicalKey` between plan and actual (trimmed to 10, "+N more" if needed). |

## How to reproduce

1. **Fresh install** (or clear app data).
2. **Allow notifications while signed out:** Open app → trigger notification permission request → grant.
3. **Sign in** and complete **onboarding**.
4. **Refresh notifications:** Foreground app (or reopen) so reconcile runs after auth + onboarded.

Gating unchanged: daily-plan (morning review, mood, sleep) is not scheduled when unauthenticated or not onboarded.

## What to grep for

- `[NOTIF_PLAN] plannedCount=N`
- `[NOTIF_ACTUAL] scheduledCount=M missing=... extra=...`

Success: `missing` empty/none and `extra` empty/none when plan matches actual.
