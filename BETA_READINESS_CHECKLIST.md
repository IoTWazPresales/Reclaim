# Beta Readiness Checklist

This document outlines what needs to be completed to make Reclaim ready for beta testing.

## 🔴 Critical (Must Have)

### 1. Build & Distribution Setup
- [ ] **Verify EAS Secrets are Set**
  - Run: `cd app && eas secret:list`
  - Ensure `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` exist for production profile
  - If missing: `eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "<your-url>" --type string`
  - Reference: `EAS_SECRETS_SETUP.md`

- [ ] **Production Build Test**
  - Build preview: `eas build --profile preview --platform android`
  - Build production: `eas build --profile production --platform android`
  - Test installation on physical device
  - Verify all features work in production build

- [ ] **App Signing Configuration**
  - ✅ Already configured for Android (debug keystore)
  - ⚠️ For production, generate proper signing key:
    ```bash
    keytool -genkeypair -v -keystore release.keystore -alias release -keyalg RSA -keysize 2048 -validity 10000
    ```
  - Configure in `eas.json`:
    ```json
    "production": {
      "android": {
        "buildType": "app-bundle",
        "gradleCommand": ":app:bundleRelease"
      }
    }
    ```

### 2. Error Handling & Crash Reporting
- [ ] **Add Sentry (or similar crash reporting)**
  ```bash
  npm install @sentry/react-native
  npx @sentry/wizard -i reactNative -p ios android
  ```
  - Configure in `App.tsx` with environment detection
  - Add error boundaries around critical sections
  - Test error reporting works in production

- [ ] **Enhance Error Boundaries**
  - Current: Basic error boundary in `App.tsx` ✅
  - Add: Recovery actions (restart app, clear cache)
  - Add: Error ID for user to report
  - Test: Force errors and verify graceful handling

### 3. Production Infrastructure
- [ ] **Supabase Production Setup**
  - Create production Supabase project (separate from dev)
  - Review and tighten Row Level Security (RLS) policies
  - Set up automated backups
  - Configure rate limiting
  - Monitor: Database size, API usage, error rates

- [ ] **Environment Configuration**
  - ✅ Dev environment uses `.env` file
  - ⚠️ Production uses EAS secrets (verify set)
  - Add staging environment if needed

### 4. Privacy & Legal
- [ ] **Privacy Policy**
  - Create privacy policy covering:
    - Data collection (health data, mood, medications)
    - Data storage (Supabase, SecureStore)
    - Third-party integrations (Google Fit, Apple HealthKit)
    - User rights (export, delete data)
  - Host online and link from Settings → About

- [ ] **Terms of Service**
  - Create ToS covering:
    - App is educational, not medical advice
    - Beta disclaimer (data may be reset)
    - User responsibilities
  - Link from Settings → About

- [ ] **Data Retention Policy**
  - Document how long data is stored
  - Add auto-deletion for inactive accounts (optional)

## 🟡 Important (Should Have)

### 5. Network & Offline Handling
- [ ] **Network Status Detection**
  ```typescript
  import NetInfo from '@react-native-community/netinfo';
  ```
  - Show offline indicator
  - Queue operations when offline
  - Sync when connection restored

- [ ] **Offline Data Caching**
  - Cache mood logs, med schedules locally
  - Sync on next connection
  - Show "syncing" indicator

- [ ] **Error Messages**
  - Replace generic errors with user-friendly messages
  - Add retry buttons for network failures
  - Show "Check your connection" when offline

### 6. Beta Tester Experience
- [ ] **Create Beta Tester Guide**
  - Installation instructions
  - Account setup process
  - Key features overview
  - Known issues list
  - How to report bugs

- [ ] **Feedback Collection**
  - In-app feedback form (Settings → Send Feedback)
  - Or use external tool (Google Forms, Typeform)
  - Include: email, description, screenshots, device info

- [ ] **Version & Release Notes**
  - Display app version in Settings → About
  - Show "What's New" modal on update
  - Track changes in `CHANGELOG.md`

### 7. Analytics & Monitoring
- [ ] **Enhanced Telemetry** (Current: Basic ✅)
  - Add user properties (device type, OS version)
  - Track key user flows (onboarding completion, feature usage)
  - Monitor crash-free sessions
  - Set up alerts for critical errors

- [ ] **Performance Monitoring**
  - Track app startup time
  - Monitor API response times
  - Identify slow screens

## 🟢 Nice to Have

### 8. Testing
- [ ] **Manual QA Checklist**
  - Authentication flows (email, Google OAuth)
  - Mood logging (all scenarios)
  - Medication scheduling and reminders
  - Sleep data sync (all providers)
  - Health integrations (Apple HealthKit, Google Fit)
  - Notifications (all types)
  - Data export (JSON, CSV)
  - Settings toggles
  - Onboarding flow
  - Error scenarios (offline, invalid input)

- [ ] **Automated Tests**
  - ✅ Unit tests exist (Vitest)
  - Add integration tests for critical flows
  - E2E tests with Detox or Maestro (optional)

### 9. Documentation
- [ ] **User Documentation**
  - Quick start guide
  - Feature explanations
  - Troubleshooting FAQ

- [ ] **Developer Documentation**
  - API documentation
  - Architecture overview
  - Contributing guidelines (if open source)

### 10. App Store Preparation (Future)
- [ ] **App Store Assets**
  - Screenshots (all required sizes)
  - App description
  - Privacy policy URL
  - Support URL

- [ ] **TestFlight / Internal Testing**
  - Set up TestFlight for iOS
  - Set up Google Play Internal Testing for Android
  - Distribute to beta testers

## 📋 Pre-Beta Checklist

Before distributing to beta testers, verify:

1. ✅ All critical items above are complete
2. ✅ Production build installs and runs correctly
3. ✅ All core features work (auth, mood, meds, sleep, insights)
4. ✅ Error handling doesn't crash the app
5. ✅ Privacy policy and terms are accessible
6. ✅ Beta tester guide is ready
7. ✅ Feedback collection mechanism is set up
8. ✅ Known issues are documented
9. ✅ App version is visible and correct

## 🚀 Quick Start Commands

```bash
# Verify EAS secrets
cd app
eas secret:list

# Build preview for testing
eas build --profile preview --platform android

# Build production
eas build --profile production --platform android

# Check app configuration
eas build:configure

# View build status
eas build:list
```

## 📝 Notes

- **Current Status**: App has solid foundation with error boundary, telemetry, onboarding, and core features
- **Priority**: Focus on critical items first (build setup, crash reporting, privacy)
- **Timeline**: Critical items can be done in 1-2 days; full beta readiness in 3-5 days
- **Testing**: Test on physical devices, not just emulators

