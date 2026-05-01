# Reclaim Incident Execution Plan (Do Not Implement Yet)

Date: 2026-04-24
Policy: execution sequencing for incident recovery only.

## P0 Stop-the-Bleeding

### P0-1 Unify guided set completion contract (in-app and external)
- **Status (2026-04-24):** Done — set log + `training_session_items.performed` now converge via shared persistence helpers; `SET_DONE` awaits DB write + performed merge before scheduling/navigation; offline `insertSetLog` replay merges performed. See `docs/release/reclaim_p0_1_set_completion_contract.md`.
- Goal: one canonical set-completion mutation path for runtime + DB + intents.
- Likely files:
  - `app/src/components/training/TrainingSessionView.tsx`
  - `app/src/lib/notifications/guidedTrainingNotificationActions.ts`
  - `app/src/lib/training/runtime/sessionRuntime.ts`
  - `app/src/lib/api.ts` / training repository layer used by actions
- Blast radius: High (training session core)
- Dependencies: none; first action
- Must test:
  - watch `SET_DONE`/`NEXT_SET` with app open and backgrounded
  - no duplicate set logs
  - UI cursor and performed state parity after external actions

### P0-2 Kill first-set replay and harden intent consumption
- **Status (2026-04-24):** Done — reconcile no longer treats one-shot **immediate** planned notifications as “missing from the OS queue” after delivery (fixes first-set / TRAINING_REST / immediate SET refire on app open). Predicate centralized as `mergedPlanSatisfiesNativeScheduledPresence` in `notificationPlanTrigger.ts`. See `docs/release/reclaim_p0_2_notification_replay_contract.md`.
- Goal: ensure `training_first:*` consumed exactly once per set lifecycle.
- Likely files:
  - `app/src/lib/notifications/trainingNotificationScheduler.ts`
  - `app/src/components/training/TrainingSessionView.tsx`
  - `app/src/hooks/useNotifications.ts`
  - `app/src/lib/notifications/NotificationScheduler.ts`
- Blast radius: High
- Dependencies: P0-1 preferred (shared action contract)
- Must test:
  - cold start after first-set schedule
  - foreground/background transitions during prep and after first set
  - reconcile cycles do not regenerate consumed first-set notifications

### P0-3 Enforce one notification ownership contract
- **Status (2026-04-25):** In this incident execution sequence, P0-3 priority was redirected to the proven recovery progression authority gap. Recovery now advances from deterministic stage-completion evaluation on Dashboard (`advanceRecoveryProgressFromStageCompletion`) instead of remaining static at week 1. See `docs/release/reclaim_p0_3_recovery_progression_contract.md`.
- Goal: reconcile-managed notifications must have `logicalKey`, and non-reconcile notifications must be isolated from reconcile cancellation.
- Likely files:
  - `app/src/lib/notifications/NotificationScheduler.ts`
  - `app/src/lib/notifications/dailySignalNotification.ts`
  - `app/src/lib/notifications/moodTrendAlert.ts`
  - `app/src/lib/notifications/weeklyNarrativeNotification.ts`
  - optional policy wrappers in notification domain
- Blast radius: High (all notifications)
- Dependencies: P0-2
- Must test:
  - mood reminders on/off
  - daily signal schedule stability same-day and cross-day
  - no cross-cancellation between direct and reconcile-managed notifications

### P0-4 Wire recovery progression to actual completion events
- Goal: stored `currentWeek/currentStage` advances from deterministic completion evaluator, not only computed card state.
- Likely files:
  - `app/src/lib/recovery.ts`
  - `app/src/lib/dashboard/recoveryCardMeta.ts`
  - `app/src/screens/Dashboard.tsx`
  - event sources (mood log, sleep sync, meds/training completion)
- Blast radius: Medium-high
- Dependencies: none, but can follow P0-1..P0-3
- Must test:
  - progression from week 1 to later weeks with realistic event sequence
  - no accidental stage jumps/regressions
  - card state matches persisted stage/week

### P0-5 Fix setup preview/runtime semantic mismatch
- **Status (2026-04-25):** Done (executed as P0-4 in current incident sequence) — preview now uses the same UI-constraint→engine-injury mapping as runtime setup, and engine enforces curl/special-case prescription guardrails (`21s` = 21 reps with minimum 2 sets; elbow-flexion minimum 2 sets). See `docs/release/reclaim_p0_4_training_generation_contract.md`.
- Goal: preview uses exact same constraint mapping semantics as runtime generation.
- Likely files:
  - `app/src/lib/training/preview/index.ts`
  - `app/src/lib/training/setupMappings.ts`
  - `app/src/lib/training/__tests__/setupMappings.test.ts`
  - preview tests under `app/src/lib/training/preview/__tests__/`
