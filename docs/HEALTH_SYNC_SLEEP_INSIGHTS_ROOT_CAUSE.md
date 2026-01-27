# Health Connect / Sleep / Insights – Root Cause Analysis

This document traces the code and logic for the four reported issues **without making changes**. It describes where errors are, why they are reproducible, and how to fix them.

---

## 1. Have to disconnect and reconnect Health Connect for data to pull through (Integrations screen)

### Process flow (simulated)

1. **Connect flow**  
   - User taps Connect on Health Connect → `handleConnectIntegration('health_connect')`  
   - `connectIntegration('health_connect')` → `integrations.ts` `connectHealthConnect()`  
   - `healthConnectRequestPermissions(HEALTH_CONNECT_DEFAULT_METRICS)` runs (permission dialog)  
   - On success → `markIntegrationConnected('health_connect')`  
   - Returns `{ success: true }` to IntegrationsScreen.

2. **Post-connect sync**  
   - IntegrationsScreen: `if (id === 'health_connect' && result?.success)`  
   - Calls `syncHealthData()` then invalidates `['sleep:last']`, `['sleep:sessions:30d']`, `['dashboard:lastSleep']`.

3. **Inside syncHealthData (HC sleep block)**  
   - `healthConnectIsAvailable()`  
   - `healthConnectHasPermissions()` **with no args** → uses `DEFAULT_PERMISSION_METRICS` = `HEALTH_CONNECT_SLEEP_METRICS`  
   - `healthConnectGetSleepSessions(30)`  
   - For each session → `upsertSleepSessionFromHealth(...)` and `existingDateKeys.add(dayKey)`.

4. **“Import latest data” flow**  
   - User taps “Import latest data” → `handleImportPress()` → `setImportModalVisible(true)`  
   - `useEffect([importModalVisible])` runs `processImport()` when modal opens.  
   - **`processImport()`** (IntegrationsScreen.tsx ~264–359):  
     - Loops over `connectedIntegrations`.  
     - For each provider: 800ms delay, then sets step status to `'success'`.  
     - At the end: `qc.invalidateQueries({ queryKey: ['sleep:last'] })` and `['sleep:sessions:30d']`.  
   - **It never calls `syncHealthData()` or any real sync.**  
   - So “Import latest data” only updates UI and invalidates queries; it does **not** pull from Health Connect or write to Supabase.

### Root causes

| Cause | Location | What happens |
|-------|----------|--------------|
| **A) First-connect race** | `integrations.ts` → `connectHealthConnect()` returns immediately after `healthConnectRequestPermissions()`; then IntegrationsScreen calls `syncHealthData()` in the same turn. On some devices, `getGrantedPermissions()` inside `healthConnectHasPermissions()` can still see the old state before the system has committed the new permissions. So `hcHasPerms` is false, `healthConnectGetSleepSessions(30)` is never called, 0 sessions, nothing written. On **reconnect**, permissions are already stored, so sync works. | Reproducible when the OS is slow to persist permission grants. |
| **B) “Import latest data” is a no-op for sync** | `IntegrationsScreen.tsx` `processImport()` | “Import latest data” never runs `syncHealthData()`. So the only way to trigger sync from Integrations is at **connect** time. If (A) happened, the user’s only way to get data without going to Dashboard is disconnect/reconnect. |

### Connection chain (files)

- `IntegrationsScreen.tsx` → `handleConnectIntegration` → `connectIntegration(id)` from `useHealthIntegrationsList`  
- `useHealthIntegrationsList.ts` → `definition.connect()`  
- `lib/health/integrations.ts` → `connectHealthConnect()` → `healthConnectRequestPermissions()` then `markIntegrationConnected()`  
- Back in IntegrationsScreen: `syncHealthData()` is called only in the `if (id === 'health_connect' && result?.success)` branch after connect.  
- `processImport()` only updates step status and invalidates queries; it does not call `syncHealthData()`.

### How to fix

1. **“Import latest data” must run real sync**  
   - In `processImport()`, before or while updating step status, call `syncHealthData()` (or an equivalent that pulls from Health Connect and writes to Supabase).  
   - Map “running”/“success”/“error” to the actual sync result (e.g. show “Syncing…” while `syncHealthData()` runs, then “Imported” or an error message).

2. **First-connect race**  
   - After `connectHealthConnect()` succeeds, **delay sync slightly** (e.g. 300–500 ms) before calling `syncHealthData()`, so the system has time to persist `getGrantedPermissions()`.  
   - Or: run sync inside a short retry loop (e.g. up to 3 attempts, 500 ms apart) until `healthConnectHasPermissions()` is true or max retries reached.  
   - Prefer a small delay or one retry rather than large refactors.

