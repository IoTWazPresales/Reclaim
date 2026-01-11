# 🔧 Fix Server Connection Issues

## Problem
After running a PowerShell command, the assistant/AI or Metro bundler cannot connect to the server.

## Quick Fix (Run This First)

```powershell
cd C:\Reclaim\app
.\scripts\fix-server-connection.ps1
```

This diagnostic script will check:
- ✅ Environment variables (.env file)
- ✅ ADB server status
- ✅ Cache state
- ✅ Node.js processes
- ✅ Network connectivity
- ✅ Metro bundler port

## Common Causes & Solutions

### Issue 1: Metro Bundler Stuck/Corrupted

**Symptoms:**
- Metro bundler won't respond
- Can't connect to dev server
- Port 8081 in use but Metro not working

**Fix:**
```powershell
cd C:\Reclaim\app

# Kill all Node processes
taskkill /F /IM node.exe

# Clear caches
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "node_modules\.cache" -ErrorAction SilentlyContinue

# Restart Metro with cleared cache
npx expo start --clear
```

### Issue 2: ADB Server Connection Lost

**Symptoms:**
- `adb devices` shows nothing or "offline"
- Can't deploy to emulator/device

**Fix:**
```powershell
# Restart ADB server
adb kill-server
adb start-server

# Verify connection
adb devices
```

### Issue 3: Environment Variables Lost/Corrupted

**Symptoms:**
- App shows "Missing Configuration" screen
- Supabase connection fails

**Fix:**
```powershell
cd C:\Reclaim\app

# Check if .env exists
if (Test-Path .env) {
    Get-Content .env
} else {
    # Create from template if missing
    Copy-Item ..\env.example .env
    Write-Host "Created .env file. Please fill in your values."
}

# Restart Metro after fixing .env
npx expo start --clear
```

### Issue 4: Network/Firewall Blocking

**Symptoms:**
- Can't reach Supabase
- Metro bundler can't serve bundle

**Fix:**
1. Check Windows Firewall isn't blocking port 8081
2. Verify internet connection
3. Check if proxy/VPN is interfering

### Issue 5: Corrupted Expo Cache

**Symptoms:**
- Metro bundler starts but can't load
- Strange errors on startup

**Fix:**
```powershell
cd C:\Reclaim\app

# Nuclear cache clear
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "node_modules\.cache" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "android\.gradle" -ErrorAction SilentlyContinue

# Restart everything
adb kill-server
adb start-server

# Start fresh
npx expo start --clear
```

## Complete Reset (If Nothing Else Works)

```powershell
cd C:\Reclaim\app

# Step 1: Kill everything
taskkill /F /IM node.exe 2>$null
adb kill-server

# Step 2: Clear all caches
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "node_modules\.cache" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "android\.gradle" -ErrorAction SilentlyContinue

# Step 3: Restart ADB
adb start-server

# Step 4: Verify emulator/device is connected
adb devices

# Step 5: Start Metro fresh
npx expo start --clear
```

## Prevention

To avoid server connection issues:

1. **Always check what PowerShell command does before running**
   - Be especially careful with commands that modify environment variables
   - Avoid killing processes unless necessary

2. **Use helper scripts**
   - `.\scripts\fix-server-connection.ps1` - Diagnostic and fix
   - `.\scripts\fix-emulator.ps1` - Fix emulator connection
   - `.\start-emulator.ps1` - Start emulator properly

3. **Don't kill Node processes unnecessarily**
   - Only kill if Metro is stuck/unresponsive
   - Always clear cache after killing processes

4. **Keep .env file safe**
   - Don't overwrite it unless necessary
   - Make backups before modifications

## Verification Steps

After running fixes, verify everything works:

```powershell
# 1. Check ADB
adb devices
# Should show your device/emulator

# 2. Check Metro is running
# Look for Metro bundler terminal output

# 3. Check app can connect
# Open app on device/emulator
# Should load without errors
```

## Still Having Issues?

If nothing works:

1. **Check Metro terminal output** for specific errors
2. **Check ADB logcat** for device errors:
   ```powershell
   adb logcat | Select-String -Pattern "Error|Exception|ReactNative" -Context 2
   ```
3. **Verify .env file** has correct values
4. **Try rebuilding the app**:
   ```powershell
   cd C:\Reclaim\app
   adb uninstall com.fissioncorporation.reclaim
   npx expo run:android
   ```
