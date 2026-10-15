# R07 adjustment contract ? source checkpoint, 2026-10-15

R07 only on `fix/training-confident-ux`, based on committed R06 and HEAD
`5e8879d`. Resumed the existing partial adapter/UI/guidance changes. No original
audit was rerun, no R08 or another recovery task was started, and no live session
or database was edited. N-0070 remains open.

## Change and before/after proof

The producer already returned 95 kg from 100 kg at first-set RPE 9. Its output
contained `adjustedWeight: 95` and `weightMultiplier: 0.95`. The old inline UI
adapter read absent `weightDelta`, persisted zero, and the reader kept 100 kg.
The regression reconstructs that exact old mapping and runs the actual producer,
new typed adapter and reader. The repaired overlay is -5 kg / 0 reps relative to
the frozen next 100 kg / 8-rep set. After JSON reload, phone-derived state and the
notification/watch chain all read 95 kg / 8 reps. The structured exact-index
output is in `independent-probes.json`; original planned and performed data are
both unchanged. Later-set weight/repetition, equipment rounding, bodyweight,
assistance, invalid data, rounding to no effect and reload cases are covered.

`recommendSessionAdjustment` validates existing inputs/units and adapts the
unchanged producer's effective targets. The typed outcome includes kg, reps,
load convention, rule ID, explanation and persisted overlay. Applied explanations
name actual effective targets using the existing load formatter.

Phone Done still uses `applySetCompletion` and canonical `performed.sets`.
Only successful online completion may publish a future overlay. The existing
API must save it before `persistAppliedSessionAdjustment` patches the shared
session cache or the UI announces success. Failed read/write and offline paths
retain the existing target and report non-application; no separate local map
supersedes the saved overlay. The duplicate guard spans this work.

Focus, rest, notification focus/Done, edit defaults and full-plan display use the
same derived reader. Rest now selects canonical pending work across skipped,
completed and partially completed exercises, preventing a jump from displaying
a completed first set. Notification bodies and shared phone/watch Done use the
same effective DB-derived target; stale payload values cannot override it.
No notification transport, native service or foreground behavior changed.

The plan is frozen; only the existing adjustment JSON changes. Completed history
is never rewritten. R06 load conventions are retained. Assistance direction,
automatic skipping, multiplier-only fatigue without an applied target, and
pending scientific decisions remain unresolved/unactivated. D-P2-01 is unchanged.
Full contract: `docs/training/recovery/R07-adjustment-contract.md`.

## Isolation and review

`source-manifest.json` identifies nine staged source/test blobs. The detached
checkout `C:/Reclaim-R07-verify-20261015` contains only those source changes on the
baseline above; its dependency junction reuses installed packages. Final gates
fingerprint the exact blobs before/after execution.

The staged TrainingSessionView was built from HEAD plus R07 hunks, preserving
unrelated replacement changes in the main worktree. Existing replacement,
programme/API/projection, generic engine, migration, catalogue-measurement,
release and EIF changes remain excluded. The untracked substitution/projection
modules are preserved. No secrets, runtime internals or shared framework were
read or edited.

Review and independent-execution scope are explicit in `review.md`: same author,
separate staged-source Node probes and isolated-checkout verification, not a
separate human/agent/model review or EIF criterion acceptance.

## Required checks

| Check | Result |
|---|---|
| Final focused isolated | 11 files / 109 tests pass (`focused-isolated.txt`) |
| Final isolated typecheck | exit 0 (`typecheck-isolated.txt`); earlier main typecheck also exit 0 |
| Git Bash dual-path | 31/31, exit 0 (`dual-path.txt`) |
| Catalogue QA | 357 rows / 0 governance issues, exit 0 (`catalogue.txt`) |
| Independent staged-source Node probes | 10/10 groups pass plus structured before/after output (`independent-probes.json`) |
| Required canonical full suite, final isolated source | completed; 1,291 passed / 4 established baseline failures, exit 1; 193 files / 1,295 cases (`full-suite-summary.json`) |
| Public EIF wrapper tests | 1 pass / 2 established ownership failures (`wrapper.txt`) |
| Source fingerprint / whitespace | nine final blobs match before/after every final gate; `git diff --cached --check` clean |

The full suite is **not green**. It completed without a full-suite runner stall
on the final isolated source, and its exact four assertion failures match the
committed isolated baseline. No new assertion failure was observed. The raw full
verbose log remains locally available; its SHA-256 and exact failing assertions
are committed in `full-suite-summary.json`.

The full-suite command retains the canonical thread pool, serial file policy and
30-second test budget. No assertions/configuration were relaxed, files excluded,
or historical expected values changed. The four isolated-baseline assertions
are already documented in R06 and R05 evidence:

1. `routineVolumeMeasurement`: seed length 31 versus obsolete expectation 18.
2. `weeklyVolumeModel`: isolation cap 15 versus 10.
3. `weeklyVolumeModel`: capped rebuild six sets versus two.
4. `runSession`: committed migration stores session UUID versus expected text.

The mixed worktree's preexisting migration fix and different missing-three-set
carry failure are not part of the isolated candidate. Do not conflate its failure
set with the committed baseline.

An earlier mixed focused run made no further progress after its first file and
was stopped only after verifying its task-owned process. Separate isolated
persistence and final focused checks pass. Prior R06 full-suite stalls remain
known harness limitations; they are not new R07 assertion failures. The first
completed isolated full run passed 1,289 tests with those same four failures.
An intermediate run was explicitly superseded when source review found the
rest-target issue; its termination is not counted as a test failure or stall.
Final canonical-gate status is given in the table and `gate-results.json`.

## Governance, device and durability limits

The required wrapper check reproduces 1 pass / 2 ownership-blocked failures.
`EIF_RUN=R20261015R07` identifies this session's checks. Established evidence
attachment blocker is `LEASE_NOT_OWNER: R20261014R03`. It was recorded without
repeated lease/status/attachment investigation, ownership repair, direct ledger
edit, evidence bypass, acceptance or completion event. No evidence ID is claimed.

ADB returned an empty device list. Device/render/watch journeys are
**UNABLE_TO_VERIFY**. `human-check.md` contains unregistered operator steps, also
referenced in HUMAN_CHECKS/AWAITING_APPROVAL. Public registration is blocked; no
render capture, actual delivery, queue-registration success, deployment or
shipping approval is claimed. Those actual journeys remain for later approved
work; R07 does not start R11.

This is an operator-authorized scoped source checkpoint, with baseline assertion
failures and EIF/runtime acceptance explicitly outstanding. It is not a validated
node or N-0070 acceptance. Push details are recorded in `push-receipt.json` after
commit. Stop after R07; do not start R08 or another task.
