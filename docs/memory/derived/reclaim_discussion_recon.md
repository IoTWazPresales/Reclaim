# Reclaim — discussion recon (canonical, merged)

**Sources:** `docs/memory/raw/**` (Codex, Cursor/SpecStory, Claude, Play Console, **ChatGPT backfill**) **plus** `app/Documentation/*` and code verification where noted.

**ChatGPT raw pack:** `raw/chatgpt/2026-04-19_chatgpt_recovered_mentions_backfill_pack.md` — **reconstructed**, not verbatim export.

**Baseline / uncertainty:** `reclaim_canonical_memory_status.md` (**PROVISIONAL CANONICAL MEMORY v0.9**). Reconstructed timeline + principles: **`reclaim_provisional_origin_note.md`** (avoid duplicating that table here). Pending imports: **`reclaim_export_backfill_queue.md`**.

**Rule:** Status distinguishes **implemented**, **planned**, **historical discussion**, **obsolete export**, **unresolved**.

---

## 0. Provisional timeline & origin (pointer)

Early ChatGPT-side history is **partially reconstructed**; **verbatim** threads from **~Oct 2025** onward are **not** fully in repo (**OQ-9**). See **`reclaim_provisional_origin_note.md`** for the dated cluster summary and discussion-level principles (**STATE → MEANING → ACTION**, permission ↔ visible feature, meaningful notifications, etc.).

---

## 1. Product decisions

| Decision / insight | Status | Sources | Evidence / notes | Related |
|--------------------|--------|---------|-------------------|---------|
| Android health pipeline → **Health Connect**; reduce / remove **Google Fit** dependence | accepted (repo doc) | `PHASE_0_HC_ANDROID_DECISIONS.md` | Current tree: no `googleFit` in TS/TSX | `integrations.ts`, `healthConnectService.ts` |
| **Suspend** Fit-era **stress** auto-push until HC-native design | accepted | `PHASE_0_HC_ANDROID_DECISIONS.md` | — | `notificationTriggers.ts` |
| **Minimum-scope** HC for Play | accepted | Phase 0; Play rejections | `withHealthConnectPermissions.js` | Raw: `raw/play-console/*.md` |
| User asked to use **all HC fields** for historical tracking (Mar 2026) | historical intent | `raw/cursor/2026_03_06_12_14_29Z_health_connect_integration_an.md` | **Superseded** by policy + narrow manifest **inference** | Conflicts with Play letters |
| Training phased UX (single-set focus, notifications channel, etc.) | accepted | Git + `raw/codex/2026_03_02_*.md` | Commits referenced in repo history | Training module |
| Wearables = **notification-mirrored** phone state, not separate watch app sync | accepted | `raw/codex/2026_03_02_*.md` flow map | Code: payload-driven actions | — |
| **HC-only Android** + avoid **enrichment-only** HC reads without visible feature tie | accepted (direction) | `PHASE_0_HC_ANDROID_DECISIONS.md`; parallel rationale (reconstructed): `raw/chatgpt/2026-04-19_*` | ChatGPT pack **does not** prove Play compliance; echoes minimum-scope tension | `withHealthConnectPermissions.js`, `healthConnectService.ts` |

---

## 2. UX decisions

| Decision / insight | Status | Sources | Notes |
|--------------------|--------|---------|-------|
| Phase 7 Tier 1 = trust / ship-blocker audit | accepted finding | `PHASE_7_UI_AUDIT_BACKLOG.md` | Partially stale vs grep; re-verify |
| Dashboard “bland” vs premium competitors; hero / today score / CTA / rails | opinion + backlog | `raw/codex/2026_02_02_Conduct_architecture_audit_and_propose_improvements.md` (Codex reply section) | Not implementation |
| **Softer, rounder** actions; warm/premium; **expressive tiles** vs **calmer** guided journey surfaces | historical discussion | `raw/chatgpt/2026-04-19_*` | **Not** a design spec; verify against `ReclaimButton` / theme tokens |
| User prefers **honest critique** over agreeable design feedback | historical discussion | `raw/chatgpt/2026-04-19_*` | Process note |
| Home tile / Phase 5–6 polish (Skia, typography, etc.) | in progress / completed mix | `raw/cursor/2026_03_29_10_49_14Z_tile_design_and_user_experien.md` | Todo export |
| **“Reclaim” naming** collision risk; alternatives with **R** | unresolved / discussion | `raw/chatgpt/2026-04-19_*` | No legal/market resolution in repo |

---

## 3. Architecture decisions

| Decision / insight | Status | Sources | Notes |
|--------------------|--------|---------|-------|
| Notifications = **intent store + reconcile** (cutover planned in JSON phases) | partial | `raw/codex/2026_02_02_*.md` JSON | **Not** full cutover proven; `NotificationScheduler.ts` exists |
| **Fail-open** onboarding on remote timeout | accepted | `RootNavigator.tsx` comments | Code |
| **SyncEngine** / background task invalidates React Query | accepted | `backgroundSync.ts`, `sync/SyncEngine.ts` | Code |
| Strangler phases: observability → auth → scoped storage → repos → sync wrapper → notif dual path → cutover | planned | `raw/codex/2026_02_02_*.md` | **WANTED** — verify phase-by-phase vs tree |
| Wearables Phase 1–2: **Glance models** + delivery adapters | planned | Same JSON tail | **No** `app/src/wearables/` in standard layout **inference** |

