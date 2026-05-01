# TRAINING MODULE SNAPSHOT (CANONICAL)

**Date**: 2024-12-19  
**Scope**: Full training module audit (read-only)  
**Purpose**: Establish ground truth baseline for current implementation

---

## A. Module Map (Files → Responsibility)

### Setup / Onboarding
- **`app/src/screens/training/TrainingSetupScreen.tsx`** (754 lines)
  - Purpose: Multi-step wizard for training profile setup (goals, schedule, equipment, constraints, baselines)
  - Key exports: Default component `TrainingSetupScreen`
  - Features: Prefill hydration from saved profile, baseline e1RM calculation, equipment normalization, program instance creation

### Planner / Scheduler
- **`app/src/lib/training/programPlanner.ts`** (343 lines)
  - Purpose: Deterministic 4-week program plan generation
  - Key exports: `buildFourWeekPlan()`, `generateProgramDays()`, `getNextDateForWeekday()`
  - Features: Weekday mapping (1=Mon, 7=Sun), split determination based on goals/days, program day date calculation
- **`app/src/lib/training/scheduler.ts`** (164 lines)
  - Purpose: Routine suggestions integration (legacy, not actively used for program generation)
  - Key exports: `determineWeeklySplit()`, `generateWeeklyTrainingPlan()`, `getScheduledTemplateForToday()`

### Engine (Session Building)
- **`app/src/lib/training/engine/index.ts`** (~986 lines)
  - Purpose: Core training engine for exercise selection, scoring, load suggestions
  - Key exports: `buildSession()`, `buildSessionFromProgramDay()`, `suggestLoading()`, `chooseExercise()`, `getExerciseById()`
  - Features: Exercise catalog access, intent-based selection, progression logic, baseline e1RM usage
- **`app/src/lib/training/progression.ts`**
  - Purpose: 1RM estimation and progression calculations
  - Key exports: `estimate1RM()`, `reverseEstimate1RM()`, `detectPRs()`, `calculateNextWeight()`
- **`app/src/lib/training/setupMappings.ts`**
  - Purpose: ID mapping layer between UI setup keys and engine catalog IDs
  - Key exports: `mapBaselineKeyToExerciseId()`, `normalizeEquipmentId()`, `mapExerciseIdToBaselineKey()`, `denormalizeEquipmentId()`

### Runtime (Session Execution)
- **`app/src/lib/training/runtime/index.ts`**
  - Purpose: Session runtime state machine and set logging
  - Key exports: `initializeRuntime()`, `resumeRuntime()`, `logSet()`, `skipExercise()`, `endSession()`, `tickRuntime()`, `advanceExercise()`, `getAdjustedSetParams()`, `getAdjustedRestTime()`, `getSessionStats()`
- **`app/src/lib/training/runtime/autoregulation.ts`** (~501 lines)
  - Purpose: Autoregulation rules engine for adjusting sets based on RPE/reps
  - Key exports: `applyAutoregulation()`
  - Features: RPE-based weight/reps adjustments, fatigue detection, deterministic rule-based decisions
- **`app/src/lib/training/runtime/payloadBuilder.ts`**
  - Purpose: Build DB payloads from runtime state (ensures correct itemIds)
  - Key exports: `buildSetLogPayload()`, `buildSetLogQueuePayload()`
- **`app/src/lib/training/runtime/sessionRuntime.ts`**
  - Purpose: Session runtime state management and transitions
  - Key exports: (internal runtime helpers)

### Data Access / Persistence
- **`app/src/lib/api.ts`** (training-related functions, lines ~1570-2400)
  - Purpose: Supabase API wrappers for training data
  - Key exports:
    - Sessions: `createTrainingSession()`, `updateTrainingSession()`, `listTrainingSessions()`, `getTrainingSession()`, `logTrainingSet()`, `getTrainingSetLogs()`
    - Profiles: `getTrainingProfile()`, `upsertTrainingProfile()`, `deleteTrainingProfile()`
    - Programs: `createProgramInstance()`, `getActiveProgramInstance()`, `getProgramInstances()`, `updateProgramInstance()`, `createProgramDays()`, `getProgramDays()`, `getProgramDayByDate()`
    - Performance: `getLastExercisePerformance()`, `getLastExercisePerformances()`, `getExerciseBestPerformance()`
    - Events: `logTrainingEvent()`, `getTrainingEvents()`
- **`app/src/lib/training/lastPerformance.ts`** (221 lines)
  - Purpose: Query last/best performance for exercises
  - Key exports: `getLastPerformanceForExercise()`, `getBestPerformanceForExercise()`, `getExerciseHistory()`
- **`app/src/lib/training/offlineQueue.ts`**
  - Purpose: Offline queue for set logs when network unavailable
  - Key exports: `enqueueOperation()`, `getQueueSize()`, `safeSerialize()`
- **`app/src/lib/training/offlineSync.ts`**
  - Purpose: Sync offline queue when network returns
  - Key exports: `syncOfflineQueue()`, `isNetworkAvailable()`

### UI Components
- **`app/src/screens/TrainingScreen.tsx`** (721 lines)
  - Purpose: Main entry point, orchestrates setup/session/history views
  - Key features: Tab switcher (today/history), week navigation, session preview, in-progress session detection
- **`app/src/components/training/TrainingSessionView.tsx`** (966 lines)
  - Purpose: Active workout interface (one exercise per screen)
  - Key features: Exercise-by-exercise navigation, set logging, rest timer, autoregulation messages, session completion
