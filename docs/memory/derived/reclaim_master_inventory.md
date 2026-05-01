# Reclaim — master inventory (canonical ledger, merged)

**Statuses:** CURRENT · PARTIAL · WANTED · REMOVED · DEPRECATED · DEFERRED · BLOCKED · UNVERIFIED

**Memory baseline:** **PROVISIONAL CANONICAL MEMORY v0.9** — `reclaim_canonical_memory_status.md`. **Pending export work:** `reclaim_export_backfill_queue.md`.

**Provenance:** See `reclaim_source_provenance_matrix.md`. **Sources** below use `raw/<agent>/filename`.

**Provisional origin / ChatGPT:** `reclaim_provisional_origin_note.md` — discussions **predate** full verbatim import; user states ideation **by ~Oct 2025**; only **reconstructed** pack in repo today.

**Conflict rule:** If raw export contradicts current code, **both** are recorded; see § Conflicts.

---

## A. Policy / Play history (facts from imported memory)

| Topic | Category | Status | Description | User-facing surface | Evidence summary | Sources | Key files | Notes |
|-------|----------|--------|-------------|---------------------|------------------|---------|-----------|-------|
| Play rejection #1 (HC minimum scope) | Policy | BLOCKED (historical) | Google listed many HC types as excessive vs declared features | None — console | Verbatim rejection | `raw/play-console/2026_04_08_First_Play_Console_Rejection_Message.md` | — | Types included HR, HRV, RHR, steps, calories, exercise, overnight vitals |
| Play rejection #2 (version code 7) | Policy | BLOCKED (historical) | Narrower list: active calories, steps, total calories, RHR, HRV | None | Verbatim rejection | `raw/play-console/2026_04_16_Second_Play_Console_Rejection_Message.md` | — | **Conflict:** second list ≠ first — iterative review |

---

## B. Current features (code + strong docs; sources when raw informed)

| Feature | Category | Status | Description | User-facing surface | Evidence summary | Sources | Key files | Notes |
|---------|----------|--------|-------------|---------------------|------------------|---------|-----------|-------|
| Auth + onboarding | Core | CURRENT | Supabase auth; onboarding stack | Auth +7-step flow | Code | — | `RootNavigator.tsx`, `OnboardingNavigator.tsx` | — |
| Main navigation | Core | CURRENT | Drawer + tabs + stacks | All major screens | Code | `raw/codex/2026_02_02_*` (audit index) | `AppNavigator.tsx`, `TabsNavigator.tsx` | — |
| Dashboard | Core | CURRENT | Home hub cards | Tab Home | Code | Codex **opinion** on blandness: `raw/codex/2026_02_02_*` | `Dashboard.tsx` | UX critique = backlog, not code change |
| Sleep / mood / meds / training / mindfulness / meditation | Core | CURRENT | Domain screens | Drawer | Code | — | `screens/*.tsx` | — |
| Health Connect (Android) | Health | CURRENT | Narrow read scope | Integrations + sync | Code + Play history | Phase 0 doc; rejections: `raw/play-console/*` | `healthConnectService.ts`, `withHealthConnectPermissions.js` | — |
| Apple Health + Samsung paths | Health | PARTIAL / CURRENT | iOS + optional Samsung | Integrations | Code | Codex **obsolete** claim re Fit: `raw/codex/2026_03_11_*` | `integrations.ts`, `samsungHealthService.ts` | **Conflict** on Fit (see §G) |
| Insights + rules JSON | Insights | CURRENT | Context + engine | Cards | Code | Phase 6 in cursor export | `InsightsProvider.tsx`, `InsightEngine.ts`, `insights.json` | Calendar slice: `calendarInsightContext.ts` |
| Calendar wellness nudges | Notifications | CURRENT | Heuristic titles → optional nudges | Notifications | Code | — | `wellnessCalendarContextNudges.ts` | Android |
| HR spike → mindfulness | Notifications | CURRENT | Polling + gates | Notifications | Code | — | `notificationTriggers.ts` | iOS parity PARTIAL |
| Training notifications + categories | Notifications | CURRENT | TRAINING_SET / REST / REMINDER | Watch + phone | Code + raw | `raw/codex/2026_03_02_*`, `raw/claude/*` | `useNotifications.ts`, `trainingNotificationScheduler.ts`, `NotificationScheduler.ts` | Background task registered |
| Background health sync | Background | CURRENT | TaskManager + SyncEngine | Invisible | Code | Architecture plan mention | `backgroundSync.ts`, `sync/SyncEngine.ts` | — |
| Maestro smoke tests | QA | CURRENT | E2E YAML | CI / local | **Verify** paths | `raw/cursor/2026_03_07_*` | `app/.maestro/*.yaml` | If yaml missing, downgrade to UNVERIFIED |
| Telemetry | Ops | CURRENT | `app_logs` | None | Code | — | `telemetry.ts` | — |
| Play Integrity client probe | Ops | CURRENT | Optional verify call | None | Code | — | `playIntegrity/monitor.ts` | Edge function OQ |
| OTA / EAS | Platform | CURRENT | Updates URL | Transparent | Code | — | `app.config.ts`, `useAppUpdates` | — |

