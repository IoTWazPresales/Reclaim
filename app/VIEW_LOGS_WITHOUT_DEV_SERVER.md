# View Logs Without Dev Server Connection

Since the Reanimated error blocks dev server connection, here's how to see logs:

## Option 1: Use ADB Logcat (Recommended)

**Works even without dev server connection!**

### Step 1: Connect Phone via USB
Even if you can't use USB for building, you can use it just for viewing logs.

### Step 2: Enable USB Debugging
- Settings → Developer options → USB debugging (ON)

### Step 3: View Logs
```powershell
# Connect phone via USB, then:
adb logcat | findstr "Reclaim\|ReactNative\|JS"
```

**Or filter for specific messages:**
```powershell
# Calendar logs
adb logcat | findstr "Calendar\|calendar"

# Sleep sync logs  
adb logcat | findstr "syncHealthData\|sleep"

# All our debug logs
adb logcat | findstr "Reclaim DEBUG"
```

**Or see everything:**
```powershell
adb logcat
```

### Step 4: Use the App
- Open app on phone
- Use features (Dashboard, Calendar, Sleep sync)
- Logs appear in terminal in real-time

**Pros**:
- ✅ Works without dev server
- ✅ See all logs (native + JS)
- ✅ Real-time logging
- ✅ No Reanimated errors blocking

**Cons**:
- ❌ Need USB connection (but just for viewing, not building)

---

## Option 2: Try to Fix Reanimated Import

We can try making the Reanimated import safer, but this might not work since it's a native module error.

---

## Option 3: Rebuild (Takes Time)

```powershell
cd C:\Reclaim\app
eas build --profile development --platform android --clear-cache
```

This will fix it, but takes 10-15 minutes.

---

## Quick Test: ADB Logcat

**Right now, try this**:

1. Connect phone via USB
2. Run: `adb logcat | findstr "Reclaim"`
3. Open app on phone
4. Use Dashboard, check Calendar, trigger Sleep sync
5. See logs in terminal!

This works **without** connecting to dev server, so no Reanimated error!

---

## What You'll See in Logcat

```
I/ReactNativeJS: [Reclaim DEBUG] Calendar module loaded successfully
I/ReactNativeJS: [Reclaim DEBUG] Found 3 calendars
I/ReactNativeJS: [Reclaim DEBUG] Retrieved 5 events for today
I/ReactNativeJS: [Reclaim DEBUG] === syncHealthData START ===
I/ReactNativeJS: [Reclaim DEBUG] Has permissions: true
I/ReactNativeJS: [Reclaim DEBUG] ✅ Sleep session saved successfully
```

All the same logs, just via ADB instead of Metro bundler!

---

## Recommendation

**Use ADB logcat** - it's the fastest way to see logs right now without fixing Reanimated.

Then later, rebuild with `--clear-cache` to fix the dev server connection properly.