- **`app/src/components/training/ExerciseCard.tsx`** (~589 lines)
  - Purpose: Individual exercise display with set controls
  - Key features: Weight/reps/RPE inputs, +/- controls, "Why this exercise?" dialog, previous stats display, autoregulation indicators
- **`app/src/components/training/RestTimer.tsx`** (116 lines)
  - Purpose: Rest period countdown timer
  - Key features: Pause capability (state exists but no UI button), extend (+30s, +60s), skip, background/foreground handling
- **`app/src/components/training/SessionPreviewModal.tsx`**
  - Purpose: Preview session plan before starting
  - Key features: Summary display, exercise list, goals/intents, duration estimate
- **`app/src/components/training/WeekView.tsx`**
  - Purpose: Current week's program days display
- **`app/src/components/training/FourWeekPreview.tsx`**
  - Purpose: 4-week program overview
- **`app/src/components/training/TrainingHistoryView.tsx`**
  - Purpose: Completed sessions list
- **`app/src/components/training/ExerciseDetailsModal.tsx`**
  - Purpose: Exercise performance history and trends
- **`app/src/components/training/FullSessionPanel.tsx`**
  - Purpose: Full session overview during workout
- **`app/src/components/training/PostSessionMoodPrompt.tsx`**
  - Purpose: Post-session mood check-in
- **`app/src/components/training/uiFormat.ts`**
  - Purpose: Display formatting helpers for numeric values
  - Key exports: `formatWeight()`, `formatReps()`, `formatRest()`, `formatDuration()`, `formatWeightReps()`

### Analytics
- **`app/src/lib/training/analytics/index.ts`**
  - Purpose: Training analytics aggregation
- **`app/src/lib/training/analytics/metrics.ts`**
  - Purpose: Metrics calculations (volume, e1RM trends, adherence)
- **`app/src/lib/training/analytics/dataTransforms.ts`**
  - Purpose: Data transformation for analytics
- **`app/src/screens/training/TrainingAnalyticsScreen.tsx`**
  - Purpose: Analytics dashboard UI

### Types
- **`app/src/lib/training/types.ts`** (502 lines)
  - Purpose: TypeScript type definitions for entire training module
  - Key types: `MovementIntent`, `TrainingGoal`, `SessionTemplate`, `Exercise`, `SessionPlan`, `PlannedExercise`, `SessionRuntimeState`, `AdaptationTrace`, `ProgramInstance`, `ProgramDay`, `TrainingProfileSnapshot`

### Catalog / Rules
- **`app/src/lib/training/catalog/exercises.v1.json`**
  - Purpose: Exercise catalog (static JSON)
- **`app/src/lib/training/rules/rules.v1.json`**
  - Purpose: Training rules (rep ranges, rest times, time budgets, warmup minutes)

### Utilities
- **`app/src/utils/trainingIntentLabels.ts`**
  - Purpose: Label mapping for movement intents (display only)
  - Key exports: `getPrimaryIntentLabels()`

---

## B. Current UX Flows (Truth Table)

### 1) First-time setup → after Save
**Flow**:
1. User completes all steps (goals → schedule → equipment → constraints → baselines)
2. On "Save" (baselines step), `saveProfileMutation` runs:
   - Calls `upsertTrainingProfile()` with normalized data
   - Calls `buildFourWeekPlan()` to generate plan
   - Calls `createProgramInstance()` to create program
   - Calls `generateProgramDays()` to compute program days
   - Calls `createProgramDays()` to insert into DB
   - Calls `logTrainingEvent('training_setup_completed')`
3. `onComplete()` callback fires (from `TrainingScreen.tsx:356`)
   - Sets `setShowSetup(false)` → returns to `TrainingScreen`
   - Invalidates queries: `['training:profile']`, `['training:activeProgram']`, `['training:programDays:week']`, `['training:programDays:fourWeek']`
4. **User lands**: `TrainingScreen` main view (Today tab) showing program days

**File**: `app/src/screens/training/TrainingSetupScreen.tsx:322-362`, `app/src/screens/TrainingScreen.tsx:353-364`

### 2) Editing setup later → after Save
**Flow**:
1. User opens setup via gear icon (`setShowSetup(true)`)
2. Setup screen loads with prefill from `getTrainingProfile()` and `getActiveProgramInstance()` (hydration effect)
3. User edits any step and saves
4. Same save flow as first-time (upsert profile, create new program instance, generate new program days)
5. **CRITICAL ISSUE**: `onComplete()` callback only sets `setShowSetup(false)` → user returns to `TrainingScreen`
6. **Problem**: If user had completed sessions, they still see the program (not reset), but the conditional render at line 388 checks `!profileQ.data || !activeProgramQ.data` → if both exist, shows main view (correct)
7. **However**: After editing, a NEW program instance is created, so old program days may be orphaned (status not updated to 'completed' or 'abandoned')

**File**: `app/src/screens/training/TrainingSetupScreen.tsx:322-362`, `app/src/screens/TrainingScreen.tsx:353-364`, `app/src/screens/TrainingScreen.tsx:388-413`

**Root Cause**: No logic to mark old program as 'abandoned' or 'completed' when creating new one. Old program days remain in DB but new active program takes precedence.

### 3) Starting a session
**Flow**:
1. User taps a program day card in `WeekView` or `FourWeekPreview`
2. `handleDayPress()` fires (`TrainingScreen.tsx:265`)
   - Calls `buildSessionFromProgramDay()` with program day and profile snapshot
   - Sets `pendingPlan` and `selectedProgramDay`
   - Sets `showPreview(true)`
