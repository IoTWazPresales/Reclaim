# Reclaim Systemic Incident Report

Date: 2026-04-24
Mode: SYSTEMIC INCIDENT RESPONSE (analysis-only, no broad fix implementation)

## Executive verdict

The preview behavior should be treated as a **systemic integrity incident**, not a UI polish issue.

Most severe failures are not isolated bugs. They are **cross-layer authority and idempotency failures** where session/runtime, notification intent/reconcile, and UI composition each hold partial state and can diverge.

Current state:
- Training runtime + guided orchestration: **incident-active**
- Notification scheduling/replay/idempotency: **incident-active**
- Sync/freshness contracts and dashboard coherence: **incident-active**
- Recovery progression: **functionally disconnected authority**
- Training setup generation: **partially trustworthy core with critical preview/runtime mismatch and output-trust defects**

Release recommendation: **keep release work frozen** until P0 trust-restoration actions are completed and device-verified.

## Severity-grouped findings

### P0 confirmed systemic failures

1. **Training progression split-brain (open UI vs external guided actions)**
- Evidence:
  - `app/src/lib/notifications/guidedTrainingNotificationActions.ts`
  - `app/src/components/training/TrainingSessionView.tsx`
- What happens:
  - External `SET_DONE` path logs a set (`logTrainingSetWithRetry`) and mutates intents/reconcile, but does not update session item `performed` in DB and cannot mutate already-mounted `runtimeState` directly.
  - `TrainingSessionView` progression renders from merged local/runtime/server sources; external mutation can lag/appear missing.
- Impact: user sees backend-ish movement but frontend progression can remain wrong.

2. **Notification authority split causing cancellation/replay instability**
- Evidence:
  - Reconcile cancels app-tagged notifications missing `logicalKey`: `NotificationScheduler.ts` (existing key extraction/cancel path).
  - Direct schedulers produce app-tagged notifications outside intent/reconcile contract: `dailySignalNotification.ts`, `moodTrendAlert.ts`, `weeklyNarrativeNotification.ts`.
- What happens:
  - Reconcile-managed universe and directly scheduled universe overlap and can invalidate each other.
- Impact: “reminders not firing”, inconsistent schedule visibility, accidental re-materialization.

3. **First-set guided replay risk on app open/foreground**
- Evidence:
  - `TrainingSessionView.tsx` first-set scheduling effect + startup/foreground reconcile in `useNotifications.ts`.
  - `training_first:*` intents are not consistently consumed in all in-app progression paths.
- What happens:
  - Startup/foreground reconcile can rematerialize immediate or stale first-set intents depending on intent lifecycle and branch timing.
- Impact: reported “first-set/session notifications re-fire when opening app”.

4. **Recovery progression authority is disconnected from completion signals**
- Evidence:
  - `setRecoveryStage`, `markStageCompleted`, `setRecoveryWeek` exist only in `lib/recovery.ts` (no active progression call path found).
  - Dashboard uses computed card status from `recoveryCardMeta.ts` + live metrics.
- What happens:
  - UI can show step-level completion while stored recovery stage/week remains unchanged (week 1).
- Impact: “recovery path stays on week 1 regardless of completion”.

5. **Training setup preview and runtime generation use different constraint semantics**
- Evidence:
  - Setup save path now maps UI constraints to engine injuries: `TrainingSetupScreen.tsx` + `setupMappings.ts`.
  - Preview path still uses old filter (`pain|issues`) and does not use mapping: `lib/training/preview/index.ts`.
- What happens:
  - Preview can show one prescription while actual session generation uses a different injury model.
- Impact: user trust collapse in setup outputs.

### P0 likely systemic failures (strong evidence, not fully runtime-proven)

6. **Mood reminders still unreliable despite toggle path fixes**
- Likely root: mixed scheduler authorities + reconcile behavior under permission/app-state transitions.
- Evidence modules: `MoodScreen.tsx`, `useNotifications.ts`, `NotificationScheduler.ts`, `moodTrendAlert.ts`.

