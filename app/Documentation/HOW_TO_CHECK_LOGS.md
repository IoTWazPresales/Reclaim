# How to Check Logs

## Where Logs Appear

### 1. Metro Bundler Terminal (Main Location) ⭐

**Where**: The terminal where you ran `npx expo start`

**What you'll see**:
- All `console.log()`, `console.warn()`, `console.error()` messages
- React Native errors
- Our debug messages (calendar, sleep sync, etc.)

**Example**:
```
LOG [Reclaim DEBUG] Calendar module loaded successfully
LOG [Reclaim DEBUG] Found 3 calendars
LOG [Reclaim DEBUG] Retrieved 5 events for today
LOG [Reclaim DEBUG] === syncHealthData START ===
LOG [Reclaim DEBUG] Has permissions: true
LOG [Reclaim DEBUG] Latest sleep: { hasStartTime: true, hasEndTime: true, ... }
LOG [Reclaim DEBUG] ✅ Sleep session saved successfully
```

**How to see more**:
- Scroll up in the terminal to see older logs
- The logs appear in real-time as the app runs

---

### 2. Android Logcat (Device Logs)

**When to use**: If Metro bundler doesn't show everything, or for native module errors

**How to access**:

**Option A: Using ADB (if phone connected via USB)**
```powershell
# Connect phone via USB first
adb logcat | findstr "Reclaim"
```

**Option B: Using Android Studio**
1. Open Android Studio
2. Connect phone via USB
3. Go to **View** → **Tool Windows** → **Logcat**
4. Filter by package: `com.fissioncorporation.reclaim`

**Option C: Using Expo CLI**
```powershell
npx expo start
# Then press 'm' to open menu
# Select "Open Android" or use adb logcat
```

**What you'll see**:
- Native Android logs
- Reanimated errors
- Permission denials
- Native module initialization

---

### 3. React Native Debugger (Browser Console)

**When to use**: For detailed JavaScript debugging

**How to enable**:
1. Shake your phone (or press `Ctrl+M` in emulator)
2. Tap **"Debug"** or **"Open Debugger"**
3. Chrome DevTools opens in browser
4. Go to **Console** tab

**What you'll see**:
- All console.log/warn/error messages
- React component errors
- Network requests
- Can set breakpoints and inspect variables

**Note**: This only works when connected to dev server (QR code scanned)

---

### 4. In-App Console (Remote JS Debugging)

**How to enable**:
1. Shake phone (or `Ctrl+M` in emulator)
2. Tap **"Debug"**
3. Chrome DevTools opens
4. Check **Console** tab

**Alternative**: Use React Native Debugger app (separate download)

---

## Quick Guide: Where to Look

### For Calendar Issues
**Check**: Metro bundler terminal
**Look for**:
```
LOG [Reclaim DEBUG] Calendar permissions not granted, requesting...
LOG [Reclaim DEBUG] Calendar permissions granted
LOG [Reclaim DEBUG] Calendar module loaded successfully
LOG [Reclaim DEBUG] Found X calendars
LOG [Reclaim DEBUG] Retrieved X events for today
WARN CalendarCard error: [error details]
```

### For Sleep Sync Issues
**Check**: Metro bundler terminal
**Look for**:
```
LOG [Reclaim DEBUG] === syncHealthData START ===
LOG [Reclaim DEBUG] Health service available
LOG [Reclaim DEBUG] Has permissions: true/false
LOG [Reclaim DEBUG] Latest sleep: { ... }
LOG [Reclaim DEBUG] ✅ Sleep session saved successfully
WARN ⚠️ SYNC BLOCKED: Health permissions not granted
ERROR ❌ FAILED TO SAVE: [error details]
```

### For Reanimated Errors
**Check**: Metro bundler terminal OR Android logcat
**Look for**:
```
ERROR Runtime not ready exception in host object get for prop reanimated module
ERROR Exception in HostObject::get prop 'ReanimatedModule'
```

---

## Step-by-Step: Check Logs Right Now

### Step 1: Open Metro Bundler Terminal
The terminal where you ran:
```powershell
npx expo start
```

