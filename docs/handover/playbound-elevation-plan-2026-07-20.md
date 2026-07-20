# Play-bound elevation plan — 2026-07-20 (Opus CONSULT READY)

**Branch:** `fix/training-confident-ux` @ `8b7a8a2`+  
**Artifacts:** `.tmp/playbound_elevation_consult_opus_seed.md`, `_followup_seed.md`, `_followup_response.md`  
**Human locks:** keep all HC features · everything in tonight’s APK · keep med mechanism + fix disclaimers · migration approved · adaptive/experiments opt-in only

**Honesty bar:** each unit is a *must-work-real MVP* with a freeze line — not hollow chrome. Depth grows post-upload.

**Operator experience:** Correct spacing; insight cards can show *why* from persisted signal history; multi-signal graph of that history; adaptive load + one behavioral experiment only if switched on; meds read as education, not diagnosis.

## Unit order (tonight → one EAS preview)

| ID | Unit | Size | Depends | Freeze |
|----|------|------|---------|--------|
| **U1** | Signal Ledger data spine (SQLite v6) | M | — | Local-only; best-effort write; no contextBuilder input changes |
| **U2** | Ledger explanations (“why”) | M | U1 | ≥7 paired points or show nothing; no causal verbs; meds out of correlations |
| **U3** | Multi-module graph | M | U1 | Reads ledger only; honest seeding if sparse |
| **U4** | Adaptive training | S–M | — | Default OFF; inject at `SuggestLoadingInput` only; never `applySetCompletion` |
| **U5** | Experiments (one real behavioral) | M | — | Default OFF; never med-testing |
| **U6** | Meds disclaimer honesty | S | — | Keep mechanism; fix copy |
| **U7** | Catalogue batch4 | M | — | Governance gate; exact-name only |
| **U8** | Padding alignment | S–M | — | Tokens only |
| **U9** | Play OQ-1 in-app truth + Console drafts | S | — | Keep permissions; Human pastes Console |

**Kickoff:** U1 first → then fan U2/U3 + parallel U4–U9.

**Status 2026-07-20 tip:** U1–U9 implemented on branch (see CONTEXT). Awaiting EAS preview + device smoke + Human Console paste.

## Ledger table (migration v6)

`reclaim_signal_ledger`: `(user_id, day_date, factor, value, source, updated_at)` PK `(user_id, day_date, factor)`.

Link: `fetchInsightContext` unchanged → `InsightsProvider.refresh` writes snapshot → `computeExplanations` / graph read repository only.

## Play tonight

- **Cursor:** visible steps + active-kcal in Integrations; draft Data-safety copy in `docs/release/`.
- **Human:** paste Console Health + Data safety to match kept permissions.

## Rejected

In-memory-only ledger · graph↔contextBuilder dual SSOT · adaptive inside `applySetCompletion` · experiment “framework” stubs · strip steps/kcal · delete mechanism · fake “proper everything” without freeze lines.
