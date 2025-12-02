# Fixes for All Three Issues

## Issue 1: Reanimated Error When Scanning QR Code

**Error**: `Runtime not ready exception in host object get for prop reanimated module nullpointer exception error`

**Cause**: Reanimated native module isn't initialized when connecting to dev server.

**Fix**: 
1. **Wait before scanning**: Open the app, wait 3-5 seconds for it to fully load, THEN scan the QR code
2. **Or rebuild**: The EAS build might need to be rebuilt with the latest code:
   ```powershell
   eas build --profile development --platform android --clear-cache
   ```

**Why this happens**: When you scan the QR code immediately, the JavaScript bundle tries to use Reanimated before the native module is ready. Waiting gives native modules time to initialize.

---

## Issue 2: Calendar Not Pulling Through

**Symptoms**: Calendar card shows "No events scheduled" even when you have events.

**Possible Causes**:
1. **Permissions not granted** - Check if calendar permission was granted
2. **No calendars found** - Device might not have any calendars
3. **Silent failure** - Errors are being caught but not shown

**Debug Steps**:
1. Check logs for calendar-related messages:
   - `"Calendar permissions not granted, requesting..."`
   - `"Found X calendars"`
   - `"Retrieved X events for today"`
   - `"CalendarCard error:"`

2. **Manually test calendar**:
   - Go to Settings → Apps → Reclaim → Permissions
   - Make sure Calendar permission is granted
   - Check if you have any calendars with events today

3. **Check if calendar module loads**:
   - Look for `"Calendar module loaded successfully"` in logs
   - If you see `"expo-calendar module not available"`, the module isn't installed

**Quick Test**:
Add a test event to your device calendar for today, then check if it appears.

**I've added logging** to help debug - check your console/logs for calendar messages.

---

## Issue 3: Sleep Data Not Syncing

**Symptoms**: No sleep data appears in `sleep_sessions` table.

**We already added debug logging** to `syncHealthData()`. Check logs for:

1. **Service available?**
   - Look for: `"Health service available"` or `"Health service unavailable"`

2. **Permissions granted?**
   - Look for: `"Has permissions: true"` or `"⚠️ SYNC BLOCKED: Health permissions not granted"`

3. **Sleep data found?**
   - Look for: `"Latest sleep:"` with details about the sleep session
   - Or: `"No sleep data found or missing startTime/endTime"`

4. **Save successful?**
   - Look for: `"✅ Sleep session saved successfully to sleep_sessions table"`
   - Or: `"❌ FAILED TO SAVE:"` with error details

**Common Issues**:

### A. Permissions Not Granted
**Fix**: 
- Go to Sleep screen
- Connect a health provider (Google Fit, Health Connect, etc.)
- Grant permissions when prompted
- Check logs: `"Has permissions: true"`

### B. No Sleep Data in Provider
**Fix**:
- Make sure your health provider (Google Fit, Samsung Health, etc.) actually has sleep data
- Sleep data needs to be recorded in the provider app first
- Check if Google Fit/Samsung Health has recent sleep sessions

### C. Database Error
**Fix**:
- Check logs for: `"❌ FAILED TO SAVE:"`
- Verify `sleep_sessions` table exists in Supabase
- Check RLS policies aren't blocking writes
- Test with manual insert in Supabase SQL editor

### D. syncHealthData Not Being Called
**Fix**:
- Check if `syncHealthData()` is actually being called
- Look for: `"=== syncHealthData START ==="` in logs
- Manually trigger sync from Dashboard

**Next Steps**:
1. Check your logs after opening the app
2. Look for the debug messages from `syncHealthData()`
3. Share the debug output so we can see exactly where it's failing

---

## Quick Diagnostic Commands

### Check Calendar Permissions (Android)
```powershell
adb shell dumpsys package com.yourcompany.reclaim | findstr "calendar"
```

### Check Logs for All Issues
```powershell
# In your terminal where you ran npx expo start
# Look for:
# - "Calendar" messages
# - "syncHealthData" messages  
# - "Reanimated" errors
```

### Test Calendar Manually
1. Add a test event to your device calendar for today
2. Open Reclaim app
3. Check Dashboard for calendar card
4. Check logs for calendar debug messages

### Test Sleep Sync Manually
1. Go to Dashboard
2. Look for sync button or pull to refresh
3. Check logs for `syncHealthData` debug output
4. Share the debug output

---

## Summary

1. **Reanimated Error**: Wait 3-5 seconds after opening app before scanning QR code
2. **Calendar**: Check permissions, check logs for debug messages
3. **Sleep Sync**: Check logs for debug output from `syncHealthData()` - we added detailed logging

All three issues now have better logging/debugging. Check your console/logs and share what you see!

