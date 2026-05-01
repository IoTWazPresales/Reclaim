# Reclaim — static and runtime sanity check

## Commands run

Executed from `c:\Reclaim\app`:

1. `npm run typecheck`
- Result: **pass** (exit 0)
- Command: `tsc --noEmit`

2. `npm run lint`
- Result: **pass with warnings** (exit 0)
- Command: `eslint --ext .ts,.tsx,.js src App.tsx`
- Output summary: **0 errors, 12 warnings** (unused eslint-disable directives)
- Additional warning: Node module type warning for `eslint.config.js` parsing mode.

3. `npm run test`
- Result: **pass** (exit 0)
- Command: `vitest run`
- Output summary: **37 test files passed, 391 tests passed**
- Non-failing stderr/stdout noise observed:
  - expected integrationStore corrupt-JSON handling log in test
  - `react-test-renderer` deprecation warning
  - stale `baseline-browser-mapping` update hint

4. `npx expo config --type public`
- Result: **pass** (exit 0)
- Config sanity points:
  - Android `versionCode: 8`
  - Android permissions list does **not** include `ACTIVITY_RECOGNITION`
  - Health Connect config plugins present

## Config sanity findings

### Verified good
- `app/app.config.ts` Android permission list excludes `ACTIVITY_RECOGNITION`.
- `app/android/app/src/main/AndroidManifest.xml` includes HC reads (`READ_SLEEP`, `READ_HEART_RATE`, `READ_OXYGEN_SATURATION`, `READ_RESPIRATORY_RATE`, `READ_BODY_TEMPERATURE`) and excludes `ACTIVITY_RECOGNITION`.
- `withHealthConnectPermissions.js` permission list matches HC coverage doc.

### Findings needing action
- `HEALTH_FIXES_SUMMARY.md` and `HEALTH_INTEGRATION_DIAGNOSIS.md` still include legacy guidance inconsistent with current HC-only Android release posture.

## Likely runtime-sensitive areas not fully executable in this pass

The following were **not fully verified** because they require device/runtime or Play Console state:
- Merged manifest truth in shipped AAB/APK (vs source tree manifest).
- Real permission dialogs and post-connect behavior on Android 13/14 devices.
- Notification behavior under background/Doze/device OEM constraints.
- Full Home UX behavior after onboarding on physical devices.
- Play Console declaration/Data Safety/listing alignment.

## Manual smoke-test recommendations (pre-submit)

1. Android fresh install:
- Connect Health Connect from onboarding sleep step.
- Confirm sleep sync writes expected data and Home daily signal refreshes immediately.

2. Dashboard:
- Confirm `Daily signal` appears as primary story on first Home view.
- Confirm Recovery card appears as support and CTA navigates correctly.

3. Training:
- Confirm ghost/invalid sessions do not appear in History.
- Confirm footer behavior in active training session: Minimize vs Finish vs Cancel.

4. Mindfulness:
- Confirm history renders readable intervention names (no raw IDs).

5. About:
- Confirm “Test Sentry” does not appear in production build.

6. Notifications:
- Toggle reminder settings that use `forceRescheduleNotifications`; verify schedules are rebuilt without duplicate/stray notifications.

7. Release package:
- Build new native artifact after permission/config changes and diff merged manifest before upload.
