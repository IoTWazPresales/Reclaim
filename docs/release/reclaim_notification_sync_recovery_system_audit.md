# Reclaim Notification, Sync, Recovery System Audit

Date: 2026-04-24
Scope: guided training notifications, watch action/UI progression, mood reminders, sync/freshness invalidation, dashboard tile hydration, recovery stagnation.

## Executive trust verdict

- Notifications/guided orchestration: **low trust (incident-active)**
- Sync/freshness coherence: **medium-low trust (contract fragmentation)**
- Recovery progression: **low trust (missing progression wiring)**

These are related but not identical failures:
- Shared root cluster: notification intents/reconcile/action lifecycle + stale refresh contracts.
- Separate root cluster: recovery stage/week progression wiring missing.

## 1) Guided training notifications

### Confirmed architecture

- Intent storage: `NotificationIntentStore.ts`
- Reconcile sink: `NotificationScheduler.ts`
- App listeners + foreground/startup reconcile: `useNotifications.ts`
- Action handling: `guidedTrainingNotificationActions.ts`

### Confirmed failure modes

1. External actions mutate intents and often DB logs, but open runtime UI can remain stale.
2. First-set lifecycle is vulnerable to replay on startup/foreground reconcile.
3. Multiple training scheduling points (session view + handler + prep path) increase race complexity.

## 2) Replay/idempotency analysis

### Why first-set can re-fire

- `training_first:*` intent exists.
- Startup/foreground in `useNotifications` reconciles frequently.
- First-set intent clearing is branch-dependent and not uniformly tied to in-app progression consumption.
- Some first-set schedules are immediate (`seconds: 0`) when not tied to delayed `scheduledAt` branch.

### Why guided notifications are unreliable

- Mixed authorities (direct schedule vs intent/reconcile, action side effects vs UI runtime state).
- Reconcile attempts to enforce plan globally but not all notifications belong to same contract surface.

### Why reminders may fail or replay

- Reconcile cancels app-tagged notifications without `logicalKey`.
- Directly scheduled reminder-like notifications may be removed unintentionally.
- Permission and foreground lifecycle transitions trigger rescheduling windows.

## 3) Mood reminders

### Confirmed

- Toggle path and force-reschedule are present in `MoodScreen.tsx` and `NotificationScheduler.ts`.

### Likely root issue

- Reliability is impacted by scheduler authority split and reconcile cancellation policy more than by simple toggle-state bug.

Status: **Likely, Not fully verified** on device matrix.

## 4) Sync/invalidation freshness

### Confirmed

- No global enforced sync->refresh contract.
- Call-site policy governs whether `refreshInsight` runs after sync.
- Dashboard carries heavy refresh burden.

### User-visible impact

- Data can look stale until visiting dashboard or manual refresh path.
- Daily signal can churn when top insight identity changes during frequent sync/refresh cycles.

## 5) Dashboard tile hydration

- Tiles consume multiple query caches plus in-dashboard derivations.
- Freshness depends on distributed invalidation triggers.
- “Need screen visits first” report is credible and consistent with current architecture.

## 6) Recovery progression stagnation

### Confirmed

- Recovery persistence API exists with `currentWeek/currentStage` mutation functions.
- Those mutators are not wired to completion events in core flows.
- Dashboard card computes progress-like state from live signals independently.

### Result

- Persistent stage can remain week 1 while card steps appear done/in-progress.

## 7) Shared root vs separate root summary

### Shared-root cluster (same systemic family)

- Guided notifications reliability
- Watch action/UI progression mismatch
- Mood reminders inconsistency
- First-set replay
- Tile freshness drift

Primary shared causes:
- fragmented scheduler authority
- partial idempotency lifecycle
- call-site freshness contract fragmentation

### Separate-root cluster

- Recovery stage/week stagnation (missing progression wiring)

## 8) Repairability

- Notifications/guided: **FOCUSED RE-ARCHITECTURE**
- Sync freshness contracts: **FOCUSED RE-ARCHITECTURE**
- Recovery progression: **TARGETED REPAIR + small architecture cleanup**

## Not fully verified

- OEM-specific notification behavior variances.
- Exact prevalence of each replay branch on current preview runtime payloads.
