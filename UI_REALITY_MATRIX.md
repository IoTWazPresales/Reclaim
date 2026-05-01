# UI VS CODE REALITY CHECK

**Generated**: 2025-01-XX  
**Purpose**: Explain why the UI looks different from expectations

---

## ISSUE 1: DRAWER MENU WRAPPING

### Expected Behavior
- Drawer section headers should be single-line, never wrap
- Menu item labels should wrap to max 2 lines at word boundaries

### Actual Code
- **File**: `app/src/routing/AppNavigator.tsx`
- **Line**: 56-75 (`DrawerSectionLabel` component)
- **Code**:
  ```typescript
  <Text
    variant="labelSmall"
    numberOfLines={1}
    ellipsizeMode="tail"
    style={{
      fontSize: 11,
      maxWidth: '100%',
    }}
  >
    {label.toUpperCase()}
  </Text>
  ```
- **Status**: ✅ IMPLEMENTED - `numberOfLines={1}` prevents wrapping
- **File**: `app/src/routing/AppNavigator.tsx`
- **Line**: ~100-200 (Tile component for menu items)
- **Code**: Uses `numberOfLines={2}` for labels (from previous UI Path A work)
- **Status**: ✅ IMPLEMENTED - Labels wrap to 2 lines

### Condition Controlling Visibility
- **N/A** - Drawer is always visible when drawer is open
- **Condition**: Drawer open/closed state (React Navigation drawer state)

### Data Source
- **N/A** - Static labels from navigation config
- **No data dependency** - Labels are hardcoded

### Why UI Might Look Different
- **UNKNOWN**: Requires device testing to verify actual rendering
- **Possible causes**:
  - Font scaling (accessibility settings)
  - Screen size differences
  - React Native Paper theme overrides
  - OTA update may have changed code

---

## ISSUE 2: ONBOARDING SHOWING AFTER COMPLETION

### Expected Behavior
- Onboarding should not show after user has completed it

### Actual Code
- **File**: `app/src/routing/RootNavigator.tsx`
- **Line**: 173-180
- **Code**:
  ```typescript
  {session ? (
    hasOnboarded ? (
      <Stack.Screen name="App" component={AppNavigator} />
    ) : (
      <Stack.Screen name="Onboarding">
        {() => <OnboardingNavigator onFinish={onFinishOnboarding} />}
      </Stack.Screen>
    )
  ) : (
    <Stack.Screen name="Auth" component={AuthScreen} />
  )}
  ```
- **Condition**: `hasOnboarded === true` shows App, `hasOnboarded === false` shows Onboarding

### Condition Controlling Visibility
- **Variable**: `hasOnboarded` (line 70)
- **Source**: 
  1. Local cache: `getHasOnboarded(userId)` (line 86)
  2. Supabase: `profiles.has_onboarded` (line 102) - background check only if local is false

### Data Source
- **Primary**: `@/state/onboarding` - SecureStore cache (fast)
- **Secondary**: `supabase.from('profiles').select('has_onboarded')` (background sync)
- **Query Key**: N/A - Uses local state, not React Query

### Why UI Might Show Onboarding After Completion

#### Scenario 1: Stale Local Cache
- **Root Cause**: `getHasOnboarded()` returns `false` from SecureStore
- **When**: SecureStore not updated after onboarding completion
- **Fix Location**: `app/src/routing/RootNavigator.tsx` line 108-109 (updates local after Supabase check)

#### Scenario 2: Supabase Not Updated
- **Root Cause**: `profiles.has_onboarded` is `false` in database
- **When**: Onboarding completion didn't update Supabase
- **Fix Location**: `app/src/screens/onboarding/PermissionsScreen.tsx` line 124-126 (updates Supabase)

#### Scenario 3: Race Condition
- **Root Cause**: App renders before `hasOnboarded` state is loaded
- **When**: `appReady === false` or `hasOnboarded === null` (line 148)
- **Fix Location**: `app/src/routing/RootNavigator.tsx` line 148-165 (shows splash while loading)

### React Query Involvement
- **NONE** - Onboarding state is NOT using React Query
- **Uses**: Local SecureStore + direct Supabase query
- **Cache**: SecureStore (persistent, fast)

### Invalidations vs Refetch Timing
- **N/A** - No React Query involved
- **Sync Mechanism**: 
  1. Local cache read (fast)
  2. Background Supabase check (if local is false, line 98-117)
  3. Global refresh function: `__refreshOnboarding` (line 131-143)

---

## ISSUE 3: START TRAINING CTA REAPPEARING

### Expected Behavior
- After saving setup, user should see training plan, not "Start training" CTA again

### Actual Code
- **File**: `app/src/screens/TrainingScreen.tsx`
- **Line**: 393-394
- **Code**:
  ```typescript
  const isRefetchingAfterSetup = profileQ.isFetching || activeProgramQ.isFetching;
  if (!profileQ.isLoading && !activeProgramQ.isLoading && !isRefetchingAfterSetup && (!profileQ.data || !activeProgramQ.data)) {
    // Show setup CTA
  }
  ```
- **Condition**: Shows CTA if queries are not loading AND not fetching AND data is missing

### Condition Controlling Visibility
- **Variables**: 
  - `profileQ.isLoading`
  - `profileQ.isFetching`
  - `activeProgramQ.isLoading`
  - `activeProgramQ.isFetching`
  - `profileQ.data`
  - `activeProgramQ.data`

### Data Source
- **Query 1**: `['training:profile']` → `getTrainingProfile()` (line 85-89)
- **Query 2**: `['training:activeProgram']` → `getActiveProgramInstance()` (line 93-97)
- **API Functions**: 
  - `getTrainingProfile()` in `app/src/lib/api.ts` line 2054-2067
  - `getActiveProgramInstance()` in `app/src/lib/api.ts` line 2285-2295

