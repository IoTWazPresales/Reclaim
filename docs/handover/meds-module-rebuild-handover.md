# Medication Module Rebuild — Session Handover

**Date:** 2026-06-07  
**Branch:** `feat/meds-catalog-governance` (never touch `main`)  
**Last commit:** `16a3a96` — `refactor(meds): phase 1 extract detail context and components`  
**Remote:** synced with `origin/feat/meds-catalog-governance`

---

## Executive summary

Phased rebuild of the medication module: move catalogue-backed education **inline** under each user med, collapse duplicate context fetches, then close the two-way loop between catalogue tags and insights. **Phases 0 and 1 are complete and pushed.** **Phase 2 is next.**

| Phase | Status | Commit |
|-------|--------|--------|
| 0 — Catalogue reconcile & freeze | ✅ Done | `9fb8ae0` |
| 1 — Hook + extracted components (zero behavior change) | ✅ Done | `16a3a96` |
| 2 — Inline host (`MedInlineDetailPanel`) | ⏳ **NEXT** | — |
| 3 — SSOT via `InsightsProvider.lastContext` | Pending | — |
| 4 — Tag fusion + `domainSignals` + insight rules | Pending | — |
| 5 — Optional `catalog_match_key` persistence | Pending | — |

**Parallel work on same branch (done, unrelated to med phases):** Training second-system removal — `ec4a308`.

---

## Frozen architecture invariants

1. **Catalogue** = static/silent knowledge DB (215 rows). No browsable catalogue screen. Exact-name match only — **no fuzzy matching**.
2. **One user-state context** = single source of truth (Phase 3+). No second mood/sleep fetch in med-detail path.
3. **One fusion function** intersects med tags × live user state → per-med “why today” notes **and** per-domain insight summary (Phase 4).
4. **Educational copy only** — never prescriptive, diagnostic, causal, dosing, or interaction-based. All generated strings pass `medCatalogGovernance.ts` banned-phrase lint.
5. **Mechanism/neurochemistry** = catalogue-sourced, read-only. Never author or expand clinical copy in code.
6. **Hook output shape is frozen** through Phase 5 (see below).

---

## Authoritative catalogue facts

- **Row count:** **215** (`v1`: 12 + `batch1`: 100 + `batch2`: 103)
- **Governance:** `validateMedCatalog()` → **0 issues**
- **Doc:** `docs/audits/med-catalog-phase0-reconciliation.md`
- **Wiring map (read-only audit):** `docs/audits/med-catalogue-detail-wiring-audit.md` — says 212 in places; **repo truth is 215**

---

## Phase 1 deliverables (current code state)

### Frozen hook: `useMedDetailContext(medId)`

**File:** `app/src/hooks/useMedDetailContext.ts`

**Output shape (`MedDetailContextValue`):**

```typescript
{
  med, catalogMatch, profileMode, schedule, doseHistory,
  contextNotes, domainSignals,  // domainSignals = {} stub until Phase 4
  medsLoading, medNotFound,
  logTaken, logTakenPending      // actions (not in type, returned alongside)
}
```

**Current internals (Phase 1 — will change in Phase 3):**

- Direct RQ fetches: `listMeds`, dose logs (30d), `listMoodCheckins` (30d), `listSleepSessions` (14d)
- Catalogue match: `findMedCatalogItemByName(med.name)` at read time
- Notes: `computeMedContextNotes()` — **`MedContextInput.catalog` passed but unused** until Phase 4

### Extracted presentational components (`app/src/components/meds/`)

| File | Role |
|------|------|
| `MedSectionCard.tsx` | Shared section wrapper |
| `MedScheduleBlock.tsx` | Schedule + reminders (props-only) |
| `CatalogEducationBlock.tsx` | “How it works” from catalogue |
| `MedContextNotesBlock.tsx` | “Why this may matter today” |
| `MedDoseHistoryBlock.tsx` | Recent doses + 30-day summary |
| `medProfileMode.ts` | **Single badge authority** — `resolveMedProfileMode`, `medProfileModeLabel` |
| `medDetailPresentation.ts` | Testable copy/mode helpers |
| `medDetailTypes.ts` | Frozen types |
| `medDoseLogUtils.ts` | Dose grouping helpers |

### Signal helpers

**File:** `app/src/lib/medDetailSignals.ts` — pure mood/sleep/adherence signal computation (extracted from old screen).

### Screen composition

**File:** `app/src/screens/MedDetailsScreen.tsx` — thin composition over hook + blocks. **Still the active detail surface** until Phase 2.

**Still on screen (not extracted):** header + badge, active ingredient/classification, possible state relevance tags, education boundary disclaimer.

### Tests (38 med-related unit tests passing at Phase 1 exit)

- `app/src/components/meds/__tests__/medProfileMode.test.ts`
- `app/src/components/meds/__tests__/medDetailComponents.test.tsx` (logic/presentation — not full RN render)
- `app/src/lib/__tests__/medDetailSignals.test.ts`
- `app/src/lib/__tests__/medIntelligence.test.ts`
- `app/src/lib/__tests__/medCatalog.test.ts`

**Vitest note:** Full RN component render in node env failed (`toJSON()` null). Phase 1 tests use pure `.ts` presentation helpers instead of importing `.tsx` in vitest node.

---

## Phase 2 — STEP 0 (pre-check, blocking)

**Before any Phase 2 edits**, verify and report:

