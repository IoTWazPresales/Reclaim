# R05 — Independent whole-programme validator

**Type:** dependent correctness gate. **Depends on:** R04's committed weekly contract (and R03 through it). **EIF:** N-0069. **Current checkpoint:** R05 implementation is committed and pushed as `dcf4bf8`; evidence receipt `f3d23f6`. See [result](../../../../.eif/audit/N-0069/R05/result.md) and [recheck](../../../../.eif/audit/N-0069/R05/recheck.md). Source verification does not establish N-0069 acceptance; evidence attachment remains blocked by `LEASE_NOT_OWNER: R20261014R03`.

**Objective and scope.** Validate the *final selected programme* against declared weekly requirements and user constraints, independently of compiler output expectations. Own `weeklyProgrammeValidator.ts` and focused validator tests. Change the compiler only through its public result interface or a narrowly reviewed contract correction.

**Why.** [Audit R1/R8/R9/R12](../../../../.eif/audit/training-intelligence-20261012/PROJECT_AUDIT_REPORT.md): component tests pass while a complete week is empty or incoherent. Taxonomy/display buckets are not dose truth; time and load semantics must be assessed on final sets, not slot labels.

**Required behavior and acceptance.** Detect absent required exposures, ineligible/duplicate exercises, unmet set allocation, invalid reps/rest/load state, existing set/time-budget violations and hybrid mode omissions. Return structured errors and warnings with provenance; do not call the generator to derive expected answers. Distinguish a scientifically unresolved target from a validated product rule. An intentionally infeasible profile cannot be returned as a valid programme.

**Verification/evidence.** Mutation-style fixtures deliberately remove one slot, change equipment, duplicate an ID, mislabel a run, exceed a cap and corrupt a load state; each must fail for its own independent reason. A valid reviewed fixture must pass. Re-run Phase 1 floor-only/dumbbell/hybrid examples through the public compiler+validator. Run required AGENTS checks, independent verification, explicit staging/commit/push and criterion evidence. Do not use a snapshot of the generator as the sole oracle.

**Exclusions/completion.** No UI, history fetch, new volume model or shared EIF edits. Complete when validator catches the known bad programmes and approved good fixtures, then N-0069 may be reviewed/closed only if all its criteria and journeys are actually satisfied.
