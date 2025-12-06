# Reclaim App - Diagnosis Report

## Overview
This document diagnoses all reported issues and provides a plan to fix them. **NO CHANGES HAVE BEEN MADE YET** - this is purely diagnostic.

---

## 1. Sleep Data Not Pulling/Writing from Samsung Health

### Problem
- Sleep data is not being pulled from Samsung Health
- Sleep data is not being written to Supabase
- Footsteps (activity data) seems to work as test data

### Root Causes Identified

#### A. Sleep Data Sync Flow Issue
**Location**: `app/src/lib/sync.ts` - `syncHealthData()` function

**Problem**: 
- The sync function only calls `getLatestSleepSession()` which returns a single session
- It doesn't perform a full historical sync from Samsung Health
- The sync only happens when explicitly called (Dashboard refresh, background sync)
- No automatic sync after permissions are granted

**Current Flow**:
1. User grants permissions → Integration marked as connected
2. Sync only happens on app launch/refresh
3. Only latest sleep session is fetched
4. If no sleep data found, nothing is saved

**Missing**:
- Full historical sync after permission grant
- Batch sync of multiple sleep sessions (not just latest)
- Automatic sync trigger after connection

#### B. Samsung Health Provider Implementation
**Location**: `app/src/lib/health/providers/samsungHealth.ts`

**Problem**:
- The provider relies on `NativeModules.SamsungHealth` which may not be properly configured
- The `isAvailable()` check may be failing silently
- Sleep data reading may be failing but errors are caught and ignored

**Issues**:
- Line 100-106: `isAvailable()` returns false if native module not found
- Line 186-291: `getSleepSessions()` catches all errors and returns empty array
- No logging of specific errors when sleep data read fails

#### C. Data Not Syncing to Supabase
**Location**: `app/src/lib/sync.ts` and `app/src/lib/api.ts`

**Problem**:
- `syncHealthData()` only syncs if `latestSleep` has both `startTime` and `endTime`
- If Samsung Health returns data in unexpected format, it may not match the expected structure
- The `upsertSleepSessionFromHealth()` function expects specific date formats

**Issues**:
- Line 154-202 in sync.ts: Only syncs if both startTime and endTime exist
- No validation of data format before attempting to save
- Errors are logged but sync continues without retry

### Solution Plan
1. **Add Full Historical Sync**: After permissions granted, sync last 30 days of sleep data
2. **Batch Sync**: Instead of just latest, fetch and sync all sessions in date range
3. **Better Error Handling**: Log specific errors from Samsung Health provider
4. **Automatic Sync Trigger**: Call sync immediately after successful permission grant
5. **Data Validation**: Validate sleep session data before attempting to save
6. **Retry Logic**: Add retry mechanism for failed syncs

---

## 2. Health Connect Not Detected as Installed

### Problem
- Health Connect app is installed but not being detected by the app

### Root Causes Identified

**Location**: `app/src/lib/health/providers/healthConnect.ts` and `app/src/lib/health/integrations.ts`

**Problem**:
- The `isAvailable()` check uses `HC.isAvailable?.()` which may not work correctly
- Health Connect detection relies on the `react-native-health-connect` package
- The package may not be properly linked or configured

**Issues**:
- Line 48-59 in healthConnect.ts: `isAvailable()` may return false even if app is installed
- Line 128-141 in integrations.ts: `connectHealthConnect()` checks availability but may fail silently
- No fallback detection method (e.g., checking if package is installed via Android PackageManager)

**Additional Issue**:
- The Health Connect provider uses `react-native-health-connect` package
- This package may require specific Android configuration in `AndroidManifest.xml`
- The package may need to be properly linked in native Android code

### Solution Plan
1. **Improve Detection**: Add multiple detection methods (package check, API availability)
2. **Better Error Messages**: Show specific error if Health Connect not detected
3. **Check Package Installation**: Use Android PackageManager to verify app is installed
4. **Verify Native Linking**: Ensure `react-native-health-connect` is properly linked
5. **Add Logging**: Log detailed information about detection attempts

---

## 3. Mindfulness Notification Appearing 4 Times (Duplicate Notifications)

### Problem
- Low activity mindfulness notification appears 4 times instead of once

### Root Causes Identified

**Location**: `app/src/lib/health/notificationTriggers.ts`

**Problem**:
- The `onLowActivity` callback may be triggered multiple times
- No deduplication mechanism to prevent duplicate notifications
- The time window check (14:00-18:00) may allow multiple triggers within that window
- Multiple health service instances may be subscribing to the same event

