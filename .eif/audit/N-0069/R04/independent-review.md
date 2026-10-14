# R04 independent source review

Result: **VERIFIED_WITH_LIMITATIONS** for the R04 implementation inspected on
2026-10-14. This report does not accept or close EIF N-0069.

Reviewer: separate delegated Codex agent `/root/r04_review`, using the same
model and inherited task context as the implementer. This is an independently
executed code review and test rerun, not another-model or fresh-context review.
Applied implementation-reviewer, architecture-specialist (module scope), and
verification-controller contracts. The reviewer changed only this report and
its test log; no product source, ledger, runtime internals, or live data.

## Findings and resolution

The starting compiler aggregated daily templates and replayed their slots. It
did not meet the brief's requirement that weekly objectives precede allocation.
The reviewed implementation instead declares stable named weekly objectives,
their required sets/exposures, scheduling ownership, accepted positions and
provenance before inspecting calendar slots or exercise availability. Omitting
a calendar day preserves the objective and produces explicit missing-exposure
and unmet-requirement diagnostics. New day materialization consumes this
allocation without adding or trimming doses.

Independent mechanical comparison with committed HEAD's balanced policy found
**109 exposure positions** across 2–6 days with identical slot identity/order.
The **85 weekly objective records** have explicit owners equal to the original
first-candidate catalogue primary owner. Stable named slot definitions share the
unchanged approved set/repetition/rest blend functions; this review approved no
new scientific quantity or anatomical stimulus calculation.

Initial concerns about mutable daily-table indexes, catalogue-derived ownership,
missing skill context, missing exercise diagnostics, rest-only cap checks,
unknown strategy identifiers, and four-week object aliasing were resolved in
the inspected implementation. Exact approved day identifiers are checked during
materialization. Accepted 24-set and 60-minute estimate policies are preserved;
malformed saved allocations report conflicts instead of silent trimming.

Committed R03 eligibility is used for weekly candidates, materialization and
eligible alternatives, with explicit selection intent. The rack exception is
enabled only for balanced allocation and historical balanced compatibility.
Generic engine selection is unchanged from committed HEAD in the scoped R04
patch; its preexisting uncommitted eligibility integration remains outside this
checkpoint. Historical balanced regeneration retains accepted recipes/doses but now diagnoses absent
candidates and reports accepted historical cap trimming. Started/guided session
snapshots remain guarded by the existing persistence adapter.

New allocation prescriptions are invariant to translated, repeated or
whitespace-modified display labels. Historical saved days without allocation
retain explicitly flagged legacy label routing. Once-frequency/fat/fitter policy
review remains pending where applicable. Hybrid 2/3-day missing run placement is
explicitly infeasible; the code does not authorize a replacement hybrid policy.
Running metadata retains the accepted numeric schedule.

## Independent re-execution

Earlier mixed-tree command, executed from `app/` with the required verbose reporter and
unchanged repository timeout:

```text
npx vitest run src/lib/training/__tests__/weeklyProgrammeAllocation.test.ts src/lib/training/__tests__/balancedHypertrophy.test.ts src/lib/training/__tests__/exerciseEligibility.test.ts src/lib/training/__tests__/buildProgramDaySession.test.ts src/lib/training/preview/__tests__/setupContract.test.ts src/lib/training/preview/__tests__/preview.test.ts --reporter=verbose
```

**79/79 tests pass; six files pass; exit 0; 13.44 seconds.** Start time reported
by Vitest: 17:07:46. Raw output: [reviewer-focused.txt](reviewer-focused.txt).
Coverage includes real planner-to-session output across 2–6 selected days and
weeks 1–4; goals, injury/forbidden/dislike constraints, rich/floor/dumbbell
equipment, label metamorphism, missing days, malformed allocations, rack
preservation, run/hybrid placement, historical compatibility, frozen snapshots,
and preview adapter transport.

Earlier reviewer runs caught two erroneous new fixture assertions (nonexistent
`dumbbell_row` ID and an assumed cap conflict absent from accepted policies).
Both fixtures were corrected, without changing scientific rules. A subsequent
run caught an interim concurrent historical-picker signature edit; final
reruns pass. These intermediate results are not represented as final passage.

