#!/bin/bash
# Bash script to verify EAS secrets are set
# Run from app directory: ./scripts/verify-eas-secrets.sh

echo "🔍 Verifying EAS Secrets..."
echo ""

REQUIRED_SECRETS=("EXPO_PUBLIC_SUPABASE_URL" "EXPO_PUBLIC_SUPABASE_ANON_KEY")
OPTIONAL_SECRETS=("EXPO_PUBLIC_APP_SCHEME" "SENTRY_DSN")

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI not found. Install it with: npm install -g eas-cli"
    exit 1
fi

EAS_VERSION=$(eas --version)
echo "✅ EAS CLI installed: $EAS_VERSION"
echo ""
echo "Checking secrets..."

# List secrets
SECRETS_OUTPUT=$(eas secret:list 2>&1)

MISSING=()

# Check required secrets
for secret in "${REQUIRED_SECRETS[@]}"; do
    if echo "$SECRETS_OUTPUT" | grep -q "$secret"; then
        echo "  ✅ $secret"
    else
        echo "  ❌ $secret (MISSING)"
        MISSING+=("$secret")
    fi
done

# Check optional secrets
for secret in "${OPTIONAL_SECRETS[@]}"; do
    if echo "$SECRETS_OUTPUT" | grep -q "$secret"; then
        echo "  ✅ $secret (optional)"
    else
        echo "  ⚠️  $secret (optional, not set)"
    fi
done

echo ""

if [ ${#MISSING[@]} -gt 0 ]; then
    echo "❌ Missing required secrets!"
    echo ""
    echo "To set missing secrets, run:"
    for secret in "${MISSING[@]}"; do
        echo "  eas secret:create --scope project --name $secret"
    done
    echo ""
    exit 1
else
    echo "✅ All required secrets are set!"
    echo ""
    echo "Next steps:"
    echo "  1. Test a production build: eas build --profile production --platform android"
    echo "  2. Check build status: eas build:list"
    exit 0
fi

