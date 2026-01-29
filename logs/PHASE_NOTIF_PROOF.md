# PHASE 3 — Notification plan vs actual + gating

## Symptom
- Notification delivery reliability: need to verify scheduled vs planned (not “plan only”).
- Morning review / daily plan must not schedule when unauthenticated.

## Code path
1. **Entry:** `NotificationManager.reconcile({ allowUnauthed: false })` from `useNotifications` (mount + AppState active) and `App.tsx` (boot).
2. **Gating:** When `allowUnauthed === false`, we check `supabase.auth.getUser()` and `getHasOnboarded(user.id)`; if no user or not onboarded, return early with `reasonsSkipped` and do not call `buildNotificationPlan` / `reconcileNotifications`.
3. **Plan:** `buildNotificationPlan()` returns `{ notifications, fingerprint }`; plannedCount = plan.notifications.length.
4. **Schedule:** `reconcileNotifications()` cancels existing app notifications and schedules each in the plan.
5. **Proof:** `getNotificationDiagnostics()` before and after gives scheduledCount; we log planned vs actual.

## Fix (surgical)
1. **`app/src/lib/notifications/NotificationManager.ts`**
   - After reconcile: compute `missing = max(0, plannedCount - scheduledCount)`, `extra = max(0, scheduledCount - plannedCount)`.
   - Log `[NOTIF_PLAN] plannedCount=N`.
   - Log `[NOTIF_ACTUAL] scheduledCount=M missing=... extra=...`.
   - Existing `[NOTIF_RECONCILE]` and auth/onboard gates unchanged.

## Verification (runtime proof)
1. Signed-out user: reconcile runs but returns early; logs show `[NOTIF_RECONCILE] Skipped: no auth`; no `[NOTIF_PLAN]` / `[NOTIF_ACTUAL]` (no scheduling).
2. Signed-in + onboarded: after reconcile, logs show `[NOTIF_PLAN] plannedCount=N`, `[NOTIF_ACTUAL] scheduledCount=M missing=... extra=...`; N and M can be compared to confirm delivery proof.
