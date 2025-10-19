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
cp .env.example .env   # fill in SUPABASE URL + ANON KEY if you have them
pnpm i                 # or npm i
pnpm start             # open Android emulator or Expo Go
```

## Notes
- Path alias `@` is configured via Babel module-resolver.
- Supabase envs are optional. Without them, client warns but won't crash.
- Timer typing fixed for RN; cleanup on unmount ensured.
- Expo `app.json` cleaned (no unsupported fields).
