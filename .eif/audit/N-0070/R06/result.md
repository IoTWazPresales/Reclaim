# R06 qualified performance evidence - 2026-10-15

Requested scope: R06 only on `fix/training-confident-ux`, based on HEAD
`3c0c14008b2c47cff33c15378ad6e37b97dcd76b`. Resumed the partial R06 work;
no audit was repeated. R02 normalized setup and R04 allocated-day interfaces are
preserved. No R07 or other recovery task was started. N-0070 stays open.

## Implementation and source-to-decision chain

1. `api.ts` reads authenticated, paginated canonical item history with the frozen
   plan and owning session. Both last-performance APIs use the same adapter;
   missing log replicas are irrelevant. Query errors throw.
2. `performanceHistory.ts` preserves the latest incomplete/unsupported entry as a
   barrier. Qualification records source, status, exercise/item/session identity,
   completion, expected indices/count, kg convention and prescription units.
3. `trainingProgramPerformanceSeed.ts` requests every catalogue candidate by
   default or supplied relevant IDs. It distinguishes available/missing/unavailable
   and clears stale profile maps even for failed/absent reads. Its legacy map-only
   export throws on failure instead of disguising it as absence.
4. Profile/user-state propagation reaches `deriveProgressionDecision`. The engine
   rechecks qualification and last/recent consistency before loading or counting
   distinct comparable sessions. Increasing reps below the top breaks stagnation.
5. Existing double-progression numbers, deload target, rounding, implement minimums
   and Epley ceiling stay in effect. Applied explanations name actual saved kg/reps,
   including rounded increments, minimum-bounded deload and bodyweight advisory
   behavior. Allocated, historical balanced and generic slots use the same boundary.
6. The screen clears stale snapshot evidence and rotates the history query when
   session-list invalidation produces refreshed data. Started/guided prescriptions
   and canonical completion authority are unchanged.

Full contract and three-session baseline example:
`docs/training/recovery/R06-performance-contract.md`. D-P2-01 remains pending:
qualified bench history 80/82.5/85 kg at 3x12 proposes 87.5 kg; the retained own
estimated 1RM of 80 kg applies 60 kg at a new 10-rep target. The reason states the
applied result and saved-baseline limit; no override policy was approved.

## Scope isolation and review

`source-manifest.json` binds the exact 16 staged source/test blobs. The detached
checkout `C:/Reclaim-R06-verify-20261015` starts at the baseline above and contains
only those blobs, copied byte-for-byte. Its node_modules junction reuses installed
dependencies; Vitest runs are sequential to avoid shared test-storage contention.
The isolated final gate fingerprints the source before/after execution.

The source checkpoint excludes preexisting generic selector edits, R09 frozen-day
API/projection work, R07/R08 runtime/UI changes, migration/data changes, EIF ledger
and generated views, and routine-volume measurement output. Those edits remain in
the main worktree. Test fixture upgrades supply canonical evidence while retaining
the old numerical assertions; no assertion was waived or timeout shortened.

Independent separate-context reviewer `/root/r06_review` approved all 16 final
staged blobs; exact-index esbuild/Node adverse probes pass 16/16. The receipt and
replay sources are `review-receipt.json`, `review-index-probes.json`,
`review-probes.ts` and `review-run.cjs`. This is same-model source/probe independence,
not different-model, Android, live-data or EIF acceptance.

## Final checks

All npm checks ran from `app/` in the stated checkout; Python wrapper checks ran
from the main repository root. Default 30-second test budget and thread pool were
retained; no test/configuration was excluded or relaxed.

