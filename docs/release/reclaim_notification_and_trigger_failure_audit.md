# Reclaim Notification and Trigger Failure Audit

Date: 2026-04-20  
Scope: guided training notifications, watch actions, mood reminders, mindfulness HR triggers.

## Executive Verdict

Failures are partly shared-root (intent/reconcile/action orchestration complexity) and partly separate-root (mindfulness trigger lifecycle binding).

## 1) Guided Training Notifications

### Current architecture (verified)

1. Session actions create intents (`training_*`) via scheduler helpers.
2. `reconcileNotifications()` materializes intents to OS scheduled notifications.
3. User action handled by `useNotifications` listener/task.
4. `guidedTrainingNotificationActions` mutates intent chain, may log set, invalidates queries.

Primary files:
- `app/src/lib/notifications/trainingNotificationScheduler.ts`
- `app/src/lib/notifications/NotificationScheduler.ts`
- `app/src/hooks/useNotifications.ts`
- `app/src/lib/notifications/guidedTrainingNotificationActions.ts`

### Failure analysis

- Chain is highly stateful and timing-sensitive.
- Multiple idempotency/intents are present, but in-session UI advancement still depends on local runtime path.
- App-open behavior can appear broken even when notification action persisted to backend.

Classification: **likely regression in orchestration coherence**.

## 2) Watch Action Advancement (Done/Next)

### Confirmed defect

- `SET_DONE` and `NEXT_SET` do not directly push the active `TrainingSessionView` runtime state forward.
- They schedule/log/invalidate; UI progression may lag or fail to appear.

Evidence files:
- `app/src/lib/notifications/guidedTrainingNotificationActions.ts`
- `app/src/components/training/TrainingSessionView.tsx`
- `app/src/screens/TrainingScreen.tsx`

Classification: **confirmed disconnected flow**.

## 3) Mood Reminder Scheduling Path

### Verified code path

- Toggle in `MoodScreen` updates notification preferences.
- Calls `forceRescheduleNotifications()`.
- Notification scheduler includes `mood_morning` and `mood_evening` when enabled.

Evidence:
- `app/src/screens/MoodScreen.tsx`
- `app/src/lib/notifications/NotificationScheduler.ts`

### Failure interpretation

- Reported broken behavior not disproven by static code.
- Likely runtime issue (permission state, OS schedule state, or reconcile materialization mismatch).

Classification: **likely runtime-only regression**, not fully verified.

## 4) Mindfulness HR Triggers

### Confirmed wiring problem

- Trigger lifecycle is managed via `useHealthTriggers`.
- Hook is mounted from `MindfulnessScreen`; when screen unmounts, triggers are stopped.

Evidence:
- `app/src/hooks/useHealthTriggers.ts`
- `app/src/screens/MindfulnessScreen.tsx`
- `app/src/lib/health/notificationTriggers.ts`

Result: HR-triggered notifications can appear nonfunctional during normal app usage outside that screen context.

Classification: **confirmed disconnected lifecycle root cause**.

## 5) Shared vs Separate Root Causes

### Shared-root cluster

- Guided training notification issues
- Watch action UI advancement issues
- Potential mood reminder runtime failures

Shared mechanics: notification intents, reconcile loop, action routing, foreground/background transitions.

### Separate-root cluster

- Mindfulness HR triggers are primarily a lifecycle ownership issue (wrong mounting scope), not the same root as training notification chain.

## 6) Build/Profile Influence

- Preview channel + OTA behavior can amplify notification inconsistency perception across testers.
- Device runtime metadata should be captured before final root-cause closure.

## 7) Required Validation Before Fix Implementation

1. Record notification diagnostics before/after guided session actions.
2. Reproduce watch Done/Next with app foregrounded and backgrounded.
3. Confirm mood reminders produce scheduled entries for both logical keys after toggle.
4. Confirm HR trigger scheduling with Mindfulness screen closed to validate lifecycle defect.
