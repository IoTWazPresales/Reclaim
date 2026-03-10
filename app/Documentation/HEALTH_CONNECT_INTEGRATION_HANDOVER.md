## Health Connect Integration Handover

### 1. Executive summary

Reclaim’s health integration layer is built around a **multi‑provider abstraction** (`health_connect`, `google_fit`, `apple_healthkit`, legacy `samsung_health`) with:

- A single **integration registry** (`integrations.ts`) that owns connection flows and status.
- A **sync coordinator** (`SyncCoordinator.ts`) that drives `syncHealthData` with reasons/cooldowns.
- A **sleep sync pipeline** (`sleepSyncPipeline.ts`) that merges provider sessions and writes to Supabase.
- A dedicated **Health Connect service** (`healthConnectService.ts`) that wraps `react-native-health-connect`.

We are now simplifying Android to be **Health Connect only for data ingestion**, while:

- **Keeping** all existing Health Connect flow & error handling.
- **Hiding/removing** UI for other Android providers.
- **Retaining** the provider modules (Google Fit / Samsung Health, etc.) for potential future reuse, but not wiring them into active sync.
- **Expanding Health Connect permissions** to cover the full set of Android Health Connect record types you listed.

This document explains the current architecture and outlines the concrete changes needed to complete that shift.

---

### 2. Current architecture overview

#### 2.1 Integrations registry (`src/lib/health/integrations.ts`)

Key responsibilities:

- Defines **integration metadata** (`IntegrationDefinition` / `IntegrationWithStatus`):
  - `id` (`IntegrationId`)
  - `title`, `subtitle`
  - `platform` (`'health_connect'`, `'google_fit'`, `'apple_healthkit'`, `garmin`, `huawei`)
  - `supported` flag (platform/runtime gating)
  - `icon`
  - `connect` / `disconnect` functions
- Maintains **auth UI mutual exclusion** (`authUiInFlight`) so only one permission flow runs at a time.
- Performs **runtime validation** against stored integration state via:
  - `getRuntimeConnectionState`
  - `reconcileStoredIntegrationStatuses`
  - `getIntegrationsWithStatus` / `getIntegrationWithStatus`
- Uses **per‑integration services**:
  - Google Fit: `getGoogleFitProvider`, `googleFitHasPermissions`
  - Health Connect: `getHealthConnectAvailability`, `healthConnectHasPermissions`, `healthConnectRequestPermissions`, `healthConnectRevokeAllPermissions`
  - Apple HealthKit: `AppleHealthKitProvider`
  - Stored state: `integrationStore` (`markIntegrationConnected/Disconnected/Error`, `getAllIntegrationStatuses`, `setIntegrationStatus`, etc.).

Important pieces:

- `METRICS: HealthMetric[]` (lines ~46–55)  
  - Shared logical metrics: `'sleep_analysis'`, `'sleep_stages'`, `'heart_rate'`, `'resting_heart_rate'`, `'heart_rate_variability'`, `'steps'`, `'active_energy'`, `'activity_level'`.
  - Passed to Google Fit and Apple HealthKit permission requests.
- **Google Fit connect** (`connectGoogleFit`):
  - Android‑only, uses `getGoogleFitProvider().isAvailable()` and `requestPermissions(METRICS, { forceOAuth: true })`.
  - Writes errors and final status into `integrationStore`.
- **Health Connect connect** (`connectHealthConnect`):
  - Android‑only, enforces minimum API level via `HEALTH_CONNECT_MIN_ANDROID_VERSION`.
  - Calls `getHealthConnectAvailability()` and bails early on `unsupported` / `needs_install` / `needs_update`.
  - Requests permissions via:
    ```ts
    const granted = await healthConnectRequestPermissions(HEALTH_CONNECT_DEFAULT_METRICS);
    ```
  - Then validates “connected” by checking:
    ```ts
    const verified = await retryBooleanCheck(
      () => healthConnectHasPermissions(HEALTH_CONNECT_SLEEP_METRICS),
      // retries…
    );
    ```
  - On success, calls `markIntegrationConnected('health_connect')`.
- **Integration definitions array (`DEFINITIONS`)**:
  - Currently includes:
    - `'google_fit'` (Android)
    - `'health_connect'` (Android, API >= `HEALTH_CONNECT_MIN_ANDROID_VERSION`)
    - `'apple_healthkit'` (iOS)
    - `'garmin'` (placeholder)
    - `'huawei'` (placeholder)
  - These drive the list shown in `IntegrationsScreen` via `HealthIntegrationList`.

#### 2.2 Health Connect service (`src/lib/health/healthConnectService.ts`)

