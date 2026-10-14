# R03 source checkpoint — 2026-10-14

Branch: `fix/training-confident-ux`. Starting HEAD: `cda17e7`.
Task authority: R03 only. No R04 or another recovery task began.

Implemented the existing uncommitted eligibility draft, with additive typed
diagnostics and rack-policy provenance while preserving string consumer fields.
Catalogue-driven candidate evaluation retains exact rejection results and input
order. Tests cover 137 actual exercises, floor-only and dumbbell-only partitions,
equipment aliases, combined ALL/ANY, injuries, forbidden movements, hard dislikes,
caller exclusions, slot-specific skill preference and the rack exception.
No catalogue records, numerical prescription rules or clinical policy changed.
See [contract](../../../../docs/training/recovery/R03-contract.md) and
[independent review](independent-review.md).

## Engineering verification

- Focused final tests: **28/28 pass** in both mixed worktree and isolated R03
  checkout; separate reviewer also reran 28/28.
- Typecheck: exit 0 in mixed and isolated R03 checkouts.
- Git Bash `npm run audit:training-dual-paths`: **31 passed, 0 failed**, exit 0.
- `npm run med-catalog-qa`: retry passes, **357 rows, 0 governance issues**.
  First attempt reported `Timeout starting threads runner` despite subsequently
  printing the QA report; that attempt is not a passing check.
- Independent review: PASS within scope, with reviewer-reported **17,262**
  matching decisions across 126 catalogue/profile/policy combinations.
- Public wrapper pytest: **1 passed, 2 failed**, both from the new ledger replay
  error below, not an app eligibility assertion.

Isolated full verbose suite: **4 failed, 1117 passed (186 files)**, exit 1,
356.81 seconds. The failures are exactly the four committed-baseline failures
documented in R01/R02: `routineVolumeMeasurement` seed count (31 vs 18), two
`weeklyVolumeModel` caps (15 vs 10 and 6 vs 2), and `runSession` migration link
type (uuid vs expected text). No new failure appears in the isolated R03 patch.

Mixed-worktree full verbose retry: **6 failed, 1120 passed (187 files)**, exit 1,
358.82 seconds. Three failures match committed baseline: the seed count and two
volume caps. Three match the preexisting Phase 2 failures documented by R02:
`balancedHypertrophy` entered squat/press preservation, `smallMuscleVolume`
advanced leg day, and `wednesdayPushShape` saved-week overhead press. The mixed
tree's preexisting migration change removes the fourth isolated-baseline failure.
All 28 R03 tests pass in this full run. This is the same six-failure set as R02,
with 28 new passing tests; no new app regression is observed. Full-suite gate
remains failing, so this is a **scoped source checkpoint, not a validated node**.

First
mixed-worktree attempt stopped advancing after the known seed-count assertion;
after several minutes without output or CPU progress, its verified Vitest
process was terminated. Its partial output is not a suite result. Retry uses
the required verbose reporter and unchanged 30-second test budget.

Raw local outputs: `.eif/audit/N-0069/R03/{focused,typecheck,full-vitest,
full-vitest-retry,catalogue-qa,catalogue-qa-retry}.txt`. Isolated checkout:
`C:\Reclaim-R03-verify`, detached at `cda17e7`, containing only the two R03 code/test
files and a junction to existing dependencies. Local outputs:
`R03-typecheck.txt`, `R03-focused.txt`, `R03-full-vitest.txt`. These are evidence
locations, not claims that untracked raw logs will accompany another checkout.

## New EIF blocker — preserve and escalate separately

Initial public status succeeded: programme revision 540, N-0069 in progress,
acceptance pending, expired lease owned by `R20261013P2`. `lease` reported the
existing lease without renewing it. At 14:12:12 UTC the public wrapper accepted
`release N-0069` under run `R20261014R03`, appending sequence 541 and a progress
line. Its generated event contains acquired/heartbeat/expiry fields on a release.
Subsequent public `status`, `status --node N-0069`, `lease`, and `release` fail:

```
ERROR LEASE_NOT_OWNER: LEASE_NOT_OWNER: R20261014R03
```

The failure persists when explicitly using the previous run `R20261013P2` and
also breaks wrapper pytest's unrelated status/dry-run queries. This is a **new
governance failure observed during R03**, not one of the documented app baseline
failures. No shared-runtime files were inspected or changed. No event rollback,
manual ledger repair, node acceptance or completion was attempted. Existing
generated/ledger changes, including preexisting R02 sequence 540, remain in the
worktree and are excluded from the R03 source checkpoint.

Exact next governance step: an authorized public-runtime repair/replay procedure
must restore readable status after sequence 541, then renew N-0069's lease and
attach this pushed R03 evidence through `scripts/eif_node.py evidence`. This is
separate authority from R03. The wrapper fails on its preliminary status query,
before it can append an intended mutation to LEDGER_PENDING; this file is the
durable record of the pending acquire/evidence operations. Do not hand-edit the
ledger or infer the lease state from stale generated views.

## Acceptance boundary

R03 API and focused contract tests are independently verified. N-0069 C2 has
partial source evidence, not whole-programme acceptance: explicit programme
infeasibility and production reuse still belong to R04/R05/R08. N-0069 C1/C3/C4/C5
and operator acceptance are not satisfied by this work. **Keep N-0069 open.**
D-P2-06 remains unresolved; legacy equipment ANY oddities remain visible in the
contract. No Android, live DB, UI swap or programme runtime journey is claimed.
Unrelated mixed-worktree code and pre-audit files were preserved.

Commit reference: the `feat(training): checkpoint R03 shared eligibility contract`
commit introducing this report; resolve with `git log -1 --format=%H --
.eif/audit/N-0069/R03/result.md`. Source/evidence may be committed and pushed on
the authorized working branch without asserting node acceptance. This checkpoint
does not include the broken generated ledger state or unrelated Phase 2 edits.
