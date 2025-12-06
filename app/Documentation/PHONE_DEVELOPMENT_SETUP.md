# Using Your Phone for Development (No EAS Build Needed)

## Quick Answer: YES! ✅

You can use `npx expo run:android` with your phone connected via USB, then scan a QR code to connect to the dev server.

## Step-by-Step Instructions

### Step 1: Enable USB Debugging on Your Phone

1. **Enable Developer Options**:
   - Go to **Settings** → **About phone**
   - Tap **Build number** 7 times until you see "You are now a developer!"

2. **Enable USB Debugging**:
   - Go to **Settings** → **Developer options** (or **System** → **Developer options**)
   - Turn on **USB debugging**
   - Turn on **Install via USB** (if available)

3. **Connect Phone to Computer**:
   - Connect via USB cable
   - On your phone, when prompted, tap **Allow USB debugging** and check **Always allow from this computer**

### Step 2: Verify Phone is Connected

In PowerShell, check if your phone is detected:

```powershell
adb devices
```

You should see your device listed, like:
```
List of devices attached
ABC123XYZ    device
```

If you see "unauthorized", check your phone for the USB debugging permission prompt.

### Step 3: Build and Install on Your Phone

```powershell
cd C:\Reclaim\app
npx expo run:android
```

This will:
- Build the Android APK
- Install it on your connected phone
- Start Metro bundler automatically

**Note**: The first build takes 5-10 minutes. Subsequent builds are faster.

### Step 4: Start Dev Server (if not already running)

If Metro bundler didn't start automatically, or you closed it:

```powershell
npx expo start
```

You'll see a QR code in the terminal.

### Step 5: Connect to Dev Server

**Option A: Scan QR Code** (Recommended)
- Open the **Reclaim** app on your phone (the one installed by `npx expo run:android`)
- Shake your phone or use the dev menu
- Tap **"Enter URL manually"** or use the QR scanner
- Scan the QR code from your terminal

**Option B: Use Development Menu**
- Shake your phone to open dev menu
- Tap **"Configure Bundler"**
- Enter the URL shown in terminal (e.g., `exp://192.168.1.100:8081`)

**Option C: Automatic Connection**
- If your phone and computer are on the same WiFi network
- The app should automatically connect when you open it

## Advantages Over EAS Build

✅ **Faster iteration**: No waiting for cloud builds  
✅ **Free**: No EAS build minutes used  
✅ **Works offline**: No internet needed after initial build  
✅ **Uses `.env` file**: Environment variables from `.env` work automatically  
✅ **Hot reload**: Changes appear instantly  

## Troubleshooting

### Phone Not Detected

```powershell
# Check ADB
adb devices

# Restart ADB server
adb kill-server
adb start-server
adb devices
```

### Build Fails

```powershell
# Clean and rebuild
cd C:\Reclaim\app
Remove-Item -Recurse -Force android\.gradle -ErrorAction SilentlyContinue
npx expo run:android
```

### App Won't Connect to Dev Server

1. Make sure phone and computer are on **same WiFi network**
2. Check firewall isn't blocking port 8081
3. Try manually entering the URL from terminal
4. Restart Metro: `npx expo start --clear`

### USB Debugging Issues

- Try a different USB cable
- Try a different USB port
- On phone: Revoke USB debugging authorizations, then reconnect
- Check if phone manufacturer requires special drivers (Samsung, etc.)

## Workflow Summary

```powershell
# 1. Connect phone via USB
# 2. Build and install (first time only, or after native changes)
npx expo run:android

# 3. Start dev server (if not already running)
npx expo start

# 4. Scan QR code with installed app
# 5. Make code changes - they'll hot reload automatically!
```

## When to Rebuild

You only need to run `npx expo run:android` again when:
- You add/remove native modules
- You change `app.config.ts` native settings
- You update Android-specific code
- You want a fresh install

For JavaScript/TypeScript changes, just save the file - hot reload handles it!

## Next Steps

After setup, you can:
- Make code changes and see them instantly
- Use the debug menu (shake phone)
- View logs in terminal
- Test sleep sync functionality
- Debug the `syncHealthData()` function with the enhanced logging

