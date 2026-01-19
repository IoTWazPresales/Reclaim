# Building for Phone Without USB Connection

## Option 1: EAS Build (Easiest) ⭐ RECOMMENDED

Build in the cloud, download APK, install on phone.

### Step 1: Set EAS Secrets (One-Time Setup)

Since EAS builds don't use `.env` files, set secrets first:

```powershell
cd C:\Reclaim\app

# Set Supabase URL
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://bgtosdgrvjwlpqxqjvdf.supabase.co"

# Set Supabase Anon Key  
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndG9zZGdydmp3bHBxeHFqdmRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MTc0OTAsImV4cCI6MjA3NjM5MzQ5MH0.cadqltZJMHH-nUrC1Wzr37ZnZNsCMKhGOIPfAUEVWLc"

# Verify
eas secret:list
```

### Step 2: Build Development APK

```powershell
cd C:\Reclaim\app
eas build --profile development --platform android
```

This will:
- Build in the cloud (takes ~10-15 minutes)
- Generate a download link
- Create an APK file you can install

### Step 3: Download and Install

1. **Get the download link** from the build output (or check EAS dashboard)
2. **On your phone**: Open the link in browser, download APK
3. **Install**: Tap the downloaded APK (you may need to allow "Install from unknown sources")
4. **Open app** and scan QR code from `npx expo start`

### Step 4: Connect to Dev Server

```powershell
cd C:\Reclaim\app
npx expo start
```

Scan the QR code with the installed app!

---

## Option 2: Build APK Locally (No Cloud)

Build APK on your computer, then transfer to phone.

### Step 1: Build APK Locally

```powershell
cd C:\Reclaim\app
npx expo run:android --variant release
```

**OR** if that doesn't work:

```powershell
cd C:\Reclaim\app
cd android
.\gradlew assembleRelease
```

The APK will be at: `android\app\build\outputs\apk\release\app-release.apk`

### Step 2: Transfer APK to Phone

**Option A: Cloud Storage** (Easiest)
- Upload `app-release.apk` to Google Drive / Dropbox / OneDrive
- Download on phone
- Install

**Option B: Email**
- Email the APK to yourself
- Download attachment on phone
- Install

**Option C: QR Code Transfer**
- Use a service like [Snapdrop](https://snapdrop.net/) or [Send Anywhere](https://send-anywhere.com/)
- Upload APK, scan QR code on phone
- Download and install

**Option D: WiFi File Transfer**
- Use apps like "Portal" or "AirDroid"
- Transfer APK wirelessly
- Install

### Step 3: Install on Phone

1. Open the APK file on your phone
2. Allow "Install from unknown sources" if prompted
3. Install
4. Open app and connect to dev server

---

## Option 3: ADB Over WiFi (If You Can Enable It Once)

If you can connect via USB **just once** to enable WiFi debugging:

### One-Time USB Setup

```powershell
# Connect phone via USB first
adb devices

# Enable WiFi debugging
adb tcpip 5555

# Get phone's IP address (shown on phone in Developer Options → Wireless debugging)
# Or use: adb shell ip addr show wlan0
```

### Then Disconnect USB

```powershell
# Connect over WiFi (replace IP with your phone's IP)
adb connect 192.168.1.100:5555

# Verify
adb devices

# Now you can use npx expo run:android normally!
npx expo run:android
```

---

## Comparison

| Method | Speed | Setup | Best For |
|--------|-------|-------|----------|
| **EAS Build** | ⭐⭐⭐ Fast | One-time secrets | Most reliable |
| **Local APK** | ⭐⭐ Medium | No setup | Quick testing |
| **ADB WiFi** | ⭐⭐⭐ Fastest | One-time USB | Regular development |

---

## My Recommendation: EAS Build

**Why?**
- ✅ No USB needed at all
- ✅ Works from anywhere
- ✅ Reliable and tested
- ✅ Easy to share with others
- ✅ Only need to set secrets once

**Steps:**
1. Set EAS secrets (one-time, 2 minutes)
2. Run `eas build --profile development --platform android`
3. Download APK when build completes
4. Install on phone
5. Run `npx expo start` and scan QR code

---

## Troubleshooting

### EAS Build Fails
- Check if secrets are set: `eas secret:list`
- Make sure you're logged in: `eas login`
- Check build logs in EAS dashboard

### APK Won't Install
- Enable "Install from unknown sources" in phone settings
- Make sure you downloaded the APK completely
- Try a different browser if download fails

### Can't Connect to Dev Server
- Make sure phone and computer are on **same WiFi network**
- Check firewall isn't blocking port 8081
- Try manually entering URL from terminal

---

## Quick Start (EAS Build)

```powershell
# 1. Set secrets (one-time)
cd C:\Reclaim\app
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://bgtosdgrvjwlpqxqjvdf.supabase.co"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndG9zZGdydmp3bHBxeHFqdmRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MTc0OTAsImV4cCI6MjA3NjM5MzQ5MH0.cadqltZJMHH-nUrC1Wzr37ZnZNsCMKhGOIPfAUEVWLc"

# 2. Build
eas build --profile development --platform android

# 3. Download APK from link provided

# 4. Install on phone

# 5. Start dev server
npx expo start

# 6. Scan QR code with installed app
```

That's it! 🎉