Wraps `react-native-health-connect` and exposes:

- **Capability & initialization**:
  - `HEALTH_CONNECT_MIN_ANDROID_VERSION = 33`
  - `HEALTH_CONNECT_SLEEP_METRICS: HealthMetric[] = ['sleep_analysis', 'sleep_stages']`
  - `HEALTH_CONNECT_DEFAULT_METRICS: HealthMetric[] = ['sleep_analysis', 'sleep_stages', 'steps', 'active_energy', 'heart_rate', 'resting_heart_rate', 'heart_rate_variability']`
  - `getHealthConnectAvailability()` → `'available' | 'needs_update' | 'needs_install' | 'unsupported'`
  - `healthConnectIsAvailable()`
  - `ensureInitialized()` around `initialize()`, with `initialized`/`initializing` guards.

- **Permission handling**:
  - `METRIC_RECORD_MAP: Partial<Record<HealthMetric, RecordType[]>>` maps logical metrics → SDK record types:
    - `sleep_analysis`, `sleep_stages` → `'SleepSession'`
    - `heart_rate` → `'HeartRate'`
    - `resting_heart_rate` → `'RestingHeartRate'`
    - `heart_rate_variability` → `'HeartRateVariabilityRmssd'`
    - `steps` → `'Steps'`
    - `active_energy` → `'ActiveCaloriesBurned' | 'TotalCaloriesBurned'`
    - `activity_level` → `'ExerciseSession'`
  - `buildPermissions(metrics)`:
    - Flattens `HealthMetric[]` → `Permission[]` (`{ recordType, accessType: 'read' }`).
  - `healthConnectRequestPermissions(metrics = DEFAULT_PERMISSION_METRICS)`:
    - Guards against background AppState and concurrent dialogs (`requestingPermissions`).
    - Ensures availability + initialization.
    - Calls `requestPermission(permissions)`, then falls back to `getGrantedPermissions()` when the array is empty.
    - Returns `true` only if each requested permission is among granted.
  - `healthConnectHasPermissions(metrics = DEFAULT_PERMISSION_METRICS)`:
    - Checks availability & initialization.
    - Compares `required` vs `getGrantedPermissions()`.
  - `healthConnectRevokeAllPermissions()`: calls `revokeAllPermissions()` with logging.

- **Data fetch APIs**:
  - `healthConnectGetSleepSessions(days)` → `SleepSession[]` mapped to domain type:
    - Uses `readRecords('SleepSession', timeRangeFilter)` with `ascendingOrder: false`.
    - Maps to `SleepSession` with computed `durationMinutes`, optional `efficiency`, stage mapping via `SleepStageType`.
  - `healthConnectGetLatestSleepSession()`:
    - Convenience wrapper (`healthConnectGetSleepSessions(7)[0]`).
  - `healthConnectGetDailyActivity(days)`:
    - Requires permissions for `['steps', 'active_energy']`.
    - Reads `'Steps'` and `'ActiveCaloriesBurned'` (fallback to `'TotalCaloriesBurned'`).
    - Aggregates into an `ActivitySample[]` keyed by day (steps + activeEnergyBurned).
  - `healthConnectGetTodayActivity()`: single‑day wrapper.
  - `healthConnectGetDailyVitals(days)`:
    - Requires `['heart_rate', 'resting_heart_rate', 'heart_rate_variability']`.
    - Reads `'HeartRate'`, `'RestingHeartRate'`, `'HeartRateVariabilityRmssd'` and aggregates per‑day stats (avg/min/max HR, resting HR, HRV).
  - `healthConnectGetTodayVitals()`: single‑day wrapper.

This service is already **Health‑Connect centric**; expanding to more record types just means:

- Extending `HealthMetric` to represent new logical metrics.
- Extending `METRIC_RECORD_MAP` to include those metrics → SDK record types.
- Passing a **larger metrics array** into `healthConnectRequestPermissions` / `healthConnectHasPermissions`, and optionally adding new read helpers.

#### 2.3 Integrations screen & list (`src/screens/IntegrationsScreen.tsx`, `src/components/HealthIntegrationList.tsx`)

`IntegrationsScreen`:

- Uses `useHealthIntegrationsList` → `getIntegrationsWithStatus()` to render current providers.
- Provides **Connect & sync** section:
  - Displays `HealthIntegrationList` with all definitions from `integrations.ts`.
  - “Refresh list”, “Import latest data” buttons.
  - Legacy “Import Samsung history” button (`importSamsungHistory`) and diagnostics for Google Fit.
