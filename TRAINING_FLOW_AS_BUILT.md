# TRAINING FLOW STATE DIAGRAM (FACTUAL)

**Generated**: 2025-01-XX  
**Purpose**: Describe the actual training flow, not intended flow

---

## FLOW 1: FIRST-TIME SETUP → SAVE → WHAT HAPPENS

### Step 1: User Opens Training Screen
- **File**: `app/src/screens/TrainingScreen.tsx`
- **Condition**: `!profileQ.data || !activeProgramQ.data` (line 394)
- **UI Shown**: Setup CTA card (line 395-418)
- **User Action**: Taps "Start setup" button
- **State Change**: `setShowSetup(true)` (line 412)

### Step 2: TrainingSetupScreen Renders
- **File**: `app/src/screens/training/TrainingSetupScreen.tsx`
- **Condition**: `showSetup === true` in TrainingScreen (line 353)
- **UI Shown**: Setup wizard (goals → schedule → equipment → constraints → baselines)
- **State**: Local state in TrainingSetupScreen (goals, weekdays, equipment, etc.)
- **Prefill**: `useEffect` at line 148-225 checks `profileQ.data` - if exists, hydrates UI (edit mode)

### Step 3: User Completes Setup
- **File**: `app/src/screens/training/TrainingSetupScreen.tsx`
- **Action**: User taps "Save" on baselines step (line ~750)
- **Mutation**: `saveProfileMutation.mutate()` (line ~300)
- **What Happens**:
  1. **Profile Save**: `upsertTrainingProfile()` called (line ~310)
  2. **Program Creation**: If no active program exists:
     - `buildFourWeekPlan()` called (line ~315)
     - `createProgramInstance()` called (line 322)
     - `generateProgramDays()` called (line 342)
     - `createProgramDays()` called (line 362)
  3. **Routine Suggestions**: `generateWeeklyTrainingPlan()` called in `onSuccess` (line 410)
  4. **State Change**: `setStep('complete')` (line 419)

### Step 4: Setup Complete Screen
- **File**: `app/src/screens/training/TrainingSetupScreen.tsx`
- **Condition**: `step === 'complete'` (line 504)
- **UI Shown**: "Setup complete!" card with "Start training" button
- **User Action**: Taps "Start training" button
- **Callback**: `onComplete?.()` called (line 508)

### Step 5: Return to TrainingScreen
- **File**: `app/src/screens/TrainingScreen.tsx`
- **Callback**: `onComplete` at line 356-366
- **What Happens**:
  1. `setShowSetup(false)` - Hides setup screen
  2. `qc.invalidateQueries({ queryKey: ['training:profile'] })` - Marks profile stale
  3. `qc.invalidateQueries({ queryKey: ['training:activeProgram'] })` - Marks program stale
  4. `qc.invalidateQueries({ queryKey: ['training:programDays:week'] })` - Marks week days stale
  5. `qc.invalidateQueries({ queryKey: ['training:programDays:fourWeek'] })` - Marks 4-week days stale
  6. `qc.refetchQueries({ queryKey: ['training:profile'] })` - Forces refetch
  7. `qc.refetchQueries({ queryKey: ['training:activeProgram'] })` - Forces refetch

### Step 6: TrainingScreen Re-renders
- **File**: `app/src/screens/TrainingScreen.tsx`
- **Condition Check**: Line 393-394
  ```typescript
  const isRefetchingAfterSetup = profileQ.isFetching || activeProgramQ.isFetching;
  if (!profileQ.isLoading && !activeProgramQ.isLoading && !isRefetchingAfterSetup && (!profileQ.data || !activeProgramQ.data)) {
    // Show setup CTA
  }
  ```
- **Expected**: Queries refetch, `isFetching` becomes `true`, then `false`, data arrives
- **UI Shown**: Training plan (WeekView, FourWeekPreview) if data exists
- **Potential Issue**: If refetch fails or is slow, `isFetching` becomes `false` before data arrives, CTA shows again

### State Sources
- **Profile**: `training_profiles` table (Supabase)
- **Program**: `training_program_instances` table (Supabase)
- **Program Days**: `training_program_days` table (Supabase)
- **Cache**: React Query cache (in-memory, per query key)

### Navigation Triggers
- **Setup → Plan**: `setShowSetup(false)` + query invalidation/refetch
- **No explicit navigation** - Conditional rendering based on state

---

