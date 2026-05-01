# SAFE FIX CANDIDATES (NO CODE YET)

**Generated**: 2025-01-XX  
**Purpose**: List minimal, surgical fixes after all reports above

---

## FIX 1: PREVENT SETUP CTA REAPPEARING AFTER SAVE

### Problem
After saving setup, the "Start training" CTA briefly reappears before the plan shows.

### Root Cause
- **File**: `app/src/screens/TrainingScreen.tsx`
- **Line**: 393-394
- **Issue**: `isRefetchingAfterSetup` becomes `false` before data arrives, causing CTA to show

### Proposed Fix
- **File**: `app/src/screens/TrainingScreen.tsx`
- **Line**: 393-394
- **Change**: Add loading state check OR extend refetch window
- **Option A**: Show loading spinner while `isRefetchingAfterSetup === true`
- **Option B**: Add small delay before checking data (hacky, not recommended)
- **Option C**: Check `profileQ.isSuccess && activeProgramQ.isSuccess` instead of just data existence

### Risk Level
- **LOW** - Only affects UI rendering, no data changes
- **Test**: Verify CTA doesn't flash after setup save

### What It Removes
- Removes the brief CTA flash
- Does NOT remove any functionality

### Independently Testable
- ✅ YES - Save setup, observe CTA behavior

---

## FIX 2: HANDLE SESSION VIEW LOADING STATE

### Problem
After starting a session, session view might not show if query is loading.

### Root Cause
- **File**: `app/src/screens/TrainingScreen.tsx`
- **Line**: 377
- **Issue**: Condition requires `activeSessionQ.data` to exist, but doesn't handle loading state

### Proposed Fix
- **File**: `app/src/screens/TrainingScreen.tsx`
- **Line**: 377-389
- **Change**: Show loading spinner if `activeSessionId !== null && activeSessionQ.isLoading`
- **Code**:
  ```typescript
  if (activeSessionId) {
    if (activeSessionQ.isLoading) {
      return <ActivityIndicator />;
    }
    if (activeSessionQ.data) {
      return <TrainingSessionView ... />;
    }
    // Handle error case
  }
  ```

### Risk Level
- **LOW** - Only affects UI rendering
- **Test**: Start session, verify loading state shows

### What It Removes
- Removes the blank screen during query load
- Does NOT remove any functionality

### Independently Testable
- ✅ YES - Start session, observe loading behavior

---

## FIX 3: PREVENT DUPLICATE PROGRAM CREATION IN EDIT MODE

### Problem
Editing setup may create a duplicate program instead of updating existing.

### Root Cause
- **File**: `app/src/screens/training/TrainingSetupScreen.tsx`
- **Line**: 322
- **Issue**: Always calls `createProgramInstance()`, doesn't check for existing program

### Proposed Fix
- **File**: `app/src/screens/training/TrainingSetupScreen.tsx`
- **Line**: 322
- **Change**: Check if `activeProgramQ.data` exists before creating
- **Option A**: Deactivate old program, create new
- **Option B**: Update existing program (if API supports it)
- **Option C**: Skip program creation if program exists (only update profile)

### Risk Level
- **MEDIUM** - Affects data creation logic
- **Test**: Edit setup, verify only one active program exists

### What It Removes
- Removes duplicate program creation
- May require API changes (update program endpoint)

### Independently Testable
- ✅ YES - Edit setup, check program count in DB

---

## FIX 4: ADD ERROR HANDLING FOR SESSION QUERY

### Problem
If `getTrainingSession()` fails, session view doesn't show and user is stuck.

### Root Cause
- **File**: `app/src/screens/TrainingScreen.tsx`
- **Line**: 169-174
- **Issue**: No error handling for `activeSessionQ`

### Proposed Fix
- **File**: `app/src/screens/TrainingScreen.tsx`
- **Line**: 377-389
- **Change**: Add error state handling
- **Code**:
  ```typescript
  if (activeSessionId) {
    if (activeSessionQ.isLoading) {
      return <ActivityIndicator />;
    }
    if (activeSessionQ.error) {
      // Show error, allow retry or cancel
      return <ErrorView onRetry={...} onCancel={() => setActiveSessionId(null)} />;
    }
    if (activeSessionQ.data) {
      return <TrainingSessionView ... />;
    }
  }
  ```

### Risk Level
- **LOW** - Only affects error UX
- **Test**: Simulate query error, verify error handling

### What It Removes
- Removes the stuck state on query error
- Does NOT remove any functionality

### Independently Testable
- ✅ YES - Simulate network error, observe error handling

---

## FIX 5: VERIFY ONBOARDING STATE SYNC

### Problem
Onboarding may show after completion due to stale cache.

### Root Cause
- **File**: `app/src/routing/RootNavigator.tsx`
- **Line**: 86, 102
- **Issue**: Local cache and Supabase may be out of sync

### Proposed Fix
- **File**: `app/src/routing/RootNavigator.tsx`
- **Line**: 98-117
- **Change**: Always check Supabase if local is false, but also check if local is true (verify it's still true)
- **Option A**: Add periodic Supabase check even if local is true
- **Option B**: Force Supabase check on app launch (not just when local is false)

### Risk Level
- **LOW** - Only affects onboarding flow
- **Test**: Complete onboarding, restart app, verify onboarding doesn't show

### What It Removes
- Removes the stale cache issue
- May add slight delay on app launch

### Independently Testable
- ✅ YES - Complete onboarding, restart app, observe behavior

---

## FIX 6: REMOVE DEAD CODE (getScheduledTemplateForToday)

### Problem
Function exists but is never called.

### Root Cause
- **File**: `app/src/lib/training/scheduler.ts`
- **Line**: 151-163
- **Issue**: No references found in codebase

### Proposed Fix
- **File**: `app/src/lib/training/scheduler.ts`
- **Line**: 151-163
- **Change**: Remove function if confirmed unused
- **Verification**: Search codebase for `getScheduledTemplateForToday` usage first

### Risk Level
- **LOW** - Dead code removal
- **Test**: Verify no references exist, then remove

### What It Removes
- Removes unused code
- Does NOT affect functionality

### Independently Testable
- ✅ YES - Search codebase, verify unused, remove

---

## SUMMARY

### Fixes by Risk Level

#### LOW RISK (Safe to implement)
1. ✅ Fix 1: Prevent setup CTA reappearing
2. ✅ Fix 2: Handle session view loading state
3. ✅ Fix 4: Add error handling for session query
4. ✅ Fix 5: Verify onboarding state sync
5. ✅ Fix 6: Remove dead code

#### MEDIUM RISK (Requires careful testing)
1. ⚠️ Fix 3: Prevent duplicate program creation

### Implementation Order
1. **Fix 6** (dead code) - No risk
2. **Fix 2** (loading state) - Improves UX
3. **Fix 4** (error handling) - Improves robustness
4. **Fix 1** (CTA flash) - Fixes user-reported issue
5. **Fix 5** (onboarding sync) - Prevents edge case
6. **Fix 3** (duplicate program) - Requires API investigation first

### Testing Requirements
- Each fix must be tested independently
- Verify no regressions in other flows
- Test on device, not just simulator
- Check React Query cache behavior

---

**END OF REPORT**
