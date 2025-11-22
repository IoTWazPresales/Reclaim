# 🔧 Fix App Stuck on Splash Screen at 100% Bundling

## Problem
App is stuck on splash screen with "Bundling" showing 100.0% but never loads.

## Quick Fixes (Try in Order)

### Fix 1: Restart Metro with Clean Cache
```powershell
cd app

# Stop Metro (Ctrl+C if running)

# Clear all caches
npx expo start --clear
```

Then:
- When Metro is ready, press `a` again
- Or shake the device/emulator and select "Reload"

### Fix 2: Check for JavaScript Errors

**In PowerShell (separate window):**
```powershell
adb logcat | Select-String -Pattern "ReactNative|JS|Error|Exception" -Context 2
```

Look for red error messages. Common issues:
- Syntax errors
- Missing imports
- API connection errors
- Missing environment variables

### Fix 3: Reload the App Manually

**On Emulator:**
1. Press `Ctrl+M` (Windows) or `Cmd+M` (Mac) to open developer menu
2. Select **"Reload"**

**Or via ADB:**
```powershell
adb shell input keyevent 82  # Opens dev menu
# Then select "Reload" with mouse
```

**Or directly:**
```powershell
adb shell am broadcast -a com.yourcompany.reclaim.RELOAD
```

### Fix 4: Check Console Logs in Metro

Look at the Metro bundler terminal output. If you see:
- ❌ Red error messages
- ⚠️ Yellow warnings about missing modules
- 🔴 Network errors

These will tell you what's wrong.

### Fix 5: Nuclear Reset

```powershell
cd app

# Kill everything
taskkill /F /IM node.exe 2>$null
adb kill-server

# Clear all caches
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "node_modules\.cache" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "android\.gradle" -ErrorAction SilentlyContinue

# Restart ADB
adb start-server

# Uninstall app from emulator
adb uninstall com.yourcompany.reclaim

# Start fresh
npx expo start --clear
```

Then press `a` to reinstall on emulator.

---

## Common Causes & Solutions

### Cause 1: JavaScript Error on App Start

**Check:** Look at Metro terminal for errors

**Fix:** Fix the JavaScript error. Common issues:
- Missing imports
- Syntax errors
- API calls failing
- Missing environment variables

### Cause 2: Network Timeout

**Check:** App trying to connect to Supabase/API on startup

**Fix:** 
- Check `.env` file has correct values
- Check network connection
- Add error handling for network failures

### Cause 3: Async Initialization Never Completes

**Check:** App waiting for something that never resolves

**Fix:** Add timeouts to async operations:
```typescript
// In App.tsx or similar
useEffect(() => {
  const timeout = setTimeout(() => {
    console.warn('Initialization timeout');
    // Fallback behavior
  }, 10000); // 10 second timeout
  
  // Your async init code
  
  return () => clearTimeout(timeout);
}, []);
```

### Cause 4: Expo Updates Issue

**Check:** App trying to check for updates on startup

**Fix:** Disable updates temporarily:
```typescript
// In app.json or app.config.ts
{
  "updates": {
    "enabled": false
  }
}
```

### Cause 5: Background Task Blocking

**Check:** Background task preventing app from mounting

**Fix:** Check `backgroundSync.ts` or any background tasks that might be blocking.

---

## Debug Commands

```powershell
# Watch for React Native errors
adb logcat | Select-String -Pattern "ReactNative|JS|Error" -Context 5

# Check Metro bundler output
# (Look at the terminal where you ran `npx expo start`)

# Clear app data and reinstall
adb shell pm clear com.yourcompany.reclaim
adb uninstall com.yourcompany.reclaim

# Rebuild and reinstall
cd app
npx expo run:android
```

---

## Quick Diagnostic

Run this to see what's happening:

```powershell
# Terminal 1: Watch logs
adb logcat | Select-String -Pattern "ReactNative|Error|Exception" -Context 3

# Terminal 2: Check Metro
# Look at the terminal where Metro is running
# Check for errors, warnings, or network issues

# Terminal 3: Try reloading
adb shell input keyevent 82  # Open dev menu
```

---

## Most Likely Issue

**90% of the time**, the app is stuck because:

1. **JavaScript error on startup** - Check Metro terminal for red errors
2. **Network request hanging** - Check for API calls in App.tsx or AuthProvider
3. **Missing environment variable** - Check `.env` file

**Check these first:**
1. Look at Metro bundler terminal - are there red errors?
2. Check `App.tsx` - does it have error handling?
3. Check network requests - are they timing out?
4. Check environment variables - is `.env` configured?

---

## If Nothing Works

1. **Check Metro terminal** for the actual error
2. **Check `adb logcat`** for native errors
3. **Try a fresh install**: `adb uninstall com.yourcompany.reclaim` then rebuild
4. **Check recent code changes** - did you add something that blocks startup?