3. `SessionPreviewModal` displays plan summary
4. User taps "Start Session"
5. `handleConfirmSession()` fires (`TrainingScreen.tsx:288`)
   - Calls `startSessionMutation.mutate()`
   - Creates session via `createTrainingSession()` (with `started_at`, `program_id`, `program_day_id`)
   - Creates session items via `createTrainingSessionItems()` (planned sets stored in `planned` JSONB)
   - Sets `activeSessionId` → triggers `activeSessionQ` query
   - Sets `showPreview(false)`
6. **User lands**: `TrainingSessionView` (one exercise per screen, first exercise)

**File**: `app/src/screens/TrainingScreen.tsx:265-295`, `app/src/components/training/TrainingSessionView.tsx:57-965`

### 4) During a session
**Flow**:
1. **Exercise display**: `TrainingSessionView` shows current exercise via `ExerciseCard`
   - `currentExerciseIndex` state tracks position
   - `ExerciseCard` shows planned sets with +/- controls for weight/reps
   - Previous stats displayed if available (`lastPerformanceQ` query)
2. **Set logging**:
   - User adjusts weight/reps using +/- or taps set row to edit
   - User taps "Complete Set" or logs via quick RPE dialog
   - `handleSetComplete()` fires (`TrainingSessionView.tsx:297`)
     - Updates runtime state via `logSet()`
     - Persists to DB via `logTrainingSet()` (or offline queue)
     - Updates session item's `performed.sets` JSONB
     - Starts rest timer if in 'timed' mode
     - Shows autoregulation message if adjustment applied
3. **Rest timer**:
   - `RestTimer` component displays countdown
   - User can extend (+30s, +60s) or skip
   - **Pause exists in state** (`isPaused` in `RestTimer.tsx:18`) but **NO UI BUTTON** to toggle it
   - Timer handles background/foreground automatically
4. **Next exercise**:
   - User taps "Next Exercise" button
   - `handleNext()` fires (`TrainingSessionView.tsx:664`)
     - Increments `currentExerciseIndex`
     - If last exercise, shows "Complete session?" alert
5. **Skip exercise**:
   - User taps "Skip" button
   - `handleSkip()` fires (`TrainingSessionView.tsx:496`)
     - Updates runtime state via `skipExercise()`
     - Persists skip to DB
     - Advances to next exercise via `advanceExercise()`

**File**: `app/src/components/training/TrainingSessionView.tsx`, `app/src/components/training/ExerciseCard.tsx`, `app/src/components/training/RestTimer.tsx`

### 5) Completing a session
**Flow**:
1. User taps "Finish session" (or completes last exercise)
2. `handleComplete()` fires (`TrainingSessionView.tsx:551`)
   - Gets previous bests for PR detection
   - Calls `endSession()` to compute session result (duration, volume, PRs, adaptation trace)
   - Updates session via `updateTrainingSession()` with `ended_at` and `summary` JSONB
   - Logs events: `training_session_completed`, `training_adaptation_applied` (for each trace)
   - Sets `showMoodPrompt(true)`
3. **User lands**: Post-session mood prompt modal
4. After mood prompt, `onComplete()` callback fires
   - Sets `activeSessionId(null)` → returns to `TrainingScreen`
   - Invalidates `['training:sessions']` query

**File**: `app/src/components/training/TrainingSessionView.tsx:551-662`, `app/src/components/training/PostSessionMoodPrompt.tsx`

**What gets persisted**:
- `training_sessions`: `ended_at`, `summary` (duration, volume, PRs, exercises completed/skipped, adaptation trace)
- `training_set_logs`: Individual set logs (already persisted during session)
- `training_session_items`: `performed.sets` JSONB (already updated during session)
- `training_post_session_checkins`: Mood check-in (after prompt)

### 6) Exiting mid-edit / mid-setup
**Flow**:
1. **Mid-setup**: User can tap "Back" button to go to previous step, or close drawer/navigate away
   - No explicit "Cancel" button
   - If user navigates away, `showSetup` state persists (if they return, setup is still open)
   - **No explicit cancellation handler** - user must complete or navigate away
2. **Mid-session**: User can tap "Close" button in `TrainingSessionView`
   - `onCancel()` callback fires → sets `activeSessionId(null)`
   - Session remains in DB with `started_at` but no `ended_at` (in-progress)
   - User can resume via "Resume session" card in `TrainingScreen`

**File**: `app/src/screens/training/TrainingSetupScreen.tsx:738-749`, `app/src/components/training/TrainingSessionView.tsx:928-930`, `app/src/screens/TrainingScreen.tsx:466-483`

---

## C. State Model (Planned vs Actual)

### Planned Entities (from Program)
- **`training_program_instances`**:
  - Fields: `id`, `user_id`, `start_date`, `duration_weeks`, `selected_weekdays` (1-7 array), `plan` (JSONB: `FourWeekProgramPlan`), `profile_snapshot` (JSONB: `TrainingProfileSnapshot`), `status` ('active'|'completed'|'abandoned')
- **`training_program_days`**:
  - Fields: `id`, `program_id`, `user_id`, `date` (YYYY-MM-DD), `week_index` (1-4), `day_index` (1-7, weekday), `label`, `intents` (JSONB array), `template_key`, `created_at`

### Actual/Logged Entities (from Sessions)
- **`training_sessions`**:
  - Fields: `id`, `user_id`, `started_at`, `ended_at` (nullable), `mode` ('timed'|'manual'), `goals` (JSONB), `summary` (JSONB: duration, volume, PRs, etc.), `program_id`, `program_day_id`, `week_index`, `day_index`, `session_type_label`
