# Reclaim — release verification report

**Verification date:** 2026-04-20  
**Commit verified:** `c3c9792`  
**Scope:** Post-implementation verification for prelaunch Phases 1–5 only (no new feature work).

## Executive verdict

Repo state is **mostly sound for code-side prelaunch goals**, with passing type/lint/test checks and expected call paths present.  
Submission readiness is **not yet fully credible** until manual Play Console gates are completed, and two internal health docs are corrected or quarantined.

Overall status:
- **Repo readiness:** **Conditional pass** (code path + static safety good; internal doc consistency has important gaps).
- **Submission package readiness:** **Not ready yet** (manual Play/Data Safety/listing evidence still missing).

## Verification scope

Read and validated required files:
- `app/Documentation/HEALTH_API_COVERAGE.md`
- `app/src/components/training/TrainingHistoryView.tsx`
- `app/src/screens/onboarding/CapabilitiesScreen.tsx`
- `app/src/components/dashboard/DashboardRecovery.tsx`
- `app/src/screens/Dashboard.tsx`
- `app/src/components/dashboard/DashboardInsight.tsx`
- `app/src/components/InsightCard.tsx`
- `app/src/screens/onboarding/WelcomeScreen.tsx`
- `app/app.config.ts`
- `app/android/app/src/main/AndroidManifest.xml`
- `app/Documentation/HEALTH_FIXES_SUMMARY.md`
- `app/Documentation/HEALTH_INTEGRATION_DIAGNOSIS.md`
- `app/src/lib/mindfulness.ts`
- `app/src/screens/MindfulnessScreen.tsx`
- `app/src/components/training/TrainingSessionView.tsx`
- `app/src/screens/AboutScreen.tsx`
- `app/src/screens/onboarding/SleepStepScreen.tsx`
- `docs/release/reclaim_cache_invalidation_map.md`
- `docs/release/reclaim_authority_rules_v1.md`
- `app/src/lib/health/integrations.ts`

Also reviewed release/policy context docs requested by prompt, including launch definition, prelaunch plan/sequence/risk notes, architecture formalization docs, and Play readiness/trust/blocker docs.

## Commands/checks run (actual)

Executed in `c:\Reclaim\app`:
- `npm run typecheck` ? **pass** (exit 0)
- `npm run lint` ? **pass with warnings** (exit 0, 12 warnings, 0 errors)
- `npm run test` ? **pass** (exit 0, 37 files / 391 tests)
- `npx expo config --type public` ? **pass** (exit 0; config resolved with `versionCode: 8` and no `ACTIVITY_RECOGNITION`)

Observed non-failing warnings:
- ESLint unused-disable warnings in multiple files.
- Vitest deprecation warnings from `react-test-renderer` and stale `baseline-browser-mapping` data.

## Code/doc consistency vs implementation report

### Verified-good
- Phase 1 claims mostly match code:
  - HC coverage doc aligned to plugin/default metrics in `HEALTH_API_COVERAGE.md`.
  - Ghost-session filter present in `TrainingHistoryView.tsx` (`durationMins > 480`, `0 exercises && 0 sets`).
  - Training calorie copy neutralized (“from logged sessions” / “from session”), not HC-branded.
- Phase 2 claims match:
  - Dashboard order shows `DashboardInsight` before `DashboardPrimaryAction`, and `DashboardRecovery` below `DashboardToday`.
  - Onboarding copy in `WelcomeScreen.tsx`/`CapabilitiesScreen.tsx` aligns to daily signal framing.
- Phase 3 claims match:
  - `ACTIVITY_RECOGNITION` absent from `app.config.ts` and main `AndroidManifest.xml`.
- Phase 4 claims match:
  - About debug action is gated with `__DEV__`.
  - Mindfulness history uses `formatInterventionLabel()`.
  - Training footer hierarchy and wording updated (`Minimize`/`Finish session`/`Done`, demoted cancel).
- Phase 5 claims match:
  - Onboarding sleep connect path calls `refreshInsights('onboarding-sleep-connect')`.
  - `reclaim_cache_invalidation_map.md` exists and reflects key call sites.
  - `reclaim_authority_rules_v1.md` includes `forceRescheduleNotifications` section.
  - Garmin/Huawei copy in `integrations.ts` says “Not available in this release.”

### Verified-broken / inconsistent with report intent
- `app/Documentation/HEALTH_FIXES_SUMMARY.md` is still heavily legacy and internally contradictory:
  - Claims Samsung and Google Fit setup paths and OAuth steps as active guidance.
  - Contains outdated rebuild/test instructions tied to deprecated integration posture.
  - Conflicts with HC-only Android launch narrative.
- `app/Documentation/HEALTH_INTEGRATION_DIAGNOSIS.md` remains mostly a legacy diagnostic write-up:
  - Top-level sections still frame Google Fit/Samsung as active required setup.
  - Contains old “missing permissions” narrative incompatible with current minimum-scope strategy.

