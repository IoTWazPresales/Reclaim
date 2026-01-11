# Fix Server Connection Script
# Use this when the AI assistant or Metro bundler can't connect to the server

Write-Host "🔧 Fixing server connection issues..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Navigate to app directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$appPath = Split-Path -Parent $scriptPath
Set-Location -Path $appPath

Write-Host "📋 Step 1: Checking environment variables..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "   ✓ .env file exists" -ForegroundColor Green
    
    # Check if .env has required variables
    $envContent = Get-Content .env -Raw
    if ($envContent -match "EXPO_PUBLIC_SUPABASE_URL" -and $envContent -match "EXPO_PUBLIC_SUPABASE_ANON_KEY") {
        Write-Host "   ✓ Required environment variables found" -ForegroundColor Green
    } else {
        Write-Host "   ✗ Missing required environment variables in .env" -ForegroundColor Red
        Write-Host "   → Please check your .env file has EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ✗ .env file missing!" -ForegroundColor Red
    Write-Host "   → Creating from env.example..." -ForegroundColor Yellow
    if (Test-Path "..\env.example") {
        Copy-Item "..\env.example" ".env"
        Write-Host "   ✓ Created .env file. Please fill in your values." -ForegroundColor Green
    } else {
        Write-Host "   ✗ env.example not found. Please create .env manually." -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "📱 Step 2: Checking ADB server..." -ForegroundColor Yellow
try {
    $adbResult = adb devices 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✓ ADB server is running" -ForegroundColor Green
        $deviceCount = ($adbResult | Select-String "device$").Count
        if ($deviceCount -gt 0) {
            Write-Host "   ✓ Found $deviceCount connected device(s)" -ForegroundColor Green
        } else {
            Write-Host "   ⚠ No devices connected (this is OK if using a physical device on WiFi)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ✗ ADB server not responding. Restarting..." -ForegroundColor Yellow
        adb kill-server
        Start-Sleep -Seconds 2
        adb start-server
        Write-Host "   ✓ ADB server restarted" -ForegroundColor Green
    }
} catch {
    Write-Host "   ✗ ADB not found or error: $_" -ForegroundColor Red
    Write-Host "   → Make sure Android SDK platform-tools are in your PATH" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🧹 Step 3: Clearing caches..." -ForegroundColor Yellow
if (Test-Path ".expo") {
    Remove-Item -Recurse -Force ".expo" -ErrorAction SilentlyContinue
    Write-Host "   ✓ Cleared .expo cache" -ForegroundColor Green
}
if (Test-Path "node_modules\.cache") {
    Remove-Item -Recurse -Force "node_modules\.cache" -ErrorAction SilentlyContinue
    Write-Host "   ✓ Cleared node_modules cache" -ForegroundColor Green
}

Write-Host ""
Write-Host "🔄 Step 4: Checking Node processes..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "   ⚠ Found $($nodeProcesses.Count) Node.js process(es) running" -ForegroundColor Yellow
    Write-Host "   → If Metro bundler is stuck, you may need to kill these manually:" -ForegroundColor Yellow
    Write-Host "     taskkill /F /IM node.exe" -ForegroundColor Gray
} else {
    Write-Host "   ✓ No Node.js processes running (ready for fresh start)" -ForegroundColor Green
}

Write-Host ""
Write-Host "🌐 Step 5: Checking network connectivity..." -ForegroundColor Yellow
try {
    $testUrl = "https://bgtosdgrvjwlpqxqjvdf.supabase.co"
    $response = Invoke-WebRequest -Uri $testUrl -Method Head -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   ✓ Can reach Supabase server" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Cannot reach Supabase server: $_" -ForegroundColor Red
    Write-Host "   → Check your internet connection and firewall settings" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📦 Step 6: Checking Metro bundler port..." -ForegroundColor Yellow
$port8081 = Get-NetTCPConnection -LocalPort 8081 -ErrorAction SilentlyContinue
if ($port8081) {
    Write-Host "   ⚠ Port 8081 is in use (Metro may already be running)" -ForegroundColor Yellow
    Write-Host "   → If Metro is stuck, kill it with: taskkill /F /IM node.exe" -ForegroundColor Yellow
} else {
    Write-Host "   ✓ Port 8081 is available" -ForegroundColor Green
}

Write-Host ""
Write-Host "✅ Diagnostic complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🔧 Next steps:" -ForegroundColor Cyan
Write-Host "   1. If ADB had issues, restart it: adb kill-server && adb start-server" -ForegroundColor White
Write-Host "   2. Start Metro bundler: npx expo start --clear" -ForegroundColor White
Write-Host "   3. If using emulator, make sure it's running FIRST" -ForegroundColor White
Write-Host "   4. Press 'a' when Metro is ready to open on Android" -ForegroundColor White
Write-Host ""
Write-Host "📝 Common fixes:" -ForegroundColor Cyan
Write-Host "   - Restart ADB: adb kill-server; adb start-server" -ForegroundColor White
Write-Host "   - Clear all caches: Remove-Item -Recurse -Force .expo,node_modules\.cache" -ForegroundColor White
Write-Host "   - Kill stuck processes: taskkill /F /IM node.exe" -ForegroundColor White
Write-Host "   - Restart Metro: npx expo start --clear" -ForegroundColor White
Write-Host ""