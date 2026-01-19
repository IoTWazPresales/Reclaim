### Health Connect debug (Android)

This repo uses Expo prebuild/bare workflow. **`npx expo prebuild --clean` regenerates `app/android/**`**, so Health Connect wiring must be validated against the *generated* Android project.

### What the diagnostic script checks

- **Dependency drift**: declared `react-native-health-connect` version in `app/package.json` vs installed `node_modules` version.
- **Android 14+ permission contract**: whether `HealthConnectPermissionDelegate.kt` contains the SDK 34+ no-arg contract branch.
- **Rationale intent declarations**: scans `app/android/**/AndroidManifest.xml` for `androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE` and prints best-effort owning activity.

### Run the script

From repo root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\healthconnect-diagnose.ps1
```

### Logcat reproduction (permission UI exits)

```powershell
adb logcat -c
# (user action) tap Integrations -> Health Connect -> Connect once
adb logcat -d -v time | Select-String -SimpleMatch -Pattern `
  "E/PermissionsActivity", `
  "App should support rationale intent, finishing!", `
  "REQUEST_HEALTH_PERMISSIONS", `
  "HEALTH_CONNECT_NO_DIALOG_OR_UNAVAILABLE"
```


