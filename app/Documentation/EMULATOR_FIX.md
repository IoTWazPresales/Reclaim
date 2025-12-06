# 🔧 Fix Emulator Not Rebuilding Issue

## Problem
When you run `npx expo start` and select the emulator, the app doesn't rebuild/connect.

## Solution

### ✅ CORRECT Workflow (This is the issue!)

**The emulator MUST be running BEFORE you start Expo!**

### Step-by-Step Fix:

#### 1. Start Android Emulator FIRST
1. Open **Android Studio**
2. Click **Tools** → **Device Manager** (or click the device icon in the toolbar)
3. Find your emulator and click the **Play ▶️ button** to start it
4. **Wait for it to fully boot** - you should see the Android home screen

#### 2. Verify Emulator is Connected
Open PowerShell in the `app` directory and run:
```powershell
adb devices
```

You should see:
```
List of devices attached
emulator-5554    device
```

If you see "offline" or nothing, see troubleshooting below.

#### 3. Start Expo (with cleared cache)
In PowerShell (still in `app` directory):
```powershell
npx expo start --clear
```

#### 4. When Metro is Ready
- Press **`a`** to open on Android emulator
- The app should automatically build and install if needed

---

## 🔨 Quick Fix Script

I've created helper scripts for you:

### Option 1: Fix Connection Issues
```powershell
cd app
.\fix-emulator.ps1
```

This will:
- Restart ADB server
- Check for connected devices
- Clear Expo cache

### Option 2: Start Everything (Recommended)
```powershell
cd app
.\start-emulator.ps1
```

This will:
- Check if emulator is running
- Wait for you to start it if needed
- Clear caches if requested
- Start Expo automatically

---

## 🐛 Troubleshooting

### Issue: "No devices found"

**Fix:**
```powershell
# Restart ADB server
adb kill-server
adb start-server
adb devices
```

If still no devices:
1. Make sure emulator is **fully booted** (home screen visible)
2. Restart the emulator from Android Studio
3. Try `adb devices` again

### Issue: Device shows "offline"

**Fix:**
```powershell
adb kill-server
adb start-server
adb devices
```

If still offline:
1. Close and restart the emulator
2. Run `adb devices` again

### Issue: Expo can't connect to emulator

**Fix:**
```powershell
cd app

# Clear all caches
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "node_modules\.cache" -ErrorAction SilentlyContinue

# Restart ADB
adb kill-server
adb start-server

# Start Expo with cleared cache
npx expo start --clear
```

### Issue: App doesn't install automatically

**Fix:**
```powershell
cd app

# Build and install manually
npx expo run:android
```

This will:
- Build the app
- Install it on the connected emulator
- Start Metro bundler
- Auto-reload on changes

---

## ⚡ Quick Commands Reference

```powershell
# Check connected devices
adb devices

# Restart ADB
adb kill-server; adb start-server

# Clear Expo cache and start
cd app
npx expo start --clear

# Build and install on emulator
cd app
npx expo run:android

# Uninstall app from emulator (if corrupted)
adb uninstall com.yourcompany.reclaim
```

---

## 📋 Correct Order of Operations

1. ✅ **Start Android Emulator** (from Android Studio)
2. ✅ **Wait for full boot** (home screen visible)
3. ✅ **Verify connection** (`adb devices` shows device)
4. ✅ **Start Expo** (`npx expo start --clear`)
5. ✅ **Press 'a'** when Metro is ready
6. ✅ **App installs and opens** automatically

---

## 💡 Pro Tips

- Always start the emulator **BEFORE** starting Expo
- Use `--clear` flag when having connection issues
- If the app is already installed, changes will hot-reload automatically
- If using a development build, use `npx expo start --dev-client` instead

---

## 🚨 Still Not Working?

Run the complete reset:

```powershell
cd app

# Kill all processes
taskkill /F /IM node.exe 2>$null
adb kill-server

# Clear everything
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "node_modules\.cache" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "android\.gradle" -ErrorAction SilentlyContinue

# Restart ADB
adb start-server

# Start emulator from Android Studio, then:
npx expo start --clear
```

Then press `a` when Metro is ready.

