# R09 — Shared weekly result across preview, persistence and app surfaces

**Type:** integration task. **Depends on:** R02, R05 and R06 committed contracts. **EIF:** N-0070. **Current tree:** `TrainingScreen.tsx`, `preview/index.ts`, `buildProgramDaySession.ts` and setup paths have partial uncommitted changes; this task starts only after owners of those interfaces complete their slices.

**Objective and scope.** Make the app use the versioned whole-week proposal for new programme/day previews and materialization, and the frozen stored planned items for started/guided work. Own TrainingScreen composition, preview/day projection adapters and the minimum programme JSON mapping. Existing `buildFourWeekPlan` and `buildProgramDaySession` remain canonical entries.

**Why.** [Audit R5/R10](../../../../.eif/audit/training-intelligence-20261012/PROJECT_AUDIT_REPORT.md) / [product PA-05](../../../../.eif/audit/training-intelligence-20261012/product/HANDOFF.md): a component-local two-pass week build and fallback calls omit coordination; summaries may recompute without started-session truth. Wear currently projects duration only, so do not claim wrong wearable kilograms absent evidence.

**Required behavior and acceptance.** Programme snapshot stores policy/version, normalized input and allocation references without a new DB migration unless separately approved. The same input/version yields the same future proposal on setup, week and day surfaces. A saved programme day resolves its exact allocation from stored plan identity, not display label. New builds may adapt under approved policy; started/guided sessions keep planned sets frozen. Weekly summaries distinguish actual, frozen planned and provisional future work; infeasible requests cannot be started as valid strength/hybrid sessions. Watch/notification guidance follows the same effective target authority.

**Verification/evidence.** Fixture follows setup→week preview→saved plan→start→history update→reload→future proposal; assert stored items and all source projections. Include named five-day account-shaped fixture and a no-device limitation if Android remains unavailable. Run required AGENTS checks, independent integration review, explicit staging/commit/push and N-0070 criterion evidence.

**Exclusions/completion.** No historical session rewrite, live DB migration/data change, N-0030 chrome, novel training rule or device acceptance claim from source alone. Complete when source/persisted-contract consistency is verified; N-0070 stays open if runtime journeys remain unverified.
