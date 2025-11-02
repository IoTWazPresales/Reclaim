# EAS Build - Supabase Configuration Setup

## Problem
When you build with EAS and install on a phone, the `.env` file is **NOT available**. You need to set environment variables as EAS secrets.

## Solution: Set EAS Environment Variables

Run these commands **manually** in PowerShell (they require interactive input):

### Step 1: Set Supabase URL

```powershell
cd C:\Reclaim\app
eas env:create EXPO_PUBLIC_SUPABASE_URL
```

When prompted:
1. **Select environment**: Choose `production` (or `all` for all environments)
2. **Enter value**: `https://bgtosdgrvjwlpqxqjvdf.supabase.co`
3. Confirm

### Step 2: Set Supabase Anon Key

```powershell
eas env:create EXPO_PUBLIC_SUPABASE_ANON_KEY
```

When prompted:
1. **Select environment**: Choose `production` (or `all` for all environments)
2. **Enter value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndG9zZGdydmp3bHBxeHFqdmRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MTc0OTAsImV4cCI6MjA3NjM5MzQ5MH0.cadqltZJMHH-nUrC1Wzr37ZnZNsCMKhGOIPfAUEVWLc`
3. Confirm

### Step 3: Verify They're Set

```powershell
eas env:list
```

You should see both variables listed.

### Step 4: Rebuild

After setting the secrets, rebuild your app:

```powershell
eas build --profile production --platform android
```

Or for preview:
```powershell
eas build --profile preview --platform android
```

## Important Notes

- ✅ **Local Development**: `.env` file works automatically
- ❌ **EAS Builds**: `.env` file is NOT available - must use `eas env:create`
- 🔒 **Secrets are encrypted** and stored securely by EAS
- 📱 **After setting secrets**: You must rebuild the app for them to take effect

## Quick Reference

Your Supabase values:
- **URL**: `https://bgtosdgrvjwlpqxqjvdf.supabase.co`
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJndG9zZGdydmp3bHBxeHFqdmRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4MTc0OTAsImV4cCI6MjA3NjM5MzQ5MH0.cadqltZJMHH-nUrC1Wzr37ZnZNsCMKhGOIPfAUEVWLc`