---

## 2. Data still not getting uploaded into Supabase

### Process flow (simulated)

1. **Write path**  
   - Only place that writes sleep to Supabase from Health Connect is `syncHealthData()` in `lib/sync.ts`.  
   - It uses `getExistingSleepDateKeys(startRange, endRange)` then, for each HC session, `upsertSleepSessionFromHealth(...)` from `lib/api.ts`.  
   - `upsertSleepSessionFromHealth` builds a row and calls `supabase.from('sleep_sessions').upsert(row, { onConflict: 'id' })`.

2. **When sync runs**  
   - On Health Connect **connect** (IntegrationsScreen).  
   - On Dashboard **app foreground** (runHealthSync) and **“Sync health”** manual trigger.  
   - **Not** when the user taps “Import latest data” on Integrations (see §1).

3. **Dedup key mismatch**  
   - `getExistingSleepDateKeys()` (sync.ts ~126–147): for each row it does `key = toDateKey(row?.end_time ?? row?.start_time)`. So keys are based on **end_time** (or start_time).  
   - In the HC sleep loop (sync.ts ~295), `dayKey = toDateKey(startTime)`. So we skip when **start** date is in `existingDateKeys`, but we filled `existingDateKeys` from **end** (or start) of DB rows.  
   - Example: DB has “22nd 23:00 → 23rd 07:00”. We add key `"2025-01-23"` (end). HC sends “23rd 23:00 → 24th 07:00”. We use `dayKey = "2025-01-23"` (start). We **skip** that session because `existingDateKeys.has("2025-01-23")` is true, even though it’s a **different night**.  
   - So we can **wrongly skip** new sessions and never upload them.

### Root causes

| Cause | Location | What happens |
|-------|----------|--------------|
| **Sync not triggered from “Import latest data”** | IntegrationsScreen `processImport()` | Same as §1: no `syncHealthData()`, so nothing is uploaded when the user uses that button. |
| **First-connect permission race** | sync.ts HC block + integrations connect flow | If `healthConnectHasPermissions()` is false on first run after connect, we never call `healthConnectGetSleepSessions`, so no uploads. |
| **Dedup key inconsistency** | `sync.ts`: `getExistingSleepDateKeys` vs HC loop `dayKey` | Existing keys use `end_time ?? start_time`; sync uses `startTime` only. One night can be keyed by “end” in DB and “start” in sync, leading to incorrect skips. |
| **Supabase/RLS/requireUser** | `api.ts` `upsertSleepSessionFromHealth` | If RLS, schema, or `requireUser()` fails, we `logger.warn` and continue. No retry and no feedback to the user that upload failed. |

### Connection chain (files)

- `lib/sync.ts`: `syncHealthData()` → `getExistingSleepDateKeys()`, `healthConnectGetSleepSessions()`, `upsertSleepSessionFromHealth()`  
- `lib/api.ts`: `upsertSleepSessionFromHealth()` → `requireUser()`, `supabase.from('sleep_sessions').upsert(...)`  
- `getExistingSleepDateKeys` uses `supabase.from('sleep_sessions').select('start_time,end_time').gte(...).lte(...)`.

### How to fix

1. **Trigger sync from “Import latest data”**  
   - As in §1: call `syncHealthData()` inside `processImport()` and map UI state to sync result.

2. **Align dedup key with sync**  
   - Use the **same** rule in both places. Recommended: key by **start_time** in `getExistingSleepDateKeys` (e.g. `key = toDateKey(new Date(row.start_time))` for each row), and keep `dayKey = toDateKey(startTime)` in the HC loop.  
   - Alternatively, key by “night” consistently (e.g. “day of start” for sleep sessions) and use that same definition in both `getExistingSleepDateKeys` and the sync loop.

3. **First-connect race**  
   - As in §1: short delay or retry before/inside sync when we just finished connecting.

4. **Visibility of upload failures**  
   - Consider surfacing “some sessions failed to save” (e.g. toast or step status) when `upsertSleepSessionFromHealth` throws, and optionally retry once per session.

---

## 3. Sleep screen scientific insight still displays “Sync or log sleep”

### Process flow (simulated)

1. **Insight selection**  
   - Sleep screen uses `useScientificInsights()` and renders the top insight.  
   - Picker: `pickInsightForScreen(insights, { preferredScopes: ['sleep'], ... })` (or equivalent).  
   - If no insight matches the sleep scope, it uses `contextualFallback('sleep')`, which returns the message **“Sync or log sleep to unlock better sleep nudges.”**  
   - Defined in `lib/insights/pickInsightForScreen.ts` line ~28.

