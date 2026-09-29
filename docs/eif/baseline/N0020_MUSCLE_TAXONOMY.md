# N-0020 — canonical muscle taxonomy

Status: source-validated. The weekly sets line is visible in session preview and was not captured on device. Do not mark this node complete from source tests.

## Display mapping

`formatWeeklyMuscleSetLine` still adds one count per primary tag. It no longer keeps a private map. `muscleVolumeBucket` in `muscleTaxonomy.ts` supplies the six labels Chest, Back, Shoulders, Arms, Legs, and Core. Unknown tags and the two non-regional tags add nothing.

Catalogue strings are unchanged. `computeWeeklyMuscleSessionCounts` still keys the isolation bump by the raw primary tag. Fractional unique sets per muscle stay with N-0011.

Grouping is display-only. It is not a weekly set target. Context: `docs/training/ROUTINE_AUDIT.md` RA-008 and RA-021, and the catalogue snapshot. `ROUTINE_AUDIT.md` still describes the pre-fix private map; the remeasured `docs/training/ROUTINE_VOLUME_BASELINE.md` is the current display measurement.

| Tag | Bucket |
|---|---|
| pectorals, lower_pectorals, upper_pectorals, serratus_anterior | Chest |
| lats, rhomboids, middle_traps, mid_traps, traps, upper_traps, upper_back, erector_spinae | Back |
| anterior_deltoids, lateral_deltoids, rear_deltoids, posterior_deltoids, shoulders | Shoulders |
| biceps, triceps, brachialis, forearms | Arms |
| quadriceps, quads, hamstrings, glutes, calves, adductors, hip_adductors, hip_abductors, hip_flexors, legs | Legs |
| core, rectus_abdominis, obliques, transverse_abdominis, abs | Core |
| cardiovascular | none (conditioning) |
| full_body | none (whole-session) |

`mid_traps`, `posterior_deltoids`, and `abs` are historical names from the old map. They are not catalogue tokens. `quads`, `serratus_anterior`, `upper_back`, and `upper_traps` are catalogue secondaries, so they do not change the primary-only line unless an exercise lists them as primary.

## Before / after (primary-tag sum, same plans)

`muscle|2d|full gym|once` week-1 line:

- Before: Chest 3 · Back 42 · Shoulders 21 · Arms 20 · Legs 24 · Core 2
- After: Chest 3 · Back 56 · Shoulders 27 · Arms 20 · Legs 24 · Core 6

The harness now reports Core omitted in **0/100** scenarios. The previous measurement was **23/100**. Fractional per-muscle lines, seed share (35.7%), and week fingerprints (100/100) did not change. Two primaries that share a bucket still add twice. That inflation is the existing line rule; N-0011 owns a fractional model.

## Proof

- Focused: `muscleTaxonomy.test.ts` plus `routineVolumeMeasurement.test.ts`, 7/7.
- `npm run typecheck`: 0 errors.
- Git Bash dual-path audit: 27/27.
- Catalogue QA: 357 rows, 0 governance issues.
- Default full Vitest: 157 files, 983 passed / 985 tests. Two failures were 5-second timeouts in `readCacheRepository` and `syncMetadataRepository` (N-0052). That default run is not a pass.
- Isolated fork-pool retry of those two files with a 30-second allowance: 4/4 in 7.97s. One of the previously timed-out cases finished in 5018ms under an earlier 30-second run.
- Full retry, default pool, `--testTimeout=30000`: 157 files / 985 tests PASS in 290.15s.

Device steps are in `N0020_DEVICE_CHECK.md`. The emulator was on Home. UI dump could not get an idle state, so the session-preview line was not opened. No visual pass is claimed.
