# Health Integration Debugging Guide

## Current Issues

1. ❌ Health Connect shows "app not installed"
2. ❌ Samsung Health crashes the app
3. ❌ Google Fit permissions being declined

## How to Help Debug

### For Health Connect Issue

Please provide:
1. **Android Version** on your device
2. **Is Health Connect actually installed?** (Check Google Play Store)
3. **Error message** - exact text shown when clicking Health Connect
4. **Console logs** - run `adb logcat | grep -i "healthconnect"` or check Metro bundler console

**Steps to check:**
```bash
# On your computer with device connected:
adb shell pm list packages | grep health
# Should show: com.google.android.apps.healthdata

# Check if Health Connect is installed:
adb shell pm path com.google.android.apps.healthdata
```

### For Samsung Health Crash

Please provide:
1. **Full crash log** from:
   - Metro bundler console (red error screen)
   - `adb logcat | grep -i "samsung\|crash\|fatal"`
2. **Device model** (e.g., Galaxy S21, Note 20)
3. **Android version**
4. **Samsung Health app version** (check in Play Store or Settings > Apps)

**Steps to get crash log:**
```bash
# On your computer with device connected:
adb logcat -d | grep -i "samsung\|reactnative\|crash" > crash_log.txt
```

### For Google Fit Permissions

Please provide:
1. **What happens when you click Google Fit?**
   - Shows permission dialog but it's declined?
   - No dialog appears?
   - Error message?
2. **Console logs** showing the permission request flow
3. **OAuth Client ID configured?** (Check app.config.ts or Google Cloud Console)

## Common Issues & Solutions

### Health Connect "App Not Installed"

**Possible Causes:**
1. Health Connect not actually installed (Android 13 needs manual install)
2. SDK method `isAvailable()` not working correctly
3. Module not properly linked

**Quick Fixes to Try:**
1. Install Health Connect from Play Store manually
2. On Android 14+, it should be built-in - check Settings > Apps
3. Restart the app after installing Health Connect

### Samsung Health Crash

**Possible Causes:**
1. Native module not properly linked
2. Calling methods on undefined/null module
3. Missing try-catch blocks
4. SDK version incompatibility

**Quick Fixes to Try:**
1. Rebuild the app: `npx expo run:android`
2. Clear cache and rebuild
3. Check if native module is actually linked

### Google Fit Permissions Declined

**Possible Causes:**
1. OAuth Client ID not configured correctly
2. SHA-1 certificate fingerprint mismatch
3. Package name mismatch in Google Cloud Console
4. User actually declining the permission

**Quick Fixes to Try:**
1. Verify OAuth client is configured in Google Cloud Console
2. Check SHA-1 fingerprint matches
3. Verify package name matches

## Immediate Action Items

I'll need you to:
1. **Run these commands** and share output:
   ```bash
   # Check installed packages
   adb shell pm list packages | grep -E "health|fit|samsung"
   
   # Get recent crash logs
   adb logcat -d -t 100 | grep -i "error\|exception\|crash"
   ```

2. **Check these in your codebase:**
   - `app/app.config.ts` - Google Fit OAuth client ID configured?
   - Package names match between AndroidManifest and code?
   - Native modules properly linked?

3. **Share error messages** - exact text shown in app

## Next Steps

Once you provide the above information, I can:
- Add better error handling to prevent crashes
- Fix the detection methods
- Add more detailed logging
- Create proper fallback behaviors