## Feature requirement re-check

### Phase 1
- HC coverage doc matches code truth: **Verified** (`HEALTH_API_COVERAGE.md` vs plugin/default metrics).
- Training history no longer over-implies HC calories: **Verified**.
- Ghost-session filter behavior: **Verified in code**.
- Recovery/adaptation copy overclaim reduction: **Partially verified** (onboarding and recovery subtitle are softened; not a full copy sweep of all app surfaces).

### Phase 2
- One clear primary Home story: **Verified in layout/copy order**.
- Recovery as support: **Verified in current Home composition**.
- Onboarding promise aligns with Home: **Verified (Welcome/Capabilities wording)**.
- Dashboard interactions still work: **Not fully runtime-verified** (static + code-path only).

### Phase 3
- `ACTIVITY_RECOGNITION` removed: **Verified**.
- Android avoids over-implying unsupported interpretation: **Partially verified** (core docs and key screens aligned; two legacy docs still muddy the story internally).
- HC-only Android posture reflected honestly: **Partial** (true in `HEALTH_API_COVERAGE.md`; contradicted by legacy diagnosis/fixes docs).

### Phase 4
- Tier 1 issues fixed/absent/gated: **Verified for listed items checked**.
- Intervention labels human-readable: **Verified**.
- Training footer sane: **Verified**.
- About debug items gated: **Verified**.

### Phase 5
- Onboarding sleep connect refreshes insights: **Verified**.
- Invalidation map matches code reality: **Mostly verified** (keys and flow match inspected call sites).
- `forceRescheduleNotifications` documentation matches current paths: **Verified**.
- Garmin/Huawei copy honest: **Verified**.

## Call-path / regression re-check

### Verified call paths
- Onboarding sleep connect path:
  `SleepStepScreen` connect -> `requestHealthSync('onboarding_sleep_connect')` -> invalidate sleep/dashboard keys -> `refreshInsights('onboarding-sleep-connect')`.
- Dashboard primary display path:
  `Dashboard` renders greeting -> `DashboardInsight` -> `DashboardPrimaryAction` -> context tiles -> `DashboardToday` -> `DashboardRecovery`.
- Training history filter path:
  `TrainingHistoryView.filteredSessions` drops >480m ended sessions and 0-ex/0-set summary sessions.
- Mindfulness label path:
  `MindfulnessScreen` history rows call `formatInterventionLabel(item.intervention)` from `lib/mindfulness.ts`.
- Training session footer path:
  `TrainingSessionView` primary finish action preserved; minimize/done and destructive cancel separation present.
- Notification doc path:
  `reclaim_authority_rules_v1.md` correctly describes `forceRescheduleNotifications` immediate behavior and call-site intent.

### Not fully verified (runtime/device-dependent)
- End-to-end UI behavior on device/emulator after all changes.
- Actual merged manifest in built AAB/APK (only source + Expo config verified).
- Notification scheduling runtime effects under OS conditions.

## Release blockers still remaining (repo + process)

### Critical
1. **Manual Play declaration/Data Safety evidence still missing in repo** (OQ-1 class risk).  
2. **Internal doc inconsistency**: `HEALTH_FIXES_SUMMARY.md` and `HEALTH_INTEGRATION_DIAGNOSIS.md` still present legacy Google Fit/Samsung guidance conflicting with launch posture.

### Important
1. No verified Console-side confirmation that versionCode/build track aligns with current repo posture (`versionCode 8` appears in config; submission parity still manual).
2. No manual proof bundle yet for listing copy/screenshots/privacy/support contact alignment.

### Non-blocking issues
- ESLint warnings (unused disable directives).
- Test/log warnings not failing suite.

## Manual verification required (not provable in repo)

- Play Console HC declaration rows exactly match shipped merged manifest.
- Data Safety entries match telemetry/Sentry/auth behavior.
- Listing text/screenshots match actual product claims and HC scope.
- Privacy policy URL + support contact reachability.
- Final AAB manifest diff and upload track parity.

## Phases 6–10 automated re-verify (2026-04-22)

**Commit verified:** `2ec48a7` (branch `reclaim/engineering-remediation-e1-e6`, includes Phase 6 baseline `36b0559` plus Phases 7–9).

Executed in `c:\Reclaim\app`:

- `npm run typecheck` — **pass**
- `npm run lint` — **pass** (warnings only; same class as prior report)
- `npm run test` — **pass** (38 files / 394 tests)

**Scope note:** This pass validates training setup/preview surfaces, notification reconcile permission behavior, mood sleep query freshness, and dashboard tile/hypnogram changes. It does **not** replace device-level notification or Health Connect verification.

## Conclusion

- **Repo readiness for native rebuild:** **Yes** (code compiles/tests pass; config resolves).
- **Submission-package readiness:** **No, not yet** until manual Console tasks are completed and legacy conflicting docs are resolved or quarantined.

