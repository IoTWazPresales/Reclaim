# Setting Up EAS Secrets for Supabase

## Problem
When building with EAS (production builds), the `.env` file is NOT available. You need to set environment variables as EAS secrets.

## Solution: Set EAS Secrets

Run these commands **manually** in your terminal (they require interactive input):

```powershell
cd C:\Reclaim\app

# Set Supabase URL
eas env:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://bgtosdgrvjwlpqxqjvdf.supabase.co"

# Set Supabase Anon Key  
eas env:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndG9zZGdydmp3bHBxeHFqdmRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MTc0OTAsImV4cCI6MjA3NjM5MzQ5MH0.cadqltZJMHH-nUrC1Wzr37ZnZNsCMKhGOIPfAUEVWLc"
```

## For Local Development (Expo Go / Development Builds)

Your `.env` file in the `app` directory should work fine. Just make sure:
1. The `.env` file exists in `C:\Reclaim\app\.env`
2. It contains:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://bgtosdgrvjwlpqxqjvdf.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndG9zZGdydmp3bHBxeHFqdmRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MTc0OTAsImV4cCI6MjA3NjM5MzQ5MH0.cadqltZJMHH-nUrC1Wzr37ZnZNsCMKhGOIPfAUEVWLc
   ```
3. Restart Expo: `npx expo start --clear`

## Verify Secrets Are Set

```powershell
eas env:list
```

You should see both secrets listed.

## Important Notes

- **Local Development**: `.env` file works automatically
- **EAS Builds**: Must use `eas env:create` to set secrets
- **Both methods**: Result in the same `process.env.EXPO_PUBLIC_*` variables in your code

