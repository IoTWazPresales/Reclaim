# Medication Module Rebuild — Session Handover

**Date:** 2026-07-17 (docs refresh)  
**Branch:** `feat/meds-catalog-governance` (never touch `main`)  
**Last known tip (docs refresh):** `21a3d5d` — promotional / premium fixes after med phases  
**Remote:** sync with `origin/feat/meds-catalog-governance` before work

---

## Executive summary

Phased rebuild of the medication module: catalogue-backed education inline under each user med, single user-state context, catalogue-tag × live-state fusion for educational notes. **Phases 0–5 are complete and pushed.**

| Phase | Status | Commit (approx) |
|-------|--------|-----------------|
| 0 — Catalogue reconcile & freeze | ✅ Done | `9fb8ae0` |
| 1 — Hook + extracted components | ✅ Done | `16a3a96` |
| 2 — Inline host (`MedInlineDetailPanel`) | ✅ Done | `aedd08d` |
| 3 — SSOT via `InsightsProvider.lastContext` | ✅ Done | `46bf90d` |
| 4 — Tag fusion + `domainSignals` + insight rules | ✅ Done | `5864266` |
| 5 — `catalog_match_key` persistence | ✅ Done | `a4b05e2` |

**Ops residual:** Ensure `app/Documentation/meds_catalog_match_key.sql` (or equivalent) is applied on the live Supabase project if not already (CONTEXT notes applied on project `reclaim` / `bgtosdgrvjwlpqxqjvdf` as of 2026-06-16).

**Parallel later work on same branch:** Reskin Phases 1–5, promotional run flag, premium entitlement fixes — unrelated to med phase gates.

---

## Frozen architecture invariants

1. **Catalogue** = static knowledge DB (**305** rows after batch3 — AGENTS / CONTEXT authority; older “215” wording is historical). Exact-name match only — **no fuzzy matching**.
2. **One user-state context** = InsightsProvider / lastContext (Phase 3+).
3. **One fusion function** intersects med tags × live user state → notes + domainSignals (Phase 4).
4. **Educational copy only** — never prescriptive, diagnostic, causal, dosing, or interaction-based. Passes `medCatalogGovernance.ts`.
5. **Mechanism/neurochemistry** = catalogue-sourced, read-only.
6. Hook output shape frozen through Phase 5: `{ med, catalogMatch, profileMode, schedule, doseHistory, contextNotes, domainSignals, ... }`.

---

## Explicitly deferred (no implementation without instruction)

- Fuzzy med matching  
- Drug interactions  
- OCR / script scanning  
- Catalogue row edits during unrelated feature work (unless governance failure)

---

## Validation (app root = `app/`)

```bash
npm run typecheck
npx vitest run <focused paths>
npm run med-catalog-qa
```

---

## Do not mix

- Do not implement med changes on `fix/training-confident-ux` or UI-audit branches without explicit instruction.  
- Do not touch `main`.

---

## Historical note

Earlier revisions of this handover said “Phase 2 is next” after `16a3a96`. That is **obsolete** — Phases 2–5 shipped on this branch.