The implementer subsequently found an additional carry regression in the
isolated suite when generic engine eligibility integration was included.
That integration was preexisting uncommitted work and outside the minimal R04
weekly scope. It was excluded from the narrowed candidate; generic engine
selection is unchanged from committed HEAD. This correction supersedes the
earlier candidate engine hash and the description of generic R03 integration.
Weekly compiler/materializer and historical balanced regeneration retain R03.

Final narrowed-candidate reviewer command, executed independently from
`C:/Reclaim-R04-verify-20261014/app`:

```text
npx vitest run src/lib/training/__tests__/weeklyProgrammeAllocation.test.ts src/lib/training/__tests__/balancedHypertrophy.test.ts src/lib/training/__tests__/exerciseEligibility.test.ts src/lib/training/__tests__/buildProgramDaySession.test.ts src/lib/training/preview/__tests__/setupContract.test.ts src/lib/training/preview/__tests__/preview.test.ts src/lib/training/__tests__/smallMuscleVolume.test.ts --reporter=verbose
```

**83/83 tests pass; seven files pass; exit 0; 15.49 seconds.** Start time
reported by Vitest: 17:14:28. Raw output:
[reviewer-focused-final.txt](reviewer-focused-final.txt). This is the final
reviewer test result for the narrowed scoped patch, including the regression
file that motivated scope correction.

## Reviewed source hashes

SHA256 of the exact scoped candidate reviewed at
`C:/Reclaim-R04-verify-20261014`, detached at committed `59b6221` with the R04
patch. The engine/type/day-wrapper diffs were separately inspected: the engine
excludes preexisting generic selector integration and the R06 progression call change, types exclude R06
performance fields, and the wrapper excludes the R09 allocation resolver.
Other listed source files match mixed-worktree content; four have only
line-ending/BOM differences. The implementer separately owns staged-index
equality and full isolated validation. The earlier 79-test reviewer rerun was
in the mixed tree; the final 83-test rerun independently verifies the exact
isolated narrowed variant.

| File (under `app/src/lib/training/`) | SHA256 |
|---|---|
| `weeklyProgramme.ts` | `00ca80d15c73478195d01435d2832dbdb506b64860747f5b55ee7bf846cca680` |
| `weeklyProgrammeTypes.ts` | `eedddd151c912127a0fbfd8d6d2b8484c2f5e2e0dd2a70acaa78dc003e2e64b2` |
| `weeklyProgrammePolicy.ts` | `90838908fb43287a13a456c41ab60ffb57890809129dd7bc84522891fcc8df5f` |
| `allocatedProgramSession.ts` | `ea75dadee81d092034f38e2b736d741fe6aa9497822b6b961ec00c5ab987db46` |
| `balancedHypertrophy.ts` | `81d1982368d4ffdb6d043146fb81dd4e79dbd979a513b7239dc09f7854a08818` |
| `engine/index.ts` | `e4fa63806e4142655cf7f6b5fe7eac2171045ed23e9b471bb8abad2bf9567c4b` |
| `types.ts` | `dbbea33caa2b2d92d247ffd596e118e4970f577570f7e133381ed4beac1b5e40` |
| `programPlanner.ts` | `4491828a783d34542960729ff52a05a70083bed85b9720abd5ef0e3c90a02e11` |
| `buildProgramDaySession.ts` | `f3d398dde570e67db27fc4afff891d0a776916a01580f26ebb0740a39e543fdb` |
| `preview/index.ts` | `4d1ff5844d02bfe5f7443f1a5b9b5c6d66fe8368258d666becf45a324c9f1e1f` |
| `__tests__/weeklyProgrammeAllocation.test.ts` | `236a9b1e999c1c59b3b10f4ac42d9e22eabedcdc098ffc124dd797191e0cbec6` |

## Acceptance limits

No remaining blocking source finding was identified within R04. Whole-programme
independent validator implementation/acceptance belongs to R05 and was not
performed here. This report independently re-executed focused tests only; full
suite, typecheck, repository gates, isolated patch checks, pushed commit,
ownership transition and EIF evidence attachment are the implementer's separately
recorded evidence. No Android rendering, live database, clinical suitability,
production release, or shared-runtime repair is claimed. N-0069 remains open.
