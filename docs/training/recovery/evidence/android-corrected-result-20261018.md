# Corrected programme Android verification ? 2026-10-18

**Result: UNABLE_TO_VERIFY in Android. Source-only startability verified with limitations.**

Source checkpoint `2480d09`, branch `fix/training-confident-ux`, workspace
`C:/Reclaim`. This is a bounded verification attempt, not R11 acceptance or R12.
Read AGENTS.md, the incomplete-history correction, its receipt, existing R11
Android evidence and the current resume pointer. No history investigation,
Phase 1 audit, application correction or full-suite rerun was performed.

## Observed Android result

The existing emulator `emulator-5554` was retained. Initially it appeared online,
but shell echo and boot-property requests each timed out after 12 seconds.
Resetting the stalled ADB server restored shell access without restarting the
AVD or changing its disk. The initial screen was the retained signed-in Training
calendar; it did not establish which JavaScript was loaded. No session preview,
exercise prescription or corrected warning was inspected successfully.

Metro was absent initially. Started Metro in `app/` with
`expo start --dev-client --localhost`, restored `tcp:8081` reverse, and reopened
only Reclaim using the documented localhost development-client URL. Android
subsequently displayed Reclaim ANR and development-client HTTP-header timeout
screens. Restarted only the Metro created by this attempt with `--max-workers 2`.
A final bounded probe returned `/status` HTTP 200 after 22.22 seconds and
`/json/list` HTTP 200 with **no targets** after 24.16 seconds. The Android-platform
manifest request timed out after 40.01 seconds. The visible error-screen Reload
control did not recover the runtime; the final capture shows a Reclaim ANR.
These observations establish a current runtime blocker, not its root cause.

Automatic approval review rejected a second force-stop/reopen command with
?blocked by policy? and no additional reason. That command was not retried;
subsequent recovery used only the visible Reload control and read-only probes.

The same AVD and the restored Metro were left available. No build, reinstall,
uninstall, data clear, emulator reset, native regeneration or VPN operation was
performed. Recovery stopped here rather than changing the application.

## Requested verification and evidence boundary

| Check | Actual result |
| --- | --- |
| Loaded corrected validator and executed-source fingerprint | UNABLE_TO_VERIFY: no inspector target. Disk fingerprint is not loaded-JS proof. |
| Existing authenticated profile through read-only APIs | UNABLE_TO_VERIFY: initial signed-in screen observed, no current API snapshot obtained. |
| Fresh four-week in-memory generation against committed evidence | UNABLE_TO_VERIFY: no authenticated runtime evaluation available. |
| Five feasible daily proposals; unresolved weekly result; 19 load confirmations + one history warning per week | Established by the prior committed offline correction only; not reclassified as current Android evidence. |
| Weekly preview and exercise guidance | UNABLE_TO_VERIFY: navigation attempt led to ANR; no corrected preview or guidance rendered. |
| Unspecified loads shown truthfully rather than calibrated 0 kg | UNABLE_TO_VERIFY in this attempt. Existing R11 or source formatting cannot substitute for corrected runtime observation. |
| Required confirmation and unresolved warning presentation | UNABLE_TO_VERIFY in rendered Android; source loss point described below. |
| Startability | Pure-source checks only, detailed below. Start never tapped. |
| Separate actual-render review | Reviewer independently inspected actual failure PNGs and matching accessibility evidence; no corrected programme render exists to approve. |

The validator's disk SHA256 matches the correction receipt:
`b4730b3a791408cc6d2d971c4e1dab4998a173f13590a7badc98adfd3d54e3b4`.
The preserved uncommitted engine SHA256 is
`3ba8cb793eb9da34a5d21ac14fd4ed65e5117776eb63adc76e72496cdf82dc48`.
Neither is presented as a fingerprint of currently executed Android JavaScript.

## Focused pure-source verification

Extracted the actual `assertStartableProgramme` function from current TypeScript
using the Babel AST, transpiled that exact function with esbuild, and invoked it
without any API or persistence dependency. All **20** proposals in the previously
captured corrected offline output pass. A feasible warning-only control carrying
`load_requires_confirmation` and `history_evidence_unverified` also passes;
controls adding an error or marking a day infeasible both throw. The separate
reviewer inspected the start path: TrainingScreen invokes the guard before
`createTrainingSession`, including the confirmation callback. These checks prove
the guard's decision, not end-to-end runtime start success or safe calibrated
loads. No Start, Save, Done, adjustment or session creation was invoked.

Source fingerprint and results are in the
[receipt](android-corrected-receipt-20261018.json). These are the only new execution
checks beyond bounded infrastructure probes; no complete test suite was run.

## Source discrepancy and precise next correction

`programmeWeekProposal` computes `validateProgrammeWeek` but copies the weekly
issues into proposals only when the weekly result is `invalid`. An `unresolved`
result is discarded. `SessionPreviewModal` does not render validation diagnostics,
and `weeklyProgrammeSummary` adds ?Programme needs review? for infeasible days,
not warning-only weekly results. This is a verified **source-level diagnostic
propagation gap**, not an observed corrected-Android warning defect.

The precise product correction to consider separately is to retain the complete
weekly status/issues in the proposal/view contract and display unresolved weekly
status, per-exercise load-confirmation requirements and the incomplete-history
barrier truthfully. Keep feasible daily proposals available and keep the current
error-only startability boundary. Do not convert unspecified external zero to a
calibrated prescription, silently accept the weekly result as valid, alter
scientific rules, or rewrite saved/started work. This attempt implements none of
that. First restore responsive Metro/inspector access, fingerprint the loaded
validator and repeat the requested read-only comparison before asserting the
rendered defect or accepting a correction. No root-cause fix is justified by
these timeout captures alone.

## Sanitisation, preservation and review

Published only two app failure screens: [loading timeout](android-corrected-loading-20261018.png)
and [final ANR](android-corrected-anr-20261018.png). The accompanying receipt retains
only their relevant accessibility nodes/bounds, aggregate check results and
source hashes. Private calendar capture, raw logs, profile/history captures from
prior work and local scripts remain outside the repository. No identities,
auth tokens, profile rows, programme dates or user measurements are published in
this packet. Matching XML may describe a later instant than its preceding PNG;
the published failure captures were separately checked against their hierarchies.

No data API write, session start, programme save, history mutation, migration,
scientific-policy change or EIF operation was requested or invoked. Because the
inspector was unavailable, this attempt cannot independently compare live rows
before/after or certify background application behavior. Original unrelated
file fingerprints, including the engine edit and programme-ledger files, are
checked for preservation before commit. Node status/table remain unchanged.

[Separate render/source review](android-corrected-review-20261018.md) records its
own evidence and limits. This packet is a failed/blocked Android verification
checkpoint, not a passed Android result, EIF acceptance or shipping approval.
Stop after this report; R12 remains out of scope.
