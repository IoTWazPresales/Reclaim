# Resolved D-P2-01 and v2 cap implementation - 2026-10-30

Baseline: `1e18694`, branch `fix/training-confident-ux`. New-build policy is
`weekly-20261030-v3` (cap rules v2). Original `weekly-20261014-v2` is retained
as the supported historical policy. No frozen, started or guided prescription
is rebuilt. No Android, live writes, migration, EIF acceptance or R12.

## Implemented contract

Qualified consecutive recent history newer than the per-exercise baseline edit
timestamp supplies the best-set Epley ceiling at target reps. A newer baseline
wins; no qualified history retains the baseline. Existing progression increments
remain unchanged. Qualification, units, identities and incomplete-history barriers
remain R06 rules. The entered baseline is never overwritten. Undated legacy
baselines yield to qualified timestamped history; invalid timestamp/ties keep the
baseline. A cleared baseline has no precedence timestamp, even if its old JSON
entry remains. Baseline edit time roundtrips through existing JSON, without a migration.

New builds enforce five sets per exercise, ten per session owner (heavy plus
follow-up), 24 working sets and the existing 60-minute estimate, plus tighter
explicit user priority/session/time caps. Direct small-muscle sets use the same
accounting. Default 25/15/10 priority ceilings and 120 total remain v1 replay
rules only. Withheld work produces `volume_cap_shortfall` diagnostics, forwarded
to weekly preview/review. Declared allocated requirements remain intact; the
validator reports unmet requirements rather than treating a capped day as full delivery.

Decisions 3 and 4 keep behavior: secondary involvement never offsets direct
prescriptions, and once/twice exposure preferences distribute weekly targets.
Regression tests cover compound secondary biceps work and direct curl dose.
The existing `ceil(weekly / exposures)` helper can round up non-divisible counts;
no general frequency-policy redesign or changed objective tables is included.

## Captured four-week profile replay

[Reproducer](replay-resolved-policy.cjs) executes the same private captured input
against pure training sources at baseline and current source. It hashes the private
capture and both source inventories; it publishes only exercise identifiers,
prescriptions and diagnostic counts. It asserts the input/baselines remain unchanged.
The capture stays outside the repository. [Full before/after rows and fingerprints](resolved-policy-replay-20261030.json).

| Week | Sets before -> after | Changed load (all three sets) | Warning counts before -> after | Confirmation change |
| --- | --- | --- | --- | --- |
| 1 | 68 -> 68 | Shrugs 20 -> 17 kg, 3 x 13 | 20 -> 20 (19 confirmation + 1 unverified history) | 19 -> 19; delta 0 |
| 2 | 68 -> 68 | Shrugs 20 -> 17 kg, 3 x 13 | 20 -> 20 (19 confirmation + 1 unverified history) | 19 -> 19; delta 0 |
| 3 | 68 -> 68 | Shrugs 20 -> 17 kg, 3 x 13 | 20 -> 20 (19 confirmation + 1 unverified history) | 19 -> 19; delta 0 |
| 4 | 68 -> 68 | Shrugs 20 -> 17 kg, 3 x 13 | 20 -> 20 (19 confirmation + 1 unverified history) | 19 -> 19; delta 0 |

All four weeks remain unresolved, with zero hard errors. Per-day working sets
stay 14 / 11 / 16 / 13 / 14; estimates stay 43 / 45 / 38 / 35 / 48 minutes.
Every other exercise load and rep target is unchanged. The history ceiling can
lower a previous uncapped suggestion as well as supersede an older lower baseline.

The separate synthetic bench regression is **60 -> 87.5 kg** at ten target reps
after qualified 80 / 82.5 / 85 kg x 12 sessions, with the existing +2.5 kg step.
This is a regression fixture, not an additional change in the captured profile.

## Source review and gates

[Separate source review](resolved-policy-source-review-20261030.md) reports no
remaining blockers after re-review. It did not claim independent runtime execution.

Focused gates before the final full run:

- Caps/allocation: **36 passed** across three files.
- History/independent validator: **161 passed** across two files, including the
  cleared-baseline timestamp regression.
- Typecheck: **exit 0**, no errors.
- Git Bash dual-path audit: **31 passed, 0 failed**.
- Catalogue QA: **exit 0**, 357 rows, zero governance issues. An earlier run
  printed its report but exited with a worker-startup error; it is retained
  separately and is not counted as a successful gate.
- Separate source review: no remaining blockers, including re-review of inferred
  compound ownership, cleared baselines and weekly shortfall transport.

Full-suite gate: the unsharded `npm test -- --reporter=verbose` attempt stalled
and is **INCOMPLETE**. It was stopped without changing the 30-second test budget.
The authorized alternative uses sequential canonical `--shard 1/4` through `4/4`
with `--reporter=verbose`. A second JSON reporter supplies the exact file inventory;
no test files, timeouts or production behavior are excluded by this method.

Earlier failed policy-era assertions and incomplete host-runner attempts are
retained under `resolved-policy-20261030/initial-run/` and
`resolved-policy-20261030/pre-clear-baseline-fix/`. They do not count as passing
results. Successful early shards were discarded when product source changed.
Stalled retries use the same canonical shard command, with no source or test
configuration change. Source fingerprints bind the final implementation/tests.

Final full-suite gate: **PASS ? 1,492 tests, 205/205 files, zero failures**.
All four shards exited 0. Combined inventory has no missing/extra/duplicate files.
The final source run executed shards sequentially without a test-timeout override.

| Shard | Files | Passed tests | Failed tests | Exit |
| --- | --- | --- | --- | --- |
| 1/4 | 52 | 312 | 0 | 0 |
| 2/4 | 51 | 371 | 0 | 0 |
| 3/4 | 51 | 489 | 0 | 0 |
| 4/4 | 51 | 320 | 0 | 0 |

[Exact final inventory](resolved-policy-20261030/inventory.json) and
[final scoped source/test hashes](resolved-policy-20261030/source-sha256.json).

Published logs normalize workspace paths, line endings and trailing whitespace.

[Sanitized command outputs, source hashes and inventory](resolved-policy-20261030/).

Android approval remains pending in `docs/eif/AWAITING_APPROVAL.md`; no render
or device journey was attempted because this task expressly excludes Android.
