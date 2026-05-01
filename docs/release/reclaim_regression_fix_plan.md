# Reclaim Regression Fix Plan (No Implementation)

Date: 2026-04-20  
Constraint: fix-order planning only; no code changes in this pass.

## P0 First (Must Finish Before Further Release Work)

### 1) Watch action -> open training UI coherence
- **Issue type:** code/orchestration
- **Likely files:** `app/src/lib/notifications/guidedTrainingNotificationActions.ts`, `app/src/components/training/TrainingSessionView.tsx`, `app/src/screens/TrainingScreen.tsx`
- **Blast radius:** high (training session core)
- **Dependency order:** first
- **Post-fix tests:** watch/phone `SET_DONE` and `NEXT_SET` with app foreground/background; verify immediate UI advancement and no duplicate logs.

### 2) Guided training notification reliability hardening
- **Issue type:** code/orchestration/runtime
- **Likely files:** `app/src/hooks/useNotifications.ts`, `app/src/lib/notifications/NotificationScheduler.ts`, `app/src/lib/notifications/trainingNotificationScheduler.ts`
- **Blast radius:** high
- **Dependency order:** after item 1 (shared paths)
- **Post-fix tests:** end-to-end guided session including prep countdown, rest, skip, edit, done, resume; verify intent/scheduled parity.

### 3) Mindfulness HR trigger lifecycle ownership fix
- **Issue type:** code/architecture
- **Likely files:** `app/src/hooks/useHealthTriggers.ts`, app root lifecycle host (likely `App.tsx` or provider), `app/src/screens/MindfulnessScreen.tsx`
- **Blast radius:** medium-high (notification behavior)
- **Dependency order:** parallel-safe with P0 #1/#2 but verify separately
- **Post-fix tests:** trigger emission while Mindfulness screen closed; confirm notification scheduling.

### 4) Calories after session: explicit product and scope correction
- **Issue type:** code + copy + config/policy decision
- **Likely files:** `app/src/lib/health/healthConnectService.ts`, `app/src/components/training/TrainingHistoryView.tsx`, related release docs
- **Blast radius:** high (truth/trust + potential permission scope)
- **Dependency order:** after policy decision (keep narrowed behavior vs expand permissions)
- **Post-fix tests:** session end with/without active-energy permission; verify deterministic UI messaging.

### 5) Preview/runtime divergence instrumentation before final sign-off
- **Issue type:** build/release/process
- **Likely files:** diagnostics surfaces and release docs (possibly `useAppUpdates`/diagnostic screens)
- **Blast radius:** medium
- **Dependency order:** immediate alongside P0 work
- **Post-fix tests:** record runtime/channel/update IDs in reproduced incidents.

## P1 Next (Major UX/Workflow Reliability)

### 6) Training setup keyboard and clipping fixes
- **Issue type:** UX/layout/code
- **Likely files:** `app/src/screens/training/TrainingSetupScreen.tsx`, `app/src/screens/TrainingScreen.tsx`, possibly shared button rows
- **Blast radius:** medium
- **Dependency order:** after P0 stabilization
- **Post-fix tests:** small-screen + large font + keyboard-open baseline entry.

### 7) Replace exercise discoverability and fallback behavior
- **Issue type:** UX/code
- **Likely files:** `app/src/components/training/ExerciseCard.tsx`, `app/src/components/training/TrainingSessionView.tsx`
- **Blast radius:** medium
- **Dependency order:** after P0 #1 (session-state coherence)
- **Post-fix tests:** replace with and without ranked alternatives; session/program scope both.

### 8) Back-editing and per-session adjustment continuity
- **Issue type:** code/state
- **Likely files:** `app/src/components/training/TrainingSessionView.tsx`, runtime modules under `app/src/lib/training/runtime/`
- **Blast radius:** high
- **Dependency order:** after notification-action coherence to avoid false negatives
- **Post-fix tests:** edit previous set after progressing, resume after background, verify persistence.

### 9) Weight increment and single-limb clarity UX
- **Issue type:** UX/copy/code
- **Likely files:** `app/src/components/training/ExerciseCard.tsx`, `app/src/components/training/TrainingSessionView.tsx`, setup/baseline surfaces
- **Blast radius:** medium
- **Dependency order:** after behavior correctness issues
- **Post-fix tests:** unit + manual for increments, unilateral exercise copy comprehension.

### 10) Session/outcome preview responsiveness and anti-clipping
- **Issue type:** UX/layout
- **Likely files:** `app/src/components/training/SessionPreviewModal.tsx`, `app/src/components/training/OutcomePreviewPanel.tsx`
- **Blast radius:** low-medium
- **Dependency order:** late P1
- **Post-fix tests:** narrow devices, long labels, dynamic text scaling.

### 11) Home training/sleep tile utility pass
- **Issue type:** UX design/code
- **Likely files:** `app/src/components/dashboard/HomeDashboardTile.tsx`, `app/src/theme/dashboardHomeTiles.ts`
- **Blast radius:** medium
- **Dependency order:** after training reliability fixes
- **Post-fix tests:** readability, overlap checks, user-task success.

## P2 Later (Domain Improvements / Non-Blocking)

### 12) Full training setup semantic audit improvements
- **Issue type:** code/domain/UX
- **Likely files:** setup + planner/engine modules
- **Blast radius:** high
- **Dependency order:** after P0/P1
- **Post-fix tests:** scenario matrix for goals/equipment/constraints/reps/sets/day schedules.

### 13) Mood cause-link explanation tuning
- **Issue type:** UX/copy
- **Likely files:** `app/src/screens/MoodScreen.tsx`
- **Blast radius:** low-medium
- **Dependency order:** post reliability stabilization
- **Post-fix tests:** comprehension and consistency review.

## Dependency-Ordered Execution Sequence

1. P0 #1 -> #2 -> #3 -> #4 (with policy gate) -> #5 evidence capture.
2. P1 #6/#7/#8 as first UX reliability wave.
3. P1 #9/#10/#11 after reliability baseline stable.
4. P2 domain polish.

## Release Gate Rule

Do not resume broad release work until all P0 fixes are implemented, regression-tested on preview devices, and re-audited with explicit runtime evidence (channel/update/runtime IDs plus notification diagnostics).