2. **Where insights come from**  
   - `InsightsProvider.refresh()` → `fetchInsightContext()` (contextBuilder.ts).  
   - `fetchInsightContext()` calls `listSleepSessions(14)` from `@/lib/api` → **Supabase only**: `supabase.from('sleep_sessions').select(...).gte('start_time', since)...`  
   - So insight context uses **only** `sleep_sessions` in Supabase. It does **not** read from Health Connect or any integration.

3. **When “Sync or log sleep” is shown**  
   - When the engine returns no insight that matches the sleep scope.  
   - That happens when `context.sleep` is undefined or when no rule’s conditions are satisfied.  
   - `sleepContext(sessions)` in contextBuilder returns `undefined` when `sessions.length === 0`.  
   - So if `listSleepSessions(14)` returns **[]** (i.e. Supabase `sleep_sessions` is empty for that user), we get `context.sleep === undefined`, no sleep insight matches, and we fall back to “Sync or log sleep”.

### Root causes

| Cause | Location | What happens |
|-------|----------|--------------|
| **Insight context uses only Supabase** | `lib/insights/contextBuilder.ts` `fetchInsightContext()` | Uses `listSleepSessions(14)` only. If `sleep_sessions` is empty, `context.sleep` is undefined → no sleep insight → fallback message. |
| **Empty or stale Supabase** | Same as §2 | If sync never runs, or fails, or skips sessions (§2), `sleep_sessions` stays empty or stale, so insights keep showing “Sync or log sleep.” |

### Connection chain (files)

- SleepScreen → `useScientificInsights()` → `InsightsProvider`  
- `InsightsProvider.refresh()` → `fetchInsightContext()` (contextBuilder.ts)  
- `fetchInsightContext()` → `listSleepSessions(14)` (api.ts) → `supabase.from('sleep_sessions')`  
- `pickInsightForScreen.ts` → `contextualFallback('sleep')` when no sleep insight is chosen.

### How to fix

1. **Ensure sleep_sessions is populated**  
   - Fix sync and “Import latest data” as in §1 and §2 so that Health Connect data is actually written to Supabase.  
   - Once `sleep_sessions` has rows, `listSleepSessions(14)` returns data, `context.sleep` is set, and the engine can match sleep rules instead of showing the fallback.

2. **Optional: use integration data for insights when Supabase is empty**  
   - In `fetchInsightContext()`, if `listSleepSessions(14)` is empty, you could optionally call a small helper that returns “latest N sessions” from the preferred health integration (e.g. Health Connect), map them to the same shape as DB rows, and pass that into `sleepContext()`.  
   - This is a larger change; fixing §1 and §2 is usually enough so that Supabase is no longer empty.

---

## 4. Still not pulling latest sleep data into the app (last data 23rd Jan)

### Process flow (simulated)

1. **SleepScreen data sources**  
   - **fetchLastSleepSession** (SleepScreen.tsx ~736):  
     - Tries each provider in `sleepProviderOrder` via `fetchLatestFromIntegration(providerId)` (Health Connect / Google Fit **directly**).  
     - If all return null, falls back to `listSleepSessions(30)` (Supabase).  
   - **fetchSleepSessions** (SleepScreen.tsx ~754):  
     - **First** calls `listSleepSessions(days)` (Supabase).  
     - **If `rows.length`** → returns those rows and **never** calls integrations.  
     - Only if Supabase returns **[]** does it try `fetchSessionsFromIntegration(providerId, days)` for each provider.

2. **Consequence**  
   - If Supabase has **any** rows (e.g. up to 23 Jan), `fetchSleepSessions(30)` returns those and the UI shows “last data 23rd Jan”.  
   - We **never** ask Health Connect for sessions, so we never show newer data that exists only in HC.  
   - So “last data 23rd Jan” is expected when: (a) Supabase has data through 23 Jan, and (b) sync after that either didn’t run, failed, or skipped new nights (§2).

### Root causes

| Cause | Location | What happens |
|-------|----------|--------------|
| **Supabase-first, integration fallback** | SleepScreen `fetchSleepSessions` | As long as Supabase returns ≥1 row, we never hit the integration. So we never “pull latest” from Health Connect when Supabase is merely stale. |
| **Sync not uploading new data** | Same as §2 | If sync doesn’t run or wrongly skips new sessions, Supabase never gets post–23 Jan data, so the app keeps showing 23 Jan. |

### Connection chain (files)

- SleepScreen `fetchSleepSessions` → `listSleepSessions(days)` (api.ts) → Supabase; only on empty result → `fetchSessionsFromIntegration(providerId, days)`.  
- `fetchLastSleepSession` → integrations first, then Supabase – so “last” can be fresher, but the **sessions list** is still Supabase-first.