- Manages:
  - Preferred integration (`getPreferredIntegration`, `setPreferredIntegration`).
  - Provider onboarding tip (which provider gets priority).
  - Health import modal that calls `requestHealthSync({ reason: 'integrations_import', force: true })`.
  - Summaries and debug info from `HealthSyncResult.debug.sleepProviders` (Health Connect, Google Fit, Apple Health, Samsung).

`HealthIntegrationList`:

- Renders one row per `IntegrationWithStatus`:
  - Icon, title, subtitle, lastConnected, lastError.
  - Connect/disconnect action.
  - Preferred provider UI.
- It is **agnostic** to provider type; the providers it shows come from `DEFINITIONS` in `integrations.ts`.

#### 2.4 Sync coordinator & sleep pipeline

**`src/sync/SyncCoordinator.ts`**

- Exposes `requestHealthSync({ reason, force, minIntervalMs? })`:
  - Handles:
    - Cooldowns (`defaultCooldownMs`).
    - Coalescing concurrent requests for the same run.
    - Connect/import vs dashboard/startup behaviour (connect/import run with full window, others with capped days).
  - Calls `syncHealthData({ maxSleepWindowDays?, forceFullSleepImport, readinessRetries, readinessRetryDelayMs, forceRuntimeConnectedProviders })`.
  - Wraps result in `CoordinatedHealthSyncResult` with metadata and telemetry.

**`src/lib/sleep/sleepSyncPipeline.ts`**

- Defines:
  ```ts
  export type SleepPipelineInput = {
    sessionsByProvider: Array<{
      provider: 'health_connect' | 'apple_healthkit' | 'samsung_health' | 'google_fit';
      sessions: HealthSleepSession[];
    }>;
    existingSessionKeys: Set<string>;
  };
  ```
- Flow:
  - Flatten all sessions across providers into `TaggedSleepSession[]` (`_provider` field).
  - Run `consolidateSleepSessions(all)` which:
    - De‑dupes & prioritises by provider (current priority: Health Connect > Apple HealthKit > Samsung > Google Fit).
    - Returns consolidated sessions plus any superseded keys.
  - For each consolidated session:
    - Skip if an identical start/end key already exists.
    - Otherwise call `upsertSleepSessionFromHealth` with normalized fields and mark `source` (e.g. `'health_connect'`).
  - Delete superseded older sessions via `deleteSleepSessionsByKeys`.

Today this pipeline assumes **multiple upstream providers**, but the priority already makes Health Connect the top source when present.

---

### 3. Existing documentation & how this continues it

Relevant existing docs:

- `Documentation/HEALTH_INTEGRATION_DIAGNOSIS.md`  
  - Earlier deep dive into missing configs for Samsung Health, Google Fit, and Health Connect.
  - Focuses on **making all three work**, with SDK/package/manifest notes.
- `Documentation/HEALTH_INTEGRATION_DEBUGGING_GUIDE.md`  
  - Checklist‑style troubleshooting for “HC app not installed”, Samsung crashes, Google Fit permission issues.
- `Documentation/SAMSUNG_HEALTH_SLEEP_DATA_FLOW.md`  
  - Details how Samsung data flowed into Supabase via direct integration.
- `Documentation/DEBUG_SLEEP_SYNC.md`  
  - Diagnostics around sleep sync and provider priority.

This current handover **supersedes the “multi‑provider first‑class” stance** for Android and sets the direction to:

- **Health Connect as the single Android upstream**.
- Other providers treated as **legacy/auxiliary** (modules preserved, UI hidden, no active sync).

---

### 4. Planned changes for Health Connect–only ingestion (Android)

> Note: This section is the implementation roadmap. **No changes have been applied yet.**

#### 4.1 Integration definitions & UI

**Target behaviour:**

- On Android:
  - **Visible connectable providers**:  
    - `Health Connect`
  - Internally present but **not visible/used**:  
    - `Google Fit`, `Samsung Health`, other experimental providers (Garmin, Huawei).
- On iOS:
  - `Apple Health` remains as-is.

**Concrete steps (Android only):**

1. **Hide Google Fit and legacy providers from UI**
   - In `src/lib/health/integrations.ts`:
     - Keep the full `DEFINITIONS` array for now, but a first option is:
       - Remove `google_fit` from `DEFINITIONS` when `Platform.OS === 'android'` once Health Connect is stable, **or**
       - Leave it in `DEFINITIONS` but gate it behind a feature flag for now.
   - In `src/screens/IntegrationsScreen.tsx`:
     - Filter `integrations` so that on Android only:
       - `health_connect` is shown.
       - Future: if you decide to show `google_fit` again, you can re‑add it.
   - In `HealthIntegrationList`, no change is needed; it just renders what it receives.

