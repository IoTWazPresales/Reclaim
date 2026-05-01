# Reclaim — phase implementation verification matrix

| phase | requirement | verdict | evidence | affected files | notes |
|---|---|---|---|---|---|
| 1 | HC coverage doc matches manifest/runtime truth | verified | `HEALTH_API_COVERAGE.md` matches `withHealthConnectPermissions.js` and `HEALTH_CONNECT_DEFAULT_METRICS` | `app/Documentation/HEALTH_API_COVERAGE.md`, `app/plugins/withHealthConnectPermissions.js`, `app/src/lib/health/healthConnectService.ts` | Source-of-truth alignment is good in this doc |
| 1 | Training history does not over-imply unsupported HC calories | verified | Text now says “from logged sessions” / “from session”, no HC branding | `app/src/components/training/TrainingHistoryView.tsx` | Requirement met without widening health scope |
| 1 | Ghost-session filter implemented | verified | `durationMins > 480` drop; `(exercisesCompleted === 0 && totalSets === 0)` drop | `app/src/components/training/TrainingHistoryView.tsx` | In-progress sessions still retained intentionally |
| 1 | Recovery/adaptation copy no longer overclaims | partial | Softened language observed in onboarding/recovery subtitle | `app/src/screens/onboarding/CapabilitiesScreen.tsx`, `app/src/components/dashboard/DashboardRecovery.tsx`, `app/src/screens/onboarding/WelcomeScreen.tsx` | Not a full-repo copy sweep; limited-surface verification |
| 2 | Home has one clear primary story | verified | Dashboard render order places `DashboardInsight` first, then `DashboardPrimaryAction`, with recovery later | `app/src/screens/Dashboard.tsx`, `app/src/components/dashboard/DashboardInsight.tsx` | Structure aligns with daily signal-first narrative |
| 2 | Recovery is support, not competing authority | verified | Recovery appears below Today and is phrased as guided support | `app/src/screens/Dashboard.tsx`, `app/src/components/dashboard/DashboardRecovery.tsx` | Product-level intent reflected in layout/copy |
| 2 | Onboarding promise aligns with Home | verified | Welcome/Capabilities reference daily signal and Home-first read | `app/src/screens/onboarding/WelcomeScreen.tsx`, `app/src/screens/onboarding/CapabilitiesScreen.tsx` | Consistent messaging across checked surfaces |
| 3 | `ACTIVITY_RECOGNITION` removed where required | verified | Absent from `app.config.ts` and main manifest | `app/app.config.ts`, `app/android/app/src/main/AndroidManifest.xml` | Native rebuild still required to ship this truth |
| 3 | Android posture does not over-imply unsupported interpretation | partial | Core HC doc is honest; two legacy docs still contain obsolete guidance | `app/Documentation/HEALTH_API_COVERAGE.md`, `app/Documentation/HEALTH_FIXES_SUMMARY.md`, `app/Documentation/HEALTH_INTEGRATION_DIAGNOSIS.md` | Internal trust/compliance process risk remains |
| 3 | Config/doc consistency around HC-only Android | partial | Primary doc aligned; secondary docs contradictory | same as above | Should be corrected or quarantined pre-submit |
| 4 | Tier 1 reviewer-visible issues fixed/absent/gated | partial | Checked items: Sleep roadmap absent, Meditation Spotify/dev copy absent, About debug gated, Meds test button absent | `app/src/screens/SleepScreen.tsx`, `app/src/screens/MeditationScreen.tsx`, `app/src/screens/AboutScreen.tsx`, `app/src/screens/MedsScreen.tsx` | Verified via targeted search, not full UX walkthrough |
| 4 | Intervention labels human-readable | verified | `formatInterventionLabel()` used in recent sessions list | `app/src/lib/mindfulness.ts`, `app/src/screens/MindfulnessScreen.tsx` | Covers aliases like `breath_478` and `urge_surfing` |
| 4 | Training session footer hierarchy sane | verified | Minimize/Done + primary Finish + demoted destructive cancel | `app/src/components/training/TrainingSessionView.tsx` | Matches intended accidental-loss mitigation |
| 4 | About debug actions dev-only | verified | “Test Sentry” wrapped in `{__DEV__ && ...}` | `app/src/screens/AboutScreen.tsx` | Release-safe in prod builds |
| 5 | Onboarding sleep connect triggers insight refresh | verified | `refreshInsights('onboarding-sleep-connect')` after sync/invalidation | `app/src/screens/onboarding/SleepStepScreen.tsx` | Call-path present in current code |
| 5 | Cache invalidation map reflects code reality | partial | Key lists match inspected dashboard/background flows | `docs/release/reclaim_cache_invalidation_map.md`, `app/src/screens/Dashboard.tsx`, `app/src/lib/backgroundSync.ts` | “Non-exhaustive” sections explicitly marked |
| 5 | `forceRescheduleNotifications` docs match behavior | verified | Authority doc description matches scheduler implementation (immediate, no debounce) and known call-sites | `docs/release/reclaim_authority_rules_v1.md`, `app/src/lib/notifications/NotificationScheduler.ts` | Documentation is accurate for checked paths |
| 5 | Garmin/Huawei copy is honest | verified | Integrations definitions and alert messages say not available in this release | `app/src/lib/health/integrations.ts` | No implied turnkey connectivity |

## Legend
- **verified**: confirmed directly in current repo files.
- **partial**: some evidence present, but full proof requires broader sweep/runtime/manual checks.
- **failed**: requirement contradicted by current repo.
- **manual**: cannot be proven in repo; requires console/device/process verification.
