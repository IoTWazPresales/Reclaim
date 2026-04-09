# Health API / permission coverage (April 2026)

This document lists **declared or requested** health capabilities versus **where they surface in product code**. It supports Play policy alignment (visible use of sensitive scopes) and engineering planning. **No permissions were removed** in the pass that added this file.

## Android — Health Connect (`react-native-health-connect`)

### First connect / import (Supabase backfill)

On **integrations connect**, **sleep connect/import**, etc., `requestHealthSync` uses a **90-day** sleep window and `forceFullSleepImport`. After the normal “today” HC upsert, `backfillHealthConnectDailyHistoryToSupabase(90)` runs:

- **`activity_daily`** — one row per calendar day (steps, active energy) from `healthConnectGetDailyActivity`.
- **`vitals_daily`** — one row per day (resting HR, HRV, HR aggregates) from `healthConnectGetDailyVitals`.

Sleep sessions in the same window are written via the existing pipeline (`healthConnectGetSleepSessions` + `upsertSleepSessionFromHealth`), including per-session vitals enrichment (SpO₂, respiratory, temperature, etc.) in `sleep_sessions.metadata` / columns.

`syncHistoricalHealthData(days)` (default 90) performs the same sleep loop + daily backfill for repair/manual tooling.

### Per-type reference

| Capability | Wired to user-visible or insight logic | Notes |
|-------------|----------------------------------------|--------|
| Sleep (`SleepSession`) | Sleep screen, dashboard tile, sync pipeline | Core |
| Heart rate (samples) | HC daily vitals aggregation, sleep enrichment | |
| Resting heart rate | Daily vitals → `summarizeRestingHeartRateTrend` → insights `vitals.*` | |
| HRV (RMSSD) | HC daily rows; sleep session metadata when enriched | Not its own dashboard tile |
| Active / total calories | Daily activity sync; **training session window** active kcal | |
| Steps | Daily activity, dashboard steps/baseline | |
| SpO₂, respiratory rate, body temperature | Sleep enrichment → DB metadata → Sleep screen + insight rules | |
| **Exercise sessions** (`READ_EXERCISE` / ExerciseSession) | **Not** used for training kcal (window uses energy records) | Declared in some builds; **not** a dedicated UI |

## iOS — HealthKit (`react-native-health`)

| Capability | Wired | Notes |
|-------------|--------|--------|
| Sleep | Sync pipeline, Sleep screen | |
| Heart rate / resting HR | Resting HR **daily series** → `fetchHeartRateContextSummary` → insights `vitals.*` | Requires Apple Health **connected** in Integrations |
| HRV, steps, active energy | Provider + sync paths | As existing features consume them |
| **Live HR “reactive” mindfulness triggers** | **Not** started on iOS (`startHealthTriggers` exits when Google Fit unavailable) | Documented on Mindfulness screen |

## Google Fit (Android)

| Capability | Wired | Notes |
|-------------|--------|--------|
| HR subscription | Mindfulness reactive triggers (live samples) | Resting context from HC, not Fit |
| Stress subscription | Reactive triggers | |
| Other read scopes | Legacy sync / provider | Retirement planned in later phase (see `PHASE_0_HC_ANDROID_DECISIONS.md`) |

## Still not integrated as standalone product surfaces (after this pass)

- **HC ExerciseSession / READ_EXERCISE** as a first-class workout browser (calories use energy records instead).
- **Dedicated dashboard tile** for resting HR or HRV (values flow into **insights** and mindfulness gating context only).
- **iOS parity** for automatic **Fit-style** reactive HR notifications (Apple subscription path not hooked into `notificationTriggers` yet).
- **Insight feedback `scope` column** for mood modal (telemetry uses `mood_logged` + `uiSurface: home_tile_modal` instead).

Update this file when adding screens, tiles, or new rules tied to a permission.
