# Reclaim Split-Brain and State Divergence Map

Date: 2026-04-24

Legend:
- Split-brain: two active authorities for same user-visible state
- Stale: authority singular, but refresh/invalidation delayed
- Missing: required authority path absent/unwired

## 1) Guided training runtime

- Intended source of truth:
  - Single session cursor + set completion state
- Actual sources:
  - `TrainingSessionView` local runtime (`runtimeState`)
  - Session item `performed.sets` persisted rows
  - `training_set_logs` writes from action handlers
  - `optimisticPerformedSets`
- Divergence point:
  - External `SET_DONE` logs set and mutates intents but does not update `performed` path consistently.
  - Runtime resume seeds from `item.performed.sets`, not authoritative set-log stream.
- Symptoms:
  - Session appears progressed in backend but not in current UI.
  - Watch actions accepted, visible cursor lags.
- Severity: Critical
- Evidence:
  - `app/src/lib/notifications/guidedTrainingNotificationActions.ts`
  - `app/src/components/training/TrainingSessionView.tsx`

Classification: **Split-brain (confirmed)**

## 2) Training cursor ownership (current exercise / set)

- Intended source of truth:
  - One cursor authority for current exercise/set
- Actual sources:
  - `currentExerciseIndex` React state in `TrainingSessionView`
  - `runtimeState.currentExerciseIndex`
  - Derived done-sets from merged overlays
- Divergence point:
  - Local index and runtime index can drift; merge logic uses partial overlays.
- Symptoms:
  - Confusing next-set highlighting, occasional jump/stall behavior.
- Severity: High
- Evidence:
  - `app/src/components/training/TrainingSessionView.tsx`

Classification: **Split-brain (confirmed)**

## 3) Notification scheduling/reconcile/action consumption

- Intended source of truth:
  - Intent store + reconcile sink (`NotificationIntentStore` + `NotificationScheduler`)
- Actual sources:
  - Intent+reconcile path
  - Direct `scheduleNotificationAsync` paths (`dailySignal`, `weeklyNarrative`, `moodTrendAlert`)
- Divergence point:
  - Reconcile cancels app-tagged notifications with missing `logicalKey`, while direct schedulers may emit app-tagged notifications outside logical-key contract.
- Symptoms:
  - Reminders missing, churn, or rescheduled unexpectedly.
- Severity: Critical
- Evidence:
  - `app/src/lib/notifications/NotificationScheduler.ts`
  - `app/src/lib/notifications/dailySignalNotification.ts`
  - `app/src/lib/notifications/moodTrendAlert.ts`

Classification: **Split-brain (confirmed)**

## 4) First-set replay/idempotency

- Intended source of truth:
  - First-set intent consumed exactly once
- Actual sources:
  - `training_first:*` intents, startup reconcile, session-view scheduling effects
- Divergence point:
  - Intent cleanup not consistently synchronized with in-app first-set progression and startup/foreground reconcile timing.
- Symptoms:
  - First-set notification re-fires on app open/foreground.
- Severity: Critical
- Evidence:
  - `app/src/components/training/TrainingSessionView.tsx`
  - `app/src/hooks/useNotifications.ts`
  - `app/src/lib/notifications/trainingNotificationScheduler.ts`

Classification: **Split-brain + replay hazard (confirmed/likely mixed)**

## 5) Sync freshness and invalidation

- Intended source of truth:
  - deterministic post-sync freshness contract for query cache + insights
- Actual sources:
  - call-site owned `refreshInsight` + scattered invalidations
  - Dashboard as de facto freshness orchestrator
  - background sync invalidates some keys only
- Divergence point:
  - no single contract enforced across all sync entry points.
- Symptoms:
  - stale tiles, values update only after visiting specific screens.
- Severity: Critical
- Evidence:
  - `app/src/screens/Dashboard.tsx`
  - `app/src/lib/backgroundSync.ts`
  - `docs/release/reclaim_cache_invalidation_map.md`

Classification: **Stale contract fragmentation (confirmed)**

## 6) Dashboard tile state

- Intended source of truth:
  - domain data sources surfaced consistently regardless of navigation path
- Actual sources:
  - mixed query caches + in-dashboard derivations + routine overlays + direct schedulers
- Divergence point:
  - tile composition depends on data that may be invalidated/refreshed by non-dashboard paths at inconsistent times.
- Symptoms:
  - tile appears stale/weak until screen visit or manual refresh.
- Severity: High
- Evidence:
  - `app/src/screens/Dashboard.tsx`

Classification: **Stale (confirmed), split-brain risk (likely)**

## 7) Recovery progression

- Intended source of truth:
  - persisted progression (`recovery:progress`) advances with completion events
- Actual sources:
  - persisted week/stage blob in `lib/recovery.ts`
  - computed “step done” state in `recoveryCardMeta.ts`
- Divergence point:
  - progression mutators (`setRecoveryStage`, `setRecoveryWeek`, `markStageCompleted`) are not wired to completion signals.
- Symptoms:
  - card can show progress while persistent week remains 1.
- Severity: Critical
- Evidence:
  - `app/src/lib/recovery.ts`
  - `app/src/lib/dashboard/recoveryCardMeta.ts`

Classification: **Missing progression authority wiring + split presentation (confirmed)**

## 8) Training setup/program generation and preview

- Intended source of truth:
  - setup preview and runtime generation share same constraints mapping semantics
- Actual sources:
  - runtime/setup save path uses mapped injuries (`mapUiConstraintIdsToEngineInjuries`)
  - preview path still filters UI ids by string pattern (`pain|issues`)
- Divergence point:
  - preview model and runtime model use different injury token translation.
- Symptoms:
  - user sees one plan in preview, gets different behavior/runtime output.
- Severity: Critical
- Evidence:
  - `app/src/screens/training/TrainingSetupScreen.tsx`
  - `app/src/lib/training/setupMappings.ts`
  - `app/src/lib/training/preview/index.ts`

Classification: **Split-brain (confirmed)**

## 9) Sleep data surfacing (Mood/Sleep)

- Intended source of truth:
  - enriched sleep data consistently visible where used
- Actual sources:
  - persisted DB rows mapped via `mapDbSleepToHealth`
  - direct HC reads in some flows
- Divergence point:
  - enrichment persistence and read timing are not guaranteed uniform across screens.
- Symptoms:
  - “additional sleep data not surfacing” and inconsistent mood sleep linkage.
- Severity: High
- Evidence:
  - `app/src/screens/SleepScreen.tsx`
  - `app/src/lib/sleep/mapDbSleepToHealth.ts`
  - `app/src/screens/MoodScreen.tsx`

Classification: **Stale/missing enrichment (likely, Not fully verified)**