2. **Deprecate “Import Samsung history” in UI**
   - In `IntegrationsScreen`:
     - Remove or hide the “Import Samsung history” button and helper text for end‑users.
     - Optionally keep the handler (`importSamsungHistory`) wired only via a hidden debug entry point (e.g. dev‑only command) if you want a one‑off migration path.

3. **Preferred provider logic**
   - `preferredIntegrationId` is currently meaningful when several providers can be connected.
   - Once Android is Health Connect–only:
     - On Android, preferred provider is effectively always `health_connect` if connected.
     - The UI copy can be updated to reflect that:
       - Instead of “Reclaim prefers the first connected provider”, you can say “Reclaim reads from Health Connect on Android; enable your other apps as sources inside Health Connect.”

#### 4.2 Health Connect permissions expansion

Goal: **keep the existing request flow** but expand the **scope** of requested data types so that, once connected, Reclaim has access to *all* HC types you care about (ActiveCaloriesBurned, Nutrition, HRV, VO2 max, etc.), even if the app doesn’t immediately use all of them.

**Where to change:**

- `src/lib/health/healthConnectService.ts`
  - `HealthMetric` union (in `health/types.ts` – not shown in this doc, but currently includes sleep, steps, HR, etc.).
  - `METRIC_RECORD_MAP` mapping `HealthMetric` → `RecordType[]`.
  - `HEALTH_CONNECT_DEFAULT_METRICS` and `HEALTH_CONNECT_SLEEP_METRICS`.

**Plan:**

1. **Extend `HealthMetric` type** to cover:
   - Activity:
     - `active_calories_burned`, `total_calories_burned`, `distance`, `elevation_gained`, `floors_climbed`, `speed`, `steps_cadence`, `wheelchair_pushes`, `vo2_max`, `planned_exercise`, `exercise_session` (with types), `activity_intensity`, `power`.
   - Sleep:
     - Existing `sleep_analysis`, `sleep_stages` (already in place).
   - Vitals:
     - `blood_glucose`, `blood_pressure`, `body_temperature`, `oxygen_saturation`, `respiratory_rate`, `resting_heart_rate`, `heart_rate`, `heart_rate_variability`, `skin_temperature`.
   - Body measurements:
     - `weight`, `height`, `body_fat`, `lean_body_mass`, `basal_metabolic_rate`, `bone_mass`, `body_water_mass`.
   - Cycle tracking:
     - `basal_body_temperature`, `cervical_mucus`, `intermenstrual_bleeding`, `menstruation`, `ovulation_test`, `sexual_activity`.
   - Nutrition & hydration:
     - `nutrition`, `hydration`.
   - Well‑being:
     - `mindfulness_session`.

2. **Map each to Health Connect record types** in `METRIC_RECORD_MAP`:
   - Example:
     - `active_calories_burned` → `['ActiveCaloriesBurned']`
     - `total_calories_burned` → `['TotalCaloriesBurned']`
     - `distance` → `['Distance']`
     - `elevation_gained` → `['ElevationGained']`
     - `floors_climbed` → `['FloorsClimbed']`
     - `speed` → `['Speed']`
     - `steps_cadence` → `['StepsCadence']`
     - `wheelchair_pushes` → `['WheelchairPushes']`
     - `vo2_max` → `['Vo2Max']`
     - `planned_exercise` → `['PlannedExerciseSession']`
     - `activity_intensity` → `['ActivityIntensity']`
     - `power` → `['Power']`
     - Vitals / body / cycle / nutrition / mindfulness similarly aligned with the HC record names you listed.

3. **Update `HEALTH_CONNECT_DEFAULT_METRICS`**:
   - Replace the small fixed list with a **comprehensive metrics list** you actually want to request on connect.
   - For now, you can:
     - Include **all metrics** you intend to use within the next phases.
     - Leave extremely sensitive types (e.g. sexual activity, menstruation) out if you want a separate consent UX later.

4. **Keep `HEALTH_CONNECT_SLEEP_METRICS`**:
   - This list is used to validate “connected” status after connect (sleep is a hard requirement).
   - You can leave it as `['sleep_analysis', 'sleep_stages']` even if `HEALTH_CONNECT_DEFAULT_METRICS` is much larger.

5. **No change to `healthConnectRequestPermissions` flow:**
   - The only behavioural change is **more record types in the permission prompt**.
   - All existing safety guards (AppState = active, `requestingPermissions` flag, `initialize()` gating) stay intact.