**Issues**:
- Line 81-96: `onLowActivity` subscription doesn't track if notification already sent today
- Line 87: Time window check allows multiple triggers in same afternoon
- No storage of "notification sent today" flag
- Multiple calls to `startHealthTriggers()` may create duplicate subscriptions

**Additional Issue**:
- Line 49: `unsubscribeFunctions.forEach((unsub) => unsub())` clears subscriptions, but if `startHealthTriggers()` is called multiple times, new subscriptions are added without proper cleanup

### Solution Plan
1. **Add Deduplication**: Store timestamp of last notification sent per trigger type
2. **Daily Limit**: Only allow one notification per trigger type per day
3. **Subscription Management**: Ensure only one subscription exists per trigger type
4. **Check Before Triggering**: Verify notification hasn't been sent today before sending
5. **Use AsyncStorage**: Store last notification timestamp to persist across app restarts

---

## 4. Medications Due Today Removed After Time Passes

### Problem
- Medications that are due today are removed from the "Due Today" list once the scheduled time passes
- User still needs to take the medication even if time has passed

### Root Causes Identified

**Location**: `app/src/screens/MedsScreen.tsx` - `DueTodayBlock` component

**Problem**:
- Line 311: The filter checks `if (dt >= today && dt <= end && isSameDay(dt, today))`
- Line 312: `isPast` is calculated but not used to filter out past medications
- However, the issue is that medications are being filtered out somewhere

