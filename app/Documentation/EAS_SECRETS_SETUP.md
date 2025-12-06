# EAS Secrets Setup for Supabase

## The Problem
In EAS builds, environment variables from `.env` files are NOT automatically available. You need to set them as EAS secrets.

## Quick Fix - Set EAS Secrets

Run these commands in PowerShell:

```powershell
cd C:\Reclaim\app

# Set Supabase URL
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://bgtosdgrvjwlpqxqjvdf.supabase.co"

# Set Supabase Anon Key
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndG9zZGdydmp3bHBxeHFqdmRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MTc0OTAsImV4cCI6MjA3NjM5MzQ5MH0.cadqltZJMHH-nUrC1Wzr37ZnZNsCMKhGOIPfAUEVWLc"
```

## Verify Secrets Are Set

```powershell
eas secret:list
```

You should see:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## After Setting Secrets

1. Rebuild your app:
   ```powershell
   eas build --profile preview --platform android
   ```

2. Or for local development build:
   ```powershell
   npx expo run:android
   ```

## For Local Development

For local development (not EAS builds), your `.env` file in the `app` directory will work fine.

## Notes

- Secrets are encrypted and stored securely by EAS
- They're automatically injected as environment variables during builds
- They're available via `process.env.EXPO_PUBLIC_*` in your app code
- They're also loaded into `app.config.ts` during build evaluation

