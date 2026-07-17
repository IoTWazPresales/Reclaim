# Health API / permission coverage (July 2026 refresh)

**⚠️ Do not paste this table into Google Play Console without diffing against the built APK’s merged manifest.** Use `app/plugins/withHealthConnectPermissions.js` as the **declared Android HC permissions** source of truth and `HEALTH_CONNECT_DEFAULT_METRICS` in `app/src/lib/health/healthConnectService.ts` as the **default runtime request** bundle.

Google Fit has been **removed** from the app; Android health data flows through **Health Connect** only.

**`ACTIVITY_RECOGNITION`** is **not** declared in `app.config.ts` (as of 2026-07-17).

---

## Android — Health Connect (current code)

### Declared in manifest (`app/plugins/withHealthConnectPermissions.js`)

| Manifest permission | Maps to HC / usage |
|---------------------|---------------------|
| `android.permission.health.READ_SLEEP` | Sleep sessions / stages — core import |
| `android.permission.health.READ_HEART_RATE` | HR samples — sleep enrichment, optional mindfulness spike path, overnight proxy for elevated-HR baseline |
| `android.permission.health.READ_OXYGEN_SATURATION` | Overnight SpO₂ — sleep UI |
| `android.permission.health.READ_RESPIRATORY_RATE` | Respiratory rate — sleep UI |
| `android.permission.health.READ_BODY_TEMPERATURE` | Body/skin temperature — sleep UI |
| `android.permission.health.READ_STEPS` | **Inactivity gate only** before HR breathing nudge (not a step tracker) |
| `android.permission.health.READ_ACTIVE_CALORIES_BURNED` | Post-session / window read-back for training finish kcal |
| `android.permission.health.WRITE_EXERCISE` | Write ExerciseSession for completed training |

**Intentionally not declared:** RestingHeartRate, HRV, TotalCaloriesBurned as HC reads.

### Requested at default connect (`HEALTH_CONNECT_DEFAULT_METRICS`)

| Metric keys in JS | Typical records | Product use |
|-------------------|-----------------|-------------|
| `sleep_analysis`, `sleep_stages` | `SleepSession` | Sleep rows, Sleep screen, dashboard |
| `heart_rate` | `HeartRate` | Sleep enrichment, HR spike nudges |
| `oxygen_saturation` | `OxygenSaturation` | Overnight UI |
| `respiratory_rate` | `RespiratoryRate` | Overnight UI |
| `body_temperature` | `BodyTemperature` | Overnight UI |

### Feature-path requests (not in default connect)

| Metric / record | When requested | Code |
|-----------------|----------------|------|
| `steps` / `Steps` | HR nudge inactivity check | `notificationTriggers` → `healthConnectGetRecentStepsCount` |
| `active_energy` / `ActiveCaloriesBurned` | Training session start / finish window | `exerciseSessionWriter`, session kcal helpers |

Manifest declares these even when default connect does not — **Play declaration must still list them** if the plugin ships.

### Wellness nudges (Android)

- **HR spike:** `notificationTriggers` + sustained HR vs baseline + steps inactivity gate + cooldown / quiet hours.
- **Calendar context:** optional, only if calendar already granted — not stress detection.

### iOS — HealthKit

Apple Health for sleep / activity / vitals where enabled; broader metric list possible on iOS connect path. No reactive Android-style HC step gate on iOS.

---

## Historical data

Legacy Supabase rows may still carry `source: googlefit`. Read-only history; new sync does not write Google Fit.

**When to update this file:** Any change to `withHealthConnectPermissions.js`, `HEALTH_CONNECT_DEFAULT_METRICS`, or new screens tied to health permissions.

**Play companion:** `docs/release/reclaim_play_readiness_audit.md`, `docs/release/reclaim_play_blocker_matrix.md`.
