# Memory merge notes (2026-04-16 pass)

## What was ingested

- `docs/memory/raw/play-console/*.md` (2 files) — full text of Google Play rejections.
- `docs/memory/raw/cursor/*.md` (5 SpecStory exports) — Health Connect handover follow-ups, Maestro setup discussion, Phase 5–6 implementation thread, Gradle, tile UX.
- `docs/memory/raw/codex/*.md` (4) — architecture audit / JSON plan pipeline, splash orb fix narrative, guided training notification audit+fix narrative, notification system audit (includes commit-history commentary).
- `docs/memory/raw/claude/*.md` (1) — mixed: meta advice + pasted audit + **external** training notification diagnosis (runtime vs watch path).

**ChatGPT (partial):** `raw/chatgpt/2026-04-19_chatgpt_recovered_mentions_backfill_pack.md` — **reconstructed** mentions pack (not full account export). Curated in `reclaim_provisional_origin_note.md` + targeted rows in discussion/inventory/provenance.

**Empty / placeholder:** other `raw/chatgpt/*` not yet imported; `raw/policies/` (only `.gitkeep`).

## Major deduplications

1. **Training notifications** — Codex (`2026_03_02`), Codex (`2026_03_11` excerpts), Claude export, and Cursor threads all orbit the same theme: intent/reconcile, `useNotifications`, `TrainingSessionView`, watch actions, duplicate first-set, background handling. Merged into one **discussion cluster** in `reclaim_discussion_recon.md` with multiple sources.

2. **Health Connect scope** — Phase 0 repo doc (narrow), Play rejections (broad types on submitted builds), Cursor 2026-03-06 user message (“all HC fields”) — treated as **timeline**: discussion wanted breadth; **policy forced narrowing**. Current code evidence: `withHealthConnectPermissions.js` + `HEALTH_CONNECT_DEFAULT_METRICS`.

3. **Google Fit** — Codex `2026_03_11` commit-history section claims Fit still in app on analyzed branch — **conflicts** with **current** `c:\Reclaim` tree (no `googleFit` in TS/TSX). Preserved as **historical export claim** + **current repo fact**, not resolved.

## Conflicts explicitly not resolved

| Topic | A | B |
|-------|---|---|
| Google Fit in app | Raw codex audit (older branch / date) | Current repo grep |
| Splash orb strategy | Codex export: analytic ellipses + `reclaimOrbPaths.ts` | Current `ReclaimLogo.tsx` still uses `ContourMeasureIter` (no `reclaimOrbPaths` module) |
| `HEALTH_API_COVERAGE.md` vs manifest | Doc table | Plugin + default metrics |

## Assumptions removed or weakened

- “No Play rejection text in repo” — **false** after import; rejections are now primary sources for policy history.
- Single rejection narrative — **false**; there are **two** distinct messages (2026-04-08 vs 2026-04-16) with different listed permission sets.

---

# Memory merge notes (2026-04-19 pass — ChatGPT backfill)

## What was ingested

- `docs/memory/raw/chatgpt/2026-04-19_chatgpt_recovered_mentions_backfill_pack.md` — **provisional** product origin timeline, principles, UX preferences, Play/HC **rationale** (reconstructed), naming discussion, release attitude.

## Treatment

- **Did not** treat as transcript truth; labeled **reconstructed** throughout derived docs.
- **Merged** where it adds timeline, principles, or tension context without contradicting verbatim Play sources.
- **New derived file:** `reclaim_provisional_origin_note.md`.
- **No** closure of OQ-1–8 from this source alone; **OQ-9** added for earliest verbatim origin export.

## Conflicts

- **None new** vs Play Console raw text or Phase 0 — ChatGPT pack **corroborates** minimum-scope narrative qualitatively only.
- **Oct 2025** start date remains **user-stated** until an export backs it.

---

# Memory merge notes (provisional canonical normalization — v0.9)

## What changed

- Declared **PROVISIONAL CANONICAL MEMORY v0.9** in `reclaim_canonical_memory_status.md`.
- Added `reclaim_export_backfill_queue.md` for **targeted** post-export import work.
- Tightened `reclaim_provisional_origin_note.md`: **predates** verbatim raw set; **Oct 2025** user-stated; claims pending export stay **provisional**.
- **Deduped** `reclaim_discussion_recon.md` §0 → pointer to origin note + status (avoid parallel timeline tables).
- Cross-linked derived docs (inventory, open questions, policy audit, release scope, provenance, README).
- **Re-checked** `raw/chatgpt/` (1 reconstruct + `.gitkeep`), `raw/policies/` (empty) — **nothing missed** beyond acknowledged gaps.

## Certainty adjustments

- **No** open questions removed — **no** new primary evidence answered OQ-1–OQ-9.
- **Play letter 1 vs 2** and **HR/vitals** uncertainty remain **Conflict** / **No direct evidence found** for full Console context.

## Architecture

- **No** raw material materially changed architecture **history**; `reclaim_architecture_recon.md` received **format fix** for data-flow table + procedural links only.