**Current Logic**:
- Line 304-325: Creates list of all doses due today
- Line 311: Filters to only include doses within today's date range
- Line 312: Calculates `isPast` but doesn't use it to exclude items
- Medications should show even if time has passed (they're still due today)

**Issue**:
- The filter at line 311 may be excluding past medications if `dt < today` check is too strict
- The `isPast` flag is calculated but medications are still shown (which is correct)
- However, if there's filtering happening elsewhere, past medications may be removed

**Additional Investigation Needed**:
- Check if there's any filtering in the parent component
- Verify if `getTodaysDoses()` is excluding past times
- Check if there's any cleanup logic removing past medications

### Solution Plan
1. **Keep Past Medications**: Ensure medications due today remain visible even after time passes
2. **Visual Indication**: Show "past" label but keep medication in list
3. **Review Filtering Logic**: Verify no code is removing past medications from today's list
4. **Update UI Logic**: Medications should only be removed after they're logged as taken/skipped/missed, not based on time

---

## 5. Calendar Not Pulling Data from Device

### Problem
- Calendar card shows no events even though device calendar has events

### Root Causes Identified

**Location**: `app/src/lib/calendar.ts` and `app/src/components/CalendarCard.tsx`

**Problem**:
- Calendar permissions may not be granted
- `expo-calendar` package may not be properly configured
- Calendar events may not be fetched correctly

**Issues**:
- Line 78-148 in calendar.ts: `getTodayEvents()` requests permissions but may fail silently
- Line 98: `getCalendarsAsync()` may return empty array if no calendars found
- Line 112: Filter `if (!calendar.allowsModifications && !calendar.source?.type) continue` may skip all calendars
- No error logging to help diagnose the issue

**Additional Issues**:
- `expo-calendar` requires proper configuration in `app.config.ts` (which appears to be configured)
- Android may require additional permissions in `AndroidManifest.xml`
- iOS may require calendar usage description in `Info.plist`

### Solution Plan
1. **Add Detailed Logging**: Log each step of calendar fetching process
2. **Check Permissions**: Verify calendar permissions are actually granted
3. **Review Calendar Filtering**: Ensure we're not filtering out all calendars
4. **Test Calendar Access**: Add test function to verify calendar module works
5. **Error Handling**: Show user-friendly error if calendar access fails
6. **Verify Configuration**: Ensure `expo-calendar` is properly configured in native code

---

## 6. Need Full Sync from Samsung Health After Permissions Granted

### Problem
- After granting permissions, only latest data is synced
- Need to sync all historical data from Samsung Health

### Root Causes Identified

**Location**: `app/src/lib/sync.ts` - `syncHealthData()` function

**Problem**:
- Line 149-152: Only fetches `getLatestSleepSession()` and `getTodayActivity()`
- No historical data sync
- No batch processing of multiple sleep sessions

**Missing Features**:
- No function to sync last N days of sleep data
- No function to sync historical activity data
- No incremental sync (only syncs what's new since last sync)

### Solution Plan
1. **Add Historical Sync Function**: Create `syncHistoricalHealthData(days: number)` function
2. **Batch Processing**: Fetch and sync all sleep sessions in date range
3. **Incremental Sync**: Track last sync timestamp and only sync new data
4. **Automatic Trigger**: Call historical sync immediately after permissions granted
5. **Progress Tracking**: Show progress for large historical syncs
6. **Error Recovery**: If sync fails partway through, resume from last successful point

---

## 7. Fill Gaps from Other Health Apps (Data Comparison)

### Problem
- Need to compare data from multiple health sources and fill gaps
- If Samsung Health has missing data, try to get it from Google Fit or Health Connect

### Root Causes Identified

**Location**: `app/src/lib/health/unifiedService.ts`

**Problem**:
- The unified service selects one provider as "active"
- It doesn't merge data from multiple sources
- No gap-filling logic to combine data from different sources

**Current Behavior**:
- Line 26-28: Maintains array of providers but selects one as active
- Line 149-152 in sync.ts: Only uses active provider
- No logic to check multiple providers for missing data

### Solution Plan
1. **Multi-Source Data Aggregation**: Fetch data from all connected providers
2. **Gap Detection**: Identify missing data periods
3. **Gap Filling**: Fill gaps using data from other providers
4. **Data Merging Logic**: Combine data from multiple sources intelligently
5. **Source Priority**: Define priority order for data sources (e.g., Samsung Health > Google Fit > Health Connect)
6. **Conflict Resolution**: Handle cases where multiple sources have conflicting data

---

## 8. Routine Component for User Routine Management

### Problem
- Need to build a routine component for manual intervention
- Help users track eat/sleep times and stay on routine

### Current State
- **No routine component exists** - this is a new feature request
- No tracking of user's routine (meal times, sleep times, etc.)
- No reminders or alerts for routine adherence

### Requirements
1. **Routine Definition**: Allow users to set:
   - Wake time
   - Bedtime
   - Meal times (breakfast, lunch, dinner)
   - Other routine activities
2. **Routine Tracking**: Track adherence to routine
3. **Routine Reminders**: Send notifications for routine activities
4. **Routine Insights**: Show how well user is sticking to routine
5. **Integration with Health Data**: Use sleep data to track bedtime/wake time adherence

### Solution Plan
1. **Create Routine Data Model**: Define schema for routine (Supabase table)
2. **Routine Settings Screen**: UI for users to set their routine
3. **Routine Tracking**: Compare actual times (from health data) vs. scheduled times
4. **Routine Reminders**: Notifications for upcoming routine activities
5. **Routine Dashboard**: Show routine adherence metrics
6. **Routine Insights**: Analyze patterns and suggest improvements

---

## Summary of Required Fixes

### High Priority (Core Functionality)
1. ✅ **Sleep Data Sync**: Fix Samsung Health sleep data reading and Supabase syncing
2. ✅ **Health Connect Detection**: Fix app detection issue
3. ✅ **Duplicate Notifications**: Fix mindfulness notification appearing 4 times
4. ✅ **Medications Due Today**: Keep medications visible even after time passes
5. ✅ **Calendar Data**: Fix calendar event fetching

### Medium Priority (Enhanced Features)
6. ✅ **Full Historical Sync**: Sync all historical data after permissions granted
7. ✅ **Multi-Source Data**: Fill gaps using data from multiple health apps

### Low Priority (New Features)
8. ✅ **Routine Component**: Build new routine management feature

---

## Next Steps

1. **Review this diagnosis** - Confirm all issues are correctly identified
2. **Prioritize fixes** - Decide which issues to fix first
3. **Implement fixes** - Make changes one issue at a time
4. **Test thoroughly** - Verify each fix works before moving to next

---

## Files That Will Need Changes

### Core Files
- `app/src/lib/sync.ts` - Health data syncing
- `app/src/lib/health/providers/samsungHealth.ts` - Samsung Health provider
- `app/src/lib/health/providers/healthConnect.ts` - Health Connect provider
- `app/src/lib/health/integrations.ts` - Integration connection logic
- `app/src/lib/health/notificationTriggers.ts` - Notification triggers
- `app/src/screens/MedsScreen.tsx` - Medications screen
- `app/src/lib/calendar.ts` - Calendar integration

### New Files (Routine Feature)
- `app/src/lib/routine.ts` - Routine data management
- `app/src/screens/RoutineScreen.tsx` - Routine settings screen
- `app/src/components/RoutineCard.tsx` - Routine display component

### Database Schema (Supabase)
- New table: `user_routines` - Store user routine settings
- New table: `routine_logs` - Track routine adherence

---

**END OF DIAGNOSIS REPORT**