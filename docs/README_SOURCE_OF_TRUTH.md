# Reclaim — repository as source of truth

This repo is the **canonical** record for what Reclaim **actually ships** (code + config), what is **planned or partial**, and what **policies/releases** require. Older chat logs, ad-hoc notes, and tools are **secondary** unless their content is merged here.

## Layout

| Path | Purpose |
|------|---------|
| `docs/memory/raw/*/` | **Imports only** — paste exports from ChatGPT, Claude, Codex, Cursor, Play Console notes, policy PDFs/snippets. **No secrets.** |
| `docs/memory/derived/` | **Curated truth** — reconciled from code + raw imports. Update when behavior changes. |
| `docs/product/` | Approved product narrative and roadmap *documents* (optional). |
| `docs/release/` | Release checklists, version notes, **formal Play/policy audits** (`reclaim_play_readiness_audit.md`, matrices). |
| `app/Documentation/` | **Existing** engineering docs (phases, audits, health coverage). Prefer not to duplicate; **link** from derived docs or add a pointer here when authoritative. |
| `app/src/` | **Ground truth** for runtime behavior. |

## Play / policy audits (`docs/release/`)

- `docs/release/reclaim_play_readiness_audit.md` — executive verdict, defensible vs weak areas, must-fix.
- `docs/release/reclaim_permission_justification_matrix.md` — HC + Android permissions vs code/UX.
- `docs/release/reclaim_play_blocker_matrix.md` — severity, evidence, resubmission consequences.
- `docs/release/reclaim_trust_risk_notes.md` — privacy, telemetry, medical-adjacent, background risks.

## Vision / product alignment (`docs/release/`)

- `docs/release/reclaim_vision_alignment_audit.md` — core vision vs current app, promise, verdict.
- `docs/release/reclaim_vision_gap_matrix.md` — intended vs current by area.
- `docs/release/reclaim_launch_non_negotiables.md` — MUST / SHOULD / CAN DEFER for “right app”.
- `docs/release/reclaim_feature_drift_and_clutter.md` — off-mission or noisy surfaces.
- `docs/release/reclaim_premium_experience_gaps.md` — home/premium gaps (not generic UX teardown).

## System coherence / interconnection (`docs/release/`)

- `docs/release/reclaim_system_coherence_audit.md` — one connected brain vs modules, verdict.
- `docs/release/reclaim_feature_interconnection_matrix.md` — domain × domain strength.
- `docs/release/reclaim_orphaned_and_siloed_systems.md` — weakly wired or misleading surfaces.
- `docs/release/reclaim_launch_critical_integrations.md` — what must cohere before launch.
- `docs/release/reclaim_shared_state_and_interpretation_gaps.md` — shared state, handoffs, STATE→MEANING→ACTION gaps.

## Architecture authority / orchestration (`docs/release/`)

- `docs/release/reclaim_architecture_authority_audit.md` — roles, authority map, verdict.
- `docs/release/reclaim_authority_graph.md` — modules × responsibility × authority level.
- `docs/release/reclaim_shared_state_map.md` — who builds/consumes context; duplication.
- `docs/release/reclaim_orchestration_overlap_matrix.md` — overlaps (insights vs recovery, sync, notifs).
- `docs/release/reclaim_existing_orchestrator_candidates.md` — formalize vs rebuild (SyncCoordinator, InsightContext, …).
- `docs/release/reclaim_launch_critical_architecture_decisions.md` — MUST / SHOULD / DEFER decisions.

## Derived files (start here)

1. `docs/memory/derived/reclaim_canonical_memory_status.md` — **PROVISIONAL CANONICAL MEMORY v0.9**; what is established vs missing; confidence by category.
2. `docs/memory/derived/reclaim_export_backfill_queue.md` — **targeted** checklist for the next full ChatGPT / policy import.
3. `docs/memory/derived/reclaim_provisional_origin_note.md` — **provisional** early history (reconstructed ChatGPT pack); user-stated **~Oct 2025** ideation; **not** verbatim completeness.
4. `docs/memory/derived/reclaim_master_inventory.md` — feature ledger (CURRENT / PARTIAL / …).
5. `docs/memory/derived/reclaim_architecture_recon.md` — navigation, providers, sync, health, duplication.
6. `docs/memory/derived/reclaim_policy_audit.md` — permissions, Health Connect, Play risks.
7. `docs/memory/derived/reclaim_release_scope.md` — ship / fix / remove / defer.
8. `docs/memory/derived/reclaim_open_questions.md` — only what the repo cannot answer.
9. `docs/memory/derived/reclaim_discussion_recon.md` — decisions and *why* (from docs + commits + imported chats).
10. `docs/memory/derived/reclaim_source_provenance_matrix.md` — claims ↔ sources ↔ confidence.
11. `docs/memory/derived/reclaim_memory_merge_notes.md` — how raw folders were merged (dedupe, conflicts).

## How to update when a feature changes

1. **Change the code** (or config) in `app/`.
2. Update **`reclaim_master_inventory.md`** — adjust status, evidence paths, permissions.
3. If architecture shifts (new provider, new sync path), update **`reclaim_architecture_recon.md`**.
4. If permissions or data collection change, update **`reclaim_policy_audit.md`** and Play Data safety drafts in `docs/memory/raw/play-console/` or `policies/`.
5. Before store submit, refresh **`reclaim_release_scope.md`**.
6. After large raw imports, update **`reclaim_canonical_memory_status.md`**, **`reclaim_source_provenance_matrix.md`**, and **`reclaim_memory_merge_notes.md`**.

## Avoiding memory fragmentation again

- **Do not** rely on a single long chat thread as history — export important decisions into `docs/memory/raw/cursor/` (or `chatgpt/`) and summarize in `reclaim_discussion_recon.md`.
- **Do not** maintain two competing “coverage” docs — if `app/Documentation/HEALTH_API_COVERAGE.md` disagrees with `app/plugins/withHealthConnectPermissions.js` + `HEALTH_CONNECT_DEFAULT_METRICS`, **fix the doc or the code** and note the resolution in the inventory.
- **Prefer** file paths and symbols over prose-only claims.

*Last structured pass: **PROVISIONAL CANONICAL MEMORY v0.9** (normalization + export queue; full early ChatGPT export still **pending**).*