- **`training_session_items`**:
  - Fields: `id`, `session_id`, `exercise_id`, `order_index`, `planned` (JSONB: sets, priority, intents, decisionTrace), `performed` (JSONB: sets array), `skipped` (boolean)
- **`training_set_logs`**:
  - Fields: `id`, `session_item_id`, `set_index`, `weight`, `reps`, `rpe` (nullable), `completed_at`

### In-App State (React/Query)
- **React Query Cache**:
  - `['training:profile']`: `TrainingProfileRow`
  - `['training:activeProgram']`: `ProgramInstanceRow`
  - `['training:programDays:week', programId, weekStart]`: `ProgramDayRow[]`
  - `['training:programDays:fourWeek', programId, fourWeekStart]`: `ProgramDayRow[]`
  - `['training:sessions']`: `TrainingSessionRow[]`
  - `['training:session', sessionId]`: `{ session, items }`
  - `['training:set_logs', itemId]`: `TrainingSetLogRow[]`
  - `['training:lastPerformance', exerciseId, sessionTypeLabel]`: `LastPerformance | null`
- **Component State**:
  - `TrainingScreen`: `activeTab`, `activeSessionId`, `showSetup`, `showPreview`, `pendingPlan`, `selectedProgramDay`, `currentWeekAnchor`
  - `TrainingSessionView`: `currentExerciseIndex`, `elapsedSeconds`, `showFullSession`, `showMoodPrompt`, `restTimer`, `runtimeState`, `lastAutoregulationMessage`, `adaptationTraces`
  - `TrainingSetupScreen`: `step`, `goals`, `selectedWeekdays`, `timePreference`, `equipment`, `constraints`, `baselines`, `baselineReps`

### What Does NOT Exist Yet
- **Warm-up sets**: Referenced in `rules.v1.json` (`warmupMinutes: 5`) and used in duration calculation, but **no warm-up sets are generated or displayed** in session plans
- **Guided mode**: No explicit "guided" vs "manual" distinction beyond `mode: 'timed'` (which only affects rest timer)
- **Watch-friendly UI**: No watch-specific components or minimal-tap interactions
- **Calendar events**: No calendar integration (see Section G)

---

## D. Baselines & Suggestions (Exact Mechanics)

### Baseline Mapping Flow
1. **UI Input** (`TrainingSetupScreen.tsx:700-733`):
   - User enters weight and selects reps (3/5/8) for baseline exercises
   - Baseline keys: `'bench_press'`, `'squat'`, `'deadlift'`, `'overhead_press'`, `'row'`
2. **e1RM Calculation** (`TrainingSetupScreen.tsx:315-320`):
   - Calls `estimate1RM(weight, reps)` from `progression.ts`
   - Formula: `weight * (1 + reps / 30)` (Epley)
3. **ID Mapping** (`TrainingSetupScreen.tsx:315-320`):
   - Calls `mapBaselineKeyToExerciseId(setupKey)` from `setupMappings.ts`
   - Maps: `'bench_press'` → `'barbell_bench_press'`, `'row'` → `'barbell_row'`, etc.
4. **Storage** (`TrainingSetupScreen.tsx:315-320`):
   - Stored in `profile.baselines` as `Record<string, number>` where key = catalog exercise ID, value = e1RM
   - Saved to `training_profiles.baselines` JSONB
5. **Profile Snapshot** (`TrainingSetupScreen.tsx:322-362`):
   - When creating program, `baselines` copied to `profile_snapshot.baselines` in program instance
6. **Suggestion Usage** (`engine/index.ts:481-486`):
   - `suggestLoading()` checks `userState.estimated1RM?.[exercise.id]` first
   - If found, calculates: `suggested = e1RM / (1 + plannedReps / 30)`
   - Rounds to weight step (2.5kg for free weights, 5kg for machines)

**Files**: `app/src/screens/training/TrainingSetupScreen.tsx:315-320`, `app/src/lib/training/setupMappings.ts`, `app/src/lib/training/engine/index.ts:468-486`

### How Suggested Weights Derived for Arbitrary Exercises
1. **Priority order** (`engine/index.ts:468-520`):
   - **First**: `userState.estimated1RM?.[exercise.id]` (from baselines)
   - **Second**: `userState.lastSessionPerformance?.[exercise.id]` (from previous session)
     - Computes e1RM from best set, applies progression
   - **Third**: Defaults based on exercise type:
     - Free weight: 60kg (intermediate horizontal_press)
     - Machine: 50kg
     - Bodyweight: 0kg (no weight)
2. **Progression logic** (`engine/index.ts:507-520`):
   - Uses `evaluateProgression()` to determine: `'increase'`, `'maintain'`, `'reduce'`, `'reduce_sets'`
   - Calls `calculateNextWeight()` with progression type
   - Applies rep range based on priority (`primary` vs `accessory`)

**File**: `app/src/lib/training/engine/index.ts:468-520`

### How Previous Stats Incorporated
1. **Last Performance Query** (`TrainingSessionView.tsx:94-112`):
   - `lastPerformanceQ` queries `getLastPerformanceForExercise()` for current exercise
   - Filters by `session_type_label` if available (apples-to-apples)
   - Returns: `{ weight, reps, date, session_type_label }`
2. **Display** (`ExerciseCard.tsx:846-850`):
   - Passed as `lastPerformance` prop to `ExerciseCard`
   - Displayed as "Last: 100kg × 5" above planned sets
