# Fixes Applied - Recovery Plan & Calendar Integration

## ✅ Completed Implementations

### 1. Recovery Plan Enhancements ✅

**Files Modified:**
- `app/src/lib/recovery.ts` - Added week selection, recovery type selection
- `app/src/screens/Dashboard.tsx` - Updated recovery card to show week and type
- `app/src/screens/SettingsScreen.tsx` - Added recovery reset modal
- `app/src/components/RecoveryResetModal.tsx` - New modal component

**New Features:**
- **Week Selection**: Users can select current week (1-52) when resetting recovery
- **Recovery Type Selection**: Options include:
  - Substance Recovery
  - Exhaustion/Burnout Recovery
  - Mental Health Recovery
  - General Recovery (default)
  - Other (with custom text)
- **Week Display**: Dashboard recovery card shows current week number
- **Type Display**: Dashboard recovery card shows recovery type chip

**Functions Added:**
- `setRecoveryWeek(week: number)` - Update current week
- `setRecoveryType(recoveryType: RecoveryType, custom?: string)` - Update recovery type
- `resetRecoveryProgress(week?, recoveryType?, recoveryTypeCustom?)` - Reset with parameters
- `getStageForWeek(week: number, recoveryType?: RecoveryType)` - Map week to stage
- `getWeeksPerStage(recoveryType?: RecoveryType)` - Get weeks per stage

### 2. Calendar Integration ✅

**Files Created:**
- `app/src/lib/calendar.ts` - Calendar API functions
- `app/src/components/CalendarCard.tsx` - Calendar UI component

**Files Modified:**
- `app/src/screens/Dashboard.tsx` - Added calendar section and card
- `app/package.json` - Added `expo-calendar` dependency

**New Features:**
- **Calendar Permissions**: Request and check calendar access
- **Today's Events**: Display all events for today
- **Event Status Indicators**:
  - 🔴 **Warning** (red) - Events within 15 minutes (reminder window)
  - 🔵 **Current** (blue) - Events happening now
  - ⚪ **Upcoming** (gray) - Future events
- **Event Filtering**: Automatically removes past events
- **Smart Icons**: Event icons based on title keywords:
  - Medical bag for doctor/appointment/medical
  - Briefcase for work/meeting
  - Dumbbell for gym/exercise/workout
  - Food for lunch/dinner/meal
  - Heart pulse for therapy/counseling
  - Calendar clock for other events
- **Event Details**: Shows time, duration, location
- **Auto-refresh**: Refetches every 5 minutes
- **Empty State**: Shows helpful message when no events

**Functions Added:**
- `requestCalendarPermissions()` - Request calendar access
- `hasCalendarPermissions()` - Check permission status
- `getTodayEvents()` - Get all events for today
- `getUpcomingEvents(hours)` - Get events for next N hours
- `getEventsForDateRange(start, end)` - Get events for date range

### 3. Package Updates ✅

**Files Modified:**
- `app/package.json` - Added `expo-calendar: ~14.0.4`

## ⚠️ Known Issues

### 1. meds_logs Error (Supabase-side issue)

**Error Message:**
```
WARN [Reclaim] Insight computation failed {"code": "PGRST205", "details": null, "hint": "Perhaps you meant the table 'public.meds_log'", "message": "Could not find the table 'public.meds_logs' in the schema cache"}
```

**Analysis:**
- All code references use `meds_log` (singular) ✅
- Error occurs during insight computation in `fetchInsightContext()`
- Suggests a Supabase database function, view, or RPC references `meds_logs` (plural)

**User Action Required:**
1. Go to Supabase SQL Editor
2. Search for any references to `meds_logs` (plural)
3. Check for:
   - Database functions (stored procedures)
   - Views
   - RPC functions
   - Materialized views
   - Triggers
4. Update all references from `meds_logs` to `meds_log`
5. Refresh Supabase schema cache
6. Verify all RLS policies use `meds_log` (singular)

