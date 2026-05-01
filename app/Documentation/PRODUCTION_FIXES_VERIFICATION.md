# Production Fixes - Verification Checklist

## Summary of Issues Fixed

### 1. Drawer UI - Label Wrapping
- **Issue**: Drawer item labels wrapping to 2 lines
- **Root Cause**: Missing `numberOfLines={1}` and `ellipsizeMode="tail"` on Text component
- **Fix**: Added proper text truncation to drawer tile labels in `AppNavigator.tsx`

### 2. Notifications - Re-showing & Badge Count
- **Issue**: Notifications re-scheduling on every app open, badge count accumulating incorrectly
- **Root Causes**:
  - No idempotent scheduling system
  - No fingerprinting/plan comparison
  - Badge count not cleared on app open
  - Multiple notification entry points without coordination
- **Fix**: Implemented comprehensive notification management system:
  - Created `NotificationScheduler.ts` with:
    - `buildNotificationPlan()` - Creates stable notification plan
    - `computePlanFingerprint()` - Generates unique hash of plan
    - `reconcileNotifications()` - Idempotent reconciliation (only schedules if plan changed)
  - Created `BadgeManager.ts` - Centralized badge count management
  - Updated `useNotifications.ts` to:
    - Call `reconcileNotifications()` on startup
    - Clear badge on app foreground
    - Use AppState listener for foreground detection

### 3. Startup UX - Onboarding Flash & Slow Initial Sync
- **Issue**: App briefly shows onboarding even after completed, dashboard initial sync too slow
- **Root Causes**:
  - Sequential loading: waited for Supabase before rendering
  - `booting` state caused UI delays
  - Onboarding flag check blocked app render
- **Fix**: Implemented 2-phase boot system in `RootNavigator.tsx`:
  - **Phase 1 (Blocking, Fast)**: Load onboarding flag from local cache (AsyncStorage/SecureStore) immediately
  - **Phase 2 (Non-blocking, Background)**: Check Supabase in background, update if changed
  - Changed `booting` to `appReady` - app renders immediately with local data
  - Reduced Supabase timeout from 3000ms to 2000ms

### 4. Routine Scheduler - Missing Meal Times
- **Issue**: Only "lunch" was suggested, missing breakfast and dinner
- **Root Cause**: `defaultRoutineTemplates` only had lunch defined
- **Fix**: Added comprehensive meal time suggestions in `routines.ts`:
  - Added `breakfast` template (6:30 AM - 10:00 AM)
  - Added `dinner` template (6:00 PM - 8:30 PM)
  - Created `adjustMealTimesForSchedule()` function for smart time calculation
  - Created `getAdjustedRoutineTemplates()` to adjust meal times based on user's sleep schedule:
    - Breakfast: 30-120 min after wake time
    - Dinner: 2-3 hours before bedtime, not earlier than 6:00 PM
    - Respects existing calendar blocks and conflicts

## Verification Steps

### 1. Drawer Labels (Quick Win)
- [ ] Open app drawer
- [ ] Verify all labels are single-line with ellipsis if too long
- [ ] No labels "drop" to second line
- [ ] Items remain vertically aligned

**Expected Result**: All drawer labels truncate with "..." if needed, no wrapping.

---

### 2. Notifications - Idempotent Scheduling

#### Test A: Fresh Install
1. [ ] Uninstall app or clear all data
2. [ ] Fresh install and complete onboarding
3. [ ] Open Diagnostics screen (Dev menu)
4. [ ] Note the "Scheduled Count" and "Last Fingerprint"
5. [ ] Close app completely
6. [ ] Re-open app 5 times
7. [ ] Check Diagnostics again

**Expected Result**:
- Scheduled count stays the same (not increasing)
- Last fingerprint unchanged
- Badge count is 0 each time app opens

#### Test B: No Duplicate Notifications
1. [ ] Check phone's notification settings for Reclaim
2. [ ] Note number of scheduled notifications
3. [ ] Open/close app 3-5 times
4. [ ] Check notification settings again

**Expected Result**:
- Number of scheduled notifications stays constant
- No duplicate "Morning Review" or other notifications

#### Test C: Badge Count Behavior
1. [ ] Note initial badge count in Diagnostics
2. [ ] Receive a notification (don't open)
3. [ ] Open app
4. [ ] Check Diagnostics

**Expected Result**:
- Badge count is 0 after opening app
- Does NOT accumulate from old notifications

---

### 3. Startup - No Onboarding Flash

#### Test A: After Onboarding
1. [ ] Complete onboarding
2. [ ] Force close app
3. [ ] Re-open app
4. [ ] Observe navigation flow carefully

**Expected Result**:
- No brief flash of onboarding screens
- Goes directly to Dashboard with lightweight splash
- Splash shows for < 500ms

#### Test B: Fast Dashboard Load
1. [ ] Open app (after onboarding)
2. [ ] Time how long until Dashboard is interactive

**Expected Result**:
- Dashboard renders within 1-2 seconds
- Shows skeletons/loading states while background data loads
- Does NOT block on slow Supabase queries

---

### 4. Meal Time Suggestions

#### Test A: Default Templates
1. [ ] Open Dashboard
2. [ ] Check "Today" card routine suggestions
3. [ ] Verify suggested times for:
   - Breakfast (if wake time < 9 AM)
   - Lunch (around 12:00-14:30)
   - Dinner (around 18:00-20:30)

**Expected Result**:
- All 3 meal times suggested (if wake time allows breakfast)
- Times are reasonable and don't conflict with existing calendar

#### Test B: Smart Adjustment
1. [ ] Go to Settings → Sleep
2. [ ] Set typical wake time to 6:30 AM
3. [ ] Set target bedtime to 22:00 (10 PM)
4. [ ] Return to Dashboard
5. [ ] Check routine suggestions

**Expected Result**:
- Breakfast suggested around 7:00-7:30 AM (30-60 min after wake)
- Dinner suggested around 19:00-20:00 (2-3h before bed)
- Times respect sleep schedule

---

## Diagnostics Screen Usage

The new Diagnostics screen (Dev-only) shows:

### User & Onboarding
- User ID
- Onboarding completion flag (from local cache)

### Notifications
- Current badge count
- Number of scheduled notifications
- Last plan fingerprint
- Last scheduled timestamp
- List of all scheduled notifications with logical keys

### AsyncStorage Keys
- All Reclaim-related keys for debugging

**To Access**:
1. Open app drawer
2. Scroll to "Diagnostics (Dev)" (only visible in dev builds)
3. Tap to view

**Use Cases**:
- Verify notification count after multiple app opens
- Check if onboarding flag is correctly cached
- Debug unexpected badge counts
- Inspect scheduled notification IDs

---

## Root Causes & Technical Details

### Notification System
**Before**:
- Each startup re-scheduled all notifications
- No coordination between scheduling entry points
- Badge count never cleared programmatically

**After**:
- Single source of truth: `NotificationScheduler.ts`
- Fingerprinting: `computePlanFingerprint()` creates stable hash
- Idempotent: `reconcileNotifications()` only acts if plan changed
- Centralized: All badge operations through `BadgeManager.ts`
- Lifecycle-aware: AppState listener clears badge on foreground

### Startup System
**Before**:
- Sequential: local → Supabase → render
- `booting` state blocked UI
- Timeout: 3000ms

**After**:
- Parallel: local → render immediately, Supabase in background
- `appReady` state allows instant render with cached data
- Timeout: 2000ms (non-blocking)

### Routine Scheduler
**Before**:
- Only lunch defined
- No awareness of user's sleep schedule

**After**:
- Breakfast, lunch, dinner templates
- `adjustMealTimesForSchedule()` dynamically calculates optimal windows
- Respects wake/bedtime from user settings

---

## Files Modified

### New Files
- `app/src/lib/notifications/NotificationScheduler.ts`
- `app/src/lib/notifications/BadgeManager.ts`
- `app/src/screens/DiagnosticsScreen.tsx`
- `app/Documentation/PRODUCTION_FIXES_VERIFICATION.md` (this file)

### Modified Files
- `app/src/routing/AppNavigator.tsx` - Drawer label truncation + Diagnostics screen
- `app/src/routing/RootNavigator.tsx` - 2-phase boot system
- `app/src/routing/OnboardingNavigator.tsx` - onFinish prop handling
- `app/src/screens/onboarding/FinishScreen.tsx` - onFinish callback
- `app/src/hooks/useNotifications.ts` - Notification reconciliation + badge clearing
- `app/src/lib/routines.ts` - Breakfast/dinner templates + smart adjustment
- `app/src/navigation/types.ts` - Diagnostics type

---

## Expected Outcomes

After these fixes:

1. **Drawer**: Clean, single-line labels with proper truncation
2. **Notifications**: Deterministic, idempotent scheduling. No duplicates on app reopen.
3. **Badge**: Always reflects reality. Cleared on app open. Never accumulates.
4. **Startup**: No onboarding flash. Fast dashboard render with local data.
5. **Meals**: Intelligent breakfast/lunch/dinner suggestions based on sleep schedule.
6. **Debuggability**: Diagnostics screen for rapid troubleshooting in dev builds.

---

## Emergency Rollback

If issues persist:

1. Disable notification reconciliation:
   - Comment out `reconcileNotifications()` call in `useNotifications.ts`
   - Fall back to previous scheduling logic

2. Revert startup changes:
   - Restore `booting` state in `RootNavigator.tsx`
   - Remove 2-phase loading

3. Disable meal templates:
   - Remove breakfast/dinner from `defaultRoutineTemplates`

---

## Next Steps (Optional Enhancements)

1. **Notification Intent TTL**: Prevent re-showing "morning review" if already acted on today
2. **Dashboard Progressive Loading**: Show more skeleton states while background queries complete
3. **Routine Conflict Resolution**: Smarter slot selection when calendar is busy
4. **Notification Analytics**: Track opens, dismissals, interaction rates in Supabase

---

**Verification Date**: _____________  
**Verified By**: _____________  
**Build Version**: _____________

