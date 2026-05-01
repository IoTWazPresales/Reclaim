# Reclaim local-first data architecture

This document captures **Phase 0** (current-state audit + target direction) and records **Phase 1** (local DB foundation) as implemented on branch `local-first-data-architecture`. Phases 2–10 are **specified below but not fully implemented** in the same delivery; follow the phase gates before expanding scope.

## Executive summary

**Today:** React Query + Supabase + AsyncStorage + health provider SDKs form a **fragmented** persistence story. Sync (`sync.ts`) pushes provider reads into Supabase (`api.ts`) and replays mood pending queue; screens often **hydrate from server queries first**, causing empty/disconnected flashes when latency or loading order is unfavorable.

**Target:** **Device-local operational truth** for UX (SQLite + narrow AsyncStorage bridges where needed), **Supabase** as acknowledged cloud ledger / history, **providers** as raw ingest. React Query remains a **read-through cache**, not durable truth.

## Current-state matrix (abbreviated — inspect code for detail)

| Domain | Durable local | Supabase | Provider/OS | Screen read path | Write path | Sync path | First-render risk | Offline risk | BG sync dependency | Priority | Recommended action |
|--------|----------------|----------|-------------|------------------|------------|-----------|-------------------|--------------|---------------------|----------|---------------------|
| Sleep / summaries | Partial via RQ cache only | `sleep_sessions`, reads via `api.listSleepSessions` | HC / Apple / Samsung → sync pipeline | `SleepScreen` uses `useQuery` + `listSleepSessions` | `upsertSleepSessionFromHealth` | `sync.ts` + `sleepSyncPipeline` | Empty until query settles | Stale without net | High for freshness | **P0** | **Phase 2:** local sleep rows + repository read before remote |
| Activity / vitals daily | RQ | `activity_daily`, `vitals_daily` | HC / Apple | Dashboard / health tiles | `upsertDaily*` | `sync.ts` backfill | Tile empty flash | Medium | High | **P0** | Bridge after Phase 2 DB |
| Health provider status | `integrationStore` (AsyncStorage) | N/A | OS permission APIs | Screens read store + live checks | store mutations | sync touches store | **False disconnected** if loaded late | Low | Medium | **P0** | Explicit `unknown → checking → …` state machine + local snapshot |
| Mood | **`moodOutbox` AsyncStorage v2** + legacy import | `mood_checkins` | N/A | MoodScreen / insights via services | `moodService` + outbox | replay in sync | Pending OK | Strong | Replay | **P1** | Bridge outbox → SQLite outbox; keep keys until proven |
| Med definitions | RQ + cache | `medications` | N/A | Meds UI | API writes | sync | Empty flash | Edits fragile | Medium | **P1** | Local cache table + pending edits |
| Med dose logs | **MedDoseOfflineQueue** (AsyncStorage) | `meds_log` | N/A | Adherence views | queue + API | sync | **P1** | Bridge queue → durable local ops |
| Meditation sessions | AsyncStorage keys + API | `meditation_sessions` | N/A | Meditation screens | local + upsert | sync | **P1** | Migrate sessions to SQLite |
| Training active session | Local session state + offline queue | training tables | Watch/app | `TrainingSessionView`, SetFocus | session writers | `syncOfflineQueue` | **Must not regress** | **P2** | Notification actions | **P0 guard** | Phase 4 — op log; never server-overwrite active |
| Training history / sets | RQ + API | Supabase | N/A | Training lists | API | sync | List stale | Medium | Medium | **P2** | Ledger + list queries |
| Today / routines | AsyncStorage per-day + API | `routine_suggestions` etc. | N/A | Dashboard / routines | mixed | sync | Empty flash | Medium | **P2** | Phase 5 |
| Recovery progression | AsyncStorage + `recovery.ts` | partial | N/A | Dashboard card | advance helpers | sync optional | Flash empty | Low | Low | **P2** | SQLite mirror; **no stale cloud overwrite** |
| Notification intents | intent stores / scheduler | logs optional | OS | notifications stack | durable stores | BG tasks | **P0** | Phase 4/7 |
| Insights context | RQ + fragmented reads | insight tables | imports | InsightCard | feedback API | sync | Stale / “no insight” | Medium | High | **P2** | Phase 6 canonical context cache |
| Sync metadata | AsyncStorage keys in `sync.ts` | N/A | N/A | status UI | writers | orchestrator | Misleading “last sync” | Medium | **P1** | Move to **`reclaim_sync_metadata`** (started Phase 1) |
| Background sync | `expo-background-fetch` + tasks | N/A | providers | indirect | — | `sync.ts` | N/A | **P2** | Phase 7 orchestration |
| Export/delete/privacy | mixed | N/A | N/A | settings | delete APIs | — | **P2** | Phase 8 — include SQLite |
| Onboarding/auth | SecureStore / Supabase session | auth.users | N/A | gates | auth | session refresh | N/A | Low | **defer** | keep |
| Integrations setup | integration store + HC flows | N/A | HC/Apple | IntegrationsScreen | store | sync | False disconnected | Medium | **P0 UX** | tie to status machine |

## Target repository contracts (per domain)

Each domain should expose:

- **What renders first:** last durable local row(s) or explicit “unknown” — never a fake empty.
- **Operational truth:** SQLite / approved AsyncStorage outbox.
- **Cloud truth:** Supabase after acknowledgement.
- **Provider truth:** imports normalized into local store before optional cloud upsert.
- **Invalidation:** repository events → React Query `invalidateQueries` / selective updates — **adapt** `healthSyncQueryInvalidation` rather than removing.

## Phase status (this branch)

| Phase | Status | Notes |
|-------|--------|--------|
| 0 Audit | **Documented** | This file + matrix |
| 1 Local DB foundation | **Implemented** | `app/src/lib/localData/*`, `expo-sqlite`, migrations v1 |
| 2 Sleep/health local-first | **Deferred** | Next — wire SleepScreen/Dashboard to repository reads |
| 3 Mood/meds/meditation | **Deferred** | Bridge outboxes |
| 4 Training | **Deferred** | High risk — op log + idempotency |
| 5 Routines/recovery | **Deferred** | |
| 6 Insights | **Deferred** | |
| 7 Sync orchestration | **Deferred** | |
| 8 Legacy migration/privacy | **Deferred** | |
| 9 Screen enforcement | **Deferred** | |
| 10 Docs/checklists | **Partial** | This doc + optional checklist below |

## Phase 1 implementation notes

- Package: **`expo-sqlite`** (`~16.0.10`) with **`expo-sqlite`** plugin in `app.config.ts`.
- Module: `app/src/lib/localData/database.ts` — `initializeLocalDatabase()`, `runMigrations()`, `requireLocalDatabase()`, explicit failure reporting (no silent corruption).
- Migration 1 creates **`reclaim_meta`** stub and **`reclaim_sync_metadata`** for future per-domain sync ledger rows.
- **No screens wired yet** — intentional minimal blast radius.

## Manual gate before Phase 2

- [ ] Confirm SQLite opens on Android/iOS device builds (not only Vitest mocks).
- [ ] Decide cold-start initialization point (e.g. post-auth, parallel to splash).
- [ ] Map first sleep read path off Supabase-primary queries.

## Related

- `docs/release/` — add migration checklist when phases advance.
