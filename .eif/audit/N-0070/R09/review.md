# R09 independent integration review

Status: **VERIFIED_WITH_LIMITATIONS** for final scoped source integration.
No remaining reproduced R09 regression in independently executed coverage.
This is not node acceptance, Android acceptance, or a claim that required
full-suite baseline failures pass.

Reviewer is a separate delegated context using the same inherited model. The
reviewer did not edit production source, mutate EIF, investigate ownership, or
read/change live data. This is independent execution/review, not a different-model
assessment. Scope is R09 only.

## Findings

1. Initial saved allocation resolution silently fell back to label-based legacy
   generation when a versioned allocation was missing. Corrected source resolves
   explicit weekIndex/day_index identity, supports reordered week arrays and
   rejects unsupported/missing policy or day identity. Reviewer probes pass.
2. Initial frozen read used child items and could not represent an empty started
   session. Corrected owned parent-session read keeps empty started snapshots and
   guided persisted snapshots. It deterministically uses latest created_at/id
   attempt per saved programme day. This is not an aggregate of repeated attempts.
3. Initial weekly summary combined frozen and provisional prescriptions. Corrected
   projection separates completed canonical performed indices, frozen planned
   sets and provisional future sets. Infeasible future proposals are excluded
   and flagged. This is muscle-set accounting, not running-duration accounting.
4. New whole-week adapter initially bypassed R05 when compilation was absent on
   a versioned saved plan. Corrected source marks such proposals infeasible.
   Reviewer probes also reject a saved changed repetition prescription.
5. **Reproduced regression, corrected:** the initial shared adapter dropped existing
   legacy weeklyMuscleSessionCounts coordination. A three-day once-frequency
   strength programme changes prescribed sets compared with the existing
   TrainingScreen two-pass contract. The expanded reviewer regression test
   reconstructs the existing first-pass counts and second-pass accumulated
   avoidExerciseIds. Final adapter centralizes that existing coordination for
   legacy policies and keeps allocated identity for balanced versioned policies.
   Expanded legacy goal/day/frequency comparison now passes. Initial failure
   evidence is retained in reviewer-probes-legacy-regression.txt; it was not
   waived as baseline.
6. Reviewed final normalization and invalidation corrections: programme input
   constraints contain supported injuries/forbiddenMovements/preferences only;
   resolved trainingMode remains top-level. Implicit/unknown and explicit strength
   equality passes. Four End/save and Cancel/delete branches now invalidate
   frozen-week data alongside existing session queries.

## Independently re-executed final evidence

Frozen checkout: `C:/Reclaim/.tmp/R09-verify`, exported from committed baseline
`733749c3cd8b6d45fcfab3847bbd70ac3e07a8d8` plus exactly the ten R09 manifest
source paths. Unrelated working engine, migration and other changes are excluded.

- **6 files / 49 tests pass**, 21.30 seconds: programmePersistence.integration,
  preview setupContract, buildProgramDaySession, weeklyProgrammeAllocation,
  scheduleGuidedTrainingNextSetFromDb, and trainingMode. Output:
  reviewer-focused-final.txt.
- **2 reviewer-authored files / 10 tests pass**, 15.50 seconds. They cover all
  twenty saved days versus setup previews,
  translated labels, reordered week arrays, malformed allocation identity,
  empty frozen sessions, immutable stored prescriptions, infeasible summary,
  owned API reads, latest guided/empty snapshots, explicit database failure,
  authentication, missing whole-week context, tampered reps and the expanded
  legacy goal/day/frequency matrix. Output: reviewer-probes.txt. Sources:
  reviewer-probes.test.ts and reviewer-api.test.ts via reviewer-vitest.config.ts.
- **10/10 source pointers match, zero mismatches**, independently checked before
  and after final execution against isolated and live bytes. Receipt:
  reviewer-source-receipt.json via reviewer-hashes.py. Exact raw hashes are
  preserved; canonical_lf_sha256 supports index/commit comparison where Git
  normalizes CRLF. This receipt establishes tested bytes, not publication.

The named synthetic five-day production-source fixture was inspected and executed:
setup to JSON saved
plan to canonical materialization to performed merge to qualified R06 history
seed to reload/new future proposal, preserving stored planned items and using
R07 effective notification targets. Its assertions pass in the final 49-test run.

Earlier live/frozen runs are retained with live/superseded suffixes and do not
substitute for final evidence. The initial full-suite log was independently
inspected: four established R08 baseline assertions plus the new trainingMode
equality regression. The final focused mode test verifies its correction.
Final required full-suite and repository check outcomes are reported separately
by the executor and must retain any baseline failures.

## Limits

No Android/AVD/Wear runtime acceptance is asserted. R11 owns actual runtime
journeys. The summary covers latest frozen attempt per programme day and muscle
sets; it does not aggregate repeated attempts or running minutes. Unknown
catalogue exercises cannot receive muscle buckets in this projection.
Known EIF lease ownership conflict remains untouched and blocks formal
evidence attachment/acceptance; this report is branch evidence only. N-0070 must
remain open. Required full-suite and repository checks must be evaluated against
the established baseline, including the four assertions listed in the R08
full-suite-summary.json, without converting known failures into a passed gate.

No production edits, historical rewrites, schema changes, scientific quantities,
calendar/completion authority changes or R10 work were performed by this reviewer.
