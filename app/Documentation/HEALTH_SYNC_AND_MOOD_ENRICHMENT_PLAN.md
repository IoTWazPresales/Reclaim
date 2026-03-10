# Health Sync, Activity/Vitals Fix, Mindfulness from HC, and Mood/Insights Enrichment — Phased Plan

**Status:** Draft for approval  
**Scope:** Make activity_daily and vitals_daily write reliably (same architecture as sleep), add HC mindfulness sessions as history, enrich mood with HC data, and enrich insights with vitals. No code changes until approved.

---

## Current state (audit summary)

### What we already do for “mood + health”

- **Insights** already use health data for **matching** (not for “showing next to mood”):
  - `contextBuilder.fetchInsightContext()` loads: `listSleepSessions(14)`, `listDailyActivitySummaries(14)`, mood, meds, training.
  - Sleep (last night, avg7d, debt, midpoint) and steps (lastDay) feed into `InsightContext` and rule evaluation.
  - **Vitals are not in InsightContext** — no HR/HRV/resting HR in context or rules.
- **Mood logging UI** does **not** currently show “last night’s sleep / today’s steps / HRV” next to the mood picker; that would be new “enrichment” UX.

So we **partially** do “mood connected to health” (insights use sleep + steps), but we do **not** yet:
- Show health context on the mood screen.
- Use vitals in insights.
- Guarantee activity_daily / vitals_daily are populated (see below).

### Why activity_daily and vitals_daily aren’t writing

1. **Only “today” is written in the main sync**  
   In `syncHealthData()` we only call `healthConnectGetTodayActivity()` and `healthConnectGetTodayVitals()` and upsert once. So you only get at most one row per table (today) per run, and only if that run executes the HC activity/vitals block.

2. **No backfill in the same run as sleep**  
   When the user does “Import” (sleep_import / integrations_import), we pass `forceFullSleepImport: true` and pull a **full window** of sleep (e.g. 90/365 days) and run the sleep pipeline. Activity and vitals are **not** backfilled in that same run — they stay “today only.” So first-time connect gets sleep history but not activity/vitals history.

3. **Historical path exists but is never called**  
   `syncHistoricalHealthData(days)` correctly loops over `healthConnectGetDailyActivity(days)` and `healthConnectGetDailyVitals(days)` and upserts each day. This function is **not** invoked from the app (only defined in `sync.ts`). So no automated path fills multiple days of activity/vitals.

4. **Possible schema/RLS issues**  
   - **activity_daily:** API sends `active_energy` as a number (calories); your schema has `active_energy integer null`. If the SDK returns a float, Supabase/Postgres may coerce or reject; we should send `Math.round(activeEnergy)` for integer column.
   - **vitals_daily:** Schema uses `numeric`; we send numbers — fine.
   - **RLS:** If RLS is enabled on `activity_daily` / `vitals_daily`, policies must allow `INSERT` and `UPDATE` for `auth.uid() = user_id`. Otherwise upserts will fail (errors are caught and logged in sync).

**Conclusion:** To “work the same architecturally as sleep,” we need activity and vitals to be **backfilled in the same sync run** that does the full sleep window when the user triggers connect/import, and we need to fix any type/RLS issues so upserts succeed.

---

## Schema alignment (no change required if you’re happy with this)

- **activity_daily:** Keep `active_energy integer null`. We will send `activeEnergy != null ? Math.round(activeEnergy) : null` from the app so we never send a float into an integer column.
- **vitals_daily:** Current schema is fine; we already send numeric values.
- **mindfulness_events (below):** Proposed extension so one table can hold both Reclaim events and HC sessions.

---

## Phased plan

### Phase 1 — Fix activity_daily and vitals_daily sync (same architecture as sleep)

**Goal:** Activity and vitals write to Supabase every time we run a health sync, and on first connect/import we backfill the **same window** we use for sleep (e.g. 90 days when no data, or 7 when we already have data), so the “first time” experience matches sleep.

**1.1 Schema / types**

- In `api.ts`, when building the row for `upsertDailyActivityFromHealth`, ensure `active_energy` is integer:  
  `active_energy: input.activeEnergy != null ? Math.round(input.activeEnergy) : null`.
- No DB migration required if `activity_daily.active_energy` stays `integer`.

