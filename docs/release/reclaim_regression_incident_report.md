# Reclaim Regression Incident Report

Date: 2026-04-20  
Scope: Regression incident audit only (no implementation)  
Evidence sources: code/config inspection, file history, prelaunch/verification docs, runtime-path analysis

## Executive Summary

Current preview should be treated as **incident-active** for training/trigger reliability until P0 notification and mindfulness trigger defects are fixed and device-verified.

Most critical finding: several user-reported failures are **not random**; they cluster around notification/trigger orchestration split between intent scheduling, action handlers, and in-screen runtime state.

## Severity Grouping

### P0 (Launch-Blocking) — Confirmed Regressions

1. **Watch action -> open UI advancement gap (Done/Next)**
   - Status: **Confirmed regression**
   - Why: notification actions (`SET_DONE`, `NEXT_SET`) update intents/DB/cache, but do not mutate `TrainingSessionView` runtime state when app UI is already open.
   - Evidence:
     - `app/src/lib/notifications/guidedTrainingNotificationActions.ts`
     - `app/src/components/training/TrainingSessionView.tsx`
     - `app/src/screens/TrainingScreen.tsx`
   - Impact: user sees watch tap "accepted" but active session UI does not advance immediately.

2. **Mindfulness HR triggers effectively screen-scoped**
   - Status: **Confirmed regression / wiring defect**
   - Why: `useHealthTriggers` lifecycle is bound to `MindfulnessScreen`; unmount stops triggers.
   - Evidence:
     - `app/src/hooks/useHealthTriggers.ts`
     - `app/src/screens/MindfulnessScreen.tsx`
   - Impact: HR-triggered mindfulness nudges appear broken unless user is in/near that screen lifecycle.

3. **Training calories expectation mismatch (removed from default permission path)**
   - Status: **Confirmed removed capability in default connect path**
   - Why: `active_energy` is not in `HEALTH_CONNECT_DEFAULT_METRICS`; merge helper requires active-energy permission data to populate session calories.
   - Evidence:
     - `app/src/lib/health/healthConnectService.ts`
     - `app/src/components/training/TrainingHistoryView.tsx`
   - Impact: many users will see missing workout calories despite completed sessions.

### P0 — Likely Regressions (Not Fully Verified on Device)

4. **Guided training notifications "not working correctly"**
   - Status: **Likely regression**
   - Why: complex multi-hop chain (intent store -> reconcile -> action task -> in-app state) has multiple brittle edges and known historical churn.
   - Likely fault area:
     - `app/src/hooks/useNotifications.ts`
     - `app/src/lib/notifications/NotificationScheduler.ts`
     - `app/src/lib/notifications/guidedTrainingNotificationActions.ts`
   - Not fully verified: device/task runtime behavior by build profile.

5. **Mood reminders broken**
   - Status: **Likely regression**
   - Why: toggle flow appears correct in code, but depends on permission state + reconcile + app tag schedule materialization.
   - Evidence path:
     - `app/src/screens/MoodScreen.tsx`
     - `app/src/lib/notifications/NotificationScheduler.ts`
   - Not fully verified: scheduled notification state on preview device after toggle.

6. **Additional sleep data missing**
   - Status: **Likely regression**
   - Why: Sleep screen prioritizes DB rows; richer metadata may not exist in DB snapshot even when direct Health Connect read can enrich runtime session objects.
   - Evidence path:
     - `app/src/screens/SleepScreen.tsx`
     - `app/src/lib/sleep/mapDbSleepToHealth.ts`
     - `app/src/lib/health/healthConnectService.ts`
   - Not fully verified: whether sync pipeline persists added vitals in current preview.

7. **Preview/build divergence risk**
   - Status: **Likely risk present**
   - Why: OTA enabled; separate `preview`/`production` channels; runtime update behavior can differ from expected branch state.
   - Evidence:
     - `app/eas.json`
     - `app/app.config.ts`
     - `app/src/hooks/useAppUpdates.ts`

### P1 (Major UX/Workflow) — Confirmed Defects

1. **Keyboard overlap risk in training setup**
   - `TrainingSetupScreen` lacks `KeyboardAvoidingView`; bottom controls are fixed in long forms.
   - Evidence: `app/src/screens/training/TrainingSetupScreen.tsx`

2. **Weight adjustment granularity too coarse**
   - Set editing uses fixed +/-2.5 in `EditSetDialog` style flow.
   - Evidence: `app/src/components/training/TrainingSessionView.tsx`, `app/src/components/training/ExerciseCard.tsx`

3. **Outcome preview / setup density creates cramped UX**
   - Panel is compact and embedded in scrolling setup; high cognitive density.
   - Evidence: `app/src/components/training/OutcomePreviewPanel.tsx`

4. **Button clipping risk on smaller widths**
   - Several horizontal button rows in setup/session rely on fixed row layouts with limited wrap behavior.
   - Evidence: `app/src/screens/training/TrainingSetupScreen.tsx`, `app/src/screens/TrainingScreen.tsx`

### P1 — Likely UX Regressions (Not Fully Runtime-Proven)

- Replace exercise perceived removed (feature exists but discoverability/context likely degraded)
- Training tile flat/overlap and sleep tile weak meaning
- Session preview clipping complaints (some mitigations exist, but not fully disproven)
- Backtracking/editability complaints after moving forward (code path exists, runtime behavior uncertain)
- Single-limb weight interpretation unclear (likely product-gap/not explicitly represented)
- RPE explanation placement weak (UX clarity issue)

### P2 Domain Audit (Training setup logic)

Training setup core logic appears mostly intact (goals normalization, day selection, baseline capture, program creation), but UX constraints create real workflow friction and likely interpretation errors under pressure. See dedicated training audit file.

## Build/Profile Divergence Findings

- `preview` and `production` are separate EAS channels (`app/eas.json`), so behavior can diverge via OTA payload even with same native binary family.
- `runtimeVersion` is pinned (`1.0.3`), so OTA applicability is controlled by runtime compatibility + channel.
- Non-dev clients run update checks (`useAppUpdates`), so preview may receive channel updates not reflected in local branch assumptions.

## Regression Type Separation (Broken vs Not Implemented vs Removed)

- **Removed / narrowed**: active-energy calories in default HC permission bundle.
- **Disconnected**: watch action path does not directly advance active in-memory session runtime UI.
- **Wired but context-fragile**: replace exercise depends on alternatives/decision-trace context and user discoverability.
- **Likely pre-existing/product gap**: single-limb weight semantics.

## Most Dangerous Regressions First

1. Watch actions not advancing open training UI state.
2. Mindfulness HR triggers lifecycle-bound to one screen.
3. Guided training notification reliability (multi-hop orchestration risk).
4. Mood reminder reliability uncertainty on preview runtime.
5. Sleep extra-vitals surfacing inconsistency vs expected launch claims.

## Confidence Legend

- Confirmed: code path strongly supports issue classification.
- Likely: plausible with strong indicators, but missing device proof.
- Not fully verified: requires runtime instrumentation/device validation.
