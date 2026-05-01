# Sentry Setup Guide — Step by Step

Your app already has Sentry integrated. Follow these steps to start receiving crash reports.

---

## Step 1: Create a Sentry Account (if needed)

1. Go to **https://sentry.io**
2. Sign up (free tier available) or log in
3. Create an **organization** (e.g. `reclaim` or your company name)

---

## Step 2: Create a Project

1. In Sentry, click **Create Project**
2. Choose platform: **React Native**
3. Name it (e.g. `Reclaim App`)
4. Click **Create Project**
5. Sentry will show you a **DSN** — a URL like:
   ```
   https://abc123def456@o123456.ingest.sentry.io/7890123
   ```
6. **Copy this DSN** — you'll need it in the next step

---

## Step 3: Add the DSN to Your Local Environment

1. Open `app/.env` (create it from `.env.example` if it doesn't exist)
2. Add this line (replace with your actual DSN):
   ```
   EXPO_PUBLIC_SENTRY_DSN=https://YOUR_KEY@oYOUR_ORG.ingest.sentry.io/YOUR_PROJECT_ID
   ```
3. Save the file
4. Restart your dev server (`npx expo start`) so it picks up the new env var

---

## Step 4: Enable Sentry for Local Testing (Optional)

By default, Sentry only runs in **production** builds (not when `__DEV__` is true).

To test locally:

1. Open `app/src/lib/sentry.ts`
2. Change `enabled: !__DEV__` to `enabled: true` temporarily
3. Build and run a development build, trigger a test error
4. Change it back when done

Or use a **preview/production** build (see Step 5).

---

## Step 5: Set the DSN for EAS Builds (Production/Preview)

For builds done with `eas build`, the DSN must be available as an EAS secret:

1. Install EAS CLI (if needed): `npm install -g eas-cli`
2. Log in: `eas login`
3. Create the secret:
   ```bash
   cd app
   eas secret:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value "https://YOUR_KEY@oYOUR_ORG.ingest.sentry.io/YOUR_PROJECT_ID"
   ```
4. When prompted, choose **production** (or **all** to include preview builds)

---

## Step 6: Verify It Works

1. Create a **production** or **preview** build: `eas build --profile preview`
2. Install the build on a device/simulator
3. Optionally add a temporary test button that throws:
   ```tsx
   throw new Error('Sentry test error');
   ```
4. Open the app, trigger the error
5. In Sentry → **Issues**, you should see the error within a minute

---

## Step 7: Source Maps (Optional — for readable stack traces)

Without source maps, stack traces show minified code. To get readable traces:

1. In Sentry: **Settings → Auth Tokens** → Create Token  
   - Scopes: `project:releases`, `org:read`
2. Add the token as an EAS secret:
   ```bash
   eas secret:create --scope project --name SENTRY_AUTH_TOKEN --value "YOUR_AUTH_TOKEN"
   ```
3. Add the `sentry-expo` plugin to `app.config.ts` (see Sentry docs for the exact config)

---

## What's Already Wired

- `app/src/lib/sentry.ts` — initializes Sentry when DSN is set
- `App.tsx` — calls `initSentry()`, wraps app with `Sentry.wrap()`, error boundary uses `Sentry.captureException`
- `logger.ts` — can log errors to Sentry via `logErrorToSentry()`
- `setSentryUser()` — sets user context when logged in (call from AuthProvider if you want user tracking)

---

## Quick Reference

| Task                     | Command / Location                                      |
|--------------------------|---------------------------------------------------------|
| Local DSN                | `app/.env` → `EXPO_PUBLIC_SENTRY_DSN=...`              |
| EAS secret               | `eas secret:create --name EXPO_PUBLIC_SENTRY_DSN`      |
| Sentry dashboard         | https://sentry.io → Your org → Issues                  |
| Current init logic       | `app/src/lib/sentry.ts`                                |
