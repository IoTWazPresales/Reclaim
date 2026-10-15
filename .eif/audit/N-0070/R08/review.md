# R08 independent implementation review

Reviewer: separate delegated context, same inherited model, no product-code edits.
Modes: implementation verification and evidence-skeptic review. This is a second
review path, not an independent-model review. Scope is R08 only; N-0070 acceptance
and Android journeys are not asserted.

## Findings

1. **MAJOR, initial implementation; corrected within local runtime:** replacement's
   read of set logs was separate from its planned/performed compare-and-swap.
   `applySetCompletion` writes a set log before canonical performed merge. A Done
   operation arriving between those stages could leave the old exercise's set
   under a replacement identity. A component-local `loggingInFlight` reference
   does not coordinate phone/watch/offline paths, and a Done tap could begin
   while replacement persistence was awaiting the network. Reported to implementer
   before final validation. Final source adds shared local serialization around
   canonical `applySetCompletion` and replacement, stale exercise guards on log
   insert and performed merge, and preserved queued exercise identity. The final
   focused tests exercise serialization, completed-set compare-and-swap rejection,
   stale log rejection and canonical merge identity rejection. Remote concurrent
   requests remain outside the protection of this runtime-local lock.

2. **Residual limitation:** no client-side serialization can make the separate
   log insert, session state read, and replacement update atomic against another
   device/process. No approved schema migration is in R08 scope. This must remain
   an outstanding issue; do not claim N-0070 acceptance or fully proven distributed
   completion/replacement atomicity.

3. **MINOR robustness observation, corrected:** initial adapter considered qualified last
   history sufficient to label a replacement calibrated; the engine can still
   reject it if the accompanying recent history disagrees. In that synthetic
   inconsistent-input case, absent a baseline, `suggestLoading` falls through to
   existing population defaults. The actual fresh seed builds matching maps, so
   this is not a reproduced production failure. Implementer added an actual
   `deriveProgressionDecision` qualification check before calling it calibrated.

4. **MAJOR offline identity gap in existing contract, corrected:**
   `buildSetLogQueuePayload` accepts an exercise ID but originally omits it from
   its return value; the offline schema and replay insert likewise omit it.
   Final source preserves optional exercise identity in new queue operations and
   passes it to replay insert and each merge branch. Failed replay merge returns
   `blocked`, retaining the operation. A legacy operation with no identity is
   rejected when the target item records replacement provenance. Replacement
   explicitly uses the added strict queue read, rejecting unavailable/corrupt
   signed-in storage rather than treating it as no completed work. Legacy queue
   entries remain compatible for unreplaced items.

## Independently re-executed evidence

Command, from `app/`:

```
npx vitest run --config ../.eif/audit/N-0070/R08/reviewer-vitest.config.ts --reporter=verbose
```

Initial observation: 4/4 reviewer-authored tests pass, 2.49 seconds. Output is
`reviewer-probes.txt`. These tests independently enumerate catalogue originals,
assert every offered alternative passes shared hard constraints, check disliked
and injured candidates, generate replacement-specific targets without copying
sentinel original kg/reps, preserve original planned input, retain session-only
scope and exercise load modes, reject even a single recorded zero-rep set, and
refuse calibration from another exercise's baseline. A fifth final probe checks
the corrected mismatched last/recent history calibration case. Final isolated
reviewer-probe rerun passes **5/5**, 7.60 seconds; output is
`reviewer-probes-final.txt`. Its audit config points imports and aliases at the
isolated staged checkout.

Final frozen-source verification uses the isolated staged checkout
`C:/Reclaim-R08-verify-20261015`, excluding unrelated workspace changes. The
independent full focused rerun passes **8 files / 95 tests**, 19.77 seconds:
`reviewer-focused-final.txt`. Tested files are `exerciseSubstitution`,
`exerciseSubstitutionPersistence`, `substitutionCompletionIdentity`,
`applySetCompletion`, `exerciseEligibility`, `performanceHistory`,
`performanceHistoryApi`, and runtime `payloadBuilder`.

The first isolated run (`reviewer-focused.txt`) loaded the merge module before
the implementer copied a final correction and the new test afterward: 94 passed
and one failed. That mixed-version run is invalidated, retained for transparency,
and superseded by the frozen-source 95/95 pass. No source changed during the
final successful rerun.

`python .eif/audit/N-0070/R08/reviewer-hashes.py` independently verifies all
**18/18** isolated SHA-256 source pointers in `source-manifest.json`, zero
mismatches. Receipt: `reviewer-source-receipt.json`. This establishes which
isolated bytes were reviewed, not commit publication or node acceptance.

Source inspection confirms the dialog offers only session scope and fails closed
without eligibility context. Final UI obtains the current saved training profile
on opening the dialog and fetches it again before replacement confirmation;
earlier session snapshots are not required. The session UI displays the persisted progression/calibration
reason via the existing focus card. No scientific constants or new plan writer
were introduced in reviewed R08 changes.

## Limits and governance

Initial inspection operated on the working tree with known unrelated changes
preserved; final execution uses the isolated staged source. Tests use synthetic
records only; no live data or runtime internals were
read or modified. Android visual/journey confirmation belongs to R11 and is not
proven here. Known EIF attachment blocker `LEASE_NOT_OWNER: R20261014R03` was
accepted as supplied; the reviewer did not re-investigate or mutate EIF state.
Result: **VERIFIED_WITH_LIMITATIONS** for the reviewed R08 source and the focused
synthetic acceptance coverage. Distributed replacement/completion atomicity,
Android runtime confirmation, and independent-model verification remain
unproven. Required whole-repository gates and commit/push receipts are owned by
the parent executor and must be reported separately.
