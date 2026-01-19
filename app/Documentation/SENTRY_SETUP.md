# Sentry Setup Guide (Optional)

This guide explains how to set up Sentry for crash reporting in production builds.

## Why Sentry?

Sentry provides:
- Real-time error tracking and alerts
- Stack traces with source maps
- User impact metrics
- Performance monitoring
- Release tracking

## Installation

### Step 1: Install Sentry SDK

```bash
cd app
npm install @sentry/react-native
```

### Step 2: Configure Sentry

Create a Sentry project at https://sentry.io and get your DSN.

### Step 3: Set up Sentry in App.tsx

Add Sentry initialization at the top of `App.tsx` (before any other imports):

```typescript
import * as Sentry from '@sentry/react-native';

// Initialize Sentry (only in production builds)
if (!__DEV__ && process.env.EXPO_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    environment: process.env.EAS_BUILD_PROFILE || 'production',
    enableInExpoDevelopment: false,
    debug: false,
    tracesSampleRate: 0.1, // 10% of transactions for performance monitoring
    integrations: [
      new Sentry.ReactNativeTracing({
        tracingOrigins: ['localhost', /^https:\/\/.*\.supabase\.co/],
      }),
    ],
  });
}
```

### Step 4: Set Sentry DSN as EAS Secret

```bash
cd app
eas secret:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value "https://YOUR_SENTRY_DSN@sentry.io/PROJECT_ID"
```

Select `production` (or `all`) when prompted for environment.

### Step 5: Set User Context (Optional)

When users log in/out, update Sentry user context. This is already handled in `logger.ts` via `setSentryUser()`.

You can call it in `AuthProvider.tsx`:

```typescript
import { setSentryUser } from '@/lib/logger';

// When user logs in
useEffect(() => {
  if (session?.user) {
    setSentryUser(session.user.id, session.user.email);
  } else {
    setSentryUser(null);
  }
}, [session]);
```

### Step 6: Upload Source Maps (Optional but Recommended)

For readable stack traces, upload source maps:

```bash
npm install --save-dev @sentry/cli
```

Add to `app.config.ts`:

```typescript
plugins: [
  // ... existing plugins
  ['sentry-expo', {
    organization: 'your-org',
    project: 'your-project',
    authToken: process.env.SENTRY_AUTH_TOKEN,
  }],
]
```

Set `SENTRY_AUTH_TOKEN` as an EAS secret or local env var.

## Testing

1. Force an error in production build:
   ```typescript
   // Temporarily add to a screen
   throw new Error('Test error for Sentry');
   ```

2. Check Sentry dashboard - you should see the error within seconds.

## Current Implementation

The app is already Sentry-ready:
- ✅ Logger supports optional Sentry integration
- ✅ Error boundary logs to Sentry when available
- ✅ Set user context with `setSentryUser()`

Just install `@sentry/react-native` and set the DSN to enable it.

## Notes

- Sentry only runs in production builds (not in `__DEV__` mode)
- All Sentry calls are wrapped in try-catch to prevent crashes
- If Sentry isn't installed, logging falls back to Supabase only

