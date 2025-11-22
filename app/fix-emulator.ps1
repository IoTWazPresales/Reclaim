# Fix Emulator Connection Script
# Run this script when the emulator isn't connecting properly

Write-Host "🔧 Fixing emulator connection..." -ForegroundColor Cyan

# Step 1: Navigate to app directory
Set-Location -Path "$PSScriptRoot"

# Step 2: Kill and restart ADB server
Write-Host "`n📱 Restarting ADB server..." -ForegroundColor Yellow
adb kill-server
Start-Sleep -Seconds 2
adb start-server
Start-Sleep -Seconds 2

# Step 3: Check connected devices
Write-Host "`n📋 Checking connected devices..." -ForegroundColor Yellow
$devices = adb devices
Write-Host $devices

# Step 4: Check if emulator is connected
$deviceList = adb devices | Select-Object -Skip 1 | Where-Object { $_ -match "device$" }

if ($deviceList) {
    Write-Host "`n✅ Emulator is connected!" -ForegroundColor Green
    
    # Step 5: Clear Expo cache
    Write-Host "`n🧹 Clearing Expo cache..." -ForegroundColor Yellow
    if (Test-Path ".expo") {
        Remove-Item -Recurse -Force ".expo" -ErrorAction SilentlyContinue
        Write-Host "   Removed .expo directory" -ForegroundColor Gray
    }
    
    if (Test-Path "node_modules\.cache") {
        Remove-Item -Recurse -Force "node_modules\.cache" -ErrorAction SilentlyContinue
        Write-Host "   Removed node_modules cache" -ForegroundColor Gray
    }
    
    Write-Host "`n✅ Ready! Now run: npx expo start --clear" -ForegroundColor Green
    Write-Host "   Then press 'a' when Metro is ready to open on Android emulator" -ForegroundColor Gray
} else {
    Write-Host "`n❌ No emulator detected!" -ForegroundColor Red
    Write-Host "`nPlease:" -ForegroundColor Yellow
    Write-Host "1. Open Android Studio" -ForegroundColor White
    Write-Host "2. Go to Tools → Device Manager" -ForegroundColor White
    Write-Host "3. Start your emulator (click the Play button)" -ForegroundColor White
    Write-Host "4. Wait for it to fully boot" -ForegroundColor White
    Write-Host "5. Run this script again: .\fix-emulator.ps1" -ForegroundColor White
}

Write-Host ""

