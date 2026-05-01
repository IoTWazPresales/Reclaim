# Reclaim — source provenance matrix

**Classification:** `fact` = directly verifiable in repo or quoted primary document; `inference` = reasonable derivation; `conflict` = two sources disagree; `obsolete` = likely outdated relative to current tree.

**Memory baseline:** **PROVISIONAL CANONICAL MEMORY v0.9** — `reclaim_canonical_memory_status.md`. **Import gaps:** `reclaim_export_backfill_queue.md`.

---

## Baseline / import coverage

| Claim | Classification | Source files | Confidence | Notes |
|-------|----------------|--------------|------------|-------|
| Derived memory normalized to **v0.9 provisional** canonical baseline | fact (process) | `reclaim_canonical_memory_status.md` | High | Not a claim of complete chat history |
| `docs/memory/raw/policies/` has **no** substantive policy imports yet | fact | `raw/policies/.gitkeep` only | High | Snippets/PDFs **pending** |
| ChatGPT raw folder has **one** reconstructed mentions pack + placeholder | fact | `raw/chatgpt/2026-04-19_*`, `.gitkeep` | High | Full thread export **pending** |

---

## Feature / integration history

| Claim | Classification | Source files | Confidence | Notes |
|-------|----------------|--------------|------------|-------|
| Google Play rejected the app for **excessive Health Connect scope** (“Minimum Scope”) | fact | `raw/play-console/2026_04_08_First_Play_Console_Rejection_Message.md`, `raw/play-console/2026_04_16_Second_Play_Console_Rejection_Message.md` | High | Verbatim Play text |
| First rejection listed many HC types including **HeartRate**, **HRV**, **RestingHeartRate**, **SpO2**, **RR**, **BodyTemperature**, **Steps**, **Active/Total calories**, **ExerciseSession** as not required | fact | `raw/play-console/2026_04_08_*.md` | High | — |
| Second rejection (version **code 7**) listed only **ActiveCaloriesBurned**, **Steps**, **TotalCaloriesBurned**, **RestingHeartRate**, **HeartRateVariabilityRmssd** as not required | fact | `raw/play-console/2026_04_16_*.md` | High | Implies narrowing between submissions **inference** |
| Current Android manifest plugin declares **5** health `READ_*` permissions (sleep, HR, SpO2, RR, body temp) | fact | `app/plugins/withHealthConnectPermissions.js` | High | Code |
| Runtime connect requests **no** steps, calories, resting HR, HRV in default bundle | fact | `app/src/lib/health/healthConnectService.ts` `HEALTH_CONNECT_DEFAULT_METRICS` | High | Code |
| User asked (Mar 2026) to leverage “**all health connect fields**” for historical tracking | fact (intent) | `raw/cursor/2026_03_06_12_14_29Z_health_connect_integration_an.md` | High | Discussion; **not** current product law |
| Architecture audit produced multi-phase JSON migration (notifications intent cutover, wearables projection, etc.) | fact (artifact) | `raw/codex/2026_02_02_Conduct_architecture_audit_and_propose_improvements.md` | High | **Not** proof all phases shipped |
| Guided training bugs: **runtimeState** not updated on watch action; **SKIP_SET** double reconcile; rest/foreground burst issues | fact (analysis) | `raw/claude/2026-03-Getting_claude_opinion.md`, `raw/codex/2026_03_02_*.md` | Medium | Aligns with fixes described in same exports |
| **Background** notification task + **first-set dedupe** proposed/implemented in Codex narrative | inference | `raw/codex/2026_03_02_*.md` | Medium | Confirm against `useNotifications.ts` / `TrainingSessionView.tsx` |
| Codex splash fix used **analytic ellipses** + new `reclaimOrbPaths.ts` | fact (export) | `raw/codex/2026_02_22_*.md` | High for export | **conflict** |
| Current repo has **no** `reclaimOrbPaths.ts`; `ReclaimLogo.tsx` still uses `ContourMeasureIter` | fact | `app/src/components/ReclaimLogo.tsx` (grep) | High | **conflict** with export’s “files changed” list for this tree |
| Codex notification audit claimed app “still ships **Google Fit** path” on analyzed branch | obsolete / conflict | `raw/codex/2026_03_11_*.md` | Low for **current** tree | Current `c:\Reclaim` TS/TSX: no `googleFit` symbols |
| **Maestro** flows exist under `app/.maestro/` | fact | `raw/cursor/2026_03_07_*.md` (glob result); verify `app/.maestro/*.yaml` | High | Cursor export references paths |

