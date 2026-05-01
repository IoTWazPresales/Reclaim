# PowerShell script to verify EAS secrets are set
# Run from app directory: .\scripts\verify-eas-secrets.ps1

Write-Host "🔍 Verifying EAS Secrets..." -ForegroundColor Cyan
Write-Host ""

$requiredSecrets = @(
    "EXPO_PUBLIC_SUPABASE_URL",
    "EXPO_PUBLIC_SUPABASE_ANON_KEY"
)

$optionalSecrets = @(
    "EXPO_PUBLIC_APP_SCHEME",
    "SENTRY_DSN"
)

$missing = @()
$found = @()

# Check if EAS CLI is installed
try {
    $easVersion = eas --version 2>$null
    Write-Host "✅ EAS CLI installed: $easVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ EAS CLI not found. Install it with: npm install -g eas-cli" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Checking secrets..." -ForegroundColor Yellow

# List secrets
try {
    $secretsOutput = eas secret:list 2>&1 | Out-String
    
    foreach ($secret in $requiredSecrets) {
        if ($secretsOutput -match $secret) {
            Write-Host "  ✅ $secret" -ForegroundColor Green
            $found += $secret
        } else {
            Write-Host "  ❌ $secret (MISSING)" -ForegroundColor Red
            $missing += $secret
        }
    }

    foreach ($secret in $optionalSecrets) {
        if ($secretsOutput -match $secret) {
            Write-Host "  ✅ $secret (optional)" -ForegroundColor Green
            $found += $secret
        } else {
            Write-Host "  ⚠️  $secret (optional, not set)" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "❌ Failed to list secrets. Make sure you're logged in: eas login" -ForegroundColor Red
    exit 1
}

Write-Host ""

if ($missing.Count -gt 0) {
    Write-Host "❌ Missing required secrets!" -ForegroundColor Red
    Write-Host ""
    Write-Host "To set missing secrets, run:" -ForegroundColor Yellow
    foreach ($secret in $missing) {
        Write-Host "  eas secret:create --scope project --name $secret" -ForegroundColor White
    }
    Write-Host ""
    exit 1
} else {
    Write-Host "✅ All required secrets are set!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Test a production build: eas build --profile production --platform android" -ForegroundColor White
    Write-Host "  2. Check build status: eas build:list" -ForegroundColor White
    exit 0
}

