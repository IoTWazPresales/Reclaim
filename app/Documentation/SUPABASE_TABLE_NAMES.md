# Supabase Table Names Used in Code

This document lists all Supabase table names used in the codebase for easy verification against your Supabase database.

## Complete List of Tables Used in Code

1. **`activity_daily`**
   - Used in: `app/src/lib/api.ts`
   - Functions: `upsertDailyActivityFromHealth()`, `listDailyActivitySummaries()`

2. **`app_logs`**
   - Used in: `app/src/lib/telemetry.ts`
   - Function: `logTelemetry()`

3. **`entries`**
   - Used in: `app/src/lib/api.ts`
   - Functions: `insertEntry()`, `listEntries()`, `upsertTodayEntry()`, `listEntriesLastNDays()`

4. **`logs`**
   - Used in: `app/src/lib/logger.ts`
   - Function: `logErrorToSupabase()`

5. **`meds`**
   - Used in: `app/src/lib/api.ts`
   - Functions: `listMeds()`, `upsertMed()`, `deleteMed()`

6. **`meds_log`** ✅ (Singular - matches Supabase)
   - Used in: `app/src/lib/api.ts`, `app/src/lib/dataPrivacy.ts`
   - Functions: `logMedDose()`, `listMedLogsLastNDays()`, `listMedDoseLogsRemoteLastNDays()`, `exportUserData()`, `exportUserDataCsv()`, `deleteAllPersonalData()`

7. **`meditation_sessions`**
   - Used in: `app/src/lib/sync.ts`
   - Function: `syncAll()`

8. **`mindfulness_events`**
   - Used in: `app/src/lib/api.ts`
   - Functions: `logMindfulnessEvent()`, `listMindfulnessEvents()`

9. **`mood_checkins`**
   - Used in: `app/src/lib/api.ts`
   - Functions: `addMoodCheckin()`, `listMoodCheckins()`, `listMoodCheckinsRange()`, `deleteMoodCheckin()`, `hasMoodToday()`

10. **`mood_entries`**
    - Used in: `app/src/lib/api.ts`, `app/src/lib/sync.ts`
    - Functions: `addMoodCheckin()` (also writes directly), `syncAll()`

11. **`profiles`**
    - Used in: `app/src/routing/RootNavigator.tsx`, `app/src/screens/onboarding/GoalsScreen.tsx`, `app/src/screens/onboarding/PermissionsScreen.tsx`, `app/src/lib/dataPrivacy.ts`
    - Functions: Onboarding checks, profile updates

12. **`sleep_candidates`**
    - Used in: `app/src/lib/api.ts`
    - Functions: `listSleepCandidates()`, `insertSleepCandidate()`, `resolveSleepCandidate()`

13. **`sleep_prefs`**
    - Used in: `app/src/lib/api.ts`
    - Functions: `upsertSleepPrefs()`, `getSleepPrefs()`
    - ⚠️ **NOTE**: `saveSleepSettings()` in `sleepSettings.ts` now also writes to this table

14. **`sleep_sessions`**
    - Used in: `app/src/lib/api.ts`
    - Functions: `listSleepSessions()`, `addSleepSession()`, `upsertSleepSessionFromHealth()`

## Table Name Verification

All table names in code match Supabase schema. ✅

## Unused Tables in Supabase (Can be deleted)

1. **`medication_logs`** - Not used (code uses `meds_logs`)
2. **`medication_schedules`** - Not used (schedules stored in `meds.schedule` JSON field)

## Tables to Verify in Supabase

Make sure these tables exist in your Supabase database:

1. ✅ `activity_daily`
2. ✅ `app_logs`
3. ✅ `entries`
4. ✅ `logs`
5. ✅ `meds`
6. ✅ `meds_log` (singular - matches code)
7. ✅ `meditation_sessions`
8. ✅ `mindfulness_events`
9. ✅ `mood_checkins`
10. ✅ `mood_entries`
11. ✅ `profiles`
12. ✅ `sleep_candidates`
13. ✅ `sleep_prefs`
14. ✅ `sleep_sessions`

## Quick Verification Script

To verify all tables exist, you can run this in Supabase SQL Editor:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

Then compare with the list above.

