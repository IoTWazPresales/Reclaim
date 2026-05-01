# Start Emulator and Expo Script
# This script ensures the emulator is running before starting Expo

Write-Host "🚀 Starting emulator and Expo..." -ForegroundColor Cyan

# Step 1: Navigate to app directory
Set-Location -Path "$PSScriptRoot"

# Step 2: Check if emulator is already running
Write-Host "`n📱 Checking for running emulators..." -ForegroundColor Yellow
$devices = adb devices | Select-Object -Skip 1 | Where-Object { $_ -match "device$" }

if (-not $devices) {
    Write-Host "❌ No emulator detected!" -ForegroundColor Red
    Write-Host "`nPlease start the emulator first:" -ForegroundColor Yellow
    Write-Host "1. Open Android Studio" -ForegroundColor White
    Write-Host "2. Go to Tools → Device Manager" -ForegroundColor White
    Write-Host "3. Click the Play button next to your emulator" -ForegroundColor White
    Write-Host "4. Wait for it to fully boot (home screen visible)" -ForegroundColor White
    Write-Host "5. Run this script again" -ForegroundColor White
    Write-Host ""
    
    # Ask if user wants to wait
    $response = Read-Host "Wait 30 seconds and check again? (y/n)"
    if ($response -eq "y" -or $response -eq "Y") {
        Write-Host "`nWaiting 30 seconds for emulator to start..." -ForegroundColor Yellow
        Start-Sleep -Seconds 30
        $devices = adb devices | Select-Object -Skip 1 | Where-Object { $_ -match "device$" }
        
        if (-not $devices) {
            Write-Host "❌ Still no emulator detected. Please start it manually." -ForegroundColor Red
            exit 1
        }
    } else {
        exit 1
    }
}

# Step 3: Emulator is running, verify connection
Write-Host "✅ Emulator detected!" -ForegroundColor Green
adb devices

# Step 4: Clear caches if requested
$clearCache = Read-Host "`nClear caches before starting? (y/n)"
if ($clearCache -eq "y" -or $clearCache -eq "Y") {
    Write-Host "🧹 Clearing caches..." -ForegroundColor Yellow
    
    if (Test-Path ".expo") {
        Remove-Item -Recurse -Force ".expo" -ErrorAction SilentlyContinue
        Write-Host "   Removed .expo directory" -ForegroundColor Gray
    }
    
    if (Test-Path "node_modules\.cache") {
        Remove-Item -Recurse -Force "node_modules\.cache" -ErrorAction SilentlyContinue
        Write-Host "   Removed node_modules cache" -ForegroundColor Gray
    }
    
    Write-Host "✅ Caches cleared!" -ForegroundColor Green
}

# Step 5: Start Expo
Write-Host "`n🚀 Starting Expo..." -ForegroundColor Cyan
Write-Host "   When Metro is ready, press 'a' to open on Android emulator" -ForegroundColor Gray
Write-Host ""

if ($clearCache -eq "y" -or $clearCache -eq "Y") {
    npx expo start --clear
} else {
    npx expo start
}

