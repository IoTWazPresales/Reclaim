# Reclaim — canonical memory status

**Current memory system status:** **PROVISIONAL CANONICAL MEMORY v0.9**

This baseline is **strong enough to work from** (inventory, policy excerpts, discussion recon, architecture map) but **not** a claim of **complete historical coverage**. Early **ChatGPT** thread export is still **pending**; `raw/policies/` has **no** substantive imports yet.

| Doc | Role |
|-----|------|
| `reclaim_export_backfill_queue.md` | What to pull from the next full export |
| `reclaim_provisional_origin_note.md` | Reconstructed early timeline (ChatGPT pack) + limitations |
| `reclaim_master_inventory.md` | Feature / policy ledger |
| `reclaim_discussion_recon.md` | Merged *why* across agents |
| `reclaim_policy_audit.md` | Permissions + Play grounding |
| `reclaim_release_scope.md` | Ship / fix / defer matrix |
| `reclaim_open_questions.md` | Repo-external or evidence gaps |
| `reclaim_source_provenance_matrix.md` | Claim → source → confidence |
| `reclaim_architecture_recon.md` | Current tree map |
| `reclaim_memory_merge_notes.md` | Merge history |

---

## What is well-established

| Area | Established content | Primary evidence |
|------|---------------------|------------------|
| **Current app shape** | Auth, onboarding, drawer/tabs, major screens, HC narrow path on Android, insights engine, training + notifications stack, background sync hooks | `app/src/**`; `reclaim_architecture_recon.md` |
| **Play rejection facts (imported)** | Two verbatim messages; issue = HC **Minimum Scope**; different type lists letter 1 vs letter 2; version **code 7** named in second | `docs/memory/raw/play-console/*.md` |
| **Cross-agent raw coverage** | Codex / Cursor / Claude exports merged into discussion + provenance | `docs/memory/raw/codex/`, `cursor/`, `claude/` |
| **Known inventory conflicts** | Fit-in-app (export vs grep); splash orb (export vs `ReclaimLogo.tsx`); HC table (`HEALTH_API_COVERAGE.md` vs manifest + default metrics); Play letter 1 vs 2 on HR/vitals | `reclaim_master_inventory.md` §G |
| **ChatGPT in repo** | One **reconstructed** mentions pack (not full account dump) | `raw/chatgpt/2026-04-19_chatgpt_recovered_mentions_backfill_pack.md` |

---

## What is partially established

| Area | State | Gap |
|------|--------|-----|
| **Feature history over time** | Timelines exist from exports + commits **where cited** | Pre–2026 ChatGPT **verbatim** threads missing; some Codex claims are **branch-dated** |
| **Architecture execution vs plan** | JSON strangler / wearables phases documented as **plan** | **No** automated proof all phases landed; `wearables/` path etc. |
| **Training notification hardening** | Background task + hooks **present**; Claude/Codex **wishlist** partially absent | `firedAt`, fingerprint parity — **OQ-8** |
| **Policy / declaration alignment** | Narrow manifest + runtime metrics **in code** | Live Console forms, Data safety text, **approval** — **OQ-1**, **OQ-2** |
| **UX / product rationale** | Strong in Phase docs + raw opinions + ChatGPT **reconstruct** | Earliest **wording** and **decision order** often **missing** |
| **Release-scope “truth”** | Matrix is evidence-based for **repo** | EAS/production validation, listing copy — **OQ-3**, **OQ-4** |

---

## What remains unresolved

- **OQ-1–OQ-9** in `reclaim_open_questions.md` (none closed by this normalization pass).
- **Play:** whether current submission **passed** after scope changes; whether HR/overnight vitals remain reviewer-sensitive (**Conflict** between letter 1 detail and letter 2 silence).
- **Historical:** earliest **verbatim** product framing (**OQ-9**); monetization / launch narrative **not** in raw set.
- **Imports:** `raw/policies/` empty of content; full **ChatGPT** export not in repo.

---

## What historical sources are still missing

| Source | Status in repo | Impact |
|--------|----------------|--------|
| **Full ChatGPT account / thread export** (incl. **~Oct 2025** onward if present in provider) | **Pending** | Origin, early feature set, first HC/Fit/notification philosophy |
| **Policy PDFs / snippets** (privacy, DPA, store listing drafts) | `raw/policies/` = `.gitkeep` only | Declaration audit, legal phrasing history |
| **Play Console form exports** (Data safety, HC declaration screens) | **Not** in repo | **OQ-1** |
| **Approval / appeal messages** after second rejection | **Not** in `raw/play-console/` | **OQ-2** |

---

## Confidence by category

| Category | Level | Notes |
|----------|--------|-------|
| **Feature history** (what the **current** tree does) | **High** | Code + navigators; partial features explicitly flagged |
| **Feature history** (what shipped **when** / on **which** branch) | **Medium–Low** | Relies on exports + commit refs; **not** full git archaeology in memory docs |
| **Architecture history** (current map) | **High** | `reclaim_architecture_recon.md` path-based |
| **Architecture history** (plan vs executed strangler JSON) | **Medium** | Plan **fact** in raw; execution **inference** / spot-check only |
| **Policy / Play history** (verbatim rejections) | **High** | Primary text imported |
| **Policy / Play history** (declaration alignment, outcome) | **Low** | **No** form dumps; **no** acceptance message |
| **UX / product rationale** | **Medium** | Mix of Cursor/Codex opinion + Phase docs + **reconstructed** ChatGPT |
| **Release-scope history** | **Medium** | Matrix grounded in repo; **external** gates explicitly BLOCKED |

---

## Early ChatGPT export backfill — explicitly pending

- **User states** ideation/discussion **by at least October 2025**; **no** October 2025 **verbatim** export is in this repo.
- The only ChatGPT raw file is **`2026-04-19_chatgpt_recovered_mentions_backfill_pack.md`**, labeled **reconstructed** by its own preamble.
- Any claim that depends on **missing** early threads stays **provisional** until corresponding `raw/chatgpt/*` (or other primary) material is imported and rowed in `reclaim_source_provenance_matrix.md`.

---

*Next step after export: run `reclaim_export_backfill_queue.md`, append provenance rows, then bump version (e.g. v1.0) only when scope of “provisional” is honestly reducible.*
