# Health Connect–Only Integration: Current State Audit

**Date:** 2025-02-18  
**Purpose:** Compare repo state to the previously agreed Health Connect–only plan.  
**Conclusion:** The planned changes are **not** present; the codebase is in the **pre–Health Connect–only** state (multi-provider sync, all integrations in UI). Reimplementation is required.

---

## 1. Summary Table

| Area | Planned (from handover) | Current state |
|------|-------------------------|---------------|
| **Sync (Android)** | Read/write only from Health Connect; no Google Fit / Samsung in sync path | **Not done.** `sync.ts` still reads from Health Connect, Google Fit, Samsung, and Apple; writes from all; `syncHistoricalHealthData` uses Google Fit only |
| **getLatestWakeTime (Android)** | Health Connect only; no Google Fit fallback | **Not done.** Still falls back to Google Fit |
| **Integrations UI** | Show only Health Connect (Android) and Apple Health (iOS); hide Google Fit / Samsung | **Not done.** All integrations still shown |
| **“Open Health Connect” button** | Button to open Health Connect app/settings for source management | **Not present** |
| **Health Connect permissions** | Request all readable Health Connect data types | **Not done.** Still small set (sleep, steps, heart rate, activity_level, etc.) |
| **Sleep enrichment** | Stage minutes, sessionType, vitals during sleep, etc. in HC service + API | **Not done.** No `enrichSleepSessionsWithVitals`; no sessionType/deepSleepMinutes in HC mapping; API does not mirror metadata to dedicated columns |
| **SleepScreen** | No Samsung import in UI; provider order / fetch only from Health Connect on Android | **Not done.** Still uses `importSamsungHistory` and multi-provider order including Google Fit |
| **Keep modules** | Google Fit / Samsung modules and auth kept, not used in sync/UI | **N/A.** Sync and UI still use them |

---

## 2. File-by-File Findings

### 2.1 `app/src/lib/sync.ts`

- **Imports:** Still imports `getGoogleFitProvider`, `googleFitGetSleepSessions`, `googleFitGetTodayActivity`, `googleFitHasPermissions`, and `samsungIsAvailable`, `samsungRequestPermissions`, `samsungReadSleep`.
- **Sync flow:** `syncHealthData()` still:
  - Probes both Health Connect and Google Fit (and Samsung, Apple).
  - Collects sleep from Health Connect, Apple HealthKit, Samsung Health, and Google Fit.
  - Pushes all into `sessionsByProvider` and runs the consolidated pipeline.
  - Uses Google Fit for activity/vitals when `!hcActivitySaved` / `!hcVitalsSaved`.
- **Historical sync:** `syncHistoricalHealthData()` uses **Google Fit only** (provider + `getSleepSessions` + activity), not Health Connect.
- **Export:** `importSamsungHistory()` is still exported and used by SleepScreen.
- **Required change:** Use Health Connect as sole Android source for sleep/activity/vitals; remove Google Fit and Samsung from sync and historical sync; keep or repurpose `importSamsungHistory` only for “keep module”/future use, not in main flow.

### 2.2 `app/src/lib/health/getLatestWakeTime.ts`

- **Android branch:** Tries Health Connect first, then **falls back to Google Fit**.
- **Required change:** On Android, use only Health Connect for wake time; remove Google Fit fallback.

### 2.3 `app/src/screens/IntegrationsScreen.tsx`

- **List source:** Uses `useHealthIntegrationsList()` → `getIntegrationsWithStatus()` with no filter. All integrations (Google Fit, Health Connect, Apple HealthKit, Samsung, placeholders) are shown.
- **Required change:** Derive a `visibleIntegrations` list: on Android show only Health Connect (and optionally “Manage Health Connect sources”); on iOS show only Apple HealthKit. Keep definitions for other providers in code but do not show them in the list.
- **Button:** No button to open Health Connect app/settings. Add one that opens Health Connect (e.g. via `Linking.openURL` or intent) so users can manage data sources.

### 2.4 `app/src/screens/SleepScreen.tsx`

- **Imports:** Still imports `importSamsungHistory` and Google Fit services (`getGoogleFitProvider`, `googleFitGetLatestSleepSession`, `googleFitGetSleepSessions`, `googleFitHasPermissions`).
- **Provider order:** `sleepProviderOrder` is built from preferred + connected integrations, then `['google_fit', 'health_connect']` is appended. So Google Fit is still in the flow.
- **Samsung import:** Import modal/flow still calls `importSamsungHistory(90)`.
- **Required change:** On Android, use only Health Connect for “latest” and “sessions” (or filter to visible integrations so only Health Connect is used). Remove or hide Samsung import from UI (keep the module for future use). Align provider order with IntegrationsScreen visibility (Health Connect only on Android).

### 2.5 `app/src/lib/health/integrations.ts`

- **Connect Health Connect:** Uses `HEALTH_CONNECT_DEFAULT_METRICS` (small set: sleep, steps, active_energy, heart_rate, resting_heart_rate, heart_rate_variability). No expanded “all readable” list.
- **Success condition:** No explicit “at least sleep metrics granted” fallback.
- **Required change:** Expand requested permissions to the full set of Health Connect read types you want; optionally treat “sleep granted” as sufficient for connection success. Do not change auth/connect flow structure.

### 2.6 `app/src/lib/health/healthConnectService.ts`

