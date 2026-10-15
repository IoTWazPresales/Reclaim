# R08 substitution - source checkpoint, 2026-10-15

R08 only on `fix/training-confident-ux`, based on HEAD `9c3c179`. Existing uncommitted replacement edits were resumed. Committed R03 eligibility and R06 performance contracts remain authorities. No prior investigation or EIF lease repair was repeated. No live session/database was changed, no scientific constants introduced, and no R09 or other recovery task started. N-0070 remains open.

## Changes and criterion evidence

- Actual catalogue candidates reapply R03 equipment, injury, forbidden movement, dislike and slot-specific skill rules. Filtering precedes the dialog limit; eligible catalogue fallback avoids a stale ranked list hiding all feasible alternatives. The dialog reads the current saved profile and confirmation fetches it again; old session context cannot bypass current restrictions. No profile means no alternatives.
- Replacement reps/duration and rest use existing engine functions and exercise overrides. Frozen slot set count and indices stay. Only the replacement own baseline or qualified R06 history can calibrate load; cross-exercise anchors are removed. Bodyweight means zero external kg; unsupported assistance/units or absent calibration show an enter-load explanation, not old kg/reps. The R06 unavailable/missing distinction and qualification survive into prescription.
- The persisted replacement trace records session scope, original exercise and planned snapshot, timestamp, calibration, units and explanation. No programme/day override is written. Old exercise adjustment overlays and warmups are not copied. Reload uses persisted identity/targets, not a local optimistic identity override.
- Performed/partly performed, skipped/ended, existing log and pending offline item work blocks replacement. The API verifies ownership and unchanged original identity/plan; an item compare-and-swap rejects concurrent performed, plan, skip or replacement changes. Query-cache publication follows successful persistence; failures retain the old item.
- Canonical Done remains `applySetCompletion` and `training_session_items.performed.sets`. A shared per-item lock serializes substitution and canonical Done in one runtime. Log/merge identity checks refuse stale exercise work. New offline Done payloads retain exercise identity. Unidentified legacy replay against a replacement is blocked, and failed merges retain queued operations instead of declaring sync success.

Detailed contract: `docs/training/recovery/R08-substitution-contract.md`. Tests use synthetic records, including barbell-to-dumbbell, machine-to-bodyweight, exercise-specific 21s/time holds, restrictions, one/three completed sets, write rejection, reload, stale Done, offline work and compare-and-swap.

## Verification and isolation

The 18 source/test paths in `source-manifest.json` were materialized from the Git index into detached checkout `C:/Reclaim-R08-verify-20261015` on the baseline above. Installed dependencies are reused via a junction. Existing uncommitted generic-engine eligibility, frozen-week API/projection/UI, TrainingScreen snapshot, migration, data/report, release and EIF ledger changes remain unstaged and preserved. Only the R08 API and engine hunks were staged in shared files. No protected runtime internals were accessed.

Initial focused mistakes were fixture ID/reader signature/test shape issues and are corrected. The final main focused run before the last legacy-replay regression passed 94/94. A reviewer run during that final copy loaded mixed versions and failed the new regression; that invalidated run is superseded by the frozen-source pass below. No product source changed during final independent verification.

Independent reviewer `/root/r08_review`, a separate agent context with the same model, challenged the implementation and re-executed 95 focused tests plus five reviewer-authored exhaustive/adversarial catalogue probes. All 18 isolated SHA-256 entries match. A further fresh-context verifier was configured/requested as `gpt-6.1-sol` (high effort); its separate run passes all 29 new R08 tests and independently matches all 18 committed and isolated source hashes. Runtime model identity is not independently observable, so configured identity is recorded without a stronger guarantee. These reviews do not confer human or EIF acceptance. Details: `review.md`, `model-verification.md`, both source receipts and retained focused/probe logs.

## Required checks

| Check | Result |
|---|---|
| Final isolated independent focused | 8 files / 95 tests pass |
| Reviewer-authored isolated probes | 5/5 pass |
| Additional configured-model fresh-context verification | 3 new files / 29 tests pass; all 18 committed/isolated hashes match |
| Isolated typecheck | exit 0 |
| Mixed-worktree typecheck | exit 0 |
| Git Bash dual-path | 31/31 pass |
| Catalogue QA | 357 rows / 0 governance issues; CLI test passes |
| Canonical isolated full suite | 196 files / 1,324 cases: 1,320 pass / 4 established baseline failures, exit 1, 358.55s |
| Public wrapper tests | 1 pass / 2 existing LEASE_NOT_OWNER failures |
| Manifest and whitespace | 18 source hashes independently match; staged whitespace check clean |

The full suite is **not green**. Its four failing assertions match the committed R07 isolated baseline exactly after stripping timing suffixes; no new R08 failure occurred. The failures are the routine-volume measurement assertion, two weekly-volume cap assertions, and the historical run-route migration assertion. `full-suite-summary.json` records the raw log SHA-256, normalized baseline comparison, counts and command. Bulk logs remain local; `log-hashes.json` fingerprints other final gate logs. All 18 isolated source hashes still match after the full run.

## Outstanding limitations and governance

The row compare-and-swap and local lock are not a transaction spanning separate devices. A log insertion or session end from another runtime can interleave with substitution. Strong distributed atomicity requires an approved database transaction/schema change; none was added or deployed. A legacy queued insert without an exercise identity can also insert an unlabelled set-log row before its merge is refused; the queue remains blocked and original performed identity is protected. Do not infer side-effect-free legacy rejection from the merge guard. These limitations remain open, not silently accepted.

Read-only `adb devices` returned no devices. Renders and Android/watch journeys are UNABLE_TO_VERIFY here; R11 owns confirmation. `human-check.md` provides synthetic-account steps. Manual notes in HUMAN_CHECKS/AWAITING_APPROVAL are explicitly unregistered. No shipping or visual approval is claimed.

EIF evidence attachment remains blocked by established `LEASE_NOT_OWNER: R20261014R03`. Required wrapper tests reproduce the same owner error. No status/lease/evidence/acceptance/complete mutation, ownership bypass or repeated investigation was attempted. No EIF evidence ID or N-0070 acceptance exists. Source/evidence publication is a scoped branch checkpoint only. Stop after R08.

## Source publication

Source/evidence checkpoint `3de2a5b8d5fcec9d9ce8cbf02ce18b303d9f067c` is pushed and remote-verified on `fix/training-confident-ux`. All 18 committed source blobs match the independently reviewed isolated hashes. `push-receipt.json` records this source publication; it is not EIF attachment or acceptance. Final publication receipt/verification documentation is a separate evidence-only commit.