#### 4.3 Sync logic: Health Connect as single Android upstream

**Target behaviour:**

- For **sleep**:
  - `sessionsByProvider` on Android should effectively be:
    ```ts
    [{ provider: 'health_connect', sessions: healthConnectGetSleepSessions(...) }]
    ```
  - The other providers (`google_fit`, `samsung_health`) should be present only if you deliberately want them, but the default path should ignore them.

**Changes:**

1. In the part of `syncHealthData` (not shown here) that builds `SleepPipelineInput`:
   - Remove or guard out reads from:
     - `googleFitGetSleepSessions`
     - Samsung Health provider functions.
   - Only include Health Connect on Android.
   - Keep Apple HealthKit intact for iOS.

2. In `sleepSyncPipeline.ts`:
   - Type union for `provider` can remain broader for now; health connect will simply be the only one used on Android.
   - Over time you could narrow it if you fully deprecate other providers.

3. For **activity/vitals** sync:
   - Ensure the code paths that ingest steps, calories, HR, HRV, etc. on Android use:
     - `healthConnectGetDailyActivity`
     - `healthConnectGetDailyVitals`
   - Remove or guard out direct Google Fit API ingestion from those flows on Android.

#### 4.4 UX to manage Health Connect sources (Google Fit, Samsung Health, etc.)

**Goal:**

- Reclaim should clearly tell users:
  - “We read from Health Connect only.”
  - “To include data from Google Fit, Samsung Health, etc., you must enable them as **sources inside Health Connect**.”

**Plan:**

1. On `IntegrationsScreen`:
   - In the Health Connect section:
     - Add a button such as **“Open Health Connect”** or **“Manage data sources in Health Connect”**.
   - Implementation:
     - If `getHealthConnectAvailability()` is not `'available'`, reuse existing “install/update Health Connect” messaging.
     - If `'available'`:
       - Launch the Health Connect app (via package name `com.google.android.apps.healthdata`) using an Intent.
       - If possible, deep‑link directly to Reclaim’s entry in the Health Connect permission UI (if the SDK/Android intents allow it in your version).

2. Copy changes:
   - Update the card copy to something like:
     - “Reclaim reads health data from **Health Connect**. To include Google Fit or Samsung Health, open Health Connect, enable those apps as data sources, and grant Reclaim permission to read them.”

---

### 5. Database & data modelling considerations (from our discussion)

From earlier database conversation, recommended approach:

- **Keep domain‑specific tables**:
  - `sleep_sessions` (health or manual logs)
  - `activity_daily` (steps, calories)
  - `vitals_daily` (HR, HRV, etc.)
  - `training_sessions` and related training tables
  - `mood_logs`, `med_logs`, etc.
- **Optionally add** a raw `health_connect_events` table:
  - Columns like: `id`, `user_id`, `provider`, `record_type`, `raw_payload JSONB`, `source_ts`, `ingested_at`.
  - Use it for debugging, backfills, and analytics, not for primary UI queries.

In terms of **source naming**:

- On Android:
  - Use `source = 'health_connect'` as the canonical upstream.
  - If you care about the underlying HC `origin` (Fit, Samsung, etc.), store that in **metadata** (JSON) fields on individual records rather than separate providers in the main tables.

---

### 6. Handover summary

If another engineer picks this up, the high‑level to‑do list is:

1. **UI / definitions**
   - Hide non‑Health‑Connect Android providers from the Integrations list.
   - Remove “Import Samsung history” from primary UI (or dev‑gate it).
   - Add “Open Health Connect / Manage sources” button + copy on the Health Connect card.

2. **Permissions**
   - Extend `HealthMetric` and `METRIC_RECORD_MAP` in `healthConnectService.ts` to support your full Health Connect metric list.
   - Expand `HEALTH_CONNECT_DEFAULT_METRICS` to include all metrics you want to authorize now.
   - Keep `HEALTH_CONNECT_SLEEP_METRICS` as the minimal set used to validate a “connected” state.

3. **Sync logic**
   - Make Android sleep/activity/vitals ingestion read only from Health Connect.
   - Stop feeding Google Fit / Samsung Health into `sessionsByProvider` and related pipelines on Android.

4. **Data model**
   - Keep domain tables separate by use‑case.
   - Optionally add a raw HC events table for debugging and backfills.

With these changes, Reclaim’s story becomes:

- **Android**: Reclaim reads from Health Connect, which aggregates Google Fit, Samsung Health, etc.  
- **iOS**: Reclaim reads from Apple Health.  
- Internally, data is normalized into domain‑specific tables with a consistent `source` and optional metadata describing the original origin.

