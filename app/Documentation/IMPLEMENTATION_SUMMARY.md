# Implementation Summary - Recovery Plan & Calendar Integration

## ✅ Completed Tasks

### 1. Recovery Plan Enhancements ✅
- **Week Selection**: Added `currentWeek` field to recovery progress (1-based week number)
- **Recovery Type Selection**: Added `recoveryType` field with options:
  - `substance` - Substance recovery
  - `exhaustion` - Exhaustion/burnout recovery
  - `mental_breakdown` - Mental health crisis recovery
  - `other` - Custom recovery type with `recoveryTypeCustom` field
- **New Functions**:
  - `setRecoveryWeek(week: number)` - Update current week
  - `setRecoveryType(recoveryType: RecoveryType, custom?: string)` - Update recovery type
  - `resetRecoveryProgress(week?, recoveryType?, recoveryTypeCustom?)` - Reset with optional week/type
  - `getStageForWeek(week: number, recoveryType?: RecoveryType)` - Map week to stage
  - `getWeeksPerStage(recoveryType?: RecoveryType)` - Get weeks per stage (default: 3 weeks)
- **UI Updates**:
  - Dashboard recovery card now shows week number and recovery type
  - Settings screen imports updated to support new recovery functions

### 2. Calendar Integration ✅
- **Created `app/src/lib/calendar.ts`**:
  - `requestCalendarPermissions()` - Request calendar access
  - `hasCalendarPermissions()` - Check permission status
  - `getTodayEvents()` - Get all events for today
  - `getUpcomingEvents(hours)` - Get events for next N hours
  - `getEventsForDateRange(start, end)` - Get events for specific date range
- **Created `app/src/components/CalendarCard.tsx`**:
  - Displays today's calendar events
  - Automatically filters out past events
  - Shows events with status indicators:
    - **Warning** (red) - Events within 15 minutes (reminder window)
    - **Current** (blue) - Events happening now
    - **Upcoming** (gray) - Future events
  - Event icons based on title keywords (doctor, work, gym, lunch, therapy, etc.)
  - Shows event time, duration, location
  - Empty state when no events
  - Auto-refreshes every 5 minutes
- **Dashboard Integration**:
  - Added `calendar` section to Dashboard sections array
  - Calendar card appears between Recovery and Mood sections
  - Added `CalendarCard` import to Dashboard

### 3. Package Updates ✅
- Added `expo-calendar` to `package.json` dependencies

## ⚠️ Known Issues

### 1. meds_logs Error (Supabase-side issue)
**Error**: `Could not find the table 'public.meds_logs' in the schema cache`  
**Hint**: `Perhaps you meant the table 'public.meds_log'`

**Analysis**:
- All code references use `meds_log` (singular) ✅
- Error occurs during insight computation (`fetchInsightContext`)
- This suggests a Supabase database function, view, or RPC might reference `meds_logs` (plural)

**Action Required from User**:
1. Check Supabase SQL Editor for any database functions/views/RPCs referencing `meds_logs`
2. Update any references from `meds_logs` to `meds_log` to match the table name
3. Refresh Supabase schema cache if needed
4. Verify all RLS policies use `meds_log` (singular)

**Code Files to Verify**:
- `app/src/lib/api.ts` - All references use `meds_log` ✅
- `app/src/lib/insights/contextBuilder.ts` - Calls `listMedDoseLogsRemoteLastNDays` which uses `meds_log` ✅
- `app/src/lib/dataPrivacy.ts` - All references use `meds_log` ✅

## 🔄 In Progress / Next Steps

### 1. Settings Screen - Recovery Plan Reset Modal ⏳
**Status**: Needs completion
**What's needed**:
- Modal dialog for resetting recovery plan
- Week picker (1-52 weeks)
- Recovery type selector (substance, exhaustion, mental_breakdown, other)
- Custom recovery type text input (if "other" selected)
- Update `resetRecoveryMut` to use new parameters

### 2. Critical Fixes ⏳
**Status**: In progress
**Remaining**:
- Error handling & logging improvements
- Accessibility improvements (AccessibilityInfo checks)
- Performance optimizations
- Type safety improvements

## 📋 User Action Items

### 1. Install New Package
```bash
cd app
npm install
# or
yarn install
```

### 2. Fix meds_logs Error in Supabase
1. Go to Supabase SQL Editor
2. Search for any references to `meds_logs` (plural)
3. Update to `meds_log` (singular)
4. Refresh schema cache
5. Verify RLS policies use `meds_log`

### 3. Test Calendar Integration
1. Grant calendar permissions when prompted
2. Add test events to device calendar
3. Verify events appear in Dashboard calendar card
4. Test event removal after they pass
5. Test warning indicators for events within 15 minutes

### 4. Test Recovery Plan Enhancements
1. Navigate to Settings → Recovery
2. Test week selection (needs modal implementation)
3. Test recovery type selection (needs modal implementation)
4. Verify week number appears in Dashboard recovery card
5. Verify recovery type appears in Dashboard recovery card

## 🚀 Next Implementation Tasks

1. **Complete Settings Screen Recovery Reset Modal**
   - Create modal component
   - Add week picker
   - Add recovery type selector
   - Wire up to `resetRecoveryProgress` with parameters

2. **Fix meds_logs Error**
   - Document exact Supabase query/function causing error
   - Create migration script if needed
   - Update user with specific fix steps

3. **Continue Critical Fixes**
   - Error boundaries
   - AccessibilityInfo checks
   - Performance optimizations
   - Type safety improvements

