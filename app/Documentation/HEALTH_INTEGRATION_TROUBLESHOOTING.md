# Health Integration Troubleshooting Guide

## Current Issues & Fixes Applied

### ✅ Fixes Applied (v0.2.0)

1. **Samsung Health Crash Prevention**
   - Added comprehensive null checks before calling native methods
   - Wrapped all SDK calls in try-catch blocks
   - Improved error logging with stack traces
   - Better error messages for debugging

2. **Health Connect Detection Improvements**
   - Enhanced SDK availability checking
   - Better error messages indicating Android version requirements
   - Improved initialization error handling

3. **Google Fit Error Handling**
   - Better OAuth configuration error detection
   - Clearer permission denial messages
   - Enhanced error logging

## To Help Debug Further

Please provide the following information:

### 1. Device Information
```
- Device Model: [e.g., Samsung Galaxy S21, Pixel 7, etc.]
- Android Version: [e.g., Android 13, Android 14]
- Is this a Samsung device? [Yes/No]
```

### 2. Health Connect Issue
Run these commands and share output:
```bash
# Check if Health Connect is installed
adb shell pm list packages | grep healthdata

# Check Health Connect version
adb shell dumpsys package com.google.android.apps.healthdata | grep versionName

# Get recent logs
adb logcat -d -t 100 | grep -i "healthconnect\|health.connect" > health_connect_logs.txt
```

**Questions:**
- Is Health Connect actually installed on your device?
- What Android version are you running?
- What exact error message do you see when clicking Health Connect?

### 3. Samsung Health Crash
Run these commands and share output:
```bash
# Get crash log
adb logcat -d -t 500 | grep -iE "samsung|crash|fatal|exception|error" > samsung_crash_log.txt

# Check if Samsung Health is installed
adb shell pm list packages | grep shealth

# Check native modules
adb shell dumpsys package com.yourcompany.reclaim | grep -A 20 "native"
```

**Questions:**
- What happens exactly when you click Samsung Health?
  - App crashes immediately?
  - Shows error message then crashes?
  - Freezes then crashes?
- Full error message from Metro bundler console?
- Samsung Health app version (check in Play Store/Settings)?

### 4. Google Fit Permissions
Run these commands:
```bash
# Check Google Fit installation
adb shell pm list packages | grep fitness

# Get permission logs
adb logcat -d -t 100 | grep -iE "googlefit|permission|oauth" > google_fit_logs.txt
```

**Questions:**
- What happens when you click Google Fit?
  - Shows permission dialog but it's declined automatically?
  - No dialog appears at all?
  - Shows error message?
- Is Google Fit installed and signed in on your device?
- Do you have `EXPO_PUBLIC_GOOGLE_FIT_CLIENT_ID` set in your environment?

## Common Issues & Quick Fixes

### Health Connect "App Not Installed"

**Android 13:**
- Install Health Connect from Play Store manually
- Open Health Connect app and complete setup
- Restart your app

**Android 14+:**
- Health Connect should be built-in
- Check: Settings > Apps > Health Connect (should be there)
- If not, install from Play Store

### Samsung Health Crash

**Possible Causes:**
1. Native module not linked properly
2. Samsung Health app not installed
3. SDK version mismatch

**Quick Fixes:**
```bash
# Rebuild the app (clears any linking issues)
cd app
npm run android

# Or if using EAS
eas build --profile preview --platform android --clear-cache
```

### Google Fit Permissions Declined

**Common Causes:**
1. OAuth Client ID not configured
2. SHA-1 fingerprint mismatch
3. Package name mismatch
4. Not using development build (Expo Go won't work)

**Check Configuration:**
1. Verify `app.config.ts` has Google Fit client ID:
   ```typescript
   ['react-native-google-fit', {
     oauthClientId: 'YOUR_CLIENT_ID.apps.googleusercontent.com',
   }]
   ```

2. Get your SHA-1 fingerprint:
   ```bash
   cd app/android
   ./gradlew signingReport
   # Look for SHA1 fingerprint in output
   ```

3. Add SHA-1 to Google Cloud Console:
   - Go to Google Cloud Console
   - APIs & Services > Credentials
   - Edit your OAuth 2.0 Client ID
   - Add SHA-1 fingerprint

## Next Steps

Once you provide:
1. Device information
2. Crash logs (for Samsung Health)
3. Error messages
4. Console logs

I can:
- Add more specific error handling
- Fix any remaining bugs
- Create device-specific workarounds
- Improve error messages

## Temporary Workaround

If you need to use health data immediately:
- Use Google Fit directly (if permissions work)
- Manually enter sleep data in the app
- Wait for fixes to be applied

All fixes are already committed and pushed - they should be in your next build.

