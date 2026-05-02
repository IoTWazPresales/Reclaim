# Local-first release QA checklist

Manual regression checklist for `local-first-data-architecture` before production release. Automated suites: `cd app && npm run typecheck && npm test`. Guided/watch flows require human verification.

---

## 1. Cold start / first render

Validate **no blocking spinner on Supabase alone**; cached/local layers appear where implemented.

| Area | Check |
|------|--------|
| Dashboard | Tiles populate from cache / local reads without permanent empty state |
| Sleep / providers | Integration snapshot + sync metadata sane; no false “disconnected” |
| Routines / Today | Routine day state from localData where wired |
| Insights | Canonical merged context; partial failure does not blank entire insights |
| Meds | Read-cache fallback after fetch or offline |
| Training list | Read-through cache; in-progress row visible when applicable |

---

## 2. Offline mode

Airplane mode or network kill **after** login. Actions queue or persist locally; **no scary errors** for best-effort paths.

| Domain | Action |
|--------|--------|
| Mood | Submit check-in → pending durable row |
| Med dose | Queue taken/skipped → mirror durable |
| Meditation | Completion → canonical local row |
| Recovery | Progress → SQLite canonical |
| Routines | Day completion → local row |
| Training | Set log / offline queue op → durable mirror |

Reconnect: run sync / foreground app → replay succeeds or retries visibly without duplicate destructive writes.

---

## 3. Guided training / watch (manual)

**Do not ship notification behavior regressions.** Evidence: logs + DB + intents.

| Step | Expect |
|------|--------|
| Start guided workout | Session row created; decision_trace guided |
| First set notification | Fires per existing scheduler rules |
| Done from app | Set persisted; rest scheduled if applicable |
| Rest notification | Fires when backgrounded per rules |
| Next set notification | Correct lookahead payload |
| Done from notification | Same codepath as in-app where designed |
| Backend / offline queue | Op appears when offline |
| Kill app mid-rest | Snapshot exists in SQLite (`guided_active_session` domain) |
| Reopen Training tab | Resumes same session when snapshot + ledger agree |
| Complete workout | Snapshot cleared; intents cleared on paths already wired |
| Ghost notifications | No stale training intents after end/delete |

---

## 4. Privacy / export / delete

| Step | Expect |
|------|--------|
| JSON export | Includes `reclaim_async_blob_mirror`, mood pending, read caches, sleep mirror sections per `exportLocalDataSectionForUser` |
| Delete local data | `clearAllLocalDataForUser` removes scoped SQLite rows |
| Sign out | No stale secrets in export artifact |

---

## 5. Sync metadata

After successful pulls / replays, **`reclaim_sync_metadata`** (or writers) reflect last success / errors where domains update metadata.

---

## 6. Store compliance / permissions

Health tiles and copy match OS permission reality; no claims that data “was deleted” from vendor clouds unless product/legal approved.

---

## Automation gaps

- **Expo web:** `npm run web` exists; full web parity is not guaranteed (native modules). Use device/simulator for authoritative QA.
- **Vitest:** `npm test` covers pure/unit paths; native SQLite uses mocks in CI-style runs.