**1.2 Sync: backfill activity and vitals in the same run as sleep**

- In `sync.ts` inside `syncHealthData()`:
  - When we have **HC connected and available and permissions** for steps/active_energy (and heart_rate/resting_heart_rate/heart_rate_variability for vitals), **and** we are in a “full window” run (e.g. `forceFullSleepImport` is true, or a new single “full sync” flag used for connect/import):
    - Use the **same window** as sleep (e.g. `windowDaysForSource('healthconnect')` or the same `snapshotWindowDays` used for the sleep fetch).
    - Call `healthConnectGetDailyActivity(windowDays)` and `healthConnectGetDailyVitals(windowDays)` (not only “today”).
    - Loop over each day and call `upsertDailyActivityFromHealth` / `upsertVitalsDailyFromHealth` for that day (same pattern as `syncHistoricalHealthData`).
  - When we are **not** in a full-window run (e.g. dashboard refresh, 7-day cap), keep current behaviour: only **today** for activity and vitals (optional: could still do last 7 days for consistency; can be a single place that decides “days to sync” for activity/vitals).
- Ensure errors (e.g. RLS or type) don’t silently skip all writes: keep per-day `.catch()` for resilience but log at least one failure so we can see “vitals_daily upsert failed” in logs if something is wrong.

**1.3 RLS**

- Verify RLS policies on `activity_daily` and `vitals_daily` allow:
  - `SELECT` for `auth.uid() = user_id`
  - `INSERT` for `auth.uid() = user_id`
  - `UPDATE` for `auth.uid() = user_id`
- If policies are missing or too strict, add/update them so the app user can upsert their own rows. If upserts still fail after Phase 1 code changes, check Supabase logs and RLS policies first.

**1.4 Optional: Remove or reuse `syncHistoricalHealthData`**

- Either:
  - **Deprecate** `syncHistoricalHealthData` and rely on the unified sync (so “historical” is just “run sync with full window once”), or
  - Keep it as an **explicit “backfill only”** entry point (e.g. “Import last 30 days” button) that only does activity + vitals + optionally mindfulness, and ensure it’s called from the UI when desired.
- Recommendation: **Unify in Phase 1** so one sync path does sleep + activity + vitals with the same window when it’s a connect/import run; then we don’t depend on a separate historical function for normal use.

**Deliverables:**  
- activity_daily and vitals_daily populate on first connect/import and on ongoing syncs (today at minimum, full window when we do full sleep window).  
- Same “sync happens correctly the first time” behaviour as sleep.

---

### Phase 2 — Add mindfulness sessions from Health Connect (as history)

**Goal:** Read `MindfulnessSession` (or equivalent) from Health Connect, persist it, and show it as wellness/mindfulness history alongside Reclaim’s own mindfulness events.

**2.1 Health Connect layer**

- In `healthConnectService.ts`:
  - Ensure `mindfulness` is in `METRIC_RECORD_MAP` (e.g. `mindfulness: ['MindfulnessSession']` — exact record type name from `react-native-health-connect`).
  - Add `healthConnectGetMindfulnessSessions(days: number)`: call `readRecords('MindfulnessSession', { timeRangeFilter, ascendingOrder: false })`, map to a small domain type (e.g. `{ startTime: Date, endTime: Date, sessionType?: string, title?: string, notes?: string, source: 'health_connect' }`).
- If the SDK uses a feature flag for mindfulness (e.g. `FEATURE_MINDFULNESS_SESSION`), check availability before reading (and optionally before requesting permission).

**2.2 Schema: one table for both Reclaim events and HC sessions**

- **Option A (recommended): single table with `source`**
  - Extend `mindfulness_events` so it can represent both:
    - **Reclaim-generated events** (current): `trigger_type`, `reason`, `intervention`, `outcome`, `ctx`; `source = 'reclaim'` (or keep null/legacy as “reclaim”).
    - **HC sessions**: `source = 'health_connect'`, plus `start_time`, `end_time`, `duration_sec`, `session_type` (e.g. meditation, breathing), optional `title`, `notes`, and `external_id` (HC record id or composite key for dedupe).
  - New/optional columns (nullable so existing rows stay valid):
    - `source` text (e.g. `'reclaim'`, `'health_connect'`), default `'reclaim'`.
    - `start_time` timestamptz, `end_time` timestamptz, `duration_sec` int, `session_type` text, `title` text, `notes` text, `external_id` text (unique per user for HC dedupe).
  - For Reclaim events, `start_time`/`end_time` can be null and we keep using `created_at`; for HC we set `start_time`/`end_time` and `duration_sec`.
  - Unique constraint on `(user_id, source, external_id)` when `source = 'health_connect'` and `external_id` is not null to avoid duplicate HC sessions.