7. **Additional sleep data not surfacing as expected**
- Likely root: screen depends primarily on persisted DB rows (`listSleepSessions` + `mapDbSleepToHealth`) and not all enriched fields are guaranteed persisted/available at render time.
- Evidence: `SleepScreen.tsx`, `mapDbSleepToHealth.ts`, health sync boundaries.

8. **Tiles stale until visiting certain screens**
- Likely root: freshness relies on scattered call-site invalidation/refresh; dashboard is overused as freshness hub.
- Evidence: `Dashboard.tsx` heavy invalidation + `refreshInsight`; call-site owned refresh policy in architecture docs.

### P1 confirmed failures

9. **Weight increment logic remains inconsistent across training surfaces**
- Evidence:
  - `SetFocusCard` uses exercise-aware step + dumbbell override.
  - `ExerciseCard` set edit still has hard-coded +/-2.5.
- Impact: “some exercises still 2.5kg when inappropriate”.

10. **Calories at session end are structurally missing for many users**
- Evidence:
  - `mergeHealthConnectActiveEnergyIntoTrainingSummary` only writes calories when HC window energy exists and >0.
  - Default HC metric scope excludes active energy for many flows.
- Impact: repeated “calories burned not available” reports.

11. **Layout clipping issues still plausible in multi-surface rows/modals**
- Evidence: partial fixes landed; multiple screens still have dense row controls and device-dependent truncation risk.

### P1 likely failures

12. **Mood-sleep linkage inconsistency**
- Evidence:
  - Correlation is heuristic with lag-choice and varying data completeness (`bestCorrelation` path in `MoodScreen`).
  - Sleep data quality/completeness can vary by source and persistence timing.

13. **Training setup outputs can feel nonsensical (example: 21s x12, 1 set)**
- Evidence:
  - Catalog includes exercise `21s` as normal `elbow_flexion` with no special prescription handling.
  - Engine uses midpoint rep target + set counts by priority and may aggressively reduce isolation sets under adaptation/time/fatigue paths.
  - Preview mismatch with runtime constraints further undermines output trust.

## Confirmed systemic failure themes

- **Authority fragmentation:** more than one actor writes/derives “truth” for the same user-visible state.
- **Replay/idempotency asymmetry:** idempotency exists, but intent consumption and schedule ownership are not consistently unified.
- **Call-site freshness contract drift:** no single enforced policy for sync->invalidate->insight refresh across all entry points.
- **Display-vs-persist divergence:** visible step/session state and persisted state can disagree for meaningful windows.

## Build/profile divergence findings

- Preview/production divergence remains plausible and material:
  - `eas.json` channels split (`preview` vs `production`).
  - OTA enabled (`app.config.ts` + `useAppUpdates.ts`).
- Incident interpretation must include runtime update metadata capture (channel, runtimeVersion, updateId).
- Not fully verified: whether all reported behavior is from one runtime payload vs mixed preview OTA states.

## Why prior passes could miss these failures

1. **Path-level verification bias:** code presence was validated, but cross-path behavioral equivalence (in-app vs notification action path) was not fully proven.
2. **Single-surface checks:** many flows are only broken when crossing surfaces (watch->app, background->foreground, sync->tile).
3. **Insufficient idempotency lifecycle testing:** reconcile loops and intent cleanup were not audited as one finite state machine.
4. **Preview/runtime variance under-tested:** OTA/channel/build profile effects can invalidate branch-only assumptions.
5. **Setup trust not audited end-to-end:** preview generator and runtime generator were treated as equivalent though they now diverge in constraint mapping.

## Most dangerous areas first

1. Guided training action->runtime coherence
2. Notification scheduler authority split and first-set replay
3. Recovery progression disconnected from completion
4. Sync/freshness contract fragmentation (tiles/insights)
5. Training setup output trust (preview vs runtime mismatch)

## Pre-existing issues (not all new regressions)

- Training calories dependency on HC active energy scope.
- Heuristic mood cause-link inference limits.
- UX density/clipping debt in training surfaces.

## Not fully verified

- Exact on-device timing matrix for replay across OEMs/notification stacks.
- Whether each reported tile/sync issue is one bug vs several stale-contract misses.
- Full persistence shape of enriched sleep metadata across all sync paths.
