# DUPLICATE & SHADOW LOGIC DETECTION

**Generated**: 2025-01-XX  
**Purpose**: Find logic that exists more than once, or is never used, especially in training

---

## DUPLICATE: "START TRAINING" ENTRY PATHS

### Path 1: Setup Completion → "Start training" Button
- **File**: `app/src/screens/training/TrainingSetupScreen.tsx`
- **Line**: 508-510
- **Code**:
  ```typescript
  <Button mode="contained" onPress={() => onComplete?.()}>
    Start training
  </Button>
  ```
- **Context**: Shown on `step === 'complete'` (line 504)
- **Who Calls It**: User taps button after completing setup
- **Status**: ✅ LIVE - This is the primary completion path

### Path 2: TrainingScreen Setup CTA
- **File**: `app/src/screens/TrainingScreen.tsx`
- **Line**: 412-414
- **Code**:
  ```typescript
  <Button mode="contained" onPress={() => setShowSetup(true)}>
    {!profileQ.data ? 'Start setup' : 'Create program'}
  </Button>
  ```
- **Context**: Shown when `!profileQ.data || !activeProgramQ.data` (line 394)
- **Who Calls It**: User taps to begin setup
- **Status**: ✅ LIVE - Entry point to setup

### Path 3: Edit Program Button
- **File**: `app/src/screens/TrainingScreen.tsx`
- **Line**: 457-459
- **Code**:
  ```typescript
  <IconButton
    icon="cog"
    onPress={() => setShowSetup(true)}
  />
  ```
- **Context**: Always visible in tab switcher (line 454-460)
- **Who Calls It**: User taps to edit existing program
- **Status**: ✅ LIVE - Edit mode entry

**ANALYSIS**: Not duplicates - these are distinct entry points (first-time setup, edit, and initial CTA). All are live and serve different purposes.

---

## DUPLICATE: SETUP COMPLETION CHECKS

### Check 1: TrainingScreen Query-Based
- **File**: `app/src/screens/TrainingScreen.tsx`
- **Line**: 393-394
- **Code**:
  ```typescript
  const isRefetchingAfterSetup = profileQ.isFetching || activeProgramQ.isFetching;
  if (!profileQ.isLoading && !activeProgramQ.isLoading && !isRefetchingAfterSetup && (!profileQ.data || !activeProgramQ.data)) {
    // Show setup CTA
  }
  ```
- **Logic**: Checks `profileQ.data` and `activeProgramQ.data` existence
- **Status**: ✅ LIVE - Primary check for showing setup CTA

### Check 2: TrainingSetupScreen Prefill Check
- **File**: `app/src/screens/training/TrainingSetupScreen.tsx`
- **Line**: 134-146
- **Code**:
  ```typescript
  const profileQ = useQuery({
    queryKey: ['training:profile'],
    queryFn: () => getTrainingProfile(),
  });
  const activeProgramQ = useQuery({
    queryKey: ['training:activeProgram'],
    queryFn: () => getActiveProgramInstance(),
  });
  ```
- **Logic**: Uses same queries to determine if editing (line 148-225: `useEffect` checks `profileQ.data`)
- **Status**: ✅ LIVE - Used for prefill/hydration, not completion check

**ANALYSIS**: Not duplicates - same queries used for different purposes (completion check vs prefill). Both are live.

---

## DUPLICATE: SESSION CREATION TRIGGERS

### Trigger 1: startSessionMutation
- **File**: `app/src/screens/TrainingScreen.tsx`
- **Line**: 207-263
- **Function**: `startSessionMutation.mutate()`
- **Called From**: 
  - `handleConfirmSession` (line 288-295)
  - Which is called from `SessionPreviewModal.onConfirm` (line 718)
- **Status**: ✅ LIVE - Primary session creation path

### Trigger 2: handleResumeSession
- **File**: `app/src/screens/TrainingScreen.tsx`
- **Line**: 297-301
- **Function**: Sets `activeSessionId` from `inProgressSession`
- **Called From**: "Resume session" button (line 485)
- **Status**: ✅ LIVE - Resume existing session (does not create new)

**ANALYSIS**: Not duplicates - one creates new session, one resumes existing. Both are live.

---

## DUPLICATE: NAVIGATION REDIRECTS

### Redirect 1: Setup Complete → TrainingScreen
- **File**: `app/src/screens/TrainingScreen.tsx`
- **Line**: 356-366
- **Code**:
  ```typescript
  onComplete={async () => {
    setShowSetup(false);
    await qc.invalidateQueries({ queryKey: ['training:profile'] });
    await qc.invalidateQueries({ queryKey: ['training:activeProgram'] });
    // ... more invalidations
    await qc.refetchQueries({ queryKey: ['training:profile'] });
    await qc.refetchQueries({ queryKey: ['training:activeProgram'] });
  }}
  ```
- **Status**: ✅ LIVE - Called when setup completes

