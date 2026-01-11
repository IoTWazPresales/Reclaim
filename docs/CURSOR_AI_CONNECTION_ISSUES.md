# Fixing Cursor AI Assistant Connection Issues

## Problem
After running a PowerShell command, the Cursor AI assistant disconnected from the server and couldn't reconnect.

## Common Causes

### 1. Network/Firewall Changes
PowerShell commands that modify network settings or firewall rules can block Cursor's connection to the AI server.

**Commands to avoid:**
- `Set-NetFirewallRule` (unless you know what you're doing)
- `netsh` firewall commands
- VPN/proxy configuration changes
- DNS server changes

### 2. Process Kills That Affect Cursor
Killing Node.js or other processes that Cursor depends on.

**Commands to avoid:**
- `taskkill /F /IM node.exe` (can kill Cursor's internal processes)
- `taskkill /F /IM Code.exe` (kills Cursor entirely)
- Killing processes without checking what they are first

### 3. Environment Variable Changes
Modifying system environment variables can affect Cursor.

**Commands to avoid:**
- `[System.Environment]::SetEnvironmentVariable()` without understanding impact
- Modifying PATH incorrectly
- Changes to proxy settings

### 4. Port Conflicts
Commands that bind to ports Cursor uses.

### 5. SSL/Certificate Issues
Commands that modify certificate stores or SSL settings.

## What to Do If This Happens

### Immediate Fixes

1. **Restart Cursor**
   - Close Cursor completely
   - Reopen it
   - This re-establishes the connection

2. **Check Internet Connection**
   - Verify you can reach the internet
   - Try accessing other websites
   - Check if VPN/proxy is blocking

3. **Check Firewall**
   - Windows Security → Firewall & network protection
   - Make sure Cursor isn't blocked
   - Check if recent changes blocked the AI server domain

4. **Restart Network Adapter** (if needed)
   ```powershell
   # Run as Administrator
   Restart-NetAdapter -Name "Ethernet"
   # Or for WiFi:
   Restart-NetAdapter -Name "Wi-Fi"
   ```

5. **Check for Proxy Settings**
   ```powershell
   # Check if proxy is blocking connection
   netsh winhttp show proxy
   ```

### If Still Not Working

1. **Check Cursor Settings**
   - Open Settings (Ctrl+,)
   - Check "AI" or "Cursor Settings"
   - Verify API keys/connection settings

2. **Check System Proxy/VPN**
   - Disable VPN temporarily
   - Check proxy settings in Windows Settings

3. **Review Recent PowerShell Commands**
   - Check PowerShell history: `Get-History`
   - Look for commands that modified network/firewall settings

4. **Restore Network Settings**
   ```powershell
   # Reset Windows Firewall (if needed)
   netsh advfirewall reset
   
   # Reset WinHTTP proxy
   netsh winhttp reset proxy
   ```

## Prevention

1. **Review Commands Before Running**
   - Don't run PowerShell commands that modify network/firewall without understanding
   - Check what a command does before executing

2. **Use Safe Alternatives**
   - Instead of `taskkill /F /IM node.exe`, be more specific:
     ```powershell
     # Kill specific Metro bundler processes only
     Get-Process -Name node | Where-Object {$_.Path -like "*Metro*"} | Stop-Process
     ```

3. **Test in Isolated Environment**
   - Use a separate terminal for risky commands
   - Don't run network-modifying commands in Cursor's terminal

4. **Keep Cursor Updated**
   - Updates often include connection improvements
   - Help → Check for Updates

## If Nothing Works

1. **Completely reinstall Cursor**
   - Uninstall Cursor
   - Delete `%APPDATA%\Cursor` folder
   - Reinstall from scratch

2. **Contact Cursor Support**
   - They can help diagnose connection issues
   - Provide details about what PowerShell command was run

## Common Safe Commands That Shouldn't Break Connection

These are generally safe:
- `cd` (change directory)
- `Get-Content`, `Get-ChildItem` (reading files)
- `Write-Host`, `Write-Output` (output)
- Most Expo/React Native commands (`npx expo start`, etc.)
- ADB commands (`adb devices`, etc.)
- Git commands

## Commands to Be Careful With

- Process killing (`taskkill`, `Stop-Process`)
- Network configuration (`netsh`, firewall rules)
- Environment variable changes
- Proxy/VPN configuration
- Certificate store modifications
- Port binding (`netstat`, `Get-NetTCPConnection` is OK, but binding ports can conflict)
