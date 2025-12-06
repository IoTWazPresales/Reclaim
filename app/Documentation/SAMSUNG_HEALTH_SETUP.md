# Samsung Health Integration — Production Setup Guide

This guide covers obtaining Partner access, registering your app/signature, and wiring the Samsung Health SDK into this project. We’ve prepared code scaffolding so you only need to drop in credentials and native SDK pieces when approved.

## 1) Join Samsung Health Partner Program
- Apply at: https://developer.samsung.com/health
- Choose Health Data SDK (read access for steps, heart rate, sleep, etc.)
- Complete organization and app details; await approval

Deliverables you’ll receive/need:
- Partner approval for your app
- Any client keys or app ID (if applicable to selected SDK version)
- Confirmation of package name/signature registration requirements

## 2) Decide your Android signing keystore
- Use the same keystore for dev/preview and production or register both
- Extract SHA-1 and SHA-256 fingerprints:
  ```bash
  keytool -list -v -keystore your-release.keystore -alias your_alias
  ```
- Keep this keystore consistent across EAS builds so signature matches what’s registered with Samsung

## 3) Register your app package and signature with Samsung
- Package name: the Android applicationId
- Signatures: add SHA-1/SHA-256 from the keystore used by EAS
- Scopes/records: select the data types your app will read (sleep, steps, heart rate, etc.)

## 4) Add SDK dependency and native module
We’ve created an Expo config plugin scaffold: `app/plugins/withSamsungHealth.ts`.
This prepares manifest/query/permissions and adds placeholders in Gradle.

### Add plugin to app config
- In `app.json` or `app.config.ts`, include:
  ```json
  {
    "expo": {
      "plugins": [
        "./app/plugins/withSamsungHealth"
      ]
    }
  }
  ```

### Add Samsung Health SDK dependency (after approval)
- Open Android app module `build.gradle` (the plugin leaves a placeholder):
  ```gradle
  dependencies {
      // SAMSUNG_HEALTH_SDK
      implementation("com.samsung.android:health-data:VERSION")
  }
  ```
- Add repository if Samsung provides a private Maven repo (check partner docs)

### Create the native bridge (Android)
- Create a React Native native module `SamsungHealthModule` that wraps:
  - `isAvailable()`
  - `connect()` (requests consent/permissions via Samsung flows)
  - `readDailySteps(startMillis, endMillis)`
  - `readHeartRate(startMillis, endMillis)`
  - `readSleepSessions(startMillis, endMillis)`
- Expose it under `NativeModules.SamsungHealth`.

Expected JS usage (already implemented): `app/src/lib/health/providers/samsungHealth.ts` calls `NativeModules.SamsungHealth`.

## 5) EAS build
- Ensure the plugin is included (see step 4)
- Run:
  ```bash
  eas build -p android --profile preview
  ```
- Install on a Samsung device with Samsung Health installed and signed in

## 6) Verification
1. Open app → Sleep screen → Integrations → Connect Samsung Health
2. On first run, Samsung consent/authorization screens should appear
3. After granting, run “Run diagnostics” and verify:
   - Active: samsung_health
   - Permissions: granted
   - Sleep/HR/Steps reads return data

## 7) Troubleshooting
- If no consent screens appear:
  - Confirm package name/signatures match what Samsung registered
  - Ensure the keystore used by EAS matches the registered fingerprints
  - Confirm SDK dependency resolves (Gradle sync in CI) and native module loads
- If reads return empty:
  - Confirm data types are enabled for your app in partner console
  - Verify user has data in Samsung Health (and export permissions enabled)

## 8) iOS (not applicable)
Samsung Health is Android-only; on iOS use Apple HealthKit

---

Once you supply the approved SDK coordinates and ensure the keystore/signature matches, no additional UI changes are needed; the app will connect and read via the Samsung native bridge automatically.