- **Metrics:** `HEALTH_CONNECT_DEFAULT_METRICS` and `METRIC_RECORD_MAP` are the small set (SleepSession, Steps, ActiveCaloriesBurned, HeartRate, RestingHeartRate, HeartRateVariabilityRmssd, ExerciseSession). No extended record types.
- **Sleep mapping:** No `enrichSleepSessionsWithVitals`; no aggregation of vitals over sleep windows. No `sessionType` (main/nap/other), no `deepSleepMinutes` / `remSleepMinutes` etc. in the mapping from Health Connect records to app `SleepSession`.
- **Required change:** Add all desired Health Connect record types to the permission/mapping (within SDK support). Implement sleep enrichment: stage totals, sessionType, optional vitals during sleep window, and pass through to API. Call enrichment in the sleep fetch path.

### 2.7 `app/src/lib/health/types.ts`

- **HealthMetric:** Small union (`heart_rate`, `sleep_analysis`, `sleep_stages`, `steps`, `active_energy`, `resting_heart_rate`, `heart_rate_variability`, `activity_level`). No extended Health Connect metrics.
- **SleepSession.metadata:** Has `avgHeartRate`, `minHeartRate`, `maxHeartRate`, `bodyTemperature`, `deepSleepMinutes`, `remSleepMinutes`, `lightSleepMinutes`, `awakeMinutes`. Missing: `sessionType`, `device`, `hrvRmssdMs`, `avgSpO2`, `minSpO2`, `avgRespiratoryRate`, `skinTemperature` (if desired).
- **Required change:** Extend `HealthMetric` for all Health Connect types you request. Extend `SleepSession.metadata` for enrichment (sessionType, device, HRV, SpO2, respiratory, etc.) so the rest of the app and API can use them.

### 2.8 `app/plugins/withHealthConnectPermissions.js`

- **Permissions:** Declares a small set of READ permissions (SLEEP, STEPS, HEART_RATE, RESTING_HEART_RATE, HEART_RATE_VARIABILITY, ACTIVE_CALORIES_BURNED, TOTAL_CALORIES_BURNED, EXERCISE).
- **Required change:** Add all Health Connect READ permission strings that correspond to the expanded metrics (matching what the SDK and Play policy allow).

### 2.9 `app/src/lib/api.ts`

- **upsertSleepSessionFromHealth:** Accepts `metadata` with `deepSleepMinutes`, `remSleepMinutes`, etc., and stores `row.metadata = metadata`. It does **not** mirror these into dedicated columns (e.g. `duration_minutes`, `deep_sleep_minutes`, `rem_sleep_minutes`, `session_type`, `avg_heart_rate`, etc.) for the Supabase table.
- **Required change:** If the DB has dedicated columns for these, mirror from `input.metadata` (and `input.durationMinutes`) into `row` so upserts and historic sync populate them; keep full metadata in `row.metadata` for flexibility.

---

## 3. What Is Present

- **Documentation:** `HEALTH_CONNECT_INTEGRATION_HANDOVER.md` exists and describes the intended architecture and plan.
- **Health Connect service:** Basic Health Connect read (sleep, steps, activity, vitals) is implemented and used in sync alongside other providers.
- **API type:** `upsertSleepSessionFromHealth` already accepts rich `metadata` (including stage minutes); only the mirroring to dedicated columns is missing.
- **Types:** `SleepSession.metadata` already has some of the stage/vital fields; it only needs the extra fields (sessionType, device, HRV, SpO2, etc.) for full enrichment.

---

## 4. Recommended Reimplementation Order

1. **Sync and wake time (single source of truth on Android)**  
   - In `sync.ts`: make Android sleep/activity/vitals read and write only from Health Connect; remove Google Fit and Samsung from the sync and historical sync paths.  
   - In `getLatestWakeTime.ts`: remove Google Fit fallback on Android.

2. **UI (visibility + Health Connect button)**  
   - In `IntegrationsScreen.tsx`: add `visibleIntegrations` (Health Connect on Android, Apple HealthKit on iOS); render only those. Add a “Manage Health Connect sources” / “Open Health Connect” button.  
   - In `SleepScreen.tsx`: remove or hide Samsung import from UI; restrict “latest” and “sessions” on Android to Health Connect (e.g. via same visibility or provider filter).

3. **Permissions and types**  
   - Extend `HealthMetric` and `withHealthConnectPermissions.js` with all desired Health Connect read types.  
   - In `healthConnectService.ts` and `integrations.ts`: request the expanded set; optionally treat “sleep granted” as sufficient for connect.

4. **Sleep enrichment and API**  
   - In `healthConnectService.ts`: implement `enrichSleepSessionsWithVitals` (and any stage/sessionType logic); ensure sleep mapping sets `metadata` (and duration, stage minutes, sessionType).  
   - In `types.ts`: add missing `SleepSession.metadata` fields.  
   - In `api.ts`: mirror `metadata` and `durationMinutes` into the Supabase columns you added (e.g. `duration_minutes`, `deep_sleep_minutes`, `session_type`, etc.) while keeping full JSON in `metadata`.

5. **Cleanup**  
   - Remove or stub `importSamsungHistory` from the main flow (keep the module for future use). Ensure no other callers depend on Google Fit or Samsung for the primary sync path.

---

## 5. Risk Notes

- **Supabase schema:** Confirm `sleep_sessions` has the columns you expect (e.g. `duration_minutes`, `deep_sleep_minutes`, `session_type`, etc.) before adding mirroring in `api.ts`. If not, add a migration first.
- **react-native-health-connect:** Some record types may not be supported by the current SDK version; expand metrics incrementally and test. Omit unsupported types to avoid runtime/type errors.
- **Existing data:** After switching to Health Connect–only sync, existing rows written from Google Fit/Samsung will remain; only new data will be Health Connect–sourced unless you run a one-off backfill from Health Connect.

This audit reflects the state of the repo at the time of the check; re-run a quick diff on the listed files if you’ve pulled further changes.