3. **Suggestion** (`engine/index.ts:489-520`):
   - Used in `suggestLoading()` as fallback if no baseline
   - Computes e1RM from last performance, applies progression

**Files**: `app/src/components/training/TrainingSessionView.tsx:94-112`, `app/src/components/training/ExerciseCard.tsx:846-850`, `app/src/lib/training/engine/index.ts:489-520`

---

## E. Scheduling & Weekday Mapping

### UI Weekday (1..7) vs JS Weekday (0..6)
- **UI convention**: `selectedWeekdays` array uses `1=Monday, 7=Sunday` (`TrainingSetupScreen.tsx:602-609`)
- **JS `Date.getDay()`**: Returns `0=Sunday, 1=Monday, ..., 6=Saturday`
- **Conversion**: `programPlanner.ts:323` converts JS weekday to UI convention: `dayDate.getDay() === 0 ? 7 : dayDate.getDay()`

### Where Selected Weekdays Stored
1. **Profile**: `training_profiles` does NOT store `selected_weekdays` (only `days_per_week`)
2. **Program Instance**: `training_program_instances.selected_weekdays` (JSONB array: `[1, 3, 5]`)
3. **Program Days**: `training_program_days.day_index` (1-7, weekday number)

**Files**: `app/src/lib/api.ts:2201`, `app/src/lib/training/programPlanner.ts:214`

### How Program Days Generated
1. **Plan Generation** (`programPlanner.ts:32-79`):
   - `buildFourWeekPlan()` creates `FourWeekProgramPlan` with `weeks[]` and `selectedWeekdays[]`
   - Each week has `days: Record<number, ProgramDayPlan>` where key = weekday (1-7)
2. **Date Calculation** (`programPlanner.ts:284-339`):
   - `generateProgramDays()` iterates weeks 1-4
   - For each weekday in plan:
     - Computes base date: `baseDate + (weekIndex - 1) * 7`
     - Gets current weekday: `dayDate.getDay() === 0 ? 7 : dayDate.getDay()`
     - Calculates days to add: `weekday - currentWeekday`
     - Sets date: `dayDate.setDate(dayDate.getDate() + daysToAdd)`
3. **Insertion** (`api.ts:2326-2356`):
   - `createProgramDays()` bulk inserts into `training_program_days`

**Files**: `app/src/lib/training/programPlanner.ts:32-79`, `app/src/lib/training/programPlanner.ts:284-339`, `app/src/lib/api.ts:2326-2356`

### Sunday Appearing When Not Selected - Root Cause
**Hypothesis**: Date calculation bug in `generateProgramDays()` when `startDate` is not a Monday.

**Analysis** (`programPlanner.ts:319-325`):
```typescript
const dayDate = new Date(baseDate);
dayDate.setDate(baseDate.getDate() + (weekIndex - 1) * 7);
const currentWeekday = dayDate.getDay() === 0 ? 7 : dayDate.getDay();
const daysToAdd = weekday - currentWeekday;
dayDate.setDate(dayDate.getDate() + daysToAdd);
```

**Problem**: If `baseDate` (start date) is not Monday, the first week's date calculation may place days on wrong weekdays. For example:
- If start date is Wednesday (day 3), and user selects `[1, 3, 5]` (Mon, Wed, Fri):
  - Week 1, Monday (weekday=1): `currentWeekday=3`, `daysToAdd=1-3=-2` → goes to previous Monday (correct)
  - Week 1, Wednesday (weekday=3): `currentWeekday=3`, `daysToAdd=0` → stays on Wednesday (correct)
  - Week 1, Friday (weekday=5): `currentWeekday=3`, `daysToAdd=5-3=2` → goes to Friday (correct)
- **BUT**: If the calculation for a later week shifts incorrectly, Sunday (7) might appear.

**Likely Root Cause**: The date calculation assumes `baseDate` is the start of week 1, but if `baseDate` is not Monday, the offset calculation may produce dates outside the selected weekdays for later weeks.

**File**: `app/src/lib/training/programPlanner.ts:319-325`

---

## F. Timer / Guided Session Capabilities

### Timer Code Location
- **`app/src/components/training/RestTimer.tsx`** (116 lines)
  - Purpose: Rest period countdown between sets
  - Features:
    - Countdown from `targetSeconds`
    - Extend buttons (+30s, +60s)
    - Skip button
    - Background/foreground handling (pauses when backgrounded, resumes when foregrounded)
    - **Pause state exists** (`isPaused` state at line 18) but **NO UI BUTTON** to toggle it

### Guided Mode
- **Not found**: No explicit "guided mode" beyond `mode: 'timed'` vs `'manual'`
- **`mode: 'timed'`**: Only affects whether rest timer starts after set completion
- **No guided flow**: No step-by-step instructions, no voice prompts, no automatic progression

### Pause Capability
- **State exists**: `isPaused` state in `RestTimer.tsx:18`
- **Logic exists**: Timer stops when `isPaused === true` (line 31)
- **UI missing**: No button to toggle `setIsPaused()`
- **Workaround**: User can extend timer or skip, but cannot pause/resume

**File**: `app/src/components/training/RestTimer.tsx:18, 31`

### Where It Would Integrate
- **Rest timer pause**: Add pause/resume button in `RestTimer.tsx` UI (lines 100-110)
- **Guided mode**: Would require new session mode, UI toggles, and step-by-step flow in `TrainingSessionView.tsx`

---

## G. Calendar Integration

