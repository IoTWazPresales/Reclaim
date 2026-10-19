# TrainingScreen weekly review status - 2026-10-19

Scoped correction on `fix/training-confident-ux`, based on `8786903`. Session
Preview implementation at `3a756a9` is unchanged. Only the weekly summary is
extended; no scientific rules, validator, prescriptions, live data, Android,
EIF acceptance or R12 work is included. Unrelated mixed-tree changes remain
excluded and preserved.

## Behaviour and data boundary

TrainingScreen retains the same active-programme proposals and frozen entries
used by its volume summary. A small weekly review component calls the existing
`weeklyProgrammeDiagnostics` selector on those entries, without revalidation.
Entries remain unavailable until the frozen query succeeds, so unknown historical
state cannot become current provisional validation.

Each returned weekly result shows its supplied valid, unresolved or invalid
status and severity counts once. Selector deduplication uses the existing
week/policy/strategy tuple after transport; every issue occurrence within the
selected result is counted, including identical repeated warnings. Unresolved
copy states that exercise weights may require confirmation and points to the
existing preview. No weight is fabricated and daily feasibility is not inferred.

Missing diagnostics, old programmes, unavailable queries and frozen-only weeks
are explicitly unavailable. Partially missing current proposals qualify the
known result as available diagnostics and also show missing-data wording.
Frozen/completed entries, including empty snapshots, are excluded from current
counts and have separate historical-prescription copy. Current volume strings
are displayed unchanged; their calculation and the preview's existing volume
prop are preserved. Start, day navigation and Session Preview are unchanged.

## Verification

Separate [source/UI review](weekly-review-review-20261019.md): both APPROVED.
Focused final run: 29 tests passed across three files (new component nine,
existing preview thirteen, existing transport seven), exit 0, 17.68 seconds.
Independent component checks: nine passed per reviewer. Typecheck: exit 0,
zero errors. Git Bash dual-path: 31 passed, zero failed. Catalogue QA: exit 0,
357 rows, zero governance issues. Wrapper: three passed, no ledger mutation.
The test timeout remains the repository's 30 seconds.

The initial combined focused runner stalled after the preview file; only its
identified owned process tree was stopped. The final completed retry above is
the pass. Local raw logs are excluded from publication.

Required full command `npm test -- --reporter=verbose`: exit 1; **1,458 passed /
4 failed**, 203 files (200 passed / three failed), duration 450.70 seconds.
This is a failing repository gate. The four failures exactly match the earlier
mixed-tree identities in the transport and preview evidence; no new assertion
failure appeared:

| File / assertion | Established observed failure |
| --- | --- |
| routineVolumeMeasurement, two-pass matrix | Expected 18 exercises, got 31 |
| smallMuscleVolume, advanced 50/50 leg day | Expected 3, got undefined |
| weeklyVolumeModel, tighter cap | Expected at most 10, got 15 |
| weeklyVolumeModel, later capped build/frozen snapshot | Expected at most 2, got 6 |

These tests, engine and route migration are unchanged by this correction. No
fresh clean-baseline full-suite run is claimed. As documented previously, the
committed baseline has a route-migration failure in place of the mixed-tree
small-muscle failure. Do not label either the full gate passing or these results
as a clean-baseline run. Commands, log hashes and results are recorded in the
[checks receipt](weekly-review-checks-20261019.json).

## Remaining Android visual requirements - UNABLE_TO_VERIFY

No Android/ADB/Metro/emulator action, reopening, screenshot capture, live read,
write, or session start was attempted. No policy-blocked operation was retried.
No ledger transition, acceptance or R12 operation occurred.

Once separately authorised, prove the loaded source and capture This Week for
valid/unresolved/invalid/unavailable and legacy cases. Inspect count readability,
wrapping and contrast on narrow screens and larger text; Prev/Next changes;
partial missing data and mixed/all-frozen states; historical/current wording;
weight-confirmation guidance; unchanged volume figures and day controls. Confirm
that existing Session Preview remains visually unchanged. Obtain a separate
actual-render review. Any live save/Start/frozen journey needs its own authorised
disposable scope. Source tests do not establish Android runtime acceptance.

Stop after committing and pushing this weekly summary correction. This report
is not visual approval, node acceptance or permission to ship.