- **Option B:** Separate table `mindfulness_sessions` for HC-only rows; keep `mindfulness_events` for Reclaim. App and insights would merge both for “wellness history.” More tables, two lists to combine.

**Recommendation:** Option A so one “wellness history” API can return a unified list ordered by time.

**2.3 API layer**

- Add e.g. `upsertMindfulnessSessionFromHealth(input: { startTime, endTime, sessionType?, title?, notes?, externalId })` that upserts into `mindfulness_events` with `source = 'health_connect'` and the new columns.
- Add `listMindfulnessSessions(days)` (or extend existing list) that returns both Reclaim events and HC sessions, ordered by `start_time` or `created_at`, so the UI can show a single timeline.

**2.4 Sync**

- In the **same** sync run that does full-window sleep/activity/vitals (connect/import), if HC has mindfulness permission:
  - Call `healthConnectGetMindfulnessSessions(windowDays)`.
  - For each session, call `upsertMindfulnessSessionFromHealth` (with a stable `external_id` from HC for dedupe).
- Add mindfulness to the set of permissions we request when connecting HC (if not already in `HEALTH_CONNECT_DEFAULT_METRICS`).

**2.5 UI**

- Wellness / mindfulness history screen (or section) that uses `listMindfulnessSessions()` and shows Reclaim events and HC sessions in one list (e.g. “Meditation – 10 min” from HC, “Box breathing – Reclaim”).

**Deliverables:**  
- HC mindfulness sessions synced on connect/import and stored in DB.  
- Single history view for Reclaim + HC mindfulness.

---

### Phase 3 — Enrich mood with health data (no clutter on mood screen)

**Goal:** When the user is logging or viewing mood, show relevant health context (sleep, steps, vitals) so mood “feels connected” to health. Reuse only already-synced data (sleep_sessions, activity_daily, vitals_daily).

**3.1 Mood logging screen (add context)**

- When the user is on the “log mood” or “mood check-in” screen (or equivalent), **before or after** they pick a rating:
  - Load for “today” (and optionally “last night”):
    - Latest sleep session that ended “last night” (from `listSleepSessions(3)` or a small “last night” query).
    - Today’s steps / active energy from `listDailyActivitySummaries(1)` (or activity_daily for today).
    - Today’s vitals from a new `listVitalsDaily(days: 1)` (or get today from vitals_daily).
  - Show a short line or card: e.g. “Last night: 6h 20m sleep · Today: 4,200 steps · Resting HR 58” (or only the fields that exist). No new HC reads — only Supabase.

**3.2 Mood history / detail**

- Where we show past mood entries, optionally show the same health context for that **day** (sleep that ended that morning, steps that day, vitals that day) if we have it. Again, read only from `sleep_sessions`, `activity_daily`, `vitals_daily`.

**3.3 API**

- Add `listVitalsDaily(days)` in `api.ts` (if not already present) that queries `vitals_daily` by `user_id` and `vitals_date` for the last N days, so mood (and insights) can consume it.

**Deliverables:**  
- Mood logging and history screens show sleep/steps/vitals context from existing tables.  
- No new Health Connect reads; same architecture as rest of app (sync writes, UI reads from Supabase).

---

### Phase 4 — Enrich insights with vitals (and optional mindfulness)

**Goal:** InsightContext and rules can use vitals (and optionally mindfulness) so insights feel more connected to health and mood.

**4.1 Context and contextBuilder**

- **InsightContext** (in `InsightEngine.ts`): Add a small `vitals` block, e.g.:
  - `vitals?: { lastRestingHeartRateBpm?: number; lastHrvRmssdMs?: number; avgHrv7d?: number }` (or similar — “last” = most recent day we have, “avg 7d” for a simple baseline).
