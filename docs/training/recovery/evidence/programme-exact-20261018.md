# Exact programme diagnostic — 2026-10-18

Root cause established: the weekly validator treats an explicitly incomplete
history entry as invalid numeric load evidence, rejecting the entire week.
The canonical history adapter and seed attachment preserve the entry correctly.
No application source, programme, session, live row or EIF acceptance was changed.
R12 was not started. This is diagnostic evidence, not programme acceptance.

## Retained Android access

Read AGENTS.md, R11 Android evidence and the local timeout diagnosis. The existing
Home screen was rendered behind a System UI ANR. After the initial dismissal,
a com.android.phone ANR held focus. The initial taps used the displayed image's
scaled coordinates; checking the native 1080×2400 resolution allowed a corrected
Wait tap to clear the remaining dialog. No environment or app restart occurred.
Reclaim MainActivity then held focus, and tapping Training opened the retained
programme. Authenticated existing app APIs returned the profile and programme.
Accessibility idle capture failed once; screenshots and window focus establish
the successful recovery. No network diagnosis, Metro restart, rebuild or reinstall.

## Exact capture and replay

Raw artifacts are local and untracked, outside the repository:
`%LOCALAPPDATA%/ReclaimDiagnostics/programme-exact-20261018/`.

- `exact-private.json`: exact normalized snapshot augmented by the cached
  canonical seed, selected weekdays, explicit start-date ISO/local representations,
  adaptive option, complete seed maps, full generated plan and all four weeks of
  session results including every emitted validation issue. This diagnoses an
  in-memory build using the retained programme's start date; it is not a new
  current-date setup save. The selected weekdays are converted from stored UI
  Sunday=7 to planner JS Sunday=0; no other values are reconstructed or rounded.
- `history-private.json`: authenticated, user-scoped SELECT of the 23 source
  items referenced by the captured maps, including original identities, skipped,
  planned/performed sets and parent-session relationships. No credentials read.
- `loaded-script-2.json` and `loaded-bundle.js`: actual executed source obtained
  through Hermes `Debugger.getScriptSource`, not a newly generated substitute.
- `offline-diagnostics.cjs`: network-free replay registering only the captured
  bundle's 3,619 Metro definitions in an isolated VM, then calling the same
  planner/projection and history adapter. It records each weekly validator's full
  declaration, generated input, result, issues and coverage in `offline-private.json`.
  Those internal validator returns are offline instrumentation; the live capture
  preserves the complete diagnostics emitted onto the returned session plans.

The complete plan and all four weeks compare exactly after replaying the captured
clock values for generated session IDs and creation timestamps. No prescribed
field or diagnostic is excluded from comparison. The history adapter reproduces
both the captured recent map and, by its first-entry relationship, the last map.
Original qualification metadata and identity relationships are retained locally.

The receipt records executed factory hashes for 94 training modules. A subsequent
source-map read has 94/94 original training sources matching the working tree.
The executed engine module itself includes the existing eligibility edit; its
original source SHA256 is
`3ba8cb793eb9da34a5d21ac14fd4ed65e5117776eb63adc76e72496cdf82dc48`.
The map is supplementary provenance; replay uses the actual executed bundle.
The working-tree edit was preserved and was not staged.

## First failing invariant and causal boundary

The underlying leg-press item has three planned sets, no performed sets,
`skipped=false`, and matching item/session identities. The adapter deliberately
retains this as `incomplete`, reason `incomplete_or_invalid_sets`, so recent
unperformed work interrupts progression rather than exposing older qualified work.
It is the first and only recent leg-press entry. The seed sets last to that same
entry; it does not fabricate performed sets or claim qualified evidence.

`isQualifiedPerformance` returns false. The allocated builder consequently does
not use this history to earn progression and emits unspecified zero load with
confirmation copy. Its per-day proposal has no hard error before weekly validation.

The first hard failure occurs in `weeklyProgrammeValidator.ts` at the
`numericHistory` predicate: a present history entry must have `sets.length > 0`.
The following `if (history && index === 0)` emits `invalid_load_evidence` when that
predicate fails, without distinguishing an explicitly incomplete barrier from
purported qualified load evidence. Friday's leg press therefore invalidates each
of the four weeks. `programmeWeekProposal` copies that whole-week error to every
day and marks all five daily proposals infeasible.

Offline causal control: removing only `lastSessionPerformance.leg_press` from the
validator profile, while retaining recent history and the identical declaration,
allocation and generated prescriptions, removes all hard validation errors.
Status becomes `unresolved`, not `valid`: other warnings remain. This is a
diagnostic intervention only, not a proposed history-filtering implementation.

The originating mismatch is validator interpretation of legitimate incomplete
history, not identity corruption or adapter construction. No claim is made about
why the historical exercise was unperformed. The existing engine eligibility
edit is present in the replay but does not create this failure.

## Minimum follow-up

Authorize a focused validator change distinguishing intentionally unqualified
history barriers from malformed evidence presented as qualified. Keep incomplete
entries in recent history and deny them progression credit. Cover the empty-set
barrier and malformed qualified numeric/identity cases with regression tests,
then rerun this exact local fixture. Do not erase or rewrite historical data.
Separate unresolved policy warnings still require their own decisions.

Stopped after root-cause diagnosis. Sanitized hashes and observations are in
`programme-exact-20261018.json`; screenshots, profile values, dates, raw IDs and
full history remain private. No source test suite was rerun for this evidence-only
change; the diagnostic replay and causal control are its verification.
