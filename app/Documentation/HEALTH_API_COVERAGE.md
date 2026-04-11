# Health API / permission coverage (April 2026)

Single source of truth for **declared Android Health Connect permissions**, **runtime requests**, and **product use**. Google Fit has been **removed** from the app; Android health data flows through **Health Connect** only.

## Android — Health Connect

### Declared (`app/plugins/withHealthConnectPermissions.js` → manifest)

| Permission | Requested at connect (`HEALTH_CONNECT_DEFAULT_METRICS`) | Read in code | Stored / UI / triggers |
|------------|--------------------------------------------------------|--------------|-------------------------|
| `READ_SLEEP` | Yes | `SleepSession` | Supabase sleep rows, Sleep screen, dashboard |
| `READ_HEART_RATE` | Yes | `HeartRate` | Daily vitals, sleep enrichment, **HR spike nudges** (polling) |
| `READ_RESTING_HEART_RATE` | Yes | `RestingHeartRate` | `vitals_daily`, insights, spike gating context |
| `READ_HEART_RATE_VARIABILITY` | Yes | `HeartRateVariabilityRmssd` | `vitals_daily`, sleep metadata, Sleep recovery card |
| `READ_STEPS` | Yes | `Steps` | `activity_daily`, dashboard |
| `READ_ACTIVE_CALORIES_BURNED` | Yes | `ActiveCaloriesBurned` | Activity + **training session window** merge |
| `READ_TOTAL_CALORIES_BURNED` | Yes | `TotalCaloriesBurned` | Fallback when active calories sparse |
| `READ_OXYGEN_SATURATION` | Yes | `OxygenSaturation` | Sleep enrichment, overnight UI |
| `READ_RESPIRATORY_RATE` | Yes | `RespiratoryRate` | Sleep enrichment, overnight UI |
| `READ_BODY_TEMPERATURE` | Yes | `BodyTemperature` | Sleep enrichment, overnight UI |
| ~~`READ_EXERCISE`~~ | **Removed** | — | Was not requested at runtime; removed from manifest/plugin for Play alignment |

### Wellness nudges (Android)

- **HR spike:** `notificationTriggers` + `healthConnectSubscribeRecentHeartRate` + `fetchHeartRateContextSummary` + daily cooldown.
- **Calendar context:** `wellnessCalendarContextNudges` — only if **calendar read already granted** (`getEventsForDateRangeIfGranted`). Optional pre/post prompts for **heuristic “demanding”** titles. **Not** stress detection. Uses same notification intent path as HR triggers.

### iOS — HealthKit

Unchanged high-level model: Apple Health for sleep/activity/vitals sync; **no** reactive HR notification path in this build. Vitals daily upsert on sync uses `AppleHealthKitProvider` (not deprecated Fit shim).

## Historical data

Legacy Supabase rows may still carry `source: googlefit`. They are read-only history; new sync does not write Google Fit.

Update this file when adding HC record types or new screens tied to health permissions.
