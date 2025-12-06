# Emulator Troubleshooting Guide

## Problem: Emulator not rebuilding/connecting after `npx expo start`

This happens when the emulator isn't properly connected or the app isn't installed on the emulator.

## Solution Steps:

### Step 1: Start the Android Emulator FIRST
1. Open Android Studio
2. Go to **Tools** → **Device Manager** (or click the device manager icon)
3. Click the **Play** button next to your emulator to start it
4. Wait for the emulator to fully boot (home screen visible)

### Step 2: Verify ADB Connection
Open PowerShell in the `app` directory and run:
```powershell
adb devices
```

You should see something like:
```
List of devices attached
emulator-5554    device
```

If you see `offline` or nothing, the emulator isn't connected properly.

### Step 3: Clear Caches and Restart
```powershell
cd app

# Stop any running Metro bundler (Ctrl+C)

# Clear all caches
npx expo start --clear

# When Metro starts, press 'a' to open Android emulator
```

### Step 4: If App Still Doesn't Load

#### Option A: Install App Directly on Emulator
```powershell
cd app

# This will build and install the app on the connected emulator
npm run android

# OR with Expo
npx expo run:android
```

#### Option B: Manual Installation (if app is already built)
```powershell
# List all installed packages
adb shell pm list packages | grep reclaim

# If app exists, uninstall it first
adb uninstall com.yourcompany.reclaim

# Then rebuild and install
cd app
npx expo run:android
```

### Step 5: Fix ADB Connection Issues

If `adb devices` shows nothing or `offline`:

1. **Kill and restart ADB server:**
```powershell
adb kill-server
adb start-server
adb devices
```

2. **Check if emulator is using correct port:**
```powershell
# Check what port emulator is on
adb devices -l
```

3. **Restart the emulator:**
   - Close the emulator completely
   - Restart it from Android Studio
   - Run `adb devices` again

### Step 6: Complete Reset (Nuclear Option)

If nothing works:

```powershell
cd app

# Kill all Metro bundlers and ADB
taskkill /F /IM node.exe 2>$null
adb kill-server

# Clear all caches
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force android\.gradle -ErrorAction SilentlyContinue

# Start ADB fresh
adb start-server

# Start emulator from Android Studio FIRST, then:
npx expo start --clear

# Press 'a' when Metro is ready
```

## Quick Reference Commands

```powershell
# Check if emulator is connected
adb devices

# Restart ADB
adb kill-server && adb start-server

# Uninstall app from emulator
adb uninstall com.yourcompany.reclaim

# Clear Expo cache and start
npx expo start --clear

# Build and install on emulator
npx expo run:android
```

## Common Issues:

1. **"No devices found"** → Start emulator FIRST, then run `adb devices`
2. **"Offline" status** → Kill and restart ADB: `adb kill-server && adb start-server`
3. **App doesn't reload** → Make sure emulator is running BEFORE starting Expo
4. **Metro bundler can't connect** → Use `npx expo start --clear` and ensure emulator is on same network

## Recommended Workflow:

1. ✅ Start Android Emulator from Android Studio
2. ✅ Wait for emulator to fully boot
3. ✅ Verify with `adb devices` (should show `device` status)
4. ✅ In PowerShell: `cd app && npx expo start --clear`
5. ✅ When Metro is ready, press `a` for Android
6. ✅ App should install and launch automatically

## If Using Development Build:

If you're using a development build (not Expo Go):

```powershell
cd app

# First time: build and install
npx expo prebuild
npx expo run:android

# After that, just start Metro
npx expo start --dev-client
```

Then the app will reload automatically when you make changes.