---

## 4. Policy / Play decisions

| Decision / insight | Status | Sources | Notes |
|--------------------|--------|---------|-------|
| Google **rejected** app for HC **excessive** types (twice) | fact | `raw/play-console/2026_04_08_*.md`, `raw/play-console/2026_04_16_*.md` | Verbatim |
| First letter listed **many** types including HR, overnight vitals, steps, calories, exercise | fact | First raw file | Drives narrowing narrative |
| Second letter (**version code 7**) narrowed list to **calories + steps + RHR + HRV** only | fact | Second raw file | Implies iterative resubmission |
| Rationale copy: say **active calories** not **steps** where permissions don’t include steps | accepted | Git message in prior recon + compliance intent | `c73c3e3` |

---

## 5. Training notifications — merged technical narrative

**Sources:** `raw/claude/2026-03-Getting_claude_opinion.md`, `raw/codex/2026_03_02_*.md`, `raw/codex/2026_03_11_*.md` (flow sections), current `useNotifications.ts`.

| Topic | What was said | Implemented in this tree? |
|-------|---------------|-------------------------|
| Watch **Done** updates DB but **runtimeState** in `TrainingSessionView` stale → UI stuck | Claude / Codex analysis | **Inference:** sync-bridge / invalidation fixes may exist; verify file |
| **SKIP_SET** double `reconcile` | Claude | Grep **deferReconcile** not confirmed in this pass for SKIP path |
| **Background** `TaskManager` for notification actions | Codex `2026_03_02` | **Yes** — `registerTaskAsync(TRAINING_NOTIFICATION_ACTION_TASK)` in `useNotifications.ts` |
| **First-set dedupe** (prep vs session view) | Codex `2026_03_02` | **Verify** `TrainingSessionView.tsx` |
| **firedAt** on intents to stop duplicate rest/set on foreground | Claude narrative | **No** `firedAt` in `NotificationScheduler.ts` (grep) — **partial / not landed** |
| Stable fingerprint for training notifications (time-independent) | Claude | **Verify** `NotificationScheduler.ts` logic |
| Dedicated **training** notification channel vs reminder channel | Claude | **Verify** channel ids in scheduler |
| `TRAINING_NOTIFICATION_DEBUG_LOGS` | Codex | **Present** (`useNotifications.ts` line ~37) |

---

## 6. Health integrations — historical vs current

| Claim | Source | Current tree |
|-------|--------|--------------|
| App still ships **Google Fit** + Samsung + HC + Apple | `raw/codex/2026_03_11_*.md` commit-history narrative | **Conflict:** no `googleFit` in app TS/TSX today |
| Samsung path exists | repo + export | `samsungHealthService.ts` — **PARTIAL** parity |

**Resolution:** Treat Codex `2026_03_11` integration inventory as **time-stamped / branch-stale** unless re-validated against `c:\Reclaim` HEAD.

---

## 7. Splash / brand animation

| Claim | Source | Current tree |
|-------|--------|--------------|
| Replace contour rings with **analytic ellipses** + `reclaimOrbPaths.ts` + tests | `raw/codex/2026_02_22_*.md` | **Conflict:** no `reclaimOrbPaths.ts`; `ReclaimLogo.tsx` still uses `Skia.ContourMeasureIter` |

**Status:** Export describes a fix that is **not** reflected in current paths — different branch, reverted, or never merged here.

---

## 8. Tooling / QA

| Topic | Source | Notes |
|-------|--------|-------|
| **Maestro** smoke / alpha flows | `raw/cursor/2026_03_07_*.md` | Paths `app/.maestro/*.yaml` cited in export — **verify** repo |
| Full “test every aspect repeatedly” | discussion | Aspirational; not a shipped guarantee |

---

## 9. Rejected / dead ends

| Item | Source | Notes |
|------|--------|-------|
| Broad HC + all types for v1 Play resubmit | Play rejections | Rejected by Google |
| “Solely HC + Apple” without doc/code sync | Phase 0 vs old exports | Directional |

---

## 10. Unresolved debates

| Debate | Sources | Why unresolved |
|--------|---------|----------------|
| Does reviewer now accept **HR + overnight vitals** if declaration + UI match? | Play letter 1 vs 2 | Second letter silent on HR/SpO2/RR/temp |
| **True earliest** product framing (pre–Mar 2026) | ChatGPT pack lists gaps | Verbatim **late-2025** export still **pending** |
| Full Claude **NotificationScheduler** patch set vs current file | Claude export vs grep | `firedAt` absent |
| Codex architecture JSON: how many phases executed? | `2026_02_02` vs tree | No automated diff in this pass |

---

## 11. Principles to preserve (discussion-derived)

1. **Provenance first:** big claims need `raw/…` or commit SHA.
2. **Play truth:** imported rejection text beats memory.
3. **No silent merge** when export says Fit exists and grep says no — mark **conflict**.
4. **Notification intents** are the architectural spine for training/watch — multiple agents agree.

---

*Add new rows when dropping exports into `docs/memory/raw/cursor/` etc.*
