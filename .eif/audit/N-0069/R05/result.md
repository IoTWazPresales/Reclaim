# R05 independent whole-programme validator — 2026-10-15

Scope: R05 only, `fix/training-confident-ux`, baseline
`37118f59da8692875bb4c881cd9994697d91c60d`. The committed R03 eligibility and
R04 weekly-v2 allocation contracts are dependencies. The existing uncommitted
validator draft was continued; its starting bytes are retained locally in
`starting-validator.ts`. No R06 or other recovery task was begun.

## Implementation

The independent validator checks actual materialized exercise sets against a
separate pre-generation declaration of weekly objectives and exposure policies.
It does not call the generator to derive expected answers. Whole-programme
validation also requires the four declared weeks, so an omitted entire week
cannot disappear from the expected result. The public API and caller trust
boundary are documented in
[`R05-validator-contract.md`](../../../../docs/training/recovery/R05-validator-contract.md).

Structured issues retain provenance and week/day/requirement/slot/exercise
locations. Missing exposures, incomplete allocations, ineligible or duplicate
exercises, invalid offered alternatives, catalogue spoofing, changed output
targets, inconsistent final prescriptions, invalid load state, exercise-specific
baseline ceilings, accepted set/time violations and missing or mislabeled runs
produce errors. Allocation feasibility claims cannot suppress these checks.

`valid` requires accepted targets with no errors or warnings. `invalid` means
at least one error. `unresolved` prevents scientific or product acceptance when
legacy targets are unspecified, external zero loads need confirmation, history
qualification is unverified or the retained rack exception applies. Actual
legacy eligibility, prescriptions, loads, time and mode still receive checks.
No pending hybrid/rack/baseline/stimulus policy is resolved here.

Only the validator and its test file are product changes. There is no new plan
writer, UI, history fetch, session completion path, persistence operation,
migration, deployment or live-data mutation. Started/guided session snapshots and
history authority are unchanged. R09 integration and R10/R11 acceptance remain
outside this source-only checkpoint.

## Independent oracle and review

The primary oracle is a literal reviewed two-day programme: twelve objectives,
37 working sets; the complete four-week fixture has 148 working sets. All 63
reason-specific damaging mutations are rejected for their expected issue code.
45 supplementary public compiler/session scenarios cover schedule lengths 2–6,
strength/running/hybrid, weeks 1–4, full/floor/dumbbell equipment. Their declarations
share some generated calendar/run inputs, so they cannot alone expose correlated
omissions; the literal oracle and independent probes are the separate checks.
`outcomes.json.gz` preserves declarations, actual reviewed work, mutation results
and scenario outcomes. The public matrix reports 23 valid and 22 invalid cases.

Two fresh-context reviewers inspected the exact final bytes:

- Same-model reviewer: `VERIFIED_WITH_LIMITATIONS`, 17/17 independently authored
  direct probes, exit 0. See `independent-review.md`,
  `reviewer-adversarial.ts` and `reviewer-adversarial-latest.txt`.
- Different model (`gpt-6-astra`, selected through the collaboration tool):
  `VERIFIED_WITH_LIMITATIONS`, nine independent Vitest probes, exit 0, unchanged
  thread pool and timeout. See `model-review.md`, `model-independent-probes.ts`
  and `model-probes-legacy-final.txt`.

Earlier review found malformed-strategy throws, ignored daily errors, invalid
status metadata, unbounded warm-ups, and legacy alternative/intent gaps. These
were corrected and checked on the final hashes recorded in `source-manifest.json`.
Earlier findings and failed infrastructure attempts remain historical evidence;
they are not current approval or clean test results. Review is source verification,
not clinical approval, Android parity or EIF acceptance.

## Verification

Final focused isolated checks: 91 R05 validator tests plus 28 R03 eligibility
tests, exit 0 (`isolated-focused-final.txt`); 21 R04 allocation tests, exit 0
(`isolated-r04-final.txt`). Combined 140 passing tests. No shortened timeout.
`R05_CAPTURE` was enabled on the final validator test run.

