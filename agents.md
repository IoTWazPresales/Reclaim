# agents.md — Reclaim agent operating context

**Last updated:** 2026-07-17  
**Active branch (training / UI follow-up):** `fix/training-confident-ux` — **never touch `main`**  
**Meds branch (complete Phases 0–5):** `feat/meds-catalog-governance` — do not mix with training work unless asked

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
| `docs/handover/training-confident-fixes-handover.md` | Training + preview UI follow-up |
| `docs/handover/ui-excellence-post-x26-handover.md` | UI excellence track close + open QA |
| `docs/handover/meds-module-rebuild-handover.md` | Med module (Phases 0–5 done) |
| `docs/release/reclaim_play_readiness_audit.md` | Play / HC declaration gate |

---

## Current focus: Training confident UX + preview UI (device sign-off)

**Status:** Code on `fix/training-confident-ux` through `e9a02d0` (Wear Done package, X-11, X-26 already on ancestry, insight/modal/Home gap fixes). **Needs new EAS preview** + evening Wear/Home smoke before calling done.

**Handover:** `docs/handover/training-confident-fixes-handover.md`

### Frozen invariants (still)

- Guided training: DB `performed.sets` + `sessionWorkAuthority` + `applySetCompletion()` — do not casually edit
- Notifications: `setIntent()` + `reconcileNotifications()` — never schedule directly
- Catalogue = static exact-name match, no fuzzy matching
- One phase / coherent unit at a time → typecheck → tests → commit + push when asked

---

## Medication module (complete)

Phases 0–5 ✅ on `feat/meds-catalog-governance`. Apply SQL only if live DB missing `catalog_match_key`. See meds handover.

---

## Git rules

- Stage explicit paths only — **never** `git add .`
- Commit only when user requests (unless workspace rule says push after their commit)
- After user-requested commit on feature branch: `git push` per `.cursor/rules/git-push-after-commit.mdc`
- Never commit `.env`, secrets, unrelated snapshots / bulk evidence unless asked

---

## Validation (app root = `app/`)

```bash
npm run typecheck
npx vitest run <focused paths>
npm run med-catalog-qa # catalogue governance
```

---

## Architecture hotspots

| Area | Authority |
|------|-----------|
| Guided training | DB `performed.sets` + `sessionWorkAuthority.ts` + `applySetCompletion()` |
| Notifications | `setIntent()` + `reconcileNotifications()` — never schedule directly |
| Med detail | `useMedDetailContext` + InsightsProvider SSOT (post Phase 3) |
| Med catalogue | `loadMedCatalog()`, `findMedCatalogItemByName()`, `medCatalogGovernance.ts` |
| Insights | `InsightsProvider` → `contextBuilder` → `InsightEngine` |
| Screen spacing | Parent `reclaimSectionSpacing` owns gap; nested AppCards pass `marginBottom={0}` on stacked screens |

---

## Explore before edit

- Prefer `codebase-memory` MCP for call chains and impact analysis
- Locate symbols by **name**, not audit line numbers
- If plan ≠ repo reality → **STOP and report**

---

## Deferred (no implementation without explicit instruction)

- Fuzzy med matching, drug interactions, OCR/script scanning
- Live Wear workout / Health Services bridge
- Home widgets (native)
- Schema migrations without approval
- Google Fit (removed March 2026)