## FLOW 2: EDIT SETUP → SAVE → WHAT HAPPENS

### Step 1: User Opens Edit
- **File**: `app/src/screens/TrainingScreen.tsx`
- **Action**: User taps cog icon (line 457)
- **State Change**: `setShowSetup(true)`

### Step 2: TrainingSetupScreen Renders (Edit Mode)
- **File**: `app/src/screens/training/TrainingSetupScreen.tsx`
- **Condition**: `profileQ.data` exists (line 148)
- **Prefill**: `useEffect` at line 148-225 hydrates UI from `profileQ.data` and `activeProgramQ.data`
- **UI Shown**: Setup wizard with prefilled values

### Step 3: User Edits and Saves
- **File**: `app/src/screens/training/TrainingSetupScreen.tsx`
- **Action**: User modifies values and taps "Save"
- **Mutation**: `saveProfileMutation.mutate()` (line ~300)
- **What Happens**:
  1. **Profile Update**: `upsertTrainingProfile()` called (updates existing)
  2. **Program Update**: If program exists:
     - **UNKNOWN**: Does it update existing program or create new?
     - **Code Check**: Line 322 calls `createProgramInstance()` - may create duplicate if not checking for existing
  3. **State Change**: `setStep('complete')` (line 419)

### Step 4: Setup Complete Screen (Edit Mode)
- **File**: `app/src/screens/training/TrainingSetupScreen.tsx`
- **Condition**: `step === 'complete'` (line 504)
- **UI Shown**: "Setup complete!" card
- **User Action**: Taps "Start training" button OR "Exit" button (if edit mode, line 753)
- **Callback**: `onComplete?.()` called

### Step 5: Return to TrainingScreen
- **File**: `app/src/screens/TrainingScreen.tsx`
- **Callback**: Same as Flow 1 (line 356-366)
- **What Happens**: Same invalidation/refetch sequence

### Step 6: TrainingScreen Re-renders
- **File**: `app/src/screens/TrainingScreen.tsx`
- **Condition Check**: Same as Flow 1 (line 393-394)
- **Expected**: Queries refetch, data arrives, plan shows
- **Potential Issue**: Same as Flow 1 - refetch timing race

### State Sources
- **Same as Flow 1** - Profile, Program, Program Days from Supabase

### Navigation Triggers
- **Same as Flow 1** - `setShowSetup(false)` + query invalidation/refetch

### Conditions That Fire Incorrectly
- **Potential**: If `createProgramInstance()` creates duplicate program instead of updating
- **Location**: `app/src/screens/training/TrainingSetupScreen.tsx` line 322
- **Risk**: Multiple active programs, or old program not deactivated

---

## FLOW 3: START SESSION → WHAT SCREEN SHOWS

### Step 1: User Taps Program Day
- **File**: `app/src/screens/TrainingScreen.tsx`
- **Action**: User taps a day in WeekView or FourWeekPreview
- **Handler**: `handleDayPress()` (line 265-286)
- **What Happens**:
  1. `setSelectedProgramDay(programDay)` (line 267)
  2. `buildSessionFromProgramDay()` called (line 273)
  3. `setPendingPlan(plan)` (line 282)
  4. `setShowPreview(true)` (line 283)

### Step 2: Session Preview Modal
- **File**: `app/src/components/training/SessionPreviewModal.tsx`
- **Condition**: `showPreview === true` (line 715)
- **UI Shown**: Modal with session plan summary
- **User Action**: Taps "Confirm" button
- **Handler**: `handleConfirmSession()` (line 288-295)

### Step 3: Session Creation
- **File**: `app/src/screens/TrainingScreen.tsx`
- **Action**: `startSessionMutation.mutate()` (line 291)
- **What Happens**:
  1. **Session Created**: `createTrainingSession()` called (line 215)
  2. **Items Created**: `createTrainingSessionItems()` called (line 239)
  3. **Event Logged**: `logTrainingEvent()` called (line 241)
  4. **onSuccess**: 
     - `setActiveSessionId(data.sessionId)` (line 251)
     - `setShowPreview(false)` (line 252)
     - `setPendingPlan(null)` (line 253)
     - `setSelectedProgramDay(null)` (line 254)
     - `qc.invalidateQueries({ queryKey: ['training:sessions'] })` (line 255)