---

## Policy / declaration

| Claim | Classification | Source files | Confidence | Notes |
|-------|----------------|--------------|------------|-------|
| Play requires manifest + **Console declaration** to match minimum scope | fact | Play rejection boilerplate in raw play-console files | High | — |
| Internal `HEALTH_API_COVERAGE.md` may still describe broader Android HC than manifest | conflict | `app/Documentation/HEALTH_API_COVERAGE.md` vs plugin (prior recon) | Medium | Not re-read line-by-line in this merge |

---

## Product / UX

| Claim | Classification | Source files | Confidence | Notes |
|-------|----------------|--------------|------------|-------|
| Dashboard feels **bland** vs premium apps; recommendations for hero, today score, CTA strip, rails | inference (opinion) | `raw/codex/2026_02_02_*.md` (dashboard critique section) | Medium | Subjective; useful for backlog |
| Tile design / home surface work in Phase 5–6 | fact (process) | `raw/cursor/2026_03_29_10_49_14Z_tile_design_and_user_experien.md` | Medium | Todo list in export |

---

## ChatGPT reconstructed backfill (2026-04-19)

**File:** `raw/chatgpt/2026-04-19_chatgpt_recovered_mentions_backfill_pack.md` — **not** verbatim transcript; retained-memory / snippet reconstruction per that file’s own disclaimer.

| Claim | Classification | Source files | Confidence | Notes |
|-------|----------------|--------------|------------|-------|
| User states Reclaim ideation **by ~Oct 2025** | user-stated (in pack) | above | Medium (timeline only) | **No** Oct 2025 export in repo |
| Earliest visible ChatGPT title **“Welltory vs Reclaim”** (2026-03-22) | reconstructed metadata | above | Low–Medium | Snippet / title only |
| **STATE → MEANING → ACTION** as durable framing | inference (principle) | above | Medium | Discussion; not automatic proof of shipped copy |
| Interpretability-first; explicit uncertainty; no guilt-driven UX | inference (principle) | above | Medium | Aligns with product direction in other raw; still ChatGPT-side |
| Softer/rounder actions; expressive tiles vs calmer journey | inference (UX preference) | above | Medium | Verify vs `ReclaimButton` / theme |
| Play: map HC types to **visible** features; avoid enrichment-only reads | inference (rationale) | above | Medium | **Consistent with** Play letters; not new Google evidence |
| Android **HC-only** vs Fit; trigger gap (streaming vs polling) | inference (technical discussion) | above | Medium | Overlaps Phase 0 + codebase; pack adds narrative only |
| **“Reclaim”** naming collision risk | inference (concern) | above | Low | No legal/market resolution in repo |
| Refuse “upload just to upload”; policy-weak builds | inference (process) | above | Medium | User/process preference in reconstruct |

---

## Architecture / process

| Claim | Classification | Source files | Confidence | Notes |
|-------|----------------|--------------|------------|-------|
| Strangler migration: observability → auth → storage scope → sync wrapper → notification dual path → cutover | fact (plan) | `raw/codex/2026_02_02_*.md` embedded JSON | High | **WANTED** if not executed |
| EAS internal iOS distribution without manual portal work (device registration) | inference | `raw/claude/2026-03-Getting_claude_opinion.md` | Medium | General guidance |

---

*When adding raw exports, append rows here before folding claims into `reclaim_master_inventory.md`.*
