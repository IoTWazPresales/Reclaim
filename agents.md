# agents.md — Reclaim agent operating context

**Last updated:** 2026-06-07  
**Active branch (med rebuild):** `feat/meds-catalog-governance` — **never touch `main`**

---

## Project

React Native / Expo wellness app (`app/`). Android primary. Supabase auth + Postgres. React Query + Zustand. Educational medication feature — **not** clinical advice.

---

## Memory palace (read at task start)

| File | Role |
|------|------|
| `CONTEXT.md` | Living history — **insert new sections at top only** |
| `agents.md` | This file — agent ops + current focus |
| `.cursor/rules/` | Enforced Cursor rules |
| `CURSOR_PROMPT_TEMPLATES.md` | Phase kickoff prompts |
| `docs/handover/meds-module-rebuild-handover.md` | Med module rebuild handover |

---

## Current focus: Medication module rebuild (Phases 0–5)

**Status:** Med rebuild Phases 0–5 ✅ complete on `feat/meds-catalog-governance`. Apply `app/Documentation/meds_catalog_match_key.sql` in Supabase for persistence backfill.

**Handover:** `docs/handover/meds-module-rebuild-handover.md`

### Frozen invariants

- Catalogue = **305** static rows (v1 + batch1–3), exact-name match, no fuzzy matching
- One user-state context (Phase 3+), one fusion fn (Phase 4)
- Hook output shape frozen: `{ med, catalogMatch, profileMode, schedule, doseHistory, contextNotes, domainSignals, ... }`
- Generated copy passes `medCatalogGovernance.ts` lint
- One phase at a time → typecheck → tests → commit + push → **STOP**

### Phase discipline

Do **not** start Phase 3 while Phase 2 is incomplete. Do **not** combine phases in one commit.

### Phase 2 Step 0 (blocking)

Before accordion/nav work: confirm `medDetailSignals` is pure (no fetch), `computeMedContextNotes` is sole `contextNotes` producer, hook returns stub `domainSignals`. Log **"Phase 2 step-0 clear"** or STOP. See handover.

---

## Git rules

- Stage explicit paths only — **never** `git add .`
- Commit only when user requests (unless workspace rule says push after their commit)
- After user-requested commit on feature branch: `git push` per `.cursor/rules/git-push-after-commit.mdc`
- Never commit `.env`, secrets, unrelated snapshots

---

## Validation (app root = `app/`)

```bash
npm run typecheck
npx vitest run <focused paths>
npm run med-catalog-qa   # catalogue governance
```

---

## Architecture hotspots

| Area | Authority |
|------|-----------|
| Guided training | DB `performed.sets` + `sessionWorkAuthority.ts` + `applySetCompletion()` |
| Notifications | `setIntent()` + `reconcileNotifications()` — never schedule directly |
| Med detail (Phase 1) | `useMedDetailContext` — duplicate fetches until Phase 3 |
| Med catalogue | `loadMedCatalog()` (~307 rows), `findMedCatalogItemByName()`, `medCatalogGovernance.ts`, `generateMedCatalogBatch3.mjs` |
| Insights | `InsightsProvider` → `contextBuilder` → `InsightEngine` |

---

## Explore before edit

- Prefer `codebase-memory` MCP for call chains and impact analysis
- Locate symbols by **name**, not audit line numbers
- If plan ≠ repo reality → **STOP and report**

---

## Deferred (no implementation without explicit instruction)

- Fuzzy med matching, drug interactions, OCR/script scanning
- Catalogue row edits during rebuild phases (unless governance failure report)
- Google Fit (removed March 2026)
- Schema migrations without approval