### Step 4: Session View Renders
- **File**: `app/src/screens/TrainingScreen.tsx`
- **Condition**: `activeSessionId && activeSessionQ.data` (line 377)
- **Query**: `activeSessionQ` fetches session data (line 169-174)
- **UI Shown**: `TrainingSessionView` component
- **Potential Issue**: If `activeSessionQ.data` is `undefined` (loading or error), session view doesn't render

### State Sources
- **Session**: `training_sessions` table (Supabase)
- **Session Items**: `training_session_items` table (Supabase)
- **Cache**: React Query cache `['training:session', activeSessionId]`

### Navigation Triggers
- **Plan → Preview**: `setShowPreview(true)`
- **Preview → Session**: `setActiveSessionId(sessionId)`
- **No explicit navigation** - Conditional rendering

### Conditions That Fire Incorrectly
- **Potential**: `activeSessionQ.data` is `undefined` even though session was created
- **When**: Query loading, query error, or session not found
- **Risk**: User sees plan view instead of session view

---

## FLOW 4: DURING SESSION → WHAT HAPPENS

### Step 1: Exercise Display
- **File**: `app/src/components/training/TrainingSessionView.tsx`
- **State**: `currentExerciseIndex` (line 63) determines which exercise shows
- **UI Shown**: `ExerciseCard` component (line 940)
- **Data**: `currentItem` from `items[currentExerciseIndex]` (line 90)

### Step 2: User Logs a Set
- **File**: `app/src/components/training/ExerciseCard.tsx`
- **Action**: User taps "Done" button (line 349-382)
- **Handler**: `onSetComplete()` called (line 431)
- **What Happens**:
  1. `handleSetComplete()` in TrainingSessionView (line 297-496)
  2. **Runtime Update**: `logSet()` called (line 350)
  3. **DB Write**: `logTrainingSet()` called (line 427)
  4. **Offline Queue**: If offline, enqueued (line 434)
  5. **State Update**: `updateTrainingSessionItem()` called (line 448)
  6. **Rest Timer**: If timed mode, rest timer starts (line 464)

### Step 3: Rest Timer
- **File**: `app/src/components/training/RestTimer.tsx`
- **Condition**: `restTimer !== null` and `restTimer.exerciseId === currentItem?.id` (line 817)
- **UI Shown**: Rest timer card with countdown
- **State**: `restTimer` state in TrainingSessionView (line 67)
- **Controls**: Pause/Resume, Extend, Skip (line 100-118)

### Step 4: Next Exercise
- **File**: `app/src/components/training/TrainingSessionView.tsx`
- **Action**: User taps "Next exercise" button (line 396 in ExerciseCard)
- **Handler**: `handleNext()` (line 677-690)
- **What Happens**:
  1. `advanceExercise()` called (line 682)
  2. `setCurrentExerciseIndex()` updated (line 688)
  3. Runtime state updated

### State Sources
- **Runtime State**: `SessionRuntimeState` in-memory (line 77)
- **Set Logs**: `training_set_logs` table (Supabase)
- **Session Items**: `training_session_items` table (Supabase) - `performed.sets` array

### Navigation Triggers
- **Exercise → Exercise**: `setCurrentExerciseIndex()`
- **No explicit navigation** - Same component, different exercise index

---

## FLOW 5: END SESSION → WHAT PERSISTS

### Step 1: User Ends Session
- **File**: `app/src/components/training/TrainingSessionView.tsx`
- **Action**: User taps "End Session" button (line 758-771)
- **Handler**: `Alert.alert()` confirmation (line 762-765)
- **User Confirms**: Taps "End & Save"
- **Handler**: `handleComplete()` called (line 553-651)

### Step 2: Session Finalization
- **File**: `app/src/components/training/TrainingSessionView.tsx`
- **Function**: `handleComplete()` (line 553-651)
- **What Happens**:
  1. **Runtime End**: `endSession()` called (line 598)
  2. **Session Update**: `updateTrainingSession()` called (line 604-620)
     - Sets `ended_at` timestamp
     - Sets `duration_minutes`
     - Sets `total_sets`, `prs`, `level_up_events`, `adaptation_trace`
  3. **State Update**: `setRuntimeState()` updated to `status: 'completed'` (line 601)
  4. **Callback**: `onComplete()` called (line 650)

### Step 3: Return to TrainingScreen
- **File**: `app/src/screens/TrainingScreen.tsx`
- **Callback**: `onComplete` at line 382-385
- **What Happens**:
  1. `setActiveSessionId(null)` (line 383)
  2. `qc.invalidateQueries({ queryKey: ['training:sessions'] })` (line 384)

