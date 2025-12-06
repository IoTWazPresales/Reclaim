# Fix: Reanimated Error When Connecting to Dev Server

## Error
```
Runtime not ready exception in host object get for prop reanimated module nullpointer exception error
```

## Cause
When connecting to the dev server via QR code, Reanimated's native module isn't fully initialized before the JavaScript bundle tries to use it. This is a timing issue with development builds.

## Solutions

### Solution 1: Wait for App to Fully Load (Recommended)
Don't scan the QR code immediately after opening the app. Wait 2-3 seconds for native modules to initialize.

### Solution 2: Add Reanimated Initialization Check
We can add a check to ensure Reanimated is ready before the app tries to use it.

### Solution 3: Use Standalone Build (No Dev Server)
If the error persists, you can use the EAS build without connecting to dev server - it will work as a standalone app.

### Solution 4: Rebuild with Latest Changes
Sometimes the native build needs to be refreshed:

```powershell
cd C:\Reclaim\app
eas build --profile development --platform android --clear-cache
```

## Quick Fix: Try This First

1. **Open the app** (don't scan QR code yet)
2. **Wait 3-5 seconds** for app to fully load
3. **Then scan the QR code** from `npx expo start`

The native modules need time to initialize before connecting to Metro bundler.

## If Error Persists

The error might be harmless - check if the app actually works after the error. Sometimes Reanimated recovers after initialization completes.

If the app is completely broken:
1. Close the app completely
2. Reopen it
3. Wait for it to fully load
4. Then connect to dev server

## Alternative: Use Standalone Build

If dev server connection keeps failing, you can:
1. Build with EAS: `eas build --profile development --platform android`
2. Install the APK
3. **Don't connect to dev server** - use it as a standalone app
4. Rebuild when you need to test native changes

The app will work fine without dev server connection, you just won't get hot reload.

