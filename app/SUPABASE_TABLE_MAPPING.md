# Supabase Table Mapping & Data Writing Issues

This document maps the code to Supabase tables and identifies data writing issues.

## Tables with Data ✅

1. **`app_logs`** - ✅ Working
   - Written by: `app/src/lib/logger.ts`
   - Function: `logErrorToSupabase()`

2. **`entries`** - ✅ Working
   - Written by: `app/src/lib/api.ts`
   - Functions: `upsertTodayEntry()`, `insertEntry()`

3. **`activity_daily`** - ✅ Working
   - Written by: `app/src/lib/api.ts`
   - Function: `upsertDailyActivityFromHealth()`

4. **`meds`** - ✅ Working
   - Written by: `app/src/lib/api.ts`
   - Functions: `upsertMed()`, `listMeds()`

5. **`meds_log`** - ✅ Working
   - Written by: `app/src/lib/api.ts`
   - Function: `logMedDose()`
   - **Note**: Table name is singular `meds_log` (matches Supabase)

6. **`mindfulness_events`** - ✅ Working
   - Written by: `app/src/lib/api.ts`
   - Function: `logMindfulnessEvent()`

7. **`profiles`** - ✅ Working
   - Written by: Auth/onboarding system

8. **`mood_checkins`** - ✅ Working (but has data)
   - Written by: `app/src/lib/api.ts`
   - Function: `addMoodCheckin()`

## Tables without Data ❌

### 1. **`medication_logs`** - ❌ NOT USED
   - **Issue**: Table exists but code doesn't write to it
   - **Action**: Either delete this table OR update code to use it instead of `meds_log`
   - **Recommendation**: Use `meds_logs` (see issue #5 above)

### 2. **`medication_schedules`** - ❌ NOT NEEDED
   - **Issue**: Table exists but code doesn't write to it
   - **Reason**: Schedules are stored in `meds.schedule` JSON field
   - **Action**: Delete this table (not needed)

### 3. **`meditation_sessions`** - ⚠️ **NOT SYNCED AUTOMATICALLY**
   - Written by: `app/src/lib/sync.ts`
   - Function: `syncAll()` 
   - **Issue**: `syncAll()` is only called manually from:
     - `AnalyticsScreen` (onSyncNow button)
     - `SleepScreen` (after import)
   - **Action**: Need to call `syncAll()` automatically after meditation sessions complete

### 4. **`mood_entries`** - ⚠️ **NOT SYNCED AUTOMATICALLY**
   - Written by: `app/src/lib/sync.ts`
   - Function: `syncAll()`
   - **Issue**: Same as meditation_sessions - only synced manually
   - **Note**: Data goes to `mood_checkins` first (local storage), then syncs to `mood_entries`
   - **Action**: Need to call `syncAll()` automatically after mood checkins OR write directly to `mood_entries`

### 5. **`sleep_candidates`** - ⚠️ **FUNCTIONS EXIST, MAY NOT BE USED**
   - Written by: `app/src/lib/api.ts`
   - Functions: `insertSleepCandidate()`, `listSleepCandidates()`, `resolveSleepCandidate()`
   - **Check**: These functions exist but may not be called in the UI
   - **Action**: Verify if sleep candidates feature is being used in the app

### 6. **`sleep_prefs`** - ⚠️ **NOT BEING WRITTEN**
   - Written by: `app/src/lib/api.ts`
   - Function: `upsertSleepPrefs()` exists but is NOT being called
   - **Issue**: `saveSleepSettings()` in `app/src/lib/sleepSettings.ts` only writes to local AsyncStorage
   - **Action**: Update `saveSleepSettings()` to also call `upsertSleepPrefs()` OR replace it with direct Supabase writes

### 7. **`sleep_sessions`** - ⚠️ **INCOMPLETE DATA**
   - Written by: `app/src/lib/api.ts`
   - Function: `upsertSleepSessionFromHealth()`
   - **Issue**: Only writes basic fields:
     - `id`, `user_id`, `start_time`, `end_time`, `source`
   - **Missing**: Extended sleep data we added:
     - `duration_minutes`
     - `efficiency`
     - `stages` (JSON array of sleep stages)
     - `metadata` (JSON with heart rate, body temp, etc.)
   - **Action**: Update `upsertSleepSessionFromHealth()` to include all fields

## Missing Tables/Columns

### `sleep_sessions` needs these columns:
```sql
-- Basic (already exists)
id TEXT PRIMARY KEY
user_id UUID REFERENCES auth.users(id)
start_time TIMESTAMPTZ
end_time TIMESTAMPTZ
source TEXT

-- Need to add:
duration_minutes INTEGER
efficiency DECIMAL(0,1)
stages JSONB  -- Array of {start: ISO, end: ISO, stage: 'awake'|'light'|'deep'|'rem'}
metadata JSONB  -- {avgHeartRate, minHeartRate, maxHeartRate, bodyTemperature, deepSleepMinutes, remSleepMinutes, lightSleepMinutes, awakeMinutes}
```

## Fix Priority

### High Priority (Data not being written)
1. ✅ Table names verified - `meds_log` (singular) matches Supabase **CONFIRMED**
2. ✅ Add automatic sync for `mood_entries` and `meditation_sessions` **DONE**
3. ✅ Update `sleep_sessions` to write all sleep data fields **DONE**
4. ⚠️ Update `saveSleepSettings()` to write to `sleep_prefs` table **TODO**

### Medium Priority (Cleanup)
4. Delete unused `medication_logs` table (if not migrating to it)
5. Delete unused `medication_schedules` table

### Low Priority (Verification)
6. Verify `sleep_candidates` is being written
7. Verify `sleep_prefs` is being written

## Implementation Plan

1. ✅ **Table name verified**: Code uses `meds_log` (singular) which matches Supabase **CONFIRMED**
2. ✅ **Auto-sync mood/meditation**: 
   - ✅ `addMoodCheckin()` now writes directly to both `mood_checkins` and `mood_entries` tables **DONE**
   - ✅ Added automatic sync after meditation sessions complete in `MeditationScreen.tsx` **DONE**
3. ✅ **Extend sleep_sessions**: Updated `upsertSleepSessionFromHealth()` to accept and write all fields (duration, efficiency, stages, metadata) **DONE**
4. ⚠️ **Update sleep_prefs**: Need to modify `saveSleepSettings()` to also write to `sleep_prefs` table **TODO**

## Missing Tables/Additional Notes

### Tables Not Mentioned (Verify if they exist in Supabase):
- `recovery_progress` - Used by recovery system
- `notification_preferences` - Used for notification settings
- `user_settings` - Used for app settings
- `telemetry_events` - Used for analytics/telemetry (if implemented)

### Unused Tables (Can be deleted):
- `medication_logs` - Code uses `meds_log` instead
- `medication_schedules` - Schedules stored in `meds.schedule` JSON field