### Redirect 2: Setup Complete → "Start training" Button
- **File**: `app/src/screens/training/TrainingSetupScreen.tsx`
- **Line**: 508-510
- **Code**:
  ```typescript
  <Button mode="contained" onPress={() => onComplete?.()}>
    Start training
  </Button>
  ```
- **Status**: ✅ LIVE - Calls `onComplete` which triggers redirect above

**ANALYSIS**: Not duplicates - the button calls the callback, which triggers the redirect. Single flow, not duplicate.

---

## STATE DUPLICATION ANALYSIS

### TrainingScreen State
- **File**: `app/src/screens/TrainingScreen.tsx`
- **State Variables**:
  - `showSetup` (line 74)
  - `activeSessionId` (line 69)
  - `pendingPlan` (line 77)
  - `selectedProgramDay` (line 78)
  - `currentWeekAnchor` (line 81)

### TrainingSetupScreen State
- **File**: `app/src/screens/training/TrainingSetupScreen.tsx`
- **State Variables**:
  - `step` (line 111)
  - `goals` (line 113-118)
  - `selectedWeekdays` (line 121)
  - `timePreference` (line 123)
  - `equipment` (line 127)
  - `constraints` (line 128)
  - `baselines` (line 129)
  - `baselineReps` (line 131)

### TrainingSessionView State
- **File**: `app/src/components/training/TrainingSessionView.tsx`
- **State Variables**:
  - `currentExerciseIndex` (line 63)
  - `elapsedSeconds` (line 64)
  - `restTimer` (line 67)
  - `restTimerPaused` (line 68)
  - `restTimerRemaining` (line 69)
  - `runtimeState` (line 77)

**ANALYSIS**: No duplication - each component manages its own local UI state. No shared state conflicts detected.

---

## QUERY KEY DUPLICATION

### Query: `['training:profile']`
- **Used In**:
  1. `TrainingScreen.tsx` line 85
  2. `TrainingSetupScreen.tsx` line 135
- **Status**: ✅ NOT DUPLICATE - Same query key, shared cache (React Query behavior)
- **Who Calls It**: Both components use the same query, which is correct

### Query: `['training:activeProgram']`
- **Used In**:
  1. `TrainingScreen.tsx` line 93
  2. `TrainingSetupScreen.tsx` line 142
- **Status**: ✅ NOT DUPLICATE - Same query key, shared cache
- **Who Calls It**: Both components use the same query, which is correct

**ANALYSIS**: Not duplicates - React Query shares cache by key. This is correct behavior.

---

## SHADOW LOGIC (NEVER CALLED)

### Potential Shadow: generateWeeklyTrainingPlan
- **File**: `app/src/lib/training/scheduler.ts`
- **Line**: 76-116
- **Called From**: `TrainingSetupScreen.tsx` line 410 (inside `onSuccess` callback)
- **Status**: ✅ LIVE - Called after profile save
- **Note**: This creates routine suggestions, not the 4-week program. The 4-week program is created by `createProgramInstance` + `createProgramDays`.

### Potential Shadow: getScheduledTemplateForToday
- **File**: `app/src/lib/training/scheduler.ts`
- **Line**: 151-163
- **Called From**: ❓ UNKNOWN - Not found in grep results
- **Status**: ⚠️ POTENTIALLY DEAD - No references found in codebase
- **Recommendation**: Search for usages or remove if unused

---

## DUPLICATE: PROGRAM GENERATION

### Path 1: TrainingSetupScreen → createProgramInstance + createProgramDays
- **File**: `app/src/screens/training/TrainingSetupScreen.tsx`
- **Line**: 322-362
- **Flow**: 
  1. `createProgramInstance()` (line 322)
  2. `generateProgramDays()` (line 342)
  3. `createProgramDays()` (line 362)
- **Status**: ✅ LIVE - Primary program creation path

### Path 2: TrainingSetupScreen → generateWeeklyTrainingPlan
- **File**: `app/src/screens/training/TrainingSetupScreen.tsx`
- **Line**: 410
- **Flow**: Creates routine suggestions (not program days)
- **Status**: ✅ LIVE - Creates routine suggestions for dashboard

**ANALYSIS**: Not duplicates - one creates the 4-week program, the other creates routine suggestions. Both are live and serve different purposes.

---

## SUMMARY

### Duplicates Found
- ❌ **NONE** - All logic appears to serve distinct purposes

### Shadow/Dead Code Found
- ⚠️ **POTENTIAL**: `getScheduledTemplateForToday()` in `scheduler.ts` - No references found

### State Duplication
- ❌ **NONE** - Each component manages its own state appropriately

### Query Duplication
- ❌ **NONE** - Shared query keys are correct (React Query cache sharing)

### Recommendations
1. **Verify**: Search for `getScheduledTemplateForToday` usage - if none, consider removing
2. **Monitor**: Watch for any new duplicate logic as features are added
3. **Document**: The distinction between `generateWeeklyTrainingPlan` (routine suggestions) and program creation (4-week plan)

---

**END OF REPORT**