### Search Results
- **No training calendar integration found**
- Only calendar-related code found:
  - `SettingsScreen.tsx:955`: Calendar icon for settings
  - `MoodScreen.tsx:1166`: Calendar icon for "Today" section
  - `MedsScreen.tsx:743, 833`: Calendar icons for meds scheduling

### Conclusion
**Calendar integration for training sessions: NOT FOUND**

Training sessions are NOT created as calendar events. The `scheduler.ts` file has `generateWeeklyTrainingPlan()` which creates `routine_suggestions` (legacy routine system), but this is not actively used for program generation and does not create calendar events.

**Files checked**: `app/src/lib/training/scheduler.ts`, `app/src/lib/api.ts` (training functions), `app/src/screens/TrainingScreen.tsx`, `app/src/components/training/TrainingSessionView.tsx`

---

## H. Issue Root Cause Notes (No Fixes Yet)

### 1. "Text strings must be rendered within a <Text> component" when clearing weight TextInput

**Symptom**: Error occurs when user clears weight input in `ExerciseCard` edit dialog.

**Repro Hypothesis**:
- User opens edit dialog (`editingSetIndex !== null`)
- User clears `TextInput` value (sets `editWeight` to empty string `''`)
- React Native Paper `TextInput` may render empty string as raw text outside `<Text>`

**Root Cause File/Line**:
- `app/src/components/training/ExerciseCard.tsx:380-386`
- `value={editWeight}` where `editWeight` can be `''`
- React Native Paper `TextInput` may not handle empty string gracefully in some versions

**What to Change**:
- Ensure `editWeight` is never `''` - use `''` → `'0'` conversion or `value={editWeight || '0'}`
- Or wrap empty state handling in `TextInput` component

### 2. After editing setup and saving, UX returns to "setup complete / start training" card again

**Symptom**: After editing setup, user sees "Create program" card instead of training plan.

**Repro Hypothesis**:
- User edits setup → saves → `onComplete()` fires → `setShowSetup(false)`
- `TrainingScreen` re-renders, checks `!profileQ.data || !activeProgramQ.data` (line 388)
- Query cache may be stale or new program not yet in cache
- Conditional render shows setup CTA instead of main view

**Root Cause File/Line**:
- `app/src/screens/TrainingScreen.tsx:388-413` (conditional render)
- `app/src/screens/TrainingScreen.tsx:356-363` (`onComplete` callback)
- Query invalidation may not be synchronous, or new program query may fail

**What to Change**:
- Ensure query invalidation waits for refetch before hiding setup
- Or check if `activeProgramQ.isLoading` and show loading state instead of setup CTA
- Or explicitly navigate to main view after successful save

### 3. Week 2 includes a Sunday session when Sunday wasn't selected

**Symptom**: Program days include Sunday (day_index=7) even though user selected `[1, 3, 5]` (Mon, Wed, Fri).

**Repro Hypothesis**: See Section E for detailed analysis.

**Root Cause File/Line**:
- `app/src/lib/training/programPlanner.ts:319-325` (date calculation in `generateProgramDays()`)
- Bug in weekday offset calculation when `startDate` is not Monday

**What to Change**:
- Fix date calculation to ensure `baseDate` is always Monday (or adjust offset logic)
- Add validation to ensure generated dates match `selectedWeekdays`
- Or normalize `startDate` to next Monday before generating days

### 4. Timer feels unguided / missing pause

**Symptom**: Rest timer has no pause button, user cannot pause/resume.

**Repro Hypothesis**: See Section F.

**Root Cause File/Line**:
- `app/src/components/training/RestTimer.tsx:18` (pause state exists)
- `app/src/components/training/RestTimer.tsx:100-110` (UI buttons - pause button missing)

**What to Change**:
- Add pause/resume button in `RestTimer` UI
- Toggle `isPaused` state on button press
- Update button label/text based on pause state

### 5. Session exercise screen has too many +/- controls; lacks previous stats display

**Symptom**: Exercise card has many +/- buttons, previous performance not prominently displayed.

**Repro Hypothesis**:
- `ExerciseCard.tsx:257-280` has +/- controls for each set's weight/reps
- Previous stats are displayed (`lastPerformance` prop) but may be small/not prominent

**Root Cause File/Line**:
- `app/src/components/training/ExerciseCard.tsx:257-280` (weight/reps controls)
- `app/src/components/training/ExerciseCard.tsx:846-850` (lastPerformance display - location inferred)

**What to Change**:
- Reduce +/- controls (maybe only for next set, or use different UI pattern)
- Make previous stats more prominent (larger text, dedicated section)
- Or add "Accept suggested" button to skip manual adjustment

### 6. Warm-ups absent

**Symptom**: No warm-up sets generated or displayed in session plans.

**Repro Hypothesis**: See Section C ("What Does NOT Exist Yet").

**Root Cause File/Line**:
- `app/src/lib/training/rules/rules.v1.json:150` (`warmupMinutes: 5` exists)
- `app/src/lib/training/engine/index.ts:815, 918` (warmup minutes used in duration calculation only)
- **No warm-up set generation logic found**

**What to Change**:
- Add warm-up set generation in `buildSession()` or `suggestLoading()`
- Add warm-up sets to `PlannedSet[]` with `setIndex: 0` or negative indices
- Display warm-up sets in `ExerciseCard` with different styling

### 7. Rest periods in program differ from prior gym routine expectations (2–3 min, 4 working sets, ARP)

**Symptom**: Rest periods may be shorter/longer than user expects.

**Repro Hypothesis**:
- Rest periods come from `rules.v1.json` or exercise-specific defaults
- May not match user's prior routine (2-3 min, 4 working sets, autoregulated progression)