---

## C. Partial / in-progress

| Feature | Category | Status | Description | Sources | Key files | Notes |
|---------|----------|--------|-------------|---------|-----------|-------|
| iOS reactive HR triggers | Notifications | PARTIAL | Discussed gap | Phase 6 doc, `raw/codex/2026_03_02_*` | `notificationTriggers.ts` | — |
| Android resting HR in insights | Insights | PARTIAL | Empty trend on Android | Code | `fetchHeartRateContextSummary.ts` | — |
| Training notif **delivery** hardening | Notifications | PARTIAL | Claude: `firedAt`, fingerprint, channel | `raw/claude/*` | `NotificationScheduler.ts` | **`firedAt` not found** in scheduler — gap |
| Runtime ↔ watch **sync bridge** for session UI | Training | PARTIAL | Claude/Codex diagnosis | `raw/claude/*`, `raw/codex/2026_03_02_*` | `TrainingSessionView.tsx` | Verify sync effect exists |
| Splash logo **analytic ellipse** orbs | Brand | UNVERIFIED | Codex claimed shipped | `raw/codex/2026_02_22_*` | `ReclaimLogo.tsx` | **Conflict:** still `ContourMeasureIter` |
| JSON architecture migration phases 5–9 | Architecture | WANTED / DEFERRED | Full strangler plan | `raw/codex/2026_02_02_*` | — | Not all paths exist (e.g. `wearables/`) |

---

## D. Historically wanted (discussion or plan, not = shipped)

| Feature | Category | Status | Description | Sources |
|---------|----------|--------|-------------|---------|
| Use **all** HC record types for historical analytics | Health | WANTED (superseded) | User direction Mar 2026 | `raw/cursor/2026_03_06_*` |
| Wearables **Glance models** + projection service | Architecture | WANTED | JSON plan phases 8–9 | `raw/codex/2026_02_02_*` |
| Dashboard **premium** redesign (hero, readiness score, rails) | UX | WANTED | Codex critique | `raw/codex/2026_02_02_*` |
| **STATE → MEANING → ACTION** framing for surfaced health data | Product | UNVERIFIED | Durable principle in ChatGPT reconstruct; verify in copy/UX | `raw/chatgpt/2026-04-19_*` |
| **Softer / rounder** CTAs; **expressive tiles** vs **calmer** journey surfaces | UX | UNVERIFIED | Design language discussion only | `raw/chatgpt/2026-04-19_*` |
| **“Reclaim”** naming collision + **R-** prefix alternatives | Brand | UNVERIFIED | No resolution in repo | `raw/chatgpt/2026-04-19_*` |
| Full Maestro coverage “every aspect” | QA | WANTED | Cursor discussion | `raw/cursor/2026_03_07_*` |
| Repository layer for all writes | Architecture | WANTED | JSON plan | `raw/codex/2026_02_02_*` |

---

## E. Removed / suspended / deprecated

| Feature | Category | Status | Description | Sources |
|---------|----------|--------|-------------|---------|
| Google Fit pipeline (current tree) | Health | REMOVED | No TS symbols | Code grep + Phase 0 |
| Fit-era **stress** auto notification | Notifications | REMOVED / SUSPENDED | Phase 0 Decision 2 | `PHASE_0_HC_ANDROID_DECISIONS.md` |
| Broad HC types for **first** Play submissions | Health | REMOVED (forced) | Reviewer required cut | `raw/play-console/2026_04_08_*` |
| **ExerciseSession** / some activity types (declared side) | Health | REMOVED | Strike-through in internal doc | `HEALTH_API_COVERAGE.md` (verify) |

---

## F. Blocked / external

| Topic | Status | Sources |
|-------|--------|---------|
| Play approval for latest binary | BLOCKED | No acceptance in `raw/play-console/` |
| Complete Console declaration audit | BLOCKED | Forms not exported |

---

## G. Conflicts (do not resolve silently)

| Topic | A says | B says |
|-------|--------|--------|
| Google Fit in app | Codex `2026_03_11` audit narrative | Current repo: no `googleFit` in TS/TSX |
| Splash orb implementation | Codex: `reclaimOrbPaths.ts` + analytic ellipses | Repo: no `reclaimOrbPaths`; `ContourMeasureIter` in `ReclaimLogo.tsx` |
| HC permission table | `HEALTH_API_COVERAGE.md` (broad) | `withHealthConnectPermissions.js` + `HEALTH_CONNECT_DEFAULT_METRICS` (narrow) |
| Play reviewer concern | Letter 1 lists HR + vitals | Letter 2 omits HR/vitals — **unclear** if accepted |

---

## H. Calendar / insights (merged from prior recon + code)

| Feature | Status | Sources | Files |
|---------|--------|---------|-------|
| Insight **calendar** context (`hasDemandingBlockSoon`, etc.) | CURRENT | Repo-derived + prior session | `calendarInsightContext.ts`, `InsightEngine.ts`, `contextBuilder.ts` |

---

*One row minimum update when changing permissions, Play status, or integrations.*
