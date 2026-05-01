# Health API / permission coverage (April 2026)

**⚠️ Do not paste this table into Google Play Console without diffing against the built APK’s merged manifest.** Use `app/plugins/withHealthConnectPermissions.js` as the **declared Android HC permissions** source of truth and `HEALTH_CONNECT_DEFAULT_METRICS` in `app/src/lib/health/healthConnectService.ts` as the **default runtime request** bundle.

Google Fit has been **removed** from the app; Android health data flows through **Health Connect** only.

**`ACTIVITY_RECOGNITION`** is **not** declared in `app.config.ts` or the app manifest. Health Connect read paths do not require it; step-based insights only evaluate when step context exists in the engine (no fabricated zeros).

---

## Android — Health Connect (Play minimum scope — current code)

### Declared in manifest (`app/plugins/withHealthConnectPermissions.js`)

These XML permissions are the only Health Connect **read** permissions injected for Android:

| Manifest permission | Maps to HC / usage |
|---------------------|---------------------|
| `android.permission.health.READ_SLEEP` | Sleep sessions / stages — core import |
| `android.permission.health.READ_HEART_RATE` | HR samples — sleep enrichment, optional mindfulness spike path |
| `android.permission.health.READ_OXYGEN_SATURATION` | Overnight SpO₂ — sleep UI |
| `android.permission.health.READ_RESPIRATORY_RATE` | Respiratory rate — sleep UI |
| `android.permission.health.READ_BODY_TEMPERATURE` | Body/skin temperature — sleep UI |

**Not declared** in the plugin (intentionally, for minimum-scope Play alignment): e.g. steps-only, active calories, total calories, resting HR, HRV as standalone HC reads — see release/policy docs.

### Requested at default connect (`HEALTH_CONNECT_DEFAULT_METRICS` in `healthConnectService.ts`)

Runtime permission requests use this metric list (must stay aligned with policy):

| Metric keys in JS | Typical records | Product use |
|-------------------|-----------------|-------------|
| `sleep_analysis`, `sleep_stages` | `SleepSession` | Supabase sleep rows, Sleep screen, dashboard |
| `heart_rate` | `HeartRate` | Sleep enrichment, **HR spike nudges** (polling) via `notificationTriggers` |
| `oxygen_saturation` | `OxygenSaturation` | Sleep enrichment, overnight UI |
| `respiratory_rate` | `RespiratoryRate` | Sleep enrichment, overnight UI |
| `body_temperature` | `BodyTemperature` | Sleep enrichment, overnight UI |

### Code paths that reference additional record types (not in default Android bundle)

`METRIC_RECORD_MAP` and sync helpers in `healthConnectService.ts` may still map types such as `RestingHeartRate`, `ActiveCaloriesBurned`, etc. for **conditional** reads if permissions were granted in **other** builds or **manual** grants — the **shipping** Android connect flow uses **`HEALTH_CONNECT_DEFAULT_METRICS`** only. Do **not** document those as “requested at connect” for this product slice without changing the manifest and defaults together.

### Wellness nudges (Android)

- **HR spike:** `notificationTriggers` + `healthConnectSubscribeRecentHeartRate` + `fetchHeartRateContextSummary` + daily cooldown.
- **Calendar context:** `wellnessCalendarContextNudges` — only if **calendar read already granted** (`getEventsForDateRangeIfGranted`). Optional pre/post prompts for **heuristic “demanding”** titles. **Not** stress detection. Uses same notification intent path as HR triggers.

### iOS — HealthKit

Apple Health for sleep / activity / vitals sync where enabled; **no** reactive HR notification path in this build. Vitals daily upsert uses `AppleHealthKitProvider` (not deprecated Fit shim).

---

## Historical data

Legacy Supabase rows may still carry `source: googlefit`. They are read-only history; new sync does not write Google Fit.

**When to update this file:** Any change to `withHealthConnectPermissions.js`, `HEALTH_CONNECT_DEFAULT_METRICS`, or new screens tied to health permissions.
