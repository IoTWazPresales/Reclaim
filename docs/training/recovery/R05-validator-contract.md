# R05 whole-programme validation contract

`weeklyProgrammeValidator.ts` checks actual final sessions against a separate,
trusted `ProgrammeWeekDeclaration`. Capture that declaration before generation;
never reconstruct it from the programme being tested. It includes the R04 policy
version, stable strategy, calendar, requirements, exposure prescription policies,
approved exercise IDs and run requirements. The caller owns declaration approval.
The validator does not call the planner, compiler, session builder or policy table.

`validateProgrammeWeek(declaration, generated, profile)` checks one week.
`validateTrainingProgramme({ declarations, weeks, profile })` additionally requires
exactly one generated week per declaration and declarations for weeks 1–4.
Results contain `status`, structured `issues` with policy provenance and location,
and expected/actual working-set and exposure `coverage` per requirement.

- `valid`: the supplied accepted requirements and actual work pass all checks.
- `invalid`: at least one error, including missing or infeasible work.
- `unresolved`: no errors, but at least one explicit warning prevents acceptance.

Checks cover declaration/output identity, missing and duplicate weeks/days/slots,
actual exercise eligibility under the committed R03 contract, canonical catalogue
metadata, offered alternatives, objective coverage, actual prescription versus
the trusted exposure policy, invalid numeric reps/rest/load, exercise-specific
baseline ceilings, load semantics, working-set/time budgets and actual run
delivery. Reported feasibility cannot override missing work or a day-level error.

The validator preserves the accepted rules in
[`ROUTINE_AUDIT.md`](../ROUTINE_AUDIT.md) and
[`RUNNING_DESIGN.md`](../RUNNING_DESIGN.md). Warm-ups are checked independently
against the existing working-weight fractions/rounding and five-repetition rule;
they do not count as working dose. Time validation uses the existing catalogue
compound/isolation estimate, reported duration and a between-set-rest lower bound;
it does not claim measured session duration. Scheduling owners remain allocation
owners, not a new muscle-stimulus credit model.

Legacy policies without approved weekly targets return `unresolved`, while actual
eligibility, numeric prescriptions, loads, empty selected strength days, time and
mode constraints remain checked. Stable alternative IDs take precedence over
legacy display names. Display-only alternatives use exact ID/name resolution;
unresolvable names produce an explicit warning. No fuzzy matching is introduced.

Unknown external zero load, history whose qualification is not established by
R06, and the retained entered-lift rack exception produce explicit warnings.
Missing authorized hybrid running is an error. D-P2-01/03/04/06 remain pending;
the validator does not approve a new ceiling, hybrid placement, stimulus model or
rack rule. It fetches no history and mutates neither input nor persisted sessions.
R09 product integration and R10 acceptance remain separate tasks.

The primary test oracle is a literal reviewed two-day fixture with twelve weekly
objectives and 37 working sets, extended to a four-week 148-set programme.
Reason-specific mutations deliberately damage actual work and allocations.
Supplementary public compiler/session scenarios cover schedule lengths 2–6,
strength/running/hybrid and full/floor/dumbbell equipment. Those integration
declarations share policy/calendar inputs with generation and cannot independently
detect correlated omissions; they supplement the literal oracle.

This source contract does not establish Android parity, live persistence,
scientific policy approval or EIF N-0069 acceptance. N-0069 evidence attachment is
separately blocked by `LEASE_NOT_OWNER: R20261014R03` through the public wrapper.