- [ ] `medDetailSignals.ts` is a **PURE transform**: state in → signals out, **NO data fetching** of its own. The hook does all fetching. If `medDetailSignals` fetches → **STOP** (Phase 3 must repoint data source to shared insight context without rewriting signals).
- [ ] `computeMedContextNotes` is the **SOLE producer** of `contextNotes`; `medDetailSignals` only feeds it inputs. If notes are produced in two places → **STOP**.
- [ ] `useMedDetailContext` still returns the **frozen shape** including the stubbed `domainSignals` field (**distinct** from `medDetailSignals`). Confirm present.

If all three hold → log **"Phase 2 step-0 clear"** and proceed. If any fails → **STOP** — do not start accordion/nav work.

**Verified at handover (2026-06-07):** All three hold. `medDetailSignals.ts` exports only `computeMoodSignals`, `computeSleepSignals`, `computeAdherenceSignals` (pure). Hook calls `computeMedContextNotes` once; `domainSignals: EMPTY_DOMAIN_SIGNALS` in return object.

---

## Phase 2 — What to build next

**Goal:** Detail renders **inline** under tapped med row on `MedsScreen`. No stack push in normal flow.

### New file

- `app/src/components/meds/MedInlineDetailPanel.tsx` — compose Phase 1 blocks + `useMedDetailContext(medId)`

### Files to modify (verify symbols by name, not line numbers)

| File | Change |
|------|--------|
| `app/src/screens/MedsScreen.tsx` | Accordion expand/collapse per row; **ONE expanded med at a time**; replace `navigation.navigate('MedDetails', { id })` |
| `app/src/navigation/nav.ts` | `navigateToMeds(focusMedId)` → MedsHome + scroll-to + expand (not MedDetails push) |
| `app/src/routing/RootNavigator.tsx` | `reclaim://meds/:id` → expand inline |
| `app/src/routing/MedsStack.tsx` | Demote `MedDetails` — keep registered, redirect to MedsHome+expand |
| `app/src/hooks/useNotifications.ts` | Med notification + id → expand |
| `app/src/screens/Dashboard.tsx` | Links with `focusMedId` → expand behavior |

### Invariants

- Standalone `MedDetailsScreen` unreachable in normal flow; route kept for old deep links
- PRN inline-log + pencil-edit on list must still work
- Back behavior sane (collapse vs navigate)

### Exit criteria

- All 4 entry points land on inline panel
- List add/edit/PRN-log unbroken
- `npm run typecheck` + tests green
- **On-device:** no jump feel; expand/collapse smooth
- Commit + push → **STOP**

---

## Phase 3–5 (summary for future sessions)

### Phase 3 — SSOT

- `useMedDetailContext` reads mood/sleep/training/adherence from `InsightsProvider.lastContext`
- Remove direct `listMoodCheckins` / `listSleepSessions` from hook
- One canonical lookback window in `contextBuilder.ts`
- **grep exit:** no mood/sleep re-fetch in med-detail path

### Phase 4 — Two-way loop

- Fusion reads `catalog.effectTags` / `stateImpactTags` × user state
- Tag→domain map in `medCatalogGovernance.ts` (single source)
- `domainSignals` populated; extend `InsightContext.meds`; `insights.json` rules
- Kill dead `MedContextInput.catalog` unused path
- Governance test on ALL generated copy

### Phase 5 — Optional persistence

- `catalog_match_key` on `Med` + `upsertMed`
- Backfill existing rows; fallback to name match
- Remove `findMedCatalogItemByName` from hot render path

---

## Current navigation / entry points (pre–Phase 2)

```
MedsScreen List.Item onPress
  → navigation.navigate('MedDetails', { id })

navigateToMeds(focusMedId)
  → App > Meds > MedDetails { id }

RootNavigator deep link
  → MedDetails: 'meds/:id'

useNotifications dest 'Meds'
  → navigateToMeds() (no focus id today)
```

**All four must change in Phase 2.**

---

## Git / working tree (as of handover)

```
Branch: feat/meds-catalog-governance
Pushed: 16a3a96

Uncommitted / untracked (leave alone unless tasked):
  M  app/src/components/__tests__/__snapshots__/InsightCard.test.tsx.snap  (unrelated)
  ?? docs/audits/med-catalogue-detail-wiring-audit.md
  ?? docs/handover/meds-module-rebuild-handover.md  (this file — commit with memory palace)
  ?? app/CLAUDE.md
  ?? app/nul
```

---

## Validation commands

```bash
cd app
npm run typecheck
npx vitest run src/components/meds src/lib/__tests__/medDetailSignals.test.ts src/lib/__tests__/medIntelligence.test.ts src/lib/__tests__/medCatalog.test.ts
npm run med-catalog-qa   # catalogue governance CLI
```

---

## Cross-cutting guardrails (all phases)

- Stage only required files — never `git add .`
- No empty catch blocks — `logger.debug` in `__DEV__`
- One phase at a time: typecheck → tests → commit + push → **STOP**
- If repo diverges from plan → **STOP and report**, do not invent structure
- Use `codebase-memory` MCP to explore before editing large surfaces
- Complete files in edits, not diffs/snippets (Claude Code convention in `app/CLAUDE.md`)

---

## Reference documents

| Path | Purpose |
|------|---------|
| `docs/audits/med-catalogue-detail-wiring-audit.md` | Wiring map + file index |
| `docs/audits/med-catalog-phase0-reconciliation.md` | 215-row baseline |
| `CONTEXT.md` | Living agent orientation (insert-only at top) |
| `agents.md` | Agent operating instructions |
| `.cursor/rules/meds-module-rebuild.mdc` | Frozen invariants rule |
| `CURSOR_PROMPT_TEMPLATES.md` | Phase kickoff prompts |

---

## Prior chat

Full implementation transcript: agent session `3a2c0efc-a6ff-4fa1-b6a7-beff0228fa55` (Medication Module Rebuild checklist from user message 2026-06-06).
