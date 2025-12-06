# Quick Guide: View Logs Right Now

## Problem
Reanimated error blocks dev server connection, but you need logs to debug calendar/sleep sync.

## Solution: Use ADB Logcat

### Step 1: Connect Phone
Connect phone via USB (just for viewing logs, not building)

### Step 2: Enable USB Debugging
On phone: Settings → Developer options → USB debugging (ON)

### Step 3: Run This Command
```powershell
adb logcat | findstr "Reclaim"
```

### Step 4: Use Your App
- Open app on phone
- Go to Dashboard
- Check Calendar card
- Trigger sleep sync
- **See logs in terminal!**

---

## What You'll See

```
I/ReactNativeJS: [Reclaim DEBUG] Calendar module loaded successfully
I/ReactNativeJS: [Reclaim DEBUG] Found X calendars  
I/ReactNativeJS: [Reclaim DEBUG] Retrieved X events for today
I/ReactNativeJS: [Reclaim DEBUG] === syncHealthData START ===
I/ReactNativeJS: [Reclaim DEBUG] Has permissions: true/false
I/ReactNativeJS: [Reclaim DEBUG] Latest sleep: { ... }
I/ReactNativeJS: [Reclaim DEBUG] ✅ Sleep session saved successfully
```

---

## Filter Commands

**All Reclaim logs:**
```powershell
adb logcat | findstr "Reclaim"
```

**Calendar only:**
```powershell
adb logcat | findstr "Calendar\|calendar"
```

**Sleep sync only:**
```powershell
adb logcat | findstr "syncHealthData\|sleep"
```

**Everything (no filter):**
```powershell
adb logcat
```

---

## This Works Right Now!

No need to fix Reanimated first - you can see all logs via ADB while we work on the Reanimated fix.

Then later, rebuild with `--clear-cache` to fix dev server connection.

