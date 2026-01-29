# PHASE 2 — Sleep sync write proof

## Where logs were added

| File | Function | Log tag | When |
|------|----------|---------|------|
| `app/src/lib/sync.ts` | `syncHealthData` | `[SLEEP_SYNC]` | After each provider fetch/import: `provider=HC|Apple|GF|Samsung fetched=N` or `imported=N` (Samsung), with `window=30d` or `window=latest` (GF). |
| `app/src/lib/api.ts` | `upsertSleepSessionFromHealth` | `[SUPA_WRITE]` | On upsert success: `table=sleep_sessions id=... ok`. On error: `table=sleep_sessions id=... error=... kind=RLS|session|other`. |
| `app/src/lib/sync/SyncManager.ts` | `runSyncVerifier` | `[SLEEP_SYNC]` | After health sync: `readback=N` (last 5 rows in same 30d window). If session missing or query fails: `readback skipped reason=...`. |

## How to reproduce

1. **Dashboard sync:** Open app → Dashboard → pull-to-refresh or use sync control.
2. **Sleep import:** Open app → Sleep → open Import modal → run import.
3. **Integrations import:** Open app → Integrations → run Import for connected providers.

## What to grep for

- `[SLEEP_SYNC]` — provider fetch/import counts and readback.
- `[SUPA_WRITE]` — sleep_sessions upsert success or error.

## Expected success patterns

- `[SLEEP_SYNC] provider=HC fetched=N window=30d` (or Apple/GF/Samsung) for each provider attempted.
- `[SUPA_WRITE] table=sleep_sessions id=... ok` for each written session.
- `[SLEEP_SYNC] readback=N` with N ≥ 1 when at least one row exists in the 30d window (proof of write + read-back).
- If no user or query fails: `[SLEEP_SYNC] readback skipped reason=...`.
