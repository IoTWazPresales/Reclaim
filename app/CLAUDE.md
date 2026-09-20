@../AGENTS.md

# app/ — pointer

All agent rules, invariants, harness commands and the EIF workflow are in the repo-root **`AGENTS.md`**. This file only adds facts specific to working inside `app/`, verified 2026-09-20.

- Run `npm run typecheck`, `npm test -- --reporter=verbose`, `npm run med-catalog-qa` from **this** directory. `npm run audit:training-dual-paths` needs Git bash (see AGENTS.md §4).
- `app.config.ts` is the Expo config (there is no `app.json`); native version lives in `android/app/build.gradle` (1.0.5 / versionCode 15).
- Config plugins in `plugins/`: guided-session FGS (`withGuidedSessionForegroundService.js`, type `health`), Health Connect permission set/delegate/rationale, exact-alarm module, chronometer notifications.
- Supabase Edge Functions in `supabase/functions/` (`delete-account`, `verify-play-integrity`). Deploy with `npx supabase functions deploy <name> --project-ref bgtosdgrvjwlpqxqjvdf`; the CLI is already logged in and linked on this machine.
- Tests live beside code in `__tests__/` folders; static source-shape tests (`designLabDevOnly`, `personalDataTables`, `splitWriterUnification`, `healthConnectPermissionUse`) read files from disk — keep the referenced paths stable.
