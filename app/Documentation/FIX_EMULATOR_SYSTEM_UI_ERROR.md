# 🔧 Fix Emulator System UI Error & Loading Loop

## Problem
Emulator is stuck in a loading loop and shows "System UI Error" or keeps restarting.

## Quick Fix Steps

### Step 1: Kill All Emulator Processes

```powershell
# Kill all emulator processes
taskkill /F /IM qemu-system-x86_64.exe 2>$null
taskkill /F /IM emulator.exe 2>$null

# Also kill ADB
adb kill-server
```

### Step 2: Cold Boot the Emulator

**Option A: Cold Boot from Command Line (Recommended)**

1. Open PowerShell as Administrator
2. Find your emulator name:
   ```powershell
   # List all available emulators
   emulator -list-avds
   ```
3. Cold boot (wipes temporary data):
   ```powershell
   # Replace "Pixel_5_API_33" with your emulator name
   emulator -avd Pixel_5_API_33 -wipe-data
   ```

**Option B: Cold Boot from Android Studio**

1. Close Android Studio completely
2. Open Android Studio
3. Go to **Tools** → **Device Manager**
4. Click the **dropdown arrow ▼** next to your emulator
5. Select **"Cold Boot Now"** or **"Wipe Data"**

### Step 3: If That Doesn't Work - Delete and Recreate Emulator

1. **Open Android Studio**
2. **Tools** → **Device Manager**
3. **Right-click** your emulator
4. Select **"Delete"**
5. **Create a new emulator:**
   - Click **"Create Device"**
   - Choose a device (e.g., Pixel 5)
   - Download a **system image** if needed (recommend **API 33 or 34**)
   - **Finish** the setup
6. **Start the new emulator**

### Step 4: If System Image is Corrupted - Reinstall

1. **Android Studio** → **Tools** → **SDK Manager**
2. Go to **"SDK Platforms"** tab
3. **Uncheck** and **re-check** your Android API level
4. Click **"Apply"** to re-download the system image
5. Wait for download to complete
6. Create a new emulator with the fresh system image

---

## Alternative: Use a Physical Device

If emulator keeps having issues, test on a physical Android device:

1. **Enable Developer Options** on your phone:
   - Go to **Settings** → **About Phone**
   - Tap **Build Number** 7 times
2. **Enable USB Debugging**:
   - Go to **Settings** → **Developer Options**
   - Enable **"USB Debugging"**
3. **Connect via USB**:
   - Connect phone to computer via USB
   - On phone, accept "Allow USB debugging" prompt
4. **Verify connection**:
   ```powershell
   adb devices
   ```
   You should see your device listed

---

## Nuclear Option: Complete Reset

If nothing works, completely reset the emulator environment:

```powershell
# 1. Kill all processes
taskkill /F /IM qemu-system-x86_64.exe 2>$null
taskkill /F /IM emulator.exe 2>$null
adb kill-server

# 2. Delete emulator data
# Location: C:\Users\YourUsername\.android\avd\
# Delete the folder for your emulator

# 3. In Android Studio:
# - Tools → Device Manager
# - Delete old emulator
# - Create fresh new emulator

# 4. Start fresh emulator
```

---

## Check System Requirements

Emulator issues can be caused by:

1. **Insufficient RAM** - Emulator needs at least 4GB free RAM
2. **Virtualization not enabled** - Check BIOS settings for Intel VT-x or AMD-V
3. **Antivirus interference** - Temporarily disable antivirus
4. **Windows Hyper-V conflict** - Disable Hyper-V if using VMware or VirtualBox

### Check if Virtualization is Enabled

```powershell
# Run in PowerShell (as Administrator)
systeminfo | findstr /C:"Hyper-V"
```

If Hyper-V is enabled and causing conflicts, you may need to disable it or use Android Studio's built-in emulator.

---

## Recommended: Use Android Studio's Emulator

The emulator built into Android Studio is usually more stable:

1. **Open Android Studio**
2. **Tools** → **Device Manager**
3. **Create Device** (if you don't have one)
4. **Start emulator** from Device Manager (not command line)
5. **Wait for full boot** (can take 2-3 minutes first time)
6. **Then** run `npx expo start` in your app directory

---

## Quick Commands Reference

```powershell
# Kill all emulator processes
taskkill /F /IM qemu-system-x86_64.exe 2>$null
taskkill /F /IM emulator.exe 2>$null

# List available emulators
emulator -list-avds

# Cold boot specific emulator
emulator -avd "YourEmulatorName" -wipe-data

# Check ADB devices
adb devices

# Restart ADB
adb kill-server
adb start-server
```

---

## Most Common Solution

**90% of the time, this fixes it:**

1. **Close the emulator completely** (not just minimize)
2. **In Android Studio**: Tools → Device Manager
3. **Click dropdown ▼** next to your emulator
4. **Select "Cold Boot Now"**
5. **Wait for it to fully boot** (2-3 minutes)
6. **Then start Expo**: `cd app && npx expo start --clear`
7. **Press 'a'** when Metro is ready

This usually resolves System UI errors caused by corrupted temporary data.

