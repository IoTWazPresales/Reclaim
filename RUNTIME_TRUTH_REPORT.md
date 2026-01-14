# RUNTIME TRUTH REPORT

**Generated**: 2025-01-XX  
**Purpose**: Determine exactly which code is running on the phone right now

---

## BUILD TYPE IDENTIFICATION

### EAS Configuration
- **File**: `app/eas.json`
- **Profiles Available**:
  - `development`: channel `development`, distribution `internal`, dev client enabled
  - `preview`: channel `preview`, distribution `internal`, APK build
  - `production`: channel `production`, distribution `store`, app-bundle build
  - `production-apk`: channel `production`, distribution `internal`, APK build
  - `preview-ios`: channel `preview`, distribution `internal`
  - `production-ios`: channel `production`, distribution `store`

### OTA Updates Status
- **File**: `app/app.config.ts` (line 91)
- **OTA Enabled**: YES
  - Updates URL: `https://u.expo.dev/${EAS_PROJECT_ID}`
  - Project ID: `d053ca52-e860-4241-822b-8f821974f884`
  - Runtime Version: `1.0.2` (line 16)
  - App Version: `1.0.2` (line 13)

**IMPORTANT**: OTA updates can override local code. The actual runtime code may differ from the source code if an OTA update has been applied.

### Channel / RuntimeVersion in Use
- **Runtime Version**: `1.0.2` (hardcoded in `app.config.ts`)
- **Channel**: Depends on EAS build profile used
- **UNKNOWN**: Which profile was used for the current device build (requires checking device logs or EAS build history)

---

## ENTRY POINT TRACE

### App.tsx Path
- **File**: `app/App.tsx`
- **Status**: ✅ CONFIRMED BUNDLED
  - Entry point: `App.tsx` (line 514: `export default function App()`)
  - Imports `RootNavigator` from `@/routing/RootNavigator` (line 22)
  - Wrapped in `QueryClientProvider`, `PaperProvider`, `ErrorBoundary`, `SafeAreaProvider`, `AuthProvider`, `InsightsProvider`

### Router Entry
- **File**: `app/src/routing/RootNavigator.tsx`
- **Status**: ✅ CONFIRMED BUNDLED
  - Renders `AppNavigator` when `hasOnboarded === true` (line 175)
  - Renders `OnboardingNavigator` when `hasOnboarded === false` (line 177-179)
  - Uses `NavigationContainer` with deep linking config (line 168)

### Training Screens Import Chain
- **File**: `app/src/routing/AppNavigator.tsx`
- **Status**: ✅ CONFIRMED BUNDLED
  - Imports `TrainingScreen` from `@/screens/TrainingScreen` (line 18)
  - Registers as drawer screen (line ~200+)
- **File**: `app/src/screens/TrainingScreen.tsx`
- **Status**: ✅ CONFIRMED BUNDLED
  - Imports `TrainingSetupScreen` from `./training/TrainingSetupScreen` (line 21)
  - Imports `TrainingSessionView` from `@/components/training/TrainingSessionView` (line 24)
  - Conditional rendering based on `showSetup`, `activeSessionId`, and query states

---

## RUNTIME MARKERS (TEMPORARY - DO NOT COMMIT)

**NOTE**: These markers should be added temporarily to verify execution on device. They are NOT in the current codebase.

### Recommended Markers

1. **App.tsx** (line ~514, inside `App()` function):
   ```typescript
   console.warn('__RUNTIME_CHECK__ file:App.tsx line:514');
   ```

2. **AppNavigator.tsx** (line ~100, inside `CustomDrawerContent` or main component):
   ```typescript
   console.warn('__RUNTIME_CHECK__ file:AppNavigator.tsx line:100');
   ```

3. **TrainingScreen.tsx** (line ~63, inside `TrainingScreen()` function):
   ```typescript
   console.warn('__RUNTIME_CHECK__ file:TrainingScreen.tsx line:63');
   ```

4. **TrainingSessionView.tsx** (line ~58, inside `TrainingSessionView()` function):
   ```typescript
   console.warn('__RUNTIME_CHECK__ file:TrainingSessionView.tsx line:58');
   ```

### Verification Instructions
1. Add markers to the 4 files above
2. Build app with EAS (or run in dev)
3. Open app and navigate to Training screen
4. Check device logs for `__RUNTIME_CHECK__` messages
5. **Report**: Which markers appear, which do not
6. **Remove markers** before committing

---

## FILES EXECUTION STATUS

### ✅ CONFIRMED EXECUTED (Based on Import Chain)
- `app/App.tsx` - Root entry point
- `app/src/routing/RootNavigator.tsx` - Navigation root
- `app/src/routing/AppNavigator.tsx` - Drawer navigator
- `app/src/screens/TrainingScreen.tsx` - Training module entry
- `app/src/screens/training/TrainingSetupScreen.tsx` - Setup wizard (conditional)
- `app/src/components/training/TrainingSessionView.tsx` - Session execution (conditional)

### ⚠️ CONDITIONALLY EXECUTED
- `TrainingSetupScreen.tsx`: Only when `showSetup === true` in `TrainingScreen`
- `TrainingSessionView.tsx`: Only when `activeSessionId !== null` and `activeSessionQ.data` exists

### ❓ UNKNOWN (Requires Runtime Verification)
- Whether OTA updates have modified any of these files
- Whether all code paths are actually executed (some may be dead code)
- Whether conditional branches are taken as expected

---

## OTA OVERRIDE DETECTION

### How to Detect OTA Override
1. **Check device logs** for `expo-updates` messages
2. **Compare bundle hash** (if available in logs)
3. **Check EAS Updates dashboard** for published updates
4. **Verify runtime version** matches `app.config.ts` (1.0.2)

### Current OTA Risk
- **HIGH**: OTA is enabled and can override local code
- **UNKNOWN**: Whether any OTA updates have been published to the active channel
- **RECOMMENDATION**: Check EAS Updates dashboard and device logs to confirm

---

## SUMMARY

### What We Know
- ✅ Entry point chain is clear: `App.tsx` → `RootNavigator` → `AppNavigator` → `TrainingScreen`
- ✅ OTA updates are enabled and can override code
- ✅ Training screens are conditionally rendered based on state

### What We Don't Know
- ❓ Which EAS build profile was used for the device
- ❓ Whether OTA updates have been applied
- ❓ Which code paths are actually executed at runtime
- ❓ Whether all imports resolve correctly on device

### Next Steps
1. Add temporary runtime markers (see above)
2. Build and test on device
3. Check logs for marker appearance
4. Verify OTA status in EAS dashboard
5. Report findings

---

**END OF REPORT**