Commands from the isolated `app/` directory:

```text
npx vitest run src/lib/training/__tests__/weeklyProgrammeValidator.test.ts src/lib/training/__tests__/weeklyProgramme.test.ts src/lib/training/__tests__/exerciseEligibility.test.ts --reporter=verbose
npx vitest run src/lib/training/__tests__/weeklyProgrammeAllocation.test.ts --reporter=verbose
npm run typecheck
npm test -- --reporter=verbose
```

The first command's obsolete `weeklyProgramme.test.ts` selector matches no file;
it ran the validator and eligibility files (119 tests). The separate second
command runs the correctly named R04 file (21 tests); no R04 check is omitted.
For future combined runs, use `weeklyProgrammeAllocation.test.ts` in the first
command instead. Repository checks also use Git Bash
`npm run audit:training-dual-paths`, `npm run med-catalog-qa` from `app/`,
and `python -m pytest scripts/test_eif_node.py -q` from the repo root.

The temporary model probe source was moved from the isolated test directory to
`model-independent-probes.ts` after its clean run, before the full suite. To
reproduce it, copy it into that checkout's
`app/src/lib/training/__tests__/r05-independent-probe.test.ts` and use the
command in `model-review.md`, then move it out again. The direct review probe
source has absolute imports into the documented isolated checkout; reproduce
with that checkout or update those import prefixes and bundle with the existing
esbuild, then execute the bundle with Node. These probes reuse the literal
fixture but independently select mutations; they are not a separate fixture
approval authority.

Typecheck exits 0 in both mixed and exact isolated source checkouts.
Git Bash dual-path audit passes 31/31 in both checkouts. The isolated candidate
contains exactly the two R05 source/test additions over the committed baseline;
reviewer temporary tests were moved to evidence before the full suite.

Final exact isolated full suite: **1,229 passed / 4 failed**, 188 files, exit 1,
467.52s (`isolated-full-final.txt`). Failures exactly match R04's committed
baseline: `routineVolumeMeasurement` seed count 31 versus 18; `runSession`
migration link uuid versus expected text; and `weeklyVolumeModel` cap assertions
15 versus 10 and 6 versus 2. No new scoped regression is observed. The existing
started-session freeze assertion elsewhere in `fourWeekProgression` also passes;
the known volume-model failure is the rebuilt-cap expectation, not a new history
mutation.

Final mixed-worktree full suite: **1,234 passed / 4 failed**, 189 files, exit 1,
223.53s (`full-vitest-final.txt`). The same four existing failures recorded by
R04 remain: routine seed count, both volume-cap assertions and `smallMuscleVolume`
missing carry (expected three sets, received undefined). The preserved migration
change removes the isolated migration failure. All R05 tests pass in this mixed
run as well. No new failure is introduced by the scoped two-file R05 patch;
the full repository suite is still not green.

Catalogue QA exits 0: **357 rows, zero governance issues** (`catalogue-final.txt`).
`verification.json` records final commands, observed exits and raw workspace /
Git-normalized log hashes. The full repository suite and EIF tests remain red
for the established failures above; this is a scoped source checkpoint.
Earlier default-pool full/focused attempts that stalled or returned thread-startup
errors are not counted as completed suite passes, even where later stdout showed
passing assertions. Concurrent runners were stopped only by their task-specific
command paths. Final runs are sequential and preserve the configured 30s budget.

## Separate EIF blocker

`EIF_RUN=R20261015R05`; public `status --node N-0069` exits 2 with
`LEASE_NOT_OWNER: R20261014R03` (`eif-status-final.txt`). Required wrapper pytest
reports 1 pass / 2 failures from that same established public replay blocker
(`wrapper-final.txt`). R03/R04 attachment remains blocked independently of R05
implementation correctness. No lease takeover/transition, runtime inspection or
repair was attempted in R05. N-0069 must remain open until authorized ownership,
required evidence and acceptance are established through the public wrapper.
