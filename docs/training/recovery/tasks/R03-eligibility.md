# R03 — Shared exercise eligibility contract

**Type:** independent prerequisite for weekly selection and substitution. **EIF:** N-0069 (leased/in progress). **Current tree:** `app/src/lib/training/exerciseEligibility.ts` and modifications to `balancedHypertrophy.ts` are uncommitted and unverified.

**Objective and scope.** Provide one deterministic eligibility decision for actual catalogue exercises and a profile: equipment `all`/`any`, normalized singular/plural equipment tokens, forbidden movement intents, injuries, explicit exclusions/dislikes, and the currently accepted entered-lift rack exception. Return reason codes, not only a Boolean. Own `exerciseEligibility.ts`, its tests and only the minimum catalogue/old-selector interface needed for use; establish the API for R04/R08 without implementing their flows.

**Why.** [Audit R1–R2/R6](../../../../.eif/audit/training-intelligence-20261012/PROJECT_AUDIT_REPORT.md) and [training T02–T03](../../../../.eif/audit/training-intelligence-20261012/training/REPORT.md): named days silently lose all candidates; dislikes are ignored; alternatives can be offered without filtering. A dumbbell row exists under `one_arm_row` and a singular token; candidate coverage must use catalogue truth.

**Required behavior and acceptance.** Eligible candidates obey hard constraints; a dislike ranks/excludes according to existing accepted behavior without silently losing every feasible movement. The rack exception is preserved and reported as a policy exception, pending D-P2-06. Selection and future replacement callers can use the same result. Given floor-only or dumbbell-only profiles, the function reports exact feasible and infeasible candidates; it does not synthesize an exercise or a new safety rule.

**Verification/evidence.** Table tests across equipment aliases, all/any requirements, injury/forbidden/disliked cases, and the rack exception; compare with real catalogue entries. A reviewer checks that every produced alternative is eligible. Run focused and required AGENTS checks; retain fixture/results and contract review. Stage only owned paths, commit/push and attach criterion evidence toward N-0069.

**Dependencies/exclusions/completion.** No prerequisite. No weekly allocation, programme validation, UI swap, scientific anatomy changes or live data. Complete when the shared API and tests are independently verified; N-0069 remains open.