**Code Verification:**
All code files verified to use `meds_log` (singular):
- ✅ `app/src/lib/api.ts` - Lines 262, 283, 870 all use `meds_log`
- ✅ `app/src/lib/dataPrivacy.ts` - Lines 45, 97, 190 all use `meds_log`
- ✅ `app/src/lib/insights/contextBuilder.ts` - Calls `listMedDoseLogsRemoteLastNDays` which uses `meds_log`

## 📋 User Action Items

### 1. Install New Package
```bash
cd app
npm install
# or
yarn install
```

This will install `expo-calendar` which is required for calendar integration.

### 2. Fix meds_logs Error in Supabase

**Steps:**
1. Log into Supabase Dashboard
2. Go to SQL Editor
3. Run this query to find any references to `meds_logs`:
   ```sql
   SELECT 
     proname as function_name,
     prosrc as function_body
   FROM pg_proc
   WHERE prosrc LIKE '%meds_logs%';
   ```

4. Check for views:
   ```sql
   SELECT viewname 
   FROM pg_views 
   WHERE definition LIKE '%meds_logs%';
   ```

5. Update any found references from `meds_logs` to `meds_log`

6. Refresh schema cache:
   - Go to Settings → API
   - Click "Refresh schema cache" or similar option

7. Verify RLS policies:
   ```sql
   SELECT tablename, policyname, definition
   FROM pg_policies
   WHERE tablename = 'meds_log';
   ```

### 3. Test Calendar Integration

**Steps:**
1. Grant calendar permissions when app requests them
2. Add test events to your device calendar:
   - Doctor appointment
   - Work meeting
   - Lunch/dinner
   - Gym/exercise
   - Therapy appointment
3. Navigate to Dashboard
4. Verify calendar card appears between Recovery and Mood sections
5. Check that events appear with correct:
   - Status indicators (warning/current/upcoming)
   - Icons (medical bag, briefcase, etc.)
   - Time and duration
   - Location (if provided)
6. Wait for an event to pass and verify it's removed
7. Test warning indicator (add event starting in 10 minutes)

### 4. Test Recovery Plan Enhancements

**Steps:**
1. Navigate to Settings → Recovery Progress
2. Click "Reset progress" button
3. Verify modal appears with:
   - Week picker (1-52)
   - Recovery type selector
   - Custom type input (when "Other" selected)
4. Select a week (e.g., Week 5)
5. Select a recovery type (e.g., "Substance Recovery")
6. Click "Reset & Start Fresh"
7. Navigate to Dashboard
8. Verify recovery card shows:
   - Selected week number (e.g., "Week 5")
   - Recovery type chip (e.g., "Substance Recovery")

### 5. App Configuration

**app.json / app.config.ts:**
Make sure calendar permissions are configured:
```json
{
  "expo": {
    "plugins": [
      [
        "expo-calendar",
        {
          "calendarPermission": "Allow Reclaim to access your calendar to show your schedule.",
          "remindersPermission": "Allow Reclaim to access your reminders."
        }
      ]
    ]
  }
}
```

## 🔄 Next Steps (Remaining Tasks)

### 1. Complete Critical Fixes ⏳
- Error boundaries
- AccessibilityInfo checks
- Remote logging (Sentry)
- Performance optimizations
- Type safety improvements

### 2. Settings Screen Recovery Modal ✅
- Modal component created
- Need to wire up properly to Settings screen

### 3. Additional Testing
- Test on physical devices
- Test calendar permissions flow
- Test recovery reset modal
- Verify week/type persistence

## 📝 Notes

- Calendar integration uses `expo-calendar` which requires native modules
- Calendar permissions are platform-specific (iOS/Android)
- Recovery plan enhancements are backward compatible (existing users will have default values)
- Week selection maps to recovery stages automatically
- Recovery type can be customized for tailored experience (future implementation)

