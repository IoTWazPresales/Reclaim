# PHASE 2 — Sleep sync write proof + readback

## Symptom
- Need to prove sleep sync actually writes to Supabase `sleep_sessions` and to distinguish RLS/session/env failures from success.

## Code path
1. **Entry:** `SyncManager.runSync({ scope: 'health' })` → `runHealthSync()` → `syncHealthData()` in `lib/sync.ts`.
2. **Per-provider fetch:** Health Connect `healthConnectGetSleepSessions(30)`; Apple `appleProvider.getSleepSessions()`; Samsung `importSamsungHistory(30)`; Google Fit `googleFitGetLatestSleepSession()`.
3. **Write:** Each path calls `upsertSleepSessionFromHealth()` in `lib/api.ts` → `supabase.from('sleep_sessions').upsert(row).select('id').single()`.
4. **Read-back:** `SyncManager.runSyncVerifier()` after health sync: queries `sleep_sessions` (last 30d window, limit 5 by `start_time` desc) and logs count.

## Fix (surgical)
1. **`app/src/lib/sync.ts`**
   - After `healthConnectGetSleepSessions(30)`: log `[SLEEP_SYNC] provider=HC fetched=N`.
   - After `appleProvider.getSleepSessions()`: log `[SLEEP_SYNC] provider=Apple fetched=N`.
   - After `importSamsungHistory(30)`: log `[SLEEP_SYNC] provider=Samsung imported=N skipped=N`.
   - After Google Fit latest sleep fetch: log `[SLEEP_SYNC] provider=GF fetched=1|0`.
2. **`app/src/lib/api.ts`** (`upsertSleepSessionFromHealth`)
   - On success: log `[SUPA_WRITE] upsert sleep_sessions id=... ok`.
   - On error: log `[SUPA_WRITE] upsert sleep_sessions id=... error=... kind=RLS|session|other` (RLS if code 42501 or message mentions row-level security; session if PGRST301 or JWT; else other).
3. **`app/src/lib/sync/SyncManager.ts`** (`runSyncVerifier`)
   - After existing 1-row verification: query last 5 `sleep_sessions` in window, log `[SLEEP_SYNC] readback=N`.

## Verification (runtime proof)
1. Run health sync (e.g. from Sleep or Integrations). Logs show `[SLEEP_SYNC] provider=HC|Apple|GF|Samsung fetched|imported=N` for each attempted provider.
2. Each successful upsert shows `[SUPA_WRITE] upsert sleep_sessions id=... ok`; each failure shows `[SUPA_WRITE] ... error=... kind=...`.
3. After sync, `[SLEEP_SYNC] readback=N` with N ≥ 1 when at least one row exists in the 30d window (proof of write + read-back).
