# Reclaim Training System Regression Audit

Date: 2026-04-20  
Scope: training setup/session/history/notifications/watch-action related incidents only.  
Mode: forensic audit, no code changes.

## Executive Training Verdict

Training logic is present, but workflow reliability is degraded by orchestration disconnects and UI/layout debt. The highest-risk failure is watch/notification action state not coherently advancing open in-app session runtime.

## 1) Setup Logic (Goals/Reps/Sets/Exercises) Correctness

Primary file: `app/src/screens/training/TrainingSetupScreen.tsx`

### Verified good

- Goal weights are captured and normalized before persistence.
- Weekday selection and time preference are persisted.
- Baseline weight + reps convert to estimated 1RM.
- Existing profile/program hydration paths are implemented.
- Program creation/deactivation flow exists with query invalidation.

### Risks / defects

- No keyboard-avoidance container for baseline input-heavy step.
- Several fixed horizontal button rows can clip on narrow widths.
- Baseline reps are coarse chip presets (`3`, `5`, `8`) with no fine-grain direct input.
- Outcome preview in setup is dense and can feel cramped.

Assessment: core setup math/path likely okay; interaction ergonomics are weak and can cause user-reported workflow failures.

## 2) Replace Exercise Availability

Primary files:
- `app/src/components/training/ExerciseCard.tsx`
- `app/src/components/training/TrainingSessionView.tsx`
- `app/src/lib/training/runtime/sessionRuntime.ts`

### Evidence

- `Swap exercise` action exists in exercise header.
- Replace dialog exists with session/program scope actions.
- Handler `handleReplaceExercise` performs optimistic + DB updates.

### Root-cause assessment

- Feature not removed in code.
- Perceived removal likely due one or more of:
  - poor discoverability (text button in dense card),
  - missing ranked alternatives/decision-trace context,
  - runtime consistency issues after replacement.

Classification: **likely disconnected/UX-hidden**, not hard-removed.

## 3) Set Editing / Backtracking Behavior

Primary files:
- `app/src/components/training/TrainingSessionView.tsx`
- `app/src/components/training/ExerciseCard.tsx`

### Evidence

- Edit dialogs and update handlers exist (`handleSetUpdate`, `EditSetDialog` paths).
- Notification-route deep-link can target edit of specific set.

### Risk

- Report says back-editing after forward movement fails in practice.
- Runtime state combines DB + optimistic + runtime overlays; edge ordering can be fragile.

Classification: **not fully verified runtime-only issue**, likely regression in state orchestration.

## 4) Weight Handling / Single-Limb Semantics / Adaptation

### Weight increments

- Quick increment/decrement paths are coarse (notably +/-2.5 patterns).
- Confirms user complaint about granularity.

### Single-limb interpretation

- No explicit unilateral load semantics surfaced in UI.
- Likely expectation mismatch / feature gap.

### Persistent adaptation behavior

- Runtime/autoregulation modules exist, but user reports persistence/continuity loss.
- Needs targeted runtime trace validation session-to-session.

Classification:
- coarse increments: **confirmed UX defect**
- single-limb semantics: **missing feature / unclear design**
- persistent adaptation loss: **likely regression, not fully verified**

## 5) Calories Visibility After Session

Primary file: `app/src/lib/health/healthConnectService.ts`

- Session summary calories rely on `mergeHealthConnectActiveEnergyIntoTrainingSummary`.
- Merge requires active-energy data availability; default HC metrics omit `active_energy`.

Result: calories often absent by design/scope unless permissions/source provide active energy.

Classification: **removed/narrowed capability in current launch posture**, not random UI bug.

## 6) Guided Notifications + Watch Actions

Primary files:
- `app/src/hooks/useNotifications.ts`
- `app/src/lib/notifications/guidedTrainingNotificationActions.ts`
- `app/src/lib/notifications/trainingNotificationScheduler.ts`
- `app/src/components/training/TrainingSessionView.tsx`
- `app/src/screens/TrainingScreen.tsx`

### Confirmed architectural fault

- Watch actions (`SET_DONE`, `NEXT_SET`) drive notification intent/DB/cache paths.
- Open training UI runtime is not directly advanced by those background action handlers.
- Session screen advances immediately mainly through local `handleSetComplete`, not external action mutations.

Classification: **confirmed disconnected flow** and a P0 blocker.

## 7) Session Preview / Outcome Preview / Header-Button Clipping

### Session preview modal

- Includes compact-width stack logic.
- Still susceptible to cramped behavior depending on device sizes and content density.

### Outcome preview

- High information density in compact card form within setup flow.

### Header/cancel clipping

- Not disproven by static inspection; runtime layout verification needed across devices.

Classification: **likely UX regression/debt**, not fully runtime-proven.

## 8) Keyboard and Edge Clipping

### Confirmed

- Setup screen uses plain `ScrollView`; no `KeyboardAvoidingView`.

### Likely

- Several action rows in setup and training surfaces risk right-edge clipping under smaller widths/font scaling.

## 9) Training Tile Quality Issues

Primary files:
- `app/src/components/dashboard/HomeDashboardTile.tsx`
- `app/src/theme/dashboardHomeTiles.ts`
- `app/src/screens/TrainingScreen.tsx` (next-session card shell)

Assessment:
- Visual strategy changed to integrated visual plane; user report of flatness/overlap is plausible.
- This is primarily UX quality regression risk, not business-logic loss.

## Training Fix Priority (No Implementation Yet)

### P0 First

1. Watch action -> in-session runtime advancement coherence.
2. Guided notification reliability path stabilization and instrumentation.
3. Calories expectation correction (either permission scope expansion or explicit product copy/logic alignment).

### P1 Next

4. Keyboard-avoidance and button clipping in setup/session flows.
5. Replace-exercise discoverability + fallback behavior when alternatives unavailable.
6. Weight/RPE/single-limb UX clarity.
7. Session/outcome preview layout responsiveness.

### P2 Later

8. Full training setup UX modernization and semantic modeling improvements.