**Root Cause File/Line**:
- `app/src/lib/training/rules/rules.v1.json` (rest time rules)
- `app/src/lib/training/engine/index.ts` (rest time assignment in `buildSession()`)

**What to Change**:
- Review rest time defaults in rules file
- Add user preference for rest period length
- Or adjust rest times based on exercise priority/type

---

## I. "Already Exists?" Checks (Anti-Duplication)

### Prefill/hydrate setup fields when editing (goals/schedule/equipment/constraints/baselines)
**Status**: ✅ **EXISTS**
- **File**: `app/src/screens/training/TrainingSetupScreen.tsx:140-220`
- **Implementation**: `useEffect` hook loads `getTrainingProfile()` and `getActiveProgramInstance()`, hydrates all UI state (goals, schedule, equipment, constraints, baselines)
- **Reverse mappings**: `mapExerciseIdToBaselineKey()`, `denormalizeEquipmentId()`, `reverseEstimate1RM()` in `setupMappings.ts`

### Ability to exit/cancel setup edit without completing all steps
**Status**: ❌ **NOT FOUND**
- **File**: `app/src/screens/training/TrainingSetupScreen.tsx:738-749`
- **Current**: Only "Back" button (goes to previous step), no "Cancel" or "Exit" button
- **Workaround**: User can navigate away (drawer/back), but setup state persists

### "Accept all suggested" (no re-entry) for a set/exercise/session
**Status**: ❌ **NOT FOUND**
- **File**: `app/src/components/training/ExerciseCard.tsx`
- **Current**: User must manually adjust weight/reps for each set, or tap "Complete Set" with current values
- **No "Accept suggested" button found**

### Show previous performance stats per exercise
**Status**: ✅ **EXISTS**
- **File**: `app/src/components/training/TrainingSessionView.tsx:94-112` (query), `app/src/components/training/ExerciseCard.tsx:846-850` (display)
- **Implementation**: `lastPerformanceQ` queries `getLastPerformanceForExercise()`, passed as `lastPerformance` prop to `ExerciseCard`
- **Display**: Shows "Last: 100kg × 5" above planned sets

### Warm-up sets
**Status**: ❌ **NOT FOUND**
- **File**: `app/src/lib/training/engine/index.ts`
- **Current**: `warmupMinutes` used in duration calculation only, no warm-up sets generated
- **No warm-up set logic found**

### Guided exercise flow with rest countdown and pause
**Status**: ⚠️ **PARTIAL**
- **Rest countdown**: ✅ EXISTS (`app/src/components/training/RestTimer.tsx`)
- **Pause**: ⚠️ STATE EXISTS BUT NO UI (`RestTimer.tsx:18` - `isPaused` state exists, no button)
- **Guided flow**: ❌ NOT FOUND (no step-by-step instructions, no voice prompts)

### Watch-friendly interaction model (minimal taps)
**Status**: ❌ **NOT FOUND**
- **File**: `app/src/components/training/TrainingSessionView.tsx`, `app/src/components/training/ExerciseCard.tsx`
- **Current**: Full mobile UI with many buttons, no watch-specific components
- **No watch UI found**

---

## J. Canonical Snapshot Summary (Frozen Baseline)

### How Training Works Today (Ground Truth)

1. **Setup Flow**:
   - Multi-step wizard (goals → schedule → equipment → constraints → baselines)
   - Prefill hydration from saved profile (EXISTS)
   - Baseline e1RM calculation and ID mapping (EXISTS)
   - Program instance creation with 4-week plan (EXISTS)
   - Program days generated deterministically for selected weekdays (EXISTS, but weekday mapping bug suspected)

2. **Session Generation**:
   - `buildSessionFromProgramDay()` uses program day intents and profile snapshot
   - Exercise selection via intent-based scoring (EXISTS)
   - Load suggestions use baselines → last performance → defaults (EXISTS)
   - Planned sets stored in `training_session_items.planned` JSONB (EXISTS)

3. **Session Execution**:
   - One exercise per screen (`TrainingSessionView` with `currentExerciseIndex`)
   - Set logging via `logSet()` updates runtime state and persists to DB (EXISTS)
   - Rest timer with extend/skip (EXISTS), pause state exists but no UI button (PARTIAL)
   - Autoregulation adjustments based on RPE/reps (EXISTS)
   - Previous stats displayed per exercise (EXISTS)

4. **Data Persistence**:
   - Sessions: `training_sessions` (started_at, ended_at, summary)
   - Items: `training_session_items` (planned, performed, skipped)
   - Set logs: `training_set_logs` (individual sets)
   - Programs: `training_program_instances` (4-week plan, profile snapshot)
   - Program days: `training_program_days` (date, week_index, day_index, intents)

5. **State Management**:
   - React Query for server state (profile, program, sessions, set logs)
   - Runtime state machine for active sessions (`SessionRuntimeState`)
   - Component state for UI (current exercise, rest timer, dialogs)

6. **Navigation**:
   - Main screen: `TrainingScreen` (Today/History tabs, week navigation)
   - Setup: `TrainingSetupScreen` (wizard, can be opened via gear icon)
   - Session: `TrainingSessionView` (one exercise per screen)
   - Preview: `SessionPreviewModal` (before starting session)

7. **Features That Exist**:
   - Baseline e1RM mapping and usage ✅
   - Previous performance display ✅
   - Autoregulation adjustments ✅
   - Rest timer (with extend/skip) ✅
   - Offline queue for set logs ✅
   - Post-session mood prompt ✅
   - Program day generation ✅
   - Prefill hydration when editing setup ✅