- Blast radius: Medium
- Dependencies: none
- Must test:
  - constrained setup scenarios (knee/back/shoulder/wrist)
  - preview output equals runtime-generated session behavior for same profile

### P0-6 Add runtime/build/profile diagnostics capture to incident repro
- Goal: every incident repro captures channel/runtime/updateId and notification diagnostics.
- Likely files:
  - `app/src/screens/SettingsScreen.tsx` (already has update info; extend/reporting hook as needed)
  - `app/src/hooks/useAppUpdates.ts`
  - incident docs in `docs/release/`
- Blast radius: Low-medium
- Dependencies: none
- Must test:
  - diagnostics visibility in preview builds
  - compare failing vs passing device runs with same metadata

## P1 Subsystem Trust Restoration

### P1-1 Unify training cursor authority
- Goal: remove drift between local index, runtime cursor, and performed overlays.
- Likely files:
  - `app/src/components/training/TrainingSessionView.tsx`
  - `app/src/lib/training/runtime/sessionRuntime.ts`
- Blast radius: High
- Dependencies: P0-1
- Must test:
  - progression through multi-exercise sessions
  - replace exercise and edit logged sets mid-session

### P1-2 Standardize weight-step behavior across all training edit surfaces
- Goal: all set edit UIs use consistent exercise-aware step logic.
- Likely files:
  - `app/src/components/training/ExerciseCard.tsx`
  - shared step utility from `progression.ts`
- Blast radius: Medium
- Dependencies: none
- Must test:
  - upper/lower/dumbbell/machine flows
  - edit dialogs and focus card parity

### P1-3 Sleep enrichment persistence/surfacing alignment
- Goal: ensure additional sleep metadata survives sync and is shown consistently in Sleep/Mood contexts.
- Likely files:
  - `app/src/lib/sleep/mapDbSleepToHealth.ts`
  - `app/src/lib/sync.ts`
  - `app/src/screens/SleepScreen.tsx`
  - `app/src/screens/MoodScreen.tsx`
- Blast radius: Medium-high
- Dependencies: P0 freshness contract decisions
- Must test:
  - same-night data after sync and after relaunch
  - Mood correlation reads same enriched dataset expectations

### P1-4 Introduce explicit post-sync freshness contract helper
- Goal: one helper for query invalidation + optional `refreshInsight` policy.
- Likely files:
  - `app/src/sync/SyncCoordinator.ts`
  - `app/src/lib/backgroundSync.ts`
  - `app/src/screens/Dashboard.tsx`, `SleepScreen.tsx`, `IntegrationsScreen.tsx`
  - `docs/release/reclaim_cache_invalidation_map.md`
- Blast radius: High
- Dependencies: P0-3 recommended
- Must test:
  - no tile stale state after sync from any entry point
  - no excessive refresh churn

### P1-5 Define special prescription policy for exercises like 21s
- Goal: explicit representation rule (e.g., 21s style) or exclusion from generic prescriptions.
- Likely files:
  - `app/src/lib/training/engine/index.ts`
  - `app/src/lib/training/catalog/exercises.v1.json`
  - training preview/runtime display components
- Blast radius: Medium
- Dependencies: product decision on representation
- Must test:
  - generated plan text does not contradict exercise semantics
  - no regressions in exercise selection diversity

## P2 UX/Layout Cleanup After Trust Restoration

### P2-1 Residual clipping/truncation audit on training/mood/sleep key surfaces
- Likely files:
  - `app/src/screens/training/TrainingSetupScreen.tsx`
  - `app/src/components/training/SessionPreviewModal.tsx`
  - `app/src/components/training/OutcomePreviewPanel.tsx`
  - `app/src/screens/MoodScreen.tsx`
- Blast radius: Low-medium
- Dependencies: all P0 complete
- Must test:
  - narrow devices + large fonts + keyboard open states

### P2-2 Tile motivation polish after data-coherence fixes
- Likely files:
  - `app/src/screens/Dashboard.tsx`
  - `app/src/components/dashboard/HomeDashboardTile.tsx`
- Blast radius: Medium
- Dependencies: P1-4
- Must test:
  - no overlap, meaningful sublines, no stale placeholders

## Gate criteria before resuming normal feature work

All must be true:
1. P0 items complete and merged.
2. Device matrix validates guided flow, mood reminders, sync freshness, and recovery advancement.
3. Incident docs updated with before/after evidence and runtime metadata.
4. No unresolved critical split-brain findings in training/notifications/recovery.
