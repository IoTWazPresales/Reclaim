# R05 checkpoint recheck — 2026-10-15

Requested scope: R05 only. On arrival, the implementation and evidence were
already committed as `dcf4bf87b6d587f99451d88d3e58fbea68f6913a` and
`f3d23f6b920daf2920521eaeafd5e364c0321272`, respectively. `git ls-remote`
confirmed the latter at `origin/fix/training-confident-ux`. No uncommitted R05
source work remained. This continuation verifies that deliverable and corrects
the stale task header; it does not redo prior discovery or begin R06.

## Source and independence

The validator/test Git blob IDs remain `03d1c462e0b2e1e9536482190d90bcd62ac3e732`
and `5bd26bc93000493d524992d7c024a6065af33fe8`, matching the committed source
manifest and prior independent reviews. No production source was changed.

Source inspection confirms separately supplied declarations, actual final-set
coverage, canonical R03 eligibility, R04 identities and accepted prescription,
load, warm-up, set/time and running constraints. No generator is called to derive
the validator's expected answer. A literal reviewed fixture supplies the primary
oracle; compiler scenarios remain supplementary because some declaration inputs
are shared. Existing scientific policies remain unchanged.

Re-executed the prior reviewer's independently authored direct probes against
the current workspace by changing only their absolute import prefix from
`C:/Reclaim-R05-verify-20261014/` to `C:/Reclaim/`, bundling with the installed
esbuild (`--bundle --platform=node --format=cjs`), then running Node. Exit 0,
17/17 expected outcomes (`recheck-probes.txt`). This is a replay of independent
probes, not a claim of a new independent agent review. The prior hash-bound
same-model and different-model reviews remain applicable to unchanged source.

## Fresh checks

All npm commands ran in `C:/Reclaim/app`; Python ran at the repository root.
No test timeout was shortened. Logs prefixed `recheck-` preserve this run.
Committed logs use UTF-8/LF with trailing whitespace and terminal blank lines
removed; assertions and diagnostics are preserved.

| Check | Command | Result |
|---|---|---|
| Focused R03/R04/R05 | `npx vitest run src/lib/training/__tests__/weeklyProgrammeValidator.test.ts src/lib/training/__tests__/weeklyProgrammeAllocation.test.ts src/lib/training/__tests__/exerciseEligibility.test.ts --reporter=verbose` | exit 0; 140/140 |
| Types | `npm run typecheck` | exit 0 |
| Dual-path | Git Bash `npm run audit:training-dual-paths` | exit 0; 31/31 |
| Full suite | `npm test -- --reporter=verbose` | exit 1; 1234 passed / 4 failed; 354.55s |
| Catalogue | `npm run med-catalog-qa -- --reporter=verbose` | retry exit 0; 357 rows / 0 governance issues; initial run exited 1 from thread-startup timeout |
| Public wrapper | `python -m pytest scripts/test_eif_node.py -q` | exit 1; 1 passed / 2 failed, existing ownership blocker |
| Reviewer probe replay | esbuild then Node, as above | exit 0; 17/17 |

Correction to the earlier summary: the historical isolated and mixed full suites
both had four failures, but **not the same four assertions**. Isolated: seed count
31 versus 18, run-migration uuid versus text, and two weekly-volume cap assertions
(15 versus 10; 6 versus 2). Mixed: the same seed and two cap assertions, plus
`smallMuscleVolume` missing `farmer_walk` (undefined versus 3); the migration test
passes there. These exact distinctions are visible in `isolated-full-final.txt`
and `full-vitest-final.txt`. The isolated candidate passes the carry test.
Unrelated uncommitted generic-engine/migration changes are preserved.
The fresh mixed full run reproduces exactly the four historical mixed failures,
with 186 passing and 3 failing files. No new scoped regression is observed.

## Behaviour and acceptance limits

Missing exposures/weeks, ineligible exercises, duplicate work, incomplete
allocation, invalid prescriptions/loading, exceeded budgets and infeasible
programmes return structured errors with provenance. Warnings produce
`unresolved`, never `valid`: legacy scientific quotas, unqualified numeric history,
unspecified external zero loads and the retained rack exception remain explicit.
No new scientific requirement is approved. Caller authenticity/approval of
pre-generation declarations, R09 integration and Android/live persistence journeys
remain outside this source checkpoint.

With `EIF_RUN=R20261015R05`, public `status --node N-0069` again fails at preliminary
status with `LEASE_NOT_OWNER: R20261014R03` (underlying exit 2). Wrapper tests fail
for the same established reason. Existing actual attachment receipt remains
`evidence-attachment.json`; no new attachment or completion is claimed. No lease
takeover, runtime inspection or ownership repair was attempted. R03/R04/R05
evidence attachment and N-0069 acceptance remain open independently of source
correctness. Stop after R05.