8. **Features That Do NOT Exist**:
   - Warm-up sets ❌
   - Calendar integration ❌
   - Guided mode (step-by-step) ❌
   - Pause button for rest timer ❌
   - "Accept suggested" button ❌
   - Cancel/exit setup button ❌
   - Watch-friendly UI ❌

### Invariants We Must Not Break

1. **ID Mappings**:
   - Baseline keys: `'bench_press'`, `'squat'`, `'deadlift'`, `'overhead_press'`, `'row'` → catalog IDs via `mapBaselineKeyToExerciseId()`
   - Equipment IDs: UI uses `'cable_machine'`, engine expects `'cable_machine'` (normalized via `normalizeEquipmentId()`)

2. **Database Schema**:
   - `training_program_days.day_index`: 1=Monday, 7=Sunday (NOT JS weekday 0-6)
   - `training_sessions.mode`: `'timed'` or `'manual'` (affects rest timer)
   - `training_session_items.planned`: JSONB with `sets`, `priority`, `intents`, `decisionTrace`
   - `training_session_items.performed`: JSONB with `sets` array (matches `SetLogEntry` format)

3. **Navigation Assumptions**:
   - `TrainingScreen` checks `!profileQ.data || !activeProgramQ.data` to show setup CTA
   - `activeSessionId` state drives `TrainingSessionView` rendering
   - `onComplete()` callbacks invalidate queries and reset state

4. **Runtime State**:
   - `SessionRuntimeState` is source of truth during active session
   - Set logs persisted to DB but runtime state drives UI
   - `currentExerciseIndex` must match runtime state's `currentExerciseIndex`

5. **Weekday Convention**:
   - UI and DB use `1=Monday, 7=Sunday`
   - JS `Date.getDay()` returns `0=Sunday, 1=Monday, ..., 6=Saturday`
   - Conversion: `dayDate.getDay() === 0 ? 7 : dayDate.getDay()`

---

## Proposed Phased Improvement Plan (NO CODE)

### Phase 1: Critical Bug Fixes (High Priority, Low Risk)
1. **Fix weekday mapping bug** (Issue #3)
   - Normalize `startDate` to Monday before generating program days
   - Add validation to ensure generated dates match `selectedWeekdays`
   - **Risk**: Low (surgical fix, no behavior change)
   - **UX Value**: High (prevents wrong days appearing)

2. **Fix setup completion navigation** (Issue #2)
   - Ensure query invalidation waits for refetch before hiding setup
   - Or show loading state instead of setup CTA during refetch
   - **Risk**: Low (UI-only change)
   - **UX Value**: High (prevents confusion)

3. **Fix TextInput empty string error** (Issue #1)
   - Ensure `editWeight`/`editReps` never empty string
   - Use `value={editWeight || '0'}` or convert empty to `'0'`
   - **Risk**: Low (defensive fix)
   - **UX Value**: Medium (prevents crash)

### Phase 2: UX Polish (Medium Priority, Low Risk)
4. **Add pause button to rest timer** (Issue #4)
   - Add pause/resume button in `RestTimer` UI
   - Toggle `isPaused` state (already exists)
   - **Risk**: Low (UI-only, state exists)
   - **UX Value**: Medium (user-requested feature)

5. **Add cancel/exit button to setup** (Anti-duplication check)
   - Add "Cancel" or "Exit" button in setup wizard
   - Clear setup state and return to main view
   - **Risk**: Low (UI-only, no persistence changes)
   - **UX Value**: Medium (improves UX flow)

6. **Improve previous stats display** (Issue #5)
   - Make previous stats more prominent (larger text, dedicated section)
   - Or add "Last session" card above exercise card
   - **Risk**: Low (UI-only)
   - **UX Value**: Medium (helps user make informed decisions)

### Phase 3: Feature Additions (Medium Priority, Medium Risk)
7. **Add "Accept suggested" button** (Anti-duplication check)
   - Add button to accept all suggested weights/reps for current set
   - Or "Accept all" for entire exercise
   - **Risk**: Medium (requires state management)
   - **UX Value**: High (reduces friction)

8. **Reduce +/- controls clutter** (Issue #5)
   - Only show +/- for next pending set
   - Or use different UI pattern (slider, quick adjust buttons)
   - **Risk**: Medium (UI change, may affect user flow)
   - **UX Value**: Medium (cleaner UI)

9. **Add warm-up sets** (Issue #6)
   - Generate warm-up sets in `buildSession()` based on working weight
   - Display warm-up sets in `ExerciseCard` with different styling
   - **Risk**: Medium (requires engine changes, new UI)
   - **UX Value**: High (completes training flow)

### Phase 4: Advanced Features (Low Priority, High Risk)
10. **Add guided mode** (Anti-duplication check)
    - New session mode with step-by-step instructions
    - Voice prompts or text guidance
    - **Risk**: High (major feature, requires new UI/UX)
    - **UX Value**: High (differentiates product)

11. **Add calendar integration** (Section G)
    - Create calendar events for program days
    - Sync with device calendar
    - **Risk**: High (requires permissions, platform-specific code)
    - **UX Value**: Medium (nice-to-have)

12. **Add watch-friendly UI** (Anti-duplication check)
    - Minimal-tap interactions for Apple Watch
    - Simplified exercise card for small screen
    - **Risk**: High (requires new components, platform-specific)
    - **UX Value**: Low (niche use case)

---

**END OF AUDIT**
