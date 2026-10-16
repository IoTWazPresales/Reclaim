# R09 source integration — 2026-10-16 (resumed from 2026-10-15)

R09 only on `fix/training-confident-ux`, baseline `733749c`. Existing uncommitted
R09 API, saved-allocation and TrainingScreen edits were resumed. R02–R08 remain
the policy/eligibility/history/adjustment/substitution authorities. No R10 or
another recovery task was started. No policy constants, schema migration, live
data, historical sessions or canonical calendar/completion interfaces changed.

## Implementation and N-0070 criterion evidence

- C1/C5: `buildFourWeekPlan` stores a versioned weekly snapshot and normalized
  input in existing programme JSON. The shared `programmeWeekProposal` projects
  saved allocations through the canonical day builder and R05 validation. Setup
  preview, setup confirmation and TrainingScreen use it. Approved legacy weekly
  count/variety coordination is centralized, preserving its prior semantics.
- C5: Saved days resolve explicit week/day identity, including reordered weeks,
  without using display labels as allocation identity. Missing allocation,
  unsupported version, missing compiled context and changed dose become
  infeasible. Setup rejects invalid proposals before replacing saved profile or
  programme. Start handlers/mutations and materialization reject infeasibility.
- C2/C3/C5: New items are deep snapshots; started/guided items remain stored
  truth. The named five-day source fixture follows setup → weekly programme →
  saved plan/calendar rows → session materialization → canonical performed merge
  → qualified R06 history → reload → future proposal. It asserts original plans,
  recorded work and R07 effective next-set targets. The existing guidance readers
  and canonical completion path are unchanged.
- C5: The owned parent-session read retains empty started and guided stored
  snapshots. Weekly text separates Completed, Frozen planned and Provisional
  future muscle sets. Errors remain unavailable. Infeasible future days need
  review and do not contribute valid workout totals. Start/complete/minimize and
  both existing alert end/delete routes refresh the frozen summary.
- C4 remains the committed R08 contract; R09 does not expand substitution or
  claim its unresolved distributed transaction limitation is solved.

The summary covers the latest saved attempt per programme day, selected by
created time/ID. It is muscle sets by known primary-region catalogue mappings,
not all repeated attempts or run duration. Full frozen planned volume includes
already completed sets; it is not remaining volume. These distinctions are
deliberate, not additional scientific rules.

Contract: `docs/training/recovery/R09-weekly-persistence-contract.md`.

## Verification and isolation

Ten R09 source/test files are overlaid on a committed export at
`C:/Reclaim/.tmp/R09-verify`; installed dependencies are reused through a junction.
The unrelated generic-engine eligibility change, migration, data/release/audit
reports, CLI state and EIF ledger/view edits remain excluded and preserved.
`source-manifest.json` records exact tested hashes. No EIF runtime internals
were read or changed. Independent reviewers challenge the isolated source and
compare all ten hashes; their reports record the measured independence and
runtime/model limitations rather than claiming human approval.

Initial source checks exposed and corrected real regressions: legacy weekly
coordination was missing, implicit/explicit strength produced different raw
input metadata, and four alert routes missed frozen-summary invalidation. Initial
setup contract failures came from comparing the old standalone helper to the
new confirmed weekly entry; the fixture now calls actual shared confirmation.
Superseded logs are retained locally and are not represented as final results.

Final check results are recorded in `gate-results.json` and
`full-suite-summary.json`. The full suite must be assessed against the four
committed R08 baseline assertions rather than described as green. The final required wrapper run returns 1 pass / 2 existing
`LEASE_NOT_OWNER: R20261014R03` failures. An earlier sandbox run skipped all
three tests, and a resumed sandbox run failed on runtime access; the required
unsandboxed retry reproduced the known owner conflict. These are operational
restrictions, not application regressions or EIF acceptance.

## Governance and runtime limitations

The established `LEASE_NOT_OWNER: R20261014R03` blocker is carried forward without
ownership investigation, ownership repair or bypass. Outside the required wrapper tests (public status and dry-run lease), no
lease/status/evidence/queue/complete action was attempted, no EIF evidence ID exists, and N-0070 stays
open. Committing/pushing these scoped files is a branch source/evidence checkpoint,
not accepted-node completion or shipping permission.

Read-only `adb devices` returned no devices. No AVD render or Android/watch/live
persistence journey was executed; visual/runtime acceptance is UNABLE_TO_VERIFY
and remains R11's responsibility. `human-check.md` records synthetic-account
steps; manual HUMAN_CHECKS/AWAITING_APPROVAL entries are explicitly unregistered.
No device acceptance is inferred from source tests. Stop after R09.

## Final checks

| Check | Result |
|---|---|
| Independent focused integration + training mode | 6 files / 49 passed |
| Reviewer-authored API/adversarial probes | 2 files / 10 passed |
| Additional fresh-context focused / own samples | 29 passed / 7 passed |
| Final isolated and mixed typechecks | exit 0 / exit 0 |
| Final Git Bash dual-path | 31 passed / 0 failed |
| Catalogue QA | 357 rows / 0 governance issues; CLI check passes |
| Full suite | 197 files / 1,330 cases: 1,326 passed / 4 established baseline assertions failed |
| Required public-wrapper tests | 1 passed / 2 known owner failures |
| Source receipt | 10 raw hashes independently match; index blobs match tested source after CRLF→LF only |

The four full-suite failures are the routine-volume measurement assertion, two
weekly-volume cap assertions and the historical run-route migration assertion.
Their identities match the committed R08 baseline after removing timing suffixes;
`full-suite-summary.json` records zero new assertion failures. The suite is not
green. Initial mode metadata/type errors were corrected and final tests rerun.
Bulk logs remain local and are fingerprinted by `log-hashes.json`.

Arbitrarily malformed persisted JSON (for example a non-string strategyId) can
still throw during projection rather than render an infeasibility explanation.
The reviewed typed snapshot/reference failure cases fail closed; this is not a
claim of a comprehensive decoder for corrupted payloads. Such an exception does
not produce a valid workout. See the independent model review for this limitation.

## Publication

Source/evidence checkpoint `df38eba9dbd9636039d2c4b6bdb59085f11a42f4` is pushed
and remote-verified on `fix/training-confident-ux`. All ten committed source blobs
match independently tested bytes after CRLF→LF normalization only; exact raw and
canonical hashes are retained. See `committed-source-receipt.json` and
`push-receipt.json`. The final receipt and resume note are an evidence-only
follow-up commit. N-0070 remains open; this is not EIF attachment, acceptance or
shipping approval. Stop after R09.
