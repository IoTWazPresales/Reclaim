# Session preview programme warnings — 2026-10-18 / resumed 2026-10-19

Source checkpoint: `596ea1b`, branch `fix/training-confident-ux`.
Scope: preview presentation, focused synthetic component tests, and sanitised
source evidence. Unrelated engine, migration, ledger and other working-tree edits
are preserved and excluded from this commit. No scientific policy, saved
prescription, live data, session-start, EIF acceptance or R12 change.

## Presentation and identity

`SessionPreviewModal` consumes `plan.weeklyValidation` directly. It displays
valid, unresolved, invalid and unavailable diagnostics distinctly. Daily
feasibility and `assertStartableProgramme` remain unchanged; warning-only
results do not disable the existing Start button or change its handler.

`SessionPreviewProgrammeReview` separates week-level issues from the selected
day's issues. Exercise guidance matches the original `weekIndex`, `dayKey` and
`exerciseId`, and checks the original allocation `slotId` when supplied. Five
caller lines in TrainingScreen pass the selected saved calendar identity and
existing resolved allocation slots; no screen/calendar redesign or new plan
writer is introduced. Neither the validator nor a reconstruction of its result
is invoked.

Selected-day issues with unmatched exercise/slot identities stay in a separate
selected-day review, once. Ambiguous repeated exercise IDs are not assigned by
display order. Other days' exposure warnings do not appear on this day. Genuine
issue occurrences remain distinct, and the week result is not repeated per
exercise. No issue-count total is fabricated. Original severity, code, message,
provenance and location fields remain visible.

`load_requires_confirmation` replaces the exercise's load summary with required
weight confirmation, without presenting the unspecified external load as 0 kg.
`history_evidence_unverified` explains that incomplete or unsupported history
cannot justify automatic progression. A policy-only unresolved week does not
invent a load-confirmation requirement.

Legacy previews show unavailable weekly validation and retain existing load
formatting. The existing frozen projection removes current diagnostics; tests
render stored 55 kg prescriptions and empty frozen snapshots without current
warnings. No current validation is inferred for historical work.

## Verification

The [checks receipt](session-preview-warnings-checks-20261018.json) records exact
commands, outcomes and hashes of uncommitted local logs. The separate
[source/UI review](session-preview-warnings-review-20261018.md) distinguishes
source presentation review from actual Android acceptance.

- Final focused component run: 13 passed.
- Final focused component/transport/persistence/preview regression run: 41
  passed across four files.
- Typecheck: passed, zero errors.
- Git Bash dual-path audit: 31 passed, zero failed.
- Catalogue QA retry: 357 rows, zero governance issues; CLI test passed.
- Ledger-wrapper tests: 3 passed; no ledger mutation.
- Required full suite: **1,449 passed / 4 failed**, 202 files (199 passed /
  3 failed), exit 1, completed in 489.43 seconds. All four failures match the
  established mixed-tree assertions below; no new assertion failure appeared.
  The full-suite repository gate remains failing.

Initial full and combined-focused runners stalled and were stopped using their
identified owned process IDs. An initial catalogue runner reported a Vitest
thread-runner startup timeout; its successful assertion output did not make
that invocation a pass. Completed retries are reported separately. The 30-second
per-test budget was not shortened.

The full retry reproduces these four established **mixed working-tree** assertion
identities, already recorded in the transport evidence:

| Test | Established failure |
| --- | --- |
| `routineVolumeMeasurement.test.ts`, two-pass matrix | Expected 18 exercises, received 31 |
| `smallMuscleVolume.test.ts`, advanced 50/50 leg day | Expected 3, received undefined |
| `weeklyVolumeModel.test.ts`, tighter cap | Expected at most 10, received 15 |
| `weeklyVolumeModel.test.ts`, later capped build/frozen snapshot | Expected at most 2, received 6 |

These tests and the unrelated engine/migration edits are not part of the
correction. No fresh clean-baseline full-suite rerun is claimed; the prior
transport evidence separately distinguishes committed-baseline and mixed-tree
failure identities. A completed suite with these failures remains a failing
repository gate.

## Visual approval remains UNABLE_TO_VERIFY

Android, ADB, Metro, emulator actions, app reopening, screenshots, live reads and
writes, and actual session starts were not performed. Android visual acceptance
is pending until separately authorised, following the prior ANR and
policy-blocked attempt. Source rendering tests mock native presentation
primitives; they do not establish actual Android layout, scrolling, wrapping,
contrast, loaded-source identity or runtime acceptance.

Once separately authorised, verify the loaded source and capture the preview
for unresolved/valid/invalid/unavailable diagnostics, scroll through relevant
exercise warnings and separate week-level warnings, check repeated exposures
and required-weight wording, and obtain an independent actual-render review.
Any real Start/save/frozen-session journey needs its own authorised disposable
scope; the synthetic callback test performs no session/API operation.

This is a source-verified branch correction, not visual approval, EIF acceptance
or permission to ship. Stop after the scoped correction is committed and pushed.
