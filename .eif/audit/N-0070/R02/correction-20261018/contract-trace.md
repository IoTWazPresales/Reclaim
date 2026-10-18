# R02 running preview contract correction ? 2026-10-18

Scope: fix/training-confident-ux, C:/Reclaim; correction only, no R12.

## Observed contradiction and accepted authority

The existing failed review in ../provenance-20261018/result.md and reviewer.md is preserved verbatim. It already reproduced the normal running path: a run has an empty lifting exercise list, the summary rejected it, and the panel said duration was unprescribed and the distance goal was saved. That contradicted the actual generated prescription and the unsaved setup state. This run follows that finding; it does not repeat the provenance investigation.

The authority is docs/training/RUNNING_DESIGN.md RD-006. runGuidance.ts::runTargetMinutes returns 20 for weeks 1/2 and 30 for weeks 3/4. programPlanner.ts::buildFourWeekPlan emits run slots with no lifting intents. setupDraft.ts::prepareTrainingSetup supplies the same profile/snapshot to preview and confirmation. programmeWeekProposal materializes through buildProgramDaySession and the engine run branch applies runTargetMinutes to both constraints.timeBudgetMinutes and estimatedDurationMinutes. Preview already used that proposal; computePreviewSummary was the lossy boundary.

## Correction

computePreviewSummary accepts a run with finite positive generated minutes despite empty lifting exercises. It returns those minutes as runningDurationMinutes; it does not derive time from distance, duplicate the minute table, or prescribe pace. Infeasible programme validation, absent plans, empty lifting sessions and invalid run minutes remain unavailable. OutcomePreviewPanel renders timed running/walking content instead of lifting fields, scopes the distance explanation, and says nothing is saved until confirmation. Setup's distance copy likewise uses future confirmation wording. A failed proposal no longer receives a successful running fallback. Strength and hybrid lifting presentation remain available for valid proposals; existing rejected programmes remain rejected.

## Boundaries and verification limits

No engine, planner, scientific policy, progression, started-session or live-data change. D-P2-02 remains unresolved. The accepted RD-006 table is unchanged; this correction does not adjudicate the deferred progression language elsewhere in the design.

Actual shared serialization/generation tests cover running weeks 1?4, 5 km/10 km/custom distance independence, confirmation parity, strength/hybrid, missing days/weeks, infeasible hybrid, empty lifting exercises, and invalid run minutes. Real panel rendering with mocked native presentation primitives checks visible copy and state selection. These are source/component tests, not Android pixel review or a persisted save round trip.

Checks use an isolated current committed branch plus only the six scoped correction files, sharing existing node_modules by junction. Unrelated canonical dirty engine and migration changes are excluded. Source fingerprints will bind the correction commit, original ten R02 paths and the added panel test. Baseline failures are retained, not waived.
