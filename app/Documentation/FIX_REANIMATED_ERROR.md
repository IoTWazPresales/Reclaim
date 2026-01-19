# 🔧 Fix ReanimatedModule Error

## Problem
```
runtime not ready error: Exception in HostObject::get prop 'ReanimatedModule':
java.lang.NullPointerException
```

This error means `react-native-reanimated` native module isn't properly initialized.

## Solution

### Step 1: Fixed Import Order ✅
I've already fixed the import order in `App.tsx` - `react-native-reanimated` must be imported FIRST.

### Step 2: Rebuild Native App (REQUIRED)

Since Reanimated is a native module, you **MUST rebuild** the native Android app:

```powershell
cd app

# Option A: Quick rebuild (Recommended)
npx expo run:android

# Option B: Full clean rebuild
npx expo prebuild --clean
npx expo run:android
```

**DO NOT just reload the app!** The native module needs to be rebuilt.

### Step 3: If Still Not Working - Nuclear Option

```powershell
cd app

# Kill Metro
taskkill /F /IM node.exe 2>$null

# Clean build
cd android
.\gradlew clean
cd ..

# Clean caches
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "node_modules\.cache" -ErrorAction SilentlyContinue

# Uninstall app from emulator
adb uninstall com.fissioncorporation.reclaim

# Rebuild everything
npx expo prebuild --clean
npx expo run:android
```

---

## Why This Happens

Reanimated is a **native module** that requires:
1. ✅ Babel plugin configured (`babel.config.js`) - Already done
2. ✅ Import order correct (`App.tsx`) - Just fixed
3. ❌ Native code rebuilt - **You need to do this now**

The error happens because:
- Reanimated's native module isn't linked properly
- Native code wasn't rebuilt after Reanimated was added
- Using `npx expo start` alone won't fix it - you need `expo run:android`

---

## Quick Fix

**Run this now:**

```powershell
cd app
npx expo run:android
```

This will:
1. Build the native Android app
2. Install it on the emulator
3. Start Metro bundler automatically

**Then the app should work!**

---

## Verification

After rebuilding, check:
- ✅ No ReanimatedModule errors in logcat
- ✅ App loads past splash screen
- ✅ Animations work (if you're using any Reanimated features)

---

## Notes

- **Always use `npx expo run:android`** when adding/changing native modules
- **Never just reload** after changing native dependencies
- Reanimated requires native rebuild, not just Metro reload

