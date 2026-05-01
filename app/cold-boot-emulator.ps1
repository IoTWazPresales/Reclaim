# Cold Boot Emulator Script
# This will wipe the emulator's temporary data and start fresh

param(
    [string]$EmulatorName = "Medium_Phone_API_36.1"
)

Write-Host "🔧 Cold Booting Emulator: $EmulatorName" -ForegroundColor Cyan

# Step 1: Kill all emulator processes
Write-Host "`n🛑 Stopping all emulator processes..." -ForegroundColor Yellow
taskkill /F /IM qemu-system-x86_64.exe 2>$null | Out-Null
taskkill /F /IM emulator.exe 2>$null | Out-Null
Start-Sleep -Seconds 2

# Step 2: Kill ADB server
Write-Host "🛑 Stopping ADB server..." -ForegroundColor Yellow
adb kill-server 2>$null | Out-Null
Start-Sleep -Seconds 1

# Step 3: Find emulator executable
$emulatorPath = $null
$possiblePaths = @(
    "$env:ANDROID_HOME\emulator\emulator.exe",
    "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe",
    "$env:USERPROFILE\AppData\Local\Android\Sdk\emulator\emulator.exe"
)

foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $emulatorPath = $path
        break
    }
}

if (-not $emulatorPath) {
    Write-Host "`n❌ Emulator executable not found!" -ForegroundColor Red
    Write-Host "`nPlease start the emulator from Android Studio:" -ForegroundColor Yellow
    Write-Host "1. Open Android Studio" -ForegroundColor White
    Write-Host "2. Go to Tools → Device Manager" -ForegroundColor White
    Write-Host "3. Click the dropdown ▼ next to your emulator" -ForegroundColor White
    Write-Host "4. Select 'Cold Boot Now' or 'Wipe Data'" -ForegroundColor White
    Write-Host ""
    exit 1
}

# Step 4: List available emulators
Write-Host "`n📋 Checking available emulators..." -ForegroundColor Yellow
$avds = & $emulatorPath -list-avds
Write-Host $avds

if (-not $avds -or $avds -notcontains $EmulatorName) {
    Write-Host "`n⚠️  Emulator '$EmulatorName' not found!" -ForegroundColor Yellow
    Write-Host "`nAvailable emulators:" -ForegroundColor White
    Write-Host $avds
    Write-Host "`nPlease specify the correct emulator name:" -ForegroundColor Yellow
    Write-Host ".\cold-boot-emulator.ps1 -EmulatorName 'YourEmulatorName'" -ForegroundColor White
    Write-Host ""
    exit 1
}

# Step 5: Cold boot (wipe data)
Write-Host "`n🚀 Starting cold boot (this will wipe temporary data)..." -ForegroundColor Cyan
Write-Host "   This may take 2-3 minutes on first boot..." -ForegroundColor Gray
Write-Host ""

# Start emulator in background with wipe data
Start-Process -FilePath $emulatorPath -ArgumentList "-avd", $EmulatorName, "-wipe-data" -NoNewWindow

Write-Host "✅ Emulator is starting with fresh data..." -ForegroundColor Green
Write-Host "`n⏳ Please wait for the emulator to fully boot (Android home screen visible)" -ForegroundColor Yellow
Write-Host "   This usually takes 2-3 minutes" -ForegroundColor Gray
Write-Host ""

# Wait and check for connection
Write-Host "Waiting for emulator to boot..." -ForegroundColor Cyan
$timeout = 180 # 3 minutes
$elapsed = 0

while ($elapsed -lt $timeout) {
    Start-Sleep -Seconds 10
    $elapsed += 10
    
    # Restart ADB
    adb start-server 2>$null | Out-Null
    Start-Sleep -Seconds 2
    
    # Check for devices
    $devices = adb devices | Select-Object -Skip 1 | Where-Object { $_ -match "device$" }
    
    if ($devices) {
        Write-Host "`n✅ Emulator is ready!" -ForegroundColor Green
        adb devices
        Write-Host "`nNow you can start Expo:" -ForegroundColor Yellow
        Write-Host "   npx expo start --clear" -ForegroundColor White
        Write-Host ""
        exit 0
    }
    
    Write-Host "." -NoNewline -ForegroundColor Gray
}

Write-Host "`n`n⏱️  Timeout waiting for emulator to boot" -ForegroundColor Yellow
Write-Host "The emulator may still be starting. Check Android Studio Device Manager." -ForegroundColor Gray
Write-Host ""

