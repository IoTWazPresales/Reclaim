# ⚡ Quick Fix: App Stuck on Splash Screen at 100%

## Immediate Actions

### Step 1: Check Metro Bundler Terminal
**Look at the terminal where you ran `npx expo start`** - are there any:
- ❌ **RED error messages**?
- ⚠️ **YELLOW warnings** about missing modules or network errors?

### Step 2: Manually Reload the App

**On Emulator:**
1. Press **`Ctrl+M`** (Windows) or **`Cmd+M`** (Mac) to open developer menu
2. Select **"Reload"**

**Or via ADB:**
```powershell
# Force stop and restart the app
adb shell am force-stop com.yourcompany.reclaim
adb shell am start -n com.yourcompany.reclaim/.MainActivity
```

### Step 3: Check for Network/Config Issues

The app might be waiting for:
- **Supabase connection** (check `.env` file exists)
- **Network request** that's timing out

**Check `.env` file:**
```powershell
cd app
cat .env
# Or in PowerShell:
Get-Content .env
```

Should have:
```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

### Step 4: Nuclear Reset

```powershell
cd app

# Kill Metro
taskkill /F /IM node.exe 2>$null

# Clear all caches
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "node_modules\.cache" -ErrorAction SilentlyContinue

# Uninstall app
adb uninstall com.yourcompany.reclaim

# Restart fresh
npx expo start --clear
```

Then press `a` to reinstall.

---

## Most Likely Causes

### 1. Supabase Connection Hanging
**Check:** Is `.env` file configured?

**Fix:** Add timeout to Supabase queries in `RootNavigator.tsx`:
```typescript
// Add timeout to prevent hanging
const timeoutPromise = new Promise((_, reject) => 
  setTimeout(() => reject(new Error('Query timeout')), 5000)
);

Promise.race([
  supabase.from('profiles').select('has_onboarded')...,
  timeoutPromise
])
```

### 2. Async Initialization Never Completes
**Check:** Look at `RootNavigator.tsx` - the `checkOnboarding` function might be hanging

**Fix:** Add timeout or error handling

### 3. Network Request Blocking
**Check:** App trying to fetch data on startup that never responds

**Fix:** Add network error handling

---

## Debug: Check What's Happening

**In PowerShell (separate window):**
```powershell
# Watch for React Native errors
adb logcat | Select-String -Pattern "ReactNativeJS|ERROR|Exception" -Context 3
```

**Look for:**
- "ReactNativeJS" errors
- Network errors
- Timeout errors
- Missing module errors

---

## Quick Test: Disable Network Blocking

Temporarily modify `RootNavigator.tsx` to skip the Supabase query:

```typescript
// In checkOnboarding function, add early return:
if (true) { // Temporary bypass
  const local = await getHasOnboarded();
  setHasOnboardedState(local);
  setBooting(false);
  return;
}
```

If the app loads after this, the issue is the Supabase query hanging.

