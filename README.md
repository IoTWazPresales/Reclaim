# Reclaim (MVP)

Mobile app scaffold for **Fusion Corporation** — recovery & performance assistant.

## Stack
- Expo (React Native, TypeScript)
- Zustand (state), React Query (server cache)
- NativeWind/Tailwind classes (className on RN components)
- Supabase client wiring (optional; env guarded)
- GitHub Actions CI (typecheck)

## Quick Start

```bash
git clone <your repo url> reclaim
cd reclaim/app
cp .env.example .env   # fill in Supabase URL + anon key (see below)
npm install            # install dependencies
npm run start          # open Android emulator or Expo Go
```

## Environment variables

Create `app/.env` from the provided example:

```ini
EXPO_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
EXPO_PUBLIC_SUPABASE_ANON_KEY="SUPABASE_ANON_KEY"
EXPO_PUBLIC_APP_SCHEME="reclaim"
```

- The `EXPO_PUBLIC_SUPABASE_*` values come from your Supabase project settings → API.
- `EXPO_PUBLIC_APP_SCHEME` controls OAuth deep-linking (must match the scheme configured in Supabase redirect URLs).
- For EAS builds, also set `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and `EXPO_PUBLIC_APP_SCHEME` as project secrets (`eas secret:create ...`).

## Feature notes

- **Health integrations:** Connectors for Google Fit, Health Connect, Samsung Health, and Apple HealthKit are available from the Sleep screen. Garmin and Huawei appear as placeholders with instructions.
- **Background sync:** Automatically syncs health data roughly once per hour when enabled in Settings → Recovery. Requires the task scheduler permissions provided in `app.config.ts`.
- **Quiet hours & snooze:** Medication reminders respect the quiet-hours window set under Settings → Notifications.
- **Telemetry:** Selected in-app actions log lightweight events to the Supabase `app_logs` table when available.


## Notes
- Path alias `@` is configured via Babel module-resolver.
- Supabase envs are optional. Without them, client warns but won't crash.
- Timer typing fixed for RN; cleanup on unmount ensured.
- Expo `app.json` cleaned (no unsupported fields).