### Step 2: Look for Debug Messages
Scroll through the terminal output. You should see messages like:
- `[Reclaim DEBUG]` - Our custom debug messages
- `LOG` - General log messages
- `WARN` - Warnings
- `ERROR` - Errors

### Step 3: Filter Logs (Optional)
If there are too many logs, you can filter:

**In PowerShell**:
```powershell
# Run expo start and pipe to findstr
npx expo start | findstr "Reclaim\|syncHealthData\|Calendar\|Reanimated"
```

**Or use grep if available**:
```powershell
npx expo start | Select-String -Pattern "Reclaim|syncHealthData|Calendar"
```

### Step 4: Trigger Actions to Generate Logs

**For Calendar**:
1. Open Dashboard (where CalendarCard is shown)
2. Check terminal for calendar-related logs

**For Sleep Sync**:
1. Go to Dashboard
2. Pull to refresh (or tap sync button if available)
3. Check terminal for `syncHealthData` logs

**For Reanimated**:
1. Open app
2. Wait 2 seconds
3. Scan QR code
4. Check terminal for Reanimated errors

---

## Example: What Good Logs Look Like

### Calendar Working:
```
LOG [Reclaim DEBUG] Calendar module loaded successfully
LOG [Reclaim DEBUG] Calendar permissions granted
LOG [Reclaim DEBUG] Found 2 calendars
LOG [Reclaim DEBUG] Retrieved 3 events for today
```

### Sleep Sync Working:
```
LOG [Reclaim DEBUG] === syncHealthData START ===
LOG [Reclaim DEBUG] Health service available
LOG [Reclaim DEBUG] Has permissions: true
LOG [Reclaim DEBUG] Latest sleep: { hasStartTime: true, hasEndTime: true, durationMinutes: 480, source: 'google_fit' }
LOG [Reclaim DEBUG] Attempting to save sleep session to database...
LOG [Reclaim DEBUG] ✅ Sleep session saved successfully to sleep_sessions table
```

### Calendar Not Working:
```
WARN CalendarCard error: [Error: Calendar permissions not granted]
# OR
LOG [Reclaim DEBUG] Calendar permissions denied by user
# OR
LOG [Reclaim DEBUG] No calendars found
```

### Sleep Sync Not Working:
```
LOG [Reclaim DEBUG] === syncHealthData START ===
LOG [Reclaim DEBUG] Health service available
LOG [Reclaim DEBUG] Has permissions: false
WARN ⚠️ SYNC BLOCKED: Health permissions not granted
# OR
LOG [Reclaim DEBUG] No sleep data found or missing startTime/endTime
# OR
ERROR ❌ FAILED TO SAVE: [database error details]
```

---

## Pro Tips

1. **Keep Terminal Open**: Don't close the Metro bundler terminal - that's where all logs appear
2. **Scroll Up**: Logs can be long, scroll up to see earlier messages
3. **Clear Terminal**: Press `Ctrl+L` to clear terminal (logs still in scrollback)
4. **Save Logs**: Copy/paste important log sections to share for debugging
5. **Filter by Component**: Look for specific component names in logs

---

## If You Don't See Any Logs

1. **Make sure dev server is connected**: QR code scanned and app connected
2. **Check if app is running**: App should be open on phone
3. **Try triggering an action**: Open Dashboard, pull to refresh, etc.
4. **Check Metro bundler is running**: Terminal should show "Metro waiting on..."
5. **Restart Metro**: `Ctrl+C` then `npx expo start --clear`

---

## Quick Reference

| What You Want to Debug | Where to Look |
|------------------------|---------------|
| Calendar issues | Metro bundler terminal |
| Sleep sync issues | Metro bundler terminal |
| Reanimated errors | Metro bundler terminal OR Android logcat |
| Native module errors | Android logcat |
| JavaScript errors | Metro bundler terminal OR React Native Debugger |
| Network requests | React Native Debugger (Network tab) |

**Main location**: The terminal where you ran `npx expo start` - that's where 90% of logs appear!

