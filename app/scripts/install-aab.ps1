# PowerShell script to convert and install .aab file
# Usage: .\scripts\install-aab.ps1 -AabPath "path/to/app.aab"

param(
    [Parameter(Mandatory=$true)]
    [string]$AabPath,
    
    [string]$BundletoolPath = "bundletool.jar",
    [string]$KeystorePath = "",
    [string]$KeystorePassword = "",
    [string]$KeyAlias = "",
    [string]$KeyPassword = ""
)

Write-Host "🔧 Converting AAB to APK..." -ForegroundColor Cyan

# Check if bundletool exists
if (-not (Test-Path $BundletoolPath)) {
    Write-Host "❌ bundletool.jar not found at: $BundletoolPath" -ForegroundColor Red
    Write-Host ""
    Write-Host "Download from: https://github.com/google/bundletool/releases" -ForegroundColor Yellow
    Write-Host "Or use preview profile to build APK directly: eas build --profile preview --platform android" -ForegroundColor Yellow
    exit 1
}

# Check if AAB file exists
if (-not (Test-Path $AabPath)) {
    Write-Host "❌ AAB file not found: $AabPath" -ForegroundColor Red
    exit 1
}

$OutputDir = "bundletool-output"
$ApksPath = Join-Path $OutputDir "app.apks"

# Create output directory
if (Test-Path $OutputDir) {
    Remove-Item -Recurse -Force $OutputDir
}
New-Item -ItemType Directory -Path $OutputDir | Out-Null

# Build command
$BuildCommand = "java -jar `"$BundletoolPath`" build-apks --bundle=`"$AabPath`" --output=`"$ApksPath`" --mode=universal"

# Add keystore if provided
if ($KeystorePath -and (Test-Path $KeystorePath)) {
    $BuildCommand += " --ks=`"$KeystorePath`""
    if ($KeystorePassword) {
        $BuildCommand += " --ks-pass=pass:$KeystorePassword"
    }
    if ($KeyAlias) {
        $BuildCommand += " --ks-key-alias=$KeyAlias"
    }
    if ($KeyPassword) {
        $BuildCommand += " --key-pass=pass:$KeyPassword"
    }
}

Write-Host "Running: $BuildCommand" -ForegroundColor Gray
Invoke-Expression $BuildCommand

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to convert AAB to APK" -ForegroundColor Red
    exit 1
}

# Extract APK from APKS (which is a ZIP file)
Write-Host "📦 Extracting APK..." -ForegroundColor Cyan
Expand-Archive -Path $ApksPath -DestinationPath $OutputDir -Force

$UniversalApk = Join-Path $OutputDir "universal.apk"

if (-not (Test-Path $UniversalApk)) {
    Write-Host "❌ universal.apk not found in $OutputDir" -ForegroundColor Red
    exit 1
}

Write-Host "✅ APK extracted: $UniversalApk" -ForegroundColor Green

# Check if adb is available
$adbExists = Get-Command adb -ErrorAction SilentlyContinue

if ($adbExists) {
    Write-Host ""
    Write-Host "📱 Checking for connected devices..." -ForegroundColor Cyan
    $devices = adb devices | Select-Object -Skip 1 | Where-Object { $_ -match "device$" }
    
    if ($devices) {
        Write-Host "✅ Found $(@($devices).Count) device(s)" -ForegroundColor Green
        Write-Host ""
        Write-Host "Installing APK..." -ForegroundColor Cyan
        adb install -r $UniversalApk
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ App installed successfully!" -ForegroundColor Green
        } else {
            Write-Host "❌ Installation failed" -ForegroundColor Red
            Write-Host "Try manually: adb install $UniversalApk" -ForegroundColor Yellow
        }
    } else {
        Write-Host "⚠️  No devices found. Install manually:" -ForegroundColor Yellow
        Write-Host "   adb install $UniversalApk" -ForegroundColor White
        Write-Host "   Or transfer $UniversalApk to your device" -ForegroundColor White
    }
} else {
    Write-Host "⚠️  ADB not found. Install manually:" -ForegroundColor Yellow
    Write-Host "   1. Transfer $UniversalApk to your device" -ForegroundColor White
    Write-Host "   2. Enable 'Install from unknown sources' in Settings" -ForegroundColor White
    Write-Host "   3. Tap the APK file to install" -ForegroundColor White
}

Write-Host ""
Write-Host "APK location: $UniversalApk" -ForegroundColor Cyan