- **contextBuilder.fetchInsightContext()**:  
  - Call `listVitalsDaily(7)` (or 14).  
  - Compute “last” and “avg 7d” (or 14d) and set `context.vitals`.
- **InsightFieldPath** (and getByPath): Add paths such as `vitals.lastRestingHeartRateBpm`, `vitals.lastHrvRmssdMs`, `vitals.avgHrv7d` so rules can reference them.

**4.2 Insight rules**

- Add one or a few rules that use vitals, e.g.:
  - “Your HRV has been low the last few days; consider rest or light movement.”
  - “Resting heart rate is above your recent average.”
- Optionally use mindfulness (e.g. “You haven’t logged a mindfulness session this week”) if we have `listMindfulnessSessions` and add a `mindfulness` or `wellness` slice to context.

**4.3 Baseline**

- In `baselineContext`, we can optionally include a “vitals baseline” (e.g. avg HRV over last 14 days) so future rules can say “below your baseline” for HRV.

**Deliverables:**  
- Insights can use vitals (and optionally mindfulness) in context and in rules.  
- Mood-related insights can reference both mood and health (sleep, steps, vitals) in the same way we do today for sleep/steps.

---

## Architecture summary (same as sleep)

- **One sync path for “connect/import”:** When the user triggers connect or “Import” (sleep_import / integrations_import), we run a single `syncHealthData` with full window. That run:
  - Fetches sleep from HC (existing).
  - Runs sleep pipeline → `sleep_sessions` (existing).
  - Fetches **multi-day** activity and vitals from HC (new in Phase 1) and upserts into `activity_daily` and `vitals_daily`.
  - Fetches **multi-day** mindfulness sessions from HC (Phase 2) and upserts into `mindfulness_events` (or new columns).
- **Ongoing syncs** (e.g. dashboard, background): At least **today** for activity and vitals (and optionally last 7 days); today or last N days for mindfulness. Sleep stays as today.
- **UI and insights** only read from Supabase (`sleep_sessions`, `activity_daily`, `vitals_daily`, `mindfulness_events`). No direct HC reads from screens or insight engine.
- **RLS:** All health tables enforce `user_id = auth.uid()` for read/write.

---

## Order of implementation

1. **Phase 1** — Fix activity/vitals sync and schema/RLS so both tables write reliably on first sync and ongoing.
2. **Phase 2** — Add HC mindfulness read + schema + sync + history UI.
3. **Phase 3** — Add mood screen context (sleep, steps, vitals) using existing tables.
4. **Phase 4** — Add vitals (and optional mindfulness) to InsightContext and rules.

Phases 3 and 4 can be parallelised after Phase 1 and 2 are in place.

---

## Mood screen: avoid clutter (decision)

The first card under the mood hero is **Cause links** (Sleep & meds correlation + “Does this match your experience?” + chips + input). It is already very text-heavy.

**Decision:** Do **not** add a new “health context” card or block to the mood screen. Do **not** add more copy to the Cause links card.

- **Phase 3 (mood enrichment):** Deliver “mood connected to health” via **insights only** (Phase 4). Add `listVitalsDaily` for the insight contextBuilder; do **not** add a dedicated health-context card or paragraph on the mood screen. If we want a minimal hint later, we can add a single line under the hero (e.g. “Last night: 6h · Today: 4.2k steps”) or show context only in the mood-entry detail modal.
- **Phase 4:** InsightContext and rules use vitals (and optionally mindfulness) so the **existing** InsightCard on the mood screen can show context-aware messages (e.g. “Your HRV was low last night — how are you feeling today?”) without any new UI blocks.

---

## Checklist for your approval

- [ ] Phase 1: Backfill activity/vitals in same run as sleep; integer fix for `active_energy`; RLS verified.
- [ ] Phase 2: Mindfulness in HC service; extended `mindfulness_events` schema (source + HC columns); sync + list API + history UI.
- [ ] Phase 3: No new card/block on mood screen; `listVitalsDaily` added for insights; “mood + health” via insights (Phase 4) only.
- [ ] Phase 4: `InsightContext.vitals` and optional mindfulness; new insight paths and rules.

Once you approve, we can break Phase 1 into concrete code edits (files and line ranges) and then proceed.