### Why CTA Might Reappear After Setup Save

#### Scenario 1: Query Not Invalidated
- **Root Cause**: `invalidateQueries` not called or failed
- **When**: Setup save completes but queries aren't marked stale
- **Fix Location**: `app/src/screens/TrainingScreen.tsx` line 359-365 (invalidates + refetches)

#### Scenario 2: Refetch Timing Race
- **Root Cause**: `isRefetchingAfterSetup` becomes `false` before data arrives
- **When**: Refetch completes but data is still `null` (network error, RLS issue)
- **Fix Location**: `app/src/screens/TrainingScreen.tsx` line 393 (checks `isFetching`)

#### Scenario 3: Stale Cache
- **Root Cause**: React Query cache has stale data
- **When**: `staleTime` (60s for profile, 300s for program) hasn't expired
- **Fix Location**: `app/src/screens/TrainingScreen.tsx` line 88, 96 (`staleTime` config)

#### Scenario 4: Database Not Updated
- **Root Cause**: `upsertTrainingProfile()` or `createProgramInstance()` failed silently
- **When**: RLS policy blocks write, or network error
- **Fix Location**: `app/src/screens/training/TrainingSetupScreen.tsx` line 422-425 (error handler)

### React Query Keys Involved
- `['training:profile']` - Profile data
- `['training:activeProgram']` - Active program instance
- `['training:programDays:week']` - Week program days
- `['training:programDays:fourWeek']` - 4-week program days

### Invalidations vs Refetch Timing
- **Invalidation**: `qc.invalidateQueries()` marks cache stale (line 359-362)
- **Refetch**: `qc.refetchQueries()` forces immediate fetch (line 364-365)
- **Timing**: Both are `await`ed, so they complete before component re-renders
- **Potential Issue**: If refetch fails, `isFetching` becomes `false` but `data` is still `null`

### Optimistic UI Masking Reality
- **NONE** - No optimistic updates detected
- **Behavior**: UI waits for actual data before showing plan
- **Risk**: If queries fail, user sees CTA even though data exists in DB

---

## ISSUE 4: SESSION FLOW NOT AUTO-ENTERING

### Expected Behavior
- After starting a session, user should immediately see the session view

### Actual Code
- **File**: `app/src/screens/TrainingScreen.tsx`
- **Line**: 377-389
- **Code**:
  ```typescript
  if (activeSessionId && activeSessionQ.data) {
    return (
      <TrainingSessionView
        sessionId={activeSessionId}
        sessionData={activeSessionQ.data}
        onComplete={() => {
          setActiveSessionId(null);
          qc.invalidateQueries({ queryKey: ['training:sessions'] });
        }}
        onCancel={() => setActiveSessionId(null)}
      />
    );
  }
  ```
- **Condition**: Shows session view if `activeSessionId !== null` AND `activeSessionQ.data` exists

### Condition Controlling Visibility
- **Variables**: 
  - `activeSessionId` (line 69)
  - `activeSessionQ.data` (from query at line 169-174)

### Data Source
- **Query**: `['training:session', activeSessionId]` → `getTrainingSession(activeSessionId)`
- **API Function**: `getTrainingSession()` in `app/src/lib/api.ts`
- **Trigger**: `startSessionMutation.onSuccess` sets `activeSessionId` (line 251)

### Why Session Might Not Auto-Enter

#### Scenario 1: Query Not Enabled
- **Root Cause**: `activeSessionQ` has `enabled: !!activeSessionId` (line 172)
- **When**: `activeSessionId` is set but query hasn't started yet
- **Fix Location**: Query should auto-enable when `activeSessionId` changes

#### Scenario 2: Query Loading
- **Root Cause**: `activeSessionQ.data` is `undefined` while loading
- **When**: Network delay or slow Supabase response
- **Fix Location**: Component should show loading state, not hide session view

#### Scenario 3: Query Error
- **Root Cause**: `getTrainingSession()` fails (RLS, network, not found)
- **When**: Session created but query fails to fetch it
- **Fix Location**: `app/src/screens/TrainingScreen.tsx` line 169-174 (no error handling shown)

### React Query Involvement
- **Query Key**: `['training:session', activeSessionId]`
- **Stale Time**: Not specified (defaults to 0)
- **Cache**: Per-session cache

### Invalidations vs Refetch Timing
- **Invalidation**: `['training:sessions']` invalidated on session complete (line 384)
- **Refetch**: Not explicitly refetched
- **Timing**: Session view depends on `activeSessionQ.data`, which is separate from sessions list

---

## SUMMARY

### Drawer Menu Wrapping
- **Status**: ✅ Code implements wrapping rules
- **Unknown**: Actual device rendering (requires testing)
- **Risk**: Low - Code looks correct

### Onboarding After Completion
- **Status**: ⚠️ Potential race condition or stale cache
- **Root Causes**: 
  1. SecureStore cache not updated
  2. Supabase not updated
  3. Race condition during load
- **Risk**: Medium - Multiple failure points

### Start Training CTA Reappearing
- **Status**: ⚠️ Potential refetch timing issue
- **Root Causes**:
  1. Query invalidation/refetch race
  2. Database write failure
  3. Stale cache
- **Risk**: High - User-facing bug

### Session Flow Not Auto-Entering
- **Status**: ⚠️ Potential query loading/error issue
- **Root Causes**:
  1. Query not enabled in time
  2. Query loading state not handled
  3. Query error not handled
- **Risk**: Medium - User experience issue

### Recommendations
1. **Add loading states** for all conditional renders
2. **Add error handling** for all queries
3. **Add logging** to track query states during transitions
4. **Test on device** to verify actual behavior vs code

---

**END OF REPORT**
