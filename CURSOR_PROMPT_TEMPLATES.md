# CURSOR_PROMPT_TEMPLATES.md

Reusable prompts for disciplined phased work. Copy the block for the active phase into a **new chat**.

---

## Template: Med module rebuild — phase kickoff

Replace `PHASE_N` and the phase section body. Default next phase: **2**.

```
# Reclaim — Medication Module Rebuild — PHASE_N

## PHASE 2 — STEP 0 (pre-check, blocking)

Before any Phase 2 edits, verify and report:

- [ ] `medDetailSignals.ts` is a PURE transform: state in → signals out, NO data
      fetching of its own. The hook does all fetching. If `medDetailSignals` fetches,
      STOP and report (Phase 3 must be able to repoint its data source to the shared
      insight context without rewriting it).
- [ ] `computeMedContextNotes` is the SOLE producer of `contextNotes`; `medDetailSignals`
      only feeds it inputs. If notes are produced in two places, STOP and report.
- [ ] `useMedDetailContext` still returns the frozen shape including the stubbed
      `domainSignals` field (distinct from `medDetailSignals`). Confirm present.

If all three hold, log **"Phase 2 step-0 clear"** and proceed. If any fails, STOP — do
not start the accordion/nav work.

Then (after step-0 clear only):

1. **Branch:** `feat/meds-catalog-governance`
2. **Handover:** `docs/handover/meds-module-rebuild-handover.md`, `CONTEXT.md`, `agents.md`
3. **Baseline** (from `app/`): `npm run typecheck` + focused med vitest — report counts
4. **Scope lock:** Phase N only; prior phases complete unless regression found

---

## Role

Senior RN/Expo engineer. Med education is **EDUCATIONAL/CONTEXTUAL only** — never prescriptive, diagnostic, causal, dosing, or interaction-based.

## Frozen architecture

- Catalogue = static/silent (215 rows, exact-name match, no fuzzy)
- One user-state context = SSOT (Phase 3+)
- One fusion fn → detail notes + insight domain summary (Phase 4)
- Hook output shape frozen through Phase 5
- All generated copy passes `medCatalogGovernance.ts` lint

## How to not break this

- Complete files only, not diffs/snippets
- Stage only required files — never `git add .`
- No empty catch blocks — `logger.debug` in `__DEV__`
- One phase → typecheck → tests → commit + push → **STOP**

---

[PASTE PHASE SECTION FROM CHECKLIST BELOW]

---

## Exit (mandatory)

- typecheck clean
- focused tests green
- commit + push to `feat/meds-catalog-governance`
- STOP — do not start next phase
```

---

## Phase sections (paste into template)

### PHASE 2 — Inline host (no screen jump)

```
# PHASE 2 — Inline host

(Complete STEP 0 blocking pre-check first — see template above.)

Files (verify by name): MedsScreen, MedsStack, AppNavigator, RootNavigator, nav.ts (navigateToMeds), useNotifications, Dashboard.
New: components/meds/MedInlineDetailPanel.tsx.

- [ ] MedInlineDetailPanel = Phase 1 components over useMedDetailContext
- [ ] MedsScreen accordion expand/collapse; ONE med expanded at a time
- [ ] Rewire entry points (no push):
      navigateToMeds(focusMedId), reclaim://meds/:id, notification Meds+id, list row tap
- [ ] Demote MedDetails route — keep registered, redirect to MedsHome+expand
- [ ] PRN inline-log + pencil-edit still work

Exit: 4 entry points → inline; add/edit/PRN unbroken; on-device no-jump QA; commit+push; STOP.
```

### PHASE 3 — SSOT

```
# PHASE 3 — Collapse duplicate context pipeline

- [ ] Confirm InsightsProvider wraps meds route — if not, STOP
- [ ] useMedDetailContext reads lastContext selector — remove direct mood/sleep fetches
- [ ] Extend contextBuilder additively if slices missing
- [ ] One canonical lookback window in contextBuilder

Exit: grep clean for listMoodCheckins/listSleepSessions in med-detail path; parity tests; commit+push; STOP.
```

### PHASE 4 — Two-way loop

```
# PHASE 4 — Governed tag fusion

- [ ] Fusion uses catalog tags × user state; kill dead MedContextInput.catalog unused path
- [ ] Tag→domain map in medCatalogGovernance.ts only
- [ ] domainSignals + InsightContext.meds from SAME derivation
- [ ] insights.json tag-aware rules; broaden medicationInsightHints
- [ ] Governance test on all generated copy

Exit: fusion + insight tests; commit+push; STOP for device QA.
```

### PHASE 5 — Persist catalogue link (optional)

```
# PHASE 5 — catalog_match_key

- [ ] Add key to Med + upsertMed; resolve on add/edit
- [ ] Backward-compatible name fallback; scoped backfill
- [ ] Remove findMedCatalogItemByName from hot path

Exit: rename stability test; commit+push; STOP.
```

---

## Full checklist source

User message in session `3a2c0efc-a6ff-4fa1-b6a7-beff0228fa55` — "Reclaim — Medication Module Rebuild (Cursor Composer Checklist)". Handover summarizes current state: `docs/handover/meds-module-rebuild-handover.md`.