### Step 4: TrainingScreen Re-renders
- **File**: `app/src/screens/TrainingScreen.tsx`
- **Condition**: `activeSessionId === null` (line 377 check fails)
- **UI Shown**: Training plan view
- **Sessions List**: Refetched due to invalidation

### What Persists
- **Session Row**: `training_sessions` table
  - `ended_at` timestamp
  - `duration_minutes`
  - `total_sets`
  - `prs` (JSON array)
  - `level_up_events` (JSON array)
  - `adaptation_trace` (JSON object)
- **Set Logs**: `training_set_logs` table
  - One row per set logged
  - `weight`, `reps`, `rpe`, `completed_at`
- **Session Items**: `training_session_items` table
  - `performed.sets` array (JSON) - may be redundant with set_logs

### State Sources
- **Session**: `training_sessions` table (Supabase)
- **Set Logs**: `training_set_logs` table (Supabase)
- **Cache**: React Query cache `['training:sessions']`

### Navigation Triggers
- **Session → Plan**: `setActiveSessionId(null)`
- **No explicit navigation** - Conditional rendering

---

## FLOW 6: APP RESTART → WHAT REAPPEARS

### Step 1: App Launches
- **File**: `app/App.tsx`
- **Entry**: `App()` function (line 514)
- **What Happens**: Providers initialize, RootNavigator renders

### Step 2: TrainingScreen Mounts
- **File**: `app/src/screens/TrainingScreen.tsx`
- **Queries**: 
  - `profileQ` (line 84-89)
  - `activeProgramQ` (line 92-97)
  - `programDaysWeekQ` (line 116-124)
  - `programDaysFourWeekQ` (line 127-135)
  - `sessionsQ` (line 138-143)

### Step 3: Query Execution
- **What Happens**: React Query executes queries
- **Data Source**: Supabase (via API functions)
- **Cache**: React Query cache (in-memory, cleared on app restart)

### Step 4: Conditional Rendering
- **File**: `app/src/screens/TrainingScreen.tsx`
- **Check 1**: `showSetup === true`? → Show setup (line 353)
- **Check 2**: `activeSessionId && activeSessionQ.data`? → Show session (line 377)
- **Check 3**: `!profileQ.data || !activeProgramQ.data`? → Show setup CTA (line 394)
- **Default**: Show training plan

### What Reappears
- **Profile**: Loaded from `training_profiles` table
- **Program**: Loaded from `training_program_instances` table (status='active')
- **Program Days**: Loaded from `training_program_days` table
- **Sessions**: Loaded from `training_sessions` table (last 50)
- **In-Progress Session**: Detected by `started_at` exists and `ended_at` is null (line 177-180)

### State Sources
- **All from Supabase** - No local persistence except React Query cache (cleared on restart)

### Navigation Triggers
- **N/A** - App restart resets all navigation state
- **Default**: Shows training plan if profile + program exist

---

## SUMMARY

### Setup → Save Flow
- **Profile saved** → **Program created** → **Program days generated** → **Routine suggestions created** → **Queries invalidated/refetched** → **Plan shows**

### Edit Setup → Save Flow
- **Profile updated** → **Program created (may duplicate)** → **Queries invalidated/refetched** → **Plan shows**

### Start Session Flow
- **Day tapped** → **Preview modal** → **Session created** → **Session view shows** (if query succeeds)

### During Session Flow
- **Exercise shown** → **Set logged** → **Rest timer** → **Next exercise** → **Repeat**

### End Session Flow
- **Session finalized** → **Data persisted** → **Return to plan**

### App Restart Flow
- **Queries execute** → **Data loaded** → **Plan shows** (if profile + program exist)

### Key State Sources
- **Supabase tables**: `training_profiles`, `training_program_instances`, `training_program_days`, `training_sessions`, `training_session_items`, `training_set_logs`
- **React Query cache**: In-memory, per query key
- **Local state**: Component-level useState (not persisted)

### Conditions That Fire Incorrectly
1. **Setup CTA reappears**: Refetch timing race (Flow 1, Step 6)
2. **Session view doesn't show**: Query loading/error (Flow 3, Step 4)
3. **Duplicate programs**: Edit mode creates new program instead of updating (Flow 2, Step 3)

---

**END OF REPORT**