### How to fix

1. **Fix sync and “Import latest data”**  
   - So that new nights are written to Supabase (§1 and §2). Then “last data” will move forward as sync runs.

2. **Optional: prefer integration when it’s fresher**  
   - Change `fetchSleepSessions` so that when HC (or preferred provider) is connected, it tries **integration first** for the last N days, then **merges** with Supabase (e.g. union by date/session id, prefer HC for overlapping dates).  
   - Or: keep Supabase-first but **trigger sync** when the screen loads and the “latest” Supabase session is older than e.g. 2 days, then refetch so we show newly synced data after that run.

3. **Minimal change**  
   - If you only fix §1 and §2, then “Import latest data” and connect will sync, Supabase will get new nights, and the existing “Supabase first” logic will start showing up-to-date data once sync has run.

---

## Summary of code errors and fixes

| # | Issue | Root cause (code/logic) | Fix (no edits done yet) |
|---|--------|--------------------------|--------------------------|
| 1 | Disconnect/reconnect needed for data | (A) Sync runs immediately after connect; permissions may not be committed yet. (B) “Import latest data” never calls `syncHealthData()`. | (1) Call `syncHealthData()` inside `processImport()` and wire UI to sync result. (2) After connect success, add ~300–500 ms delay or a short retry before `syncHealthData()`. |
| 2 | Data not uploading to Supabase | Same (B); dedup keys use end_time in DB but startTime in sync (wrong skips); sync not triggered from “Import latest data”. | (1) Make “Import latest data” call `syncHealthData()`. (2) Use start_time consistently for day keys in `getExistingSleepDateKeys` and in the HC loop. (3) Same connect delay/retry as §1. |
| 3 | Sleep insight “Sync or log sleep” | Insights use only `listSleepSessions(14)` (Supabase). Empty DB → no sleep context → fallback message. | (1) Fix §1 and §2 so `sleep_sessions` is filled. (2) Optionally allow insight context to use integration data when Supabase is empty. |
| 4 | Last sleep data stuck at 23 Jan | `fetchSleepSessions` uses Supabase first; if it has any rows, we never ask HC. Stale Supabase + no new sync → stuck at 23 Jan. | (1) Fix §1 and §2 so sync runs and writes new nights. (2) Optionally: run sync when Sleep loads and latest DB session is old, or use “integration first then merge” for the sessions list. |

---

## Files to touch when implementing fixes

- **IntegrationsScreen.tsx** – `processImport()`: call `syncHealthData()`, wire step status to sync result; optionally trigger sync with a short delay after connect (or handle delay in the same file when calling sync after connect).
- **lib/sync.ts** – `getExistingSleepDateKeys()`: build keys from `start_time` (or the same “night” rule used in the HC loop); keep HC loop as-is or align both to the same rule.
- **lib/sync.ts** or **IntegrationsScreen** – after Health Connect connect success, add a short delay or retry before `syncHealthData()` (if done in IntegrationsScreen, no sync.ts change for that part).
- **lib/insights/contextBuilder.ts** – only if you add an integration fallback when `listSleepSessions(14)` is empty; otherwise fixing §1 and §2 is enough.
- **SleepScreen.tsx** – only if you add “sync when latest is old” or “integration-first then merge” for `fetchSleepSessions`; otherwise §1 and §2 are enough for “last data” to advance.

---

## Simulated flows (reproducibility)

- **Login → connect Health Connect → “Import latest data”**  
  - Today: connect runs sync (possibly with race); “Import latest data” does **not** run sync, only invalidates queries. So “data doesn’t pull through” unless sync succeeded at connect or user goes to Dashboard and syncs.  
  - After fix: “Import latest data” runs `syncHealthData()`, so data can pull through from that button.

- **Connect Health Connect → immediate sync**  
  - Today: sync runs in same tick as connect; `healthConnectHasPermissions()` can be false on first run → 0 sessions.  
  - After fix: delay or retry after connect → permissions established → sync sees sessions and uploads.

- **Supabase empty → Sleep screen insight**  
  - Today: `fetchInsightContext()` uses `listSleepSessions(14)` → []; `context.sleep === undefined` → “Sync or log sleep.”  
  - After fix: sync and “Import latest data” populate Supabase → `listSleepSessions(14)` returns data → sleep insight can match.

- **Supabase has rows up to 23 Jan, no newer sync**  
  - Today: `fetchSleepSessions(30)` returns those rows and never calls HC → “last data 23rd Jan.”  
  - After fix: “Import latest data” and connect run sync → new nights written → next refetch shows newer “last” data.
