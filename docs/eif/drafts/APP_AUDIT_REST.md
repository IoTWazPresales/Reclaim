# APP_AUDIT_REST — Remaining surfaces defect audit (read-only)

**CONSULT:** READY  
**Sync pin:** `fix/training-confident-ux` @ `cf12b4d` · pushed to `origin/fix/training-confident-ux` (working tree dirty with unrelated untracked/EIF noise; **no product edits in this audit**)  
**Build under test:** source tree only (no fresh device remeasure this run)  
**Consultant:** none  
**Next:** audit only — await Human fix gate  

**Operator experience (fixed world):** Sleep/HC permissions match what Connect actually requests and what Play declares; mood logs once per intentional tap; med badge honesty matches curation strength; meditation/guided never steal FGS; insights/analytics/settings/offline/sync/RLS/Sentry/release stay coherent and deletable.

**Method:** Code + SQL under `app/` and `app/Documentation/`. Claims marked **VERIFIED** (opened `file:line`) or **ASSERTED** (strong inference from adjacent evidence). No secrets copied — use `[SECRET]` / `[CREDENTIAL]` markers only.

---

## Claim refute / confirm

| Claim | Verdict | Evidence |
|-------|---------|----------|
| Mood check-in double-log | **CONFIRMED (double-submit risk + intentional multi-log)** | MoodScreen Save has no in-flight lock (`MoodScreen.tsx` ~1334–1359). Each save mints a new UUID (`moodService.ts` 406–423). No DB unique on `(user_id, day_date)` in repo SQL. UI shows up to 5 today (`MoodScreen.tsx` ~1240). Dashboard modal uses `isPending` (`Dashboard.tsx` ~2757) — MoodScreen does not. |
| Med “Curated profile available” on unreviewed rows | **CONFIRMED as semantics bug; copy renamed** | Current label is **“Educational reference matched”** (`medProfileMode.ts` 15–16), not the old audit string. Mode = any `catalogMatch` truthy (`medProfileMode.ts` 5–8; `useMedDetailContext.ts` 176). **No `reviewed` field** on `MedCatalogItem` — only `confidence` + `sourceNote` (`medCatalog.ts` 42–45). Any exact-name hit (incl. low-confidence batch rows) gets curated mode. Old string lives in stale audit doc only (`docs/audits/med-catalogue-detail-wiring-audit.md` ~220). |
| Cold start 14–18s from notification-permission gate | **PARTIALLY REFUTED as current root cause; historically CONFIRMED** | X-26 diagnosis: splash awaited full `reconcileNotifications` (`docs/audits/cold-start-audit.md`). Fix in tree: await permission only; reconcile fire-and-forget (`notificationStartupGate.ts` 29–40); test locks that contract (`notificationStartupGate.test.ts` 37+). Splash still holds through Phase C (`useStartupGate.ts` 95–97; `RootNavigator.tsx` 413–426). **14–18s as live regression: UNVERIFIED** without new device timing; gate is no longer the reconcile long-pole. |
| Stale `app/CLAUDE.md` vs `AGENTS.md` | **CONFIRMED** | CLAUDE: branch `feat/meds-catalog-governance`, catalogue **215**, May/June 2026 (`CLAUDE.md` 35–45). AGENTS: branch `fix/training-confident-ux`, version floor **1.0.5 / versionCode 12** (`AGENTS.md` 3–35). Tree: `versionCode: 15` (`app.config.ts` 36); catalogue **357** rows (v1+batches). Both memory files drift from HEAD. |
| Zustand dependency unused | **CONFIRMED** | `package.json` lists `zustand`; **zero** `from 'zustand'` / `require('zustand')` under `app/src`. React Query owns client cache. |
| Empty catch in `trainingProgramPerformanceSeed.ts` | **CONFIRMED** | Lines 29–31 and 54–56: bare `catch { return {} / empty }` with no `__DEV__` logger (violates CLAUDE rule #8). |

---

## Defect register (ranked)

| ID | Sev | Symptom | Root cause | Evidence | Status |
|----|-----|---------|------------|----------|--------|
| R-01 | P0 | Account “delete all data” leaves training / check-ins / activity | `deleteAllPersonalData` deletes a short table list; omits `mood_checkins`, all `training_*`, `activity_daily`, `app_logs`, etc. | `dataPrivacy.ts` 394–407 | VERIFIED |
| R-02 | P0 | Play HC keep-set Steps/ActiveCalories may never be granted | Manifest declares Steps + ActiveCalories; Connect requests only `HEALTH_CONNECT_DEFAULT_METRICS` (sleep + HR + SpO2 + RR + temp) — **not** steps/active_energy | `withHealthConnectPermissions.js` 9–21; `healthConnectService.ts` 33–39; `integrations.ts` 169 | VERIFIED |
| R-03 | P1 | Mood double rows on double-tap / multi entry | No submit lock on MoodScreen; new UUID per call; no day unique constraint in repo SQL | `MoodScreen.tsx` 1334–1359; `moodService.ts` 398–423; `SUPABASE_SETUP.sql` 110–142 | VERIFIED |
| R-04 | P1 | Med badge implies curated/reviewed for any catalogue hit | `resolveMedProfileMode` ignores `confidence` / curation depth | `medProfileMode.ts` 5–8; `medCatalog.ts` 42–45 | VERIFIED |
| R-05 | P1 | Repo SQL: no `CREATE POLICY` for `sleep_sessions` (and several core tables) | Validation expects RLS on sleep/entries/mindfulness/meditation; setup scripts only cover subset | `SUPABASE_SCHEMA_VALIDATION.sql` 592–607; grep: no `ON sleep_sessions` policies | VERIFIED (repo); live DB **UNKNOWN** |
| R-06 | P1 | `app_logs` SELECT allows `auth.uid() IS NULL` | Over-broad read policy in shipped SQL | `SUPABASE_MISSING_TABLES.sql` 79–81 | VERIFIED |
| R-07 | P2 | Ghost RHR/HRV record-type strings still in JS map | Manifest clean of ghosts; `METRIC_RECORD_MAP` still maps `RestingHeartRate` / `HeartRateVariabilityRmssd` (dead request path unless metrics passed) | `withHealthConnectPermissions.js` 9–21; `healthConnectService.ts` 55–56 | VERIFIED (manifest OK; map debt) |
| R-08 | P2 | Cold-start splash still serializes Phase C | Permission await + disclaimer path still hold splash before `canMountApp` | `useStartupGate.ts` 95–97; `notificationStartupGate.ts` 29–34 | VERIFIED (severity depends on grant state) |
| R-09 | P2 | Major lists not virtualised | Meds/Mood/Sleep/Training/Dashboard use `ScrollView`; only Moments uses `FlatList` | screen greps; `ReclaimMomentsScreen.tsx` 326 | VERIFIED |
| R-10 | P2 | Memory palace / release floor drift | CLAUDE 215/meds branch; AGENTS vc12; config vc15; catalogue 357 | cited above | VERIFIED |
| R-11 | P2 | Account deletion / export vs local sleep orphans | Local sleep notes server deletes may leave orphans | `localSleepRepository.ts` 8–12 | VERIFIED |
| R-12 | P3 | Empty catches swallow seed / FGS tick failures | `trainingProgramPerformanceSeed.ts` 29–31, 54–56; `guidedSessionFgs.ts` 39–41 | VERIFIED |
| R-13 | P3 | Zustand unused dependency | package.json only | VERIFIED |
| R-14 | P3 | Analytics tab is placeholder “Coming soon” | No live analytics SoT on tab | `AnalyticsScreen.tsx` 1–100 | VERIFIED |
| R-15 | P3 | Sentry init skips when DSN unset; production profile disables upload | Env DSN; `eas.json` `SENTRY_DISABLE_AUTO_UPLOAD: true` on production | `sentry.ts` 7–23; `eas.json` 34–36 | VERIFIED |

---

## Surface maps

### 1. Sleep / Health Connect

**SoT map**

| Role | Authority |
|------|-----------|
| Writers (cloud) | `upsertSleepSessionFromHealth`, `addSleepSession`, sync pipeline (`api.ts`, `sync.ts`) |
| Writers (device HC) | `healthConnectService` `readRecords('SleepSession'|HeartRate|…)` |
| Local mirror | `mergeRemoteSleepSessionsIntoLocal` → SQLite `reclaim_local_sleep_session` |
| Readers (UI) | `SleepScreen` + React Query `SLEEP_SESSIONS_30D_UI_KEY` |
| Readers (insights) | `listSleepSessionsForInsights` merge local+remote |
| Cache | React Query keys under `sleep:*` |
| Persistence SoT | Supabase `sleep_sessions` (online); SQLite mirror for offline read; orphans possible on remote delete |

**Permissions keep-set (binary / manifest)** — VERIFIED present:
- `READ_SLEEP`, `READ_HEART_RATE`, `READ_OXYGEN_SATURATION`, `READ_RESPIRATORY_RATE`, `READ_BODY_TEMPERATURE`, `READ_STEPS`, `READ_ACTIVE_CALORIES_BURNED`, `WRITE_EXERCISE` (`withHealthConnectPermissions.js` 9–25)

**Ghosts RHR / HRV / TotalCalories** — VERIFIED **absent** from Android uses-permission plugin. JS still contains record-type map entries for RHR/HRV (`healthConnectService.ts` 55–56) but Connect flow does not request them via `HEALTH_CONNECT_DEFAULT_METRICS`.

**Race / stale / loss**
- Connect does not request Steps/ActiveCalories → readers `hasPermissions(['steps'|'active_energy'])` no-op (**R-02**).
- Local mirror orphan policy deferred (**R-11**).
- Overnight “resting” on Android is HeartRate window proxy, not RestingHeartRate record (`healthConnectRestingHrDaily.ts` header; `fetchHeartRateContextSummary.ts` 15–18).

**Error / offline / restore**
- `listSleepSessions` falls back to local on remote failure (`api.ts` ~929).
- HC init/request failures log and return false (non-throwing).

**Tests vs behaviour**
- HR summary unit tests exist; Connect permission/default-metric parity **untested** against plugin list.
- Gap: no test that DEFAULT_METRICS ⊆ manifest and includes Steps/ActiveCalories.

---

### 2. Mood (double-log)

**SoT map**

| Role | Authority |
|------|-----------|
| Writer API | `createMoodCheckin` → `submitCreateMoodCheckinDeviceFirst` |
| Outbox | AsyncStorage pending (`moodOutbox`) then upsert `mood_checkins` onConflict `id` |
| Cloud | Supabase `mood_checkins` (+ best-effort `mood_entries` mirror) |
| Readers | Canonical merge server+pending; MoodScreen `mood:checkins:7d`; insights via `listMoodCheckins` path |
| Cache | React Query mood keys + insight invalidate |

**Race / double-log**
- **Intentional multi check-in/day** supported (Today list slice 5).
- **Accidental double-submit:** MoodScreen button not disabled while awaiting (**R-03**). Dashboard quick mood **does** gate with `isPending`.
- Sync replay idempotent on same `localId`; not on same day+rating.

**Error / offline**
- Device-first outbox; `replayAllPendingMoodCheckinsForSync` in `syncAll`.
- Unique violation treated as synced (`moodService.ts` 178–187).

**Tests**
- `moodService.deviceFirst.test.ts`, outbox tests — cover sync, not UI double-tap.

---

### 3. Meds (catalogue + curated badge)

**SoT map**

| Role | Authority |
|------|-----------|
| Catalogue | Static JSON merge `loadMedCatalog()` — exact normalized name / alias / single ingredient (`medCatalog.ts` 184–199) |
| Match key | `catalog_match_key` on user med; backfill via exact match |
| Detail UI | `useMedDetailContext` → `findMedCatalogItemByName` / key |
| Badge | `resolveMedProfileMode` → label `Educational reference matched` |
| Cloud | `meds`, `meds_log` + RLS in `SUPABASE_SETUP.sql` |

**“Curated / reviewed” field**
- **Does not exist.** Closest fields: `confidence` (0–1), `sourceNote` (required by governance).
- Badge fires on **any** catalogue match, not `confidence ≥ threshold` (**R-04**).

**Catalogue size:** **357** rows (12+100+103+92+50) — not 215.

**Tests:** `medCatalog.test.ts`, governance QA, `medProfileMode.test.ts` (locks current misleading label).

---

### 4. Meditation / mindfulness (FGS singleton)

**SoT map**

| Role | Authority |
|------|-----------|
| Owner singleton | `backgroundActionsOwner.ts` — `'none' \| 'guided' \| 'mindfulness' \| 'meditation'` |
| Guided FGS | `guidedSessionFgs.ts` — refuses if other owner |
| Meditation FGS | `meditationSessionFgs.ts` |
| Mindfulness FGS | via `mindfulnessNotificationActions` + owner claim |
| Session state | module session state + notifications intent/reconcile |

**Race**
- Cross-domain steal blocked by `isBackgroundActionsOwnedByOther` (tested in `backgroundActionsOwner.test.ts`).
- In-process owner only — process death / native service desync **ASSERTED** residual risk.

**Tests:** owner unit tests; FGS start refusal paths log-only.

---

### 5. Insight engine

**SoT map**

| Role | Authority |
|------|-----------|
| Rules | `data/insights.json` |
| Engine | `createInsightEngine` → `evaluateAll` |
| Context | `fetchInsightContext` / `contextBuilder.ts` (mood canonical, sleep merge, meds adherence, vitals proxy) |
| Provider | `InsightsProvider` debounce 5 min, write signal ledger |
| Ledger | SQLite `reclaim_signal_ledger` |
| Feedback | Supabase insight feedback rows |

**Risks**
- Stale insights if refresh debounce swallows rapid domain writes (by design; may feel wrong after mood log — partially mitigated by explicit `refreshInsight` callers).
- Med rules largely adherence-only (historical audit still accurate).

**Tests:** engine/condition/rotation/verify-lite suites; not full provider integration.

---

### 6. Analytics

**SoT map**
- Tab `AnalyticsScreen`: **placeholder only** — no writers/readers (**R-14**).
- Related live pieces: `populationBaselines.ts` (static), training analytics sub-screen, telemetry → `app_logs`.

---

### 7. Settings / data & privacy / account deletion

**SoT map**

| Action | Path |
|--------|------|
| UI | `SettingsScreen` privacy section; `DataPrivacyScreen` |
| Export | `exportUserData` / CSV / PDF |
| Delete | `deleteAllPersonalData` |

**Defects**
- Incomplete cloud wipe table list (**R-01**) — training history and mood_checkins survive.
- Signs out after delete; local clear via `clearAllLocalDataForUser`.
- Does not delete Auth user account row (session signOut only) — product may intend “data wipe” not “account destroy”; label honesty **ASSERTED** risk.

**Tests:** none found for delete coverage matrix.

---

### 8. Offline queue + sync

**Training**
- Queue: AsyncStorage `@reclaim/training/offline_queue` + SQLite blob mirror (`offlineQueue.ts`).
- Writers: `applySetCompletion`, `closeTrainingSession`, `sessionWriteBuffer`, etc. enqueue ops.
- Replay: `offlineSync.ts` with backoff (`MAX_RETRIES` 8).

**Other modules**
- Mood: separate outbox (`moodOutbox`) replayed in `syncAll`.
- Meditation: `syncAll` upserts local sessions.
- Health: `requestHealthSync` / SyncCoordinator — not the training queue.

**Race / loss**
- Dual store (AS + SQLite) migration path present; conflict prefers non-empty blob.
- Invalid JSON → null parse → empty queue risk if both corrupt.

**Tests:** offlineQueue validation, applySetCompletion/close session with mocked queue.

---

### 9. Supabase schema + RLS (repo SQL only — do not invent live state)

**Location:** `app/Documentation/*.sql` (no root `supabase/` migrations folder).

**Policies found (examples):**
- `meds`, `meds_log`, `mood_checkins`, `logs` — `SUPABASE_SETUP.sql`
- `activity_daily`, `app_logs` — `SUPABASE_MISSING_TABLES.sql` (note over-broad SELECT on `app_logs`)
- Training tables/events/profiles/program layer — dedicated SQL files with user_id policies

**Gaps in repo:**
- No `CREATE POLICY` for `sleep_sessions` / `sleep_candidates` / `sleep_prefs` / `entries` / `mindfulness_events` / `meditation_sessions` despite validation expecting RLS enabled (**R-05**).
- Live project may have Console-applied policies not checked in — mark **UNKNOWN** until `pg_policies` dump.

---

### 10. Sentry

| Item | Fact |
|------|------|
| Init | `lib/sentry.ts` — only if `EXPO_PUBLIC_SENTRY_DSN` set; `enabled: !__DEV__`; `sendDefaultPii: false`; traces 0.2 |
| Plugin | `@sentry/react-native/expo` in `app.config.ts` (org/project names only — no DSN in file) |
| EAS | Production builds set `SENTRY_DISABLE_AUTO_UPLOAD: true` — source maps may not upload |

DSN value: `[SECRET]` via env only — never committed in this audit.

---

### 11. Performance

| Issue | Evidence | Status |
|-------|----------|--------|
| Historical 14–18s splash (X-26) | Cold-start audit; fix backgrounds reconcile | Historical CONFIRMED; current severity UNVERIFIED |
| Splash still waits Phase C permission | `ensureNotificationPermission` can block on OS dialog first grant | VERIFIED |
| List virtualisation missing on core tabs | ScrollView everywhere except Moments | VERIFIED (**R-09**) |
| Re-renders | Not profiled this run | UNVERIFIED |
| Insight refresh debounce 5m | `InsightsProvider` | VERIFIED design trade-off |

---

### 12. Security

| Item | Finding | Marker |
|------|---------|--------|
| Supabase URL / anon key | Injected via `EXPO_PUBLIC_*` into `app.config.ts` `extra` and `supabase.ts` | `[SECRET]` env — anon key is public-by-design but must stay RLS-backed |
| EAS project id | Plain UUID in `app.config.ts` | not a credential |
| No service role in app | Not found in app source | OK |
| RLS gaps in repo SQL | sleep/entries/etc. | **R-05** |
| `app_logs` anonymous insert + null-uid select | **R-06** | |
| SecureStore session with AsyncStorage fallback | `supabase.ts` storage adapter | large tokens may land in AS |

Never copy secret values into artifacts.

---

### 13. Build / release

| Item | Value |
|------|-------|
| `version` / `runtimeVersion` | `1.0.5` (`app.config.ts` 13–16) |
| `android.versionCode` | **15** (comment: Play consumed vc14; next AAB > 14) |
| EAS production | `autoIncrement: true`, `appVersionSource: remote`, AAB |
| AGENTS.md floor | still says versionCode **12** — stale |
| HC Play narrative | OQ1 draft keep-and-justify; ghosts scrub Console-side |

---

## Rejected thin alternatives

| Thin path | Reject because |
|-----------|----------------|
| Strip Steps/ActiveCalories from manifest to “fix” Play | Product lock is keep-and-justify; fix is request+UX proof parity (**R-02**). |
| Rename badge only (“Educational…”) without confidence gate | Already renamed; honesty bug remains (**R-04**). |
| Add day unique constraint without UX for multi check-in | Product allows multiple/day; fix submit lock + optional “replace today” affordance. |
| Re-await reconcile on splash “to be safe” | Reverts X-26; use background reconcile + readiness metrics. |
| Patch `deleteAllPersonalData` with one more table ad hoc | Needs full inventory of user-owned tables + local mirrors (**R-01**). |

---

## Fixed workflow (target — not implemented)

1. HC Connect requests the full keep-set declared in the plugin (incl. Steps + ActiveCalories); Integrations/Privacy copy match; ghosts stay out of manifest.
2. Mood Save disables while pending; optional confirm if logging second time same minute.
3. Med badge uses confidence/curation tier (or “Catalogue match” wording without “curated/reviewed”).
4. Delete-all enumerates every user table + queues + SQLite domains, then verifies empty.
5. Repo SQL documents/creates RLS for sleep/entries/mindfulness/meditation; tighten `app_logs` SELECT.
6. Memory palace (`AGENTS.md` / `CLAUDE.md`) updated to branch, vc15, 357 rows — or CLAUDE demoted.
7. Drop unused zustand; log empty catches in seed path.

---

## Unit split (only if Human asks to fix)

1. **U1** HC DEFAULT_METRICS ↔ plugin parity + connect request  
2. **U2** MoodScreen submit lock + tests  
3. **U3** Med profile mode confidence gate + copy  
4. **U4** `deleteAllPersonalData` completeness + test matrix  
5. **U5** Sleep/entries RLS SQL checked-in + validation  
6. **U6** Memory palace sync + remove zustand  
7. **U7** List virtualisation for Meds (highest row count risk)

---

## Open questions (≤5)

1. Is multiple mood check-ins per day a product requirement, or should Today be last-write-wins?
2. Should “delete my data” also call Supabase Auth admin delete, or data-wipe only?
3. Can Human export live `pg_policies` for sleep/entries to close **R-05** UNKNOWN?
4. After X-26 fix, what is measured cold-start p50 on current preview/production AAB?
5. Should Analytics tab stay gated, or wire `HowYouCompareCard` / signal graph now?

---

## Files inspected (material)

- `app/plugins/withHealthConnectPermissions.js`
- `app/src/lib/health/healthConnectService.ts`, `integrations.ts`, `fetchHeartRateContextSummary.ts`
- `app/src/lib/mood/moodService.ts`, `app/src/screens/MoodScreen.tsx`, `Dashboard.tsx`
- `app/src/components/meds/medProfileMode.ts`, `hooks/useMedDetailContext.ts`, `lib/medCatalog.ts`
- `app/src/lib/system/backgroundActionsOwner.ts`, `training/guidedSessionFgs.ts`, `meditation/meditationSessionFgs.ts`
- `app/src/providers/InsightsProvider.tsx`, `lib/insights/*`
- `app/src/screens/AnalyticsScreen.tsx`, `DataPrivacyScreen.tsx`, `lib/dataPrivacy.ts`
- `app/src/lib/training/offlineQueue.ts`, `lib/sync.ts`
- `app/Documentation/SUPABASE_*.sql`
- `app/src/lib/sentry.ts`, `app/app.config.ts`, `app/eas.json`
- `app/src/startup/notificationStartupGate.ts`, `useStartupGate.ts`, `routing/RootNavigator.tsx`
- `app/CLAUDE.md`, `AGENTS.md`, `docs/audits/cold-start-audit.md`, `docs/release/play_oq1_hc_data_safety_draft_2026-07-20.md`
- `app/src/lib/training/trainingProgramPerformanceSeed.ts`

**Not tested this run:** device cold-start timing, live Supabase RLS, Play Console declaration scrape, EAS build.

---

*End of read-only audit. No product source modified.*
