# History seed count assertion correction - 2026-10-19

Scope: measurement test and this sanitized receipt only, on `fix/training-confident-ux`.
Base: `0c3ae6146911bfaf43d6ae4356d56dbe907da9e0`.

## Source findings

- `5849fa2` introduced the 18-ID seed. `3d61eae766f64daa60ea6c3f54c0762c220203b3` retained that prefix and deliberately appended 13 IDs. Its contemporaneous CONTEXT entry explicitly describes adding curls, triceps, raises and leg isolations to progression history. This is provenance, not a new endorsement or change of progression/scientific rules.
- Added IDs: `barbell_curl`, `dumbbell_curl`, `hammer_curl`, `tricep_pushdown`, `overhead_tricep_extension`, `rope_tricep_pushdown`, `cable_overhead_extension`, `lateral_raises`, `face_pulls`, `leg_curls`, `leg_extensions`, `calf_raises`, `seated_calf_raise`.
- Independent catalogue checks: 31 IDs, 31 distinct; all resolve exactly once in the 137-row `catalog/exercises.v1.json`. No missing or ambiguous ID.
- `77726c6d3ae31f85212503c8c21dee3cc626bac8` subsequently changed `loadTrainingPerformanceSeed` to default to every catalogue ID. The exported 31-ID list is now a historical measurement subset, not the production fetch limit. TrainingScreen calls the default; substitutions can request a specific exercise.
- The current loader deduplicates/sorts requested IDs and requests three recent sessions per exercise. `getRecentExercisePerformances` reads owned canonical session items, paginates at 500 rows, and delegates qualification to the history adapter. Missing/unavailable history stays explicit. All 31 IDs are supported; membership alone never qualifies evidence or earns progression.

## Correction

The imported seed is asserted to contain exactly 31 IDs, 31 unique IDs, and no IDs absent from the actual exercise catalogue. Fixed expected counts are independent of the imported list. Generated text now expects 31 and accurately calls this list a historical subset. No production, progression, prescription or unrelated test changes.

## Isolated verification

A temporary archive of the base commit was extracted outside the working tree, with the installed node_modules linked for dependencies. Only the corrected test was copied into that source archive; the preexisting uncommitted engine edit was excluded. The report writer ran exclusively there. Generated reports and raw logs are not included in this commit.

- Baseline: `npx vitest run src/lib/training/__tests__/routineVolumeMeasurement.test.ts --reporter=verbose` reproduced exactly one failure: expected 18, received 31.
- Corrected: `npx vitest run src/lib/training/__tests__/routineVolumeMeasurement.test.ts src/lib/training/__tests__/performanceHistoryApi.test.ts --reporter=verbose` passed both files, 7/7 tests. The affected measurement itself passed 1/1, including its existing scenario and volume assertions. API tests use mocks; no live reads or writes.
- Final `npm run typecheck` on the corrected isolated source: passed, exit 0, no TypeScript errors.
- `git diff --check` for the correction: passed.
- Copied test and working test matched byte-for-byte. SHA-256: `628530621b962201118edae43b5b78bac829946113696c91b517fd57b7f30a96`.
- All 13 preexisting content-modified tracked files captured in the preservation manifest retained their SHA-256 values, including engine, migration and generated baseline report. Existing unrelated changes remain unstaged.

## Separate source review

Independent reviewer `/root/source_review` inspected AGENTS.md, reviewer instructions, the exact test diff, seed list, catalogue, production loader/API and git history. It independently confirmed the counts, catalogue resolution and 18+13 provenance. Verdict: **APPROVE; no blocking findings**. It found the fixed count, uniqueness and catalogue assertions non-tautological, the report wording accurate, and production behavior unchanged. Review was read-only; it did not claim to run the primary agent's tests or typecheck.

No full-suite rerun, Android, live writes, EIF operations/acceptance, or R12. Stop after this scoped verification and publication.
