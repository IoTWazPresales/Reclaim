# agents.md — Reclaim agent operating context

**Last updated:** 2026-07-22  
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
| `docs/audits/guided-session-fgs-gate-2026-07-21.md` | FGS Unit A gates — sticky forbidden |
| `docs/audits/guided-rest-notification-audit-2026-07-22.md` | Rest tile / delay / stale safety net |

---

## Current focus: Guided rest + close correctness (post Gate 3 preview)

**Status:** Rest OS-id split + absolute rest-end/stale date triggers + work-complete close safety net on `fix/training-confident-ux`. Device smoke on next preview: rest stays during countdown; rest-complete near wall-clock; work-complete without End & save still gets stale / auto-finalize path.

**Do not:** revive Expo sticky; share now/at OS notification ids; clear `training_stale` before close succeeds; Wear companion / Health Services live workout.

**Handover:** `docs/audits/guided-rest-notification-audit-2026-07-22.md` · FGS gate: `docs/audits/guided-session-fgs-gate-2026-07-21.md`

### Frozen invariants (still)

- Guided training: DB `performed.sets` + `sessionWorkAuthority` + `applySetCompletion()` — do not casually edit
- Notifications: `setIntent()` + `reconcileNotifications()` — never schedule directly
- Catalogue = static exact-name match, no fuzzy matching
- One phase / coherent unit at a time → typecheck → tests → commit + push when asked
- Guided session alive transport = **native FGS**, never Expo sticky

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