| Check | Result |
|---|---|
| Final isolated focused, real API + progression + R02/R04/R05 consumers | 10 files / 186 tests pass (`focused-isolated-final.txt`) |
| Typecheck, main and exact isolated candidate | both exit 0 (`typecheck-final.txt`, `typecheck-isolated-final.txt`) |
| Git Bash dual-path, exact isolated candidate | exit 0, 31/31 (`dual-path-isolated.txt`) |
| Catalogue QA | 357 rows / 0 governance issues; final verbose receipt `catalogue-final.txt` |
| Public wrapper tests | 1 pass / 2 established ownership failures (`wrapper.txt`) |
| Canonical mixed full command | startup stalled before assertion output; task-owned runner stopped after >3 minutes (`full-mixed-final.txt`, `startup-stall.json`) |
| Canonical isolated full command | 93 files produced output, 841 passes / 3 known failures; worker-shutdown warning in unchanged mood file, then >3-minute stall; task-owned runner stopped (`full-isolated-final.txt`) |
| Supplementary remaining batch 1 | 35 files / 131 tests pass (`remaining-1.txt`) |
| Supplementary remaining batch 2 | 35 files / 169 tests pass (`remaining-2.txt`) |
| Supplementary remaining batch 3 | 28 files / 120 pass, 1 known migration failure (`remaining-3.txt`) |
| Independent exact-index probes | 16/16 pass, no unresolved source finding |

The canonical full-suite gate is **INCOMPLETE**, not passed. The supplementary
runs are diagnostic source evidence, not a substitute canonical gate or waiver.
Inventory verification (`verification-summary.json`, `remaining-gates.json`)
accounts for every one of 191 current test files and all 1,265 cases: 1,261 passes
and four established isolated-baseline assertion failures, with no new app
assertion failure observed. The isolated source matches all 16 reviewed blobs
before/after both its partial full run and every supplementary batch.

Those four assertions match the R05 isolated baseline documented in
`.eif/audit/N-0069/R05/recheck.md`: seed length 31 versus obsolete 18 expectation;
weekly isolation cap 15 versus 10; capped rebuild six sets versus two; run-session
migration UUID versus text. R06 does not edit those rules, expectations or schema.
The earlier mixed worktree instead has the existing missing-three-set carry
failure; its unrelated migration fix remains preserved and excluded. Do not
conflate the two sets of four failures.

Harness failures are separate: mixed startup stall and isolated worker shutdown /
progress stall remain unresolved. Their cause is not established. All stopped
processes were verified task-owned; no other project process was stopped.
`full-gates.json` proves source stability but does not turn an interrupted run into
a full-suite pass. Reproduction drivers are `run-full-gates.py` and
`run-remaining-gates.py`. Test log whitespace is normalized to UTF-8/LF without
changing assertions or diagnostics.

The required full gate remains blocked by the harness stalls above; the four
established assertion failures are separately accounted for by source evidence. No old measurement expectation is updated to hide a
failure. Earlier test-fixture errors were corrected. One earlier full run had four
historical failures plus two copy mismatches because source changed while Vitest
cached the old module; it is not final-source evidence. A subsequent run was
stopped before the final compatibility-boundary repair. Final full runs are started
from frozen source with before/after fingerprints (`full-gates.json`).

## Governance and runtime limits

With `EIF_RUN=R20261015R06`, public status, lease and human-check each exit 2 at
preliminary status with `LEASE_NOT_OWNER: R20261014R03`. Actual commands and output
are in `governance.json`. Wrapper tests reproduce the established 1 pass / 2
ownership-blocked failures. No runtime internals, shared framework, lease takeover,
ledger hand-edit, completion event or criterion acceptance is attempted.

ADB returned an empty device list. Visible explanation changes are
UNABLE_TO_VERIFY, with operator steps in `human-check.md`. Public registration of
those steps is blocked; no queue registration, render, approval, Android journey,
live DB write, deployment or shipping is claimed. D-P2-01 requires separate
approval before a ceiling policy change. The historical schema's kg/catalogue
convention is retained; there is no unit conversion or schema migration.

This is a scoped source checkpoint authorized by the operator, with the required
full-suite gate and EIF acceptance explicitly blocked. It is not a validated node,
criterion acceptance or permission to ship. The pushed source commit and actual
public evidence-attachment result are recorded in `push-receipt.json` and the
post-push receipt once the checkpoint is durable.
