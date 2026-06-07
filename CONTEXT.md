# CONTEXT.md

## 2026-06-07 — Med module Phase 4: governed tag fusion (branch: feat/meds-catalog-governance)

**Status:** Phase 4 complete — catalogue tags × user state fusion drives `domainSignals`, detail notes, insight `meds.domainOverlap`, and tag-aware rules.

**What changed:** `medCatalogFusion.ts` + tag→domain maps in `medCatalogGovernance.ts`. `computeMedContextNotes` uses `domainSignals` (removed dead `catalog` input). `InsightContext.meds.domainOverlap` + 3 new `insights.json` rules. All generated fusion copy governance-linted.

**Validation:** `npm run typecheck` pass; 95 med/fusion vitest tests pass.

**Next:** Phase 5 — optional `catalog_match_key` persistence.

## 2026-06-07 — Med module Phase 3: insight SSOT for detail context (branch: feat/meds-catalog-governance)

**Status:** Phase 3 complete — `useMedDetailContext` reads mood/sleep from `InsightsProvider` (`lastContext` + `lastSource`); no duplicate mood/sleep fetches in med-detail path.

**What changed:** `buildMedDetailInsightSignals()` bridge; canonical lookback constants exported from `contextBuilder.ts`. Per-med dose logs still fetched for dose history + adherence signals.

**Validation:** `npm run typecheck` pass; 65 med vitest tests pass.

**Next:** Phase 4 — tag fusion + `domainSignals` + insight rules.

## 2026-06-07 — Med module Phase 2: inline detail panel (branch: feat/meds-catalog-governance)

**Status:** Phase 2 complete — detail renders inline on MedsScreen accordion; no stack push in normal flow.

**What changed:** `MedInlineDetailPanel` composes Phase 1 blocks over `useMedDetailContext`. MedsScreen accordion (one expanded med). `navigateToMeds(focusMedId)`, notifications, and `reclaim://meds/:id` land on MedsHome+expand. `MedDetails` route kept as redirect shell.

**Validation:** `npm run typecheck` pass; 62 med vitest tests pass.

**Next:** Phase 3 — SSOT via `InsightsProvider.lastContext` (remove duplicate mood/sleep fetch in hook).

## 2026-06-07 — Med module Phase 1: detail context + extracted components (branch: feat/meds-catalog-governance)

**Status:** Phase 1 complete — zero behavior change; MedDetailsScreen is thin composition.

**What changed:** `useMedDetailContext(medId)` frozen output `{ med, catalogMatch, profileMode, schedule, doseHistory, contextNotes, domainSignals }`. Four presentational blocks under `components/meds/`. Badge logic centralized in `medProfileMode.ts`. Signal helpers in `medDetailSignals.ts`.

**Validation:** `npm run typecheck` pass; 38 med Phase 1 vitest tests pass.

**Next:** Phase 2 — inline `MedInlineDetailPanel` on MedsScreen (no stack push).

## 2026-06-06 — Training session second-system removal (branch: feat/meds-catalog-governance)

**Status:** Committed + pushed (`ec4a308`).

**What changed:** Removed parallel optimistic position authority from guided training UI. Single source of truth is DB `performed.sets` + `current_exercise_index`, read via React Query and `sessionWorkAuthority.ts`. Writes go through `applySetCompletion()` with RQ cache patches (`sessionQueryPatch.ts`) for instant UI only.

**Key files:** `TrainingSessionView.tsx`, `sessionWorkAuthority.ts`, `applySetCompletion.ts`, `sessionQueryPatch.ts`, `sessionDerivedState.ts`, `guidedNotificationRoute.ts`, `guidedExternalSetDoneTransition.ts`.

**Validation:** `npm run typecheck` pass; 54/54 training vitest tests pass.

**Next:** Optional — route `guidedTrainingNotificationActions.ts` through `applySetCompletion` for one persistence module.

**Audit:** `docs/audits/second-system-removal-verification.md`

## Handover pointer

**Med rebuild session handover:** `docs/handover/meds-module-rebuild-handover.md` — phase status, frozen contracts, Phase 2 file list, validation commands.
