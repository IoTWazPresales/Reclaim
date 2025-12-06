# OAuth PKCE Error - EAS Build Solution

## Issue
**Error**: `AuthApiError: invalid request: both auth code and verifier should be non empty`

This error occurs when the PKCE code verifier stored during OAuth initiation cannot be retrieved during code exchange.

## Why This Happens in Development
- SecureStore behavior differs in Expo Go/development builds
- Storage context may not persist between OAuth initiation and callback
- Deep linking handling can be inconsistent in development mode

## Solution: Use EAS Build
OAuth PKCE flow works much more reliably in EAS production builds because:
1. ✅ SecureStore has full native support
2. ✅ Deep linking is properly configured
3. ✅ Storage persistence is guaranteed
4. ✅ Better error handling and logging

## Building with EAS

### 1. Ensure EAS is configured
```bash
cd app
eas build:configure
```

### 2. Set up EAS secrets (if not already done)
```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "your-url"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-key"
```

### 3. Build for Android (development build)
```bash
eas build --platform android --profile development
```

### 4. Install on device/emulator
After build completes, install the APK and test OAuth.

## Alternative: Development Workaround
If you need to test OAuth in development mode, you can:
1. Use email/password authentication instead
2. Test OAuth only in EAS builds
3. Ensure the app doesn't restart between OAuth initiation and callback

## Expected Behavior in EAS Build
- OAuth flow should complete without code verifier errors
- Deep linking should work reliably
- Session should persist correctly

## Testing Checklist
- [ ] EAS build installed on device/emulator
- [ ] Google OAuth button works
- [ ] OAuth callback is received
- [ ] Session is created successfully
- [ ] User is navigated to app after sign-in

