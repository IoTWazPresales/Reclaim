# N-0021 — one program-day session builder

Status: source-validated. The generator is unchanged. Weeks 1–4 are still copies, there is still no weekly set budget, accessories can still occupy compound slots, and progression history still covers 18 lifts. `docs/training/ROUTINE_AUDIT.md` remains the evidence for that. This node does not make the routine scientifically correct. N-0022, N-0011, N-0023, and N-0024 own those changes.

Executor for this node: Grok 4.7. `CLAUDE.md` asks for the strongest available model on N-0021. This continuation was run on the model in the session.

## Contract

Product code builds a session from a program day only through `buildProgramDaySession`. That function delegates to `buildSessionFromProgramDay` with the same arguments. The dual-path audit fails if any other product file names the engine function. Tests may still call the engine.

`materializePlannedSessionItems` is what `TrainingScreen` writes at start. It copies the confirmed plan. A later plan does not replace items when `startedAt` is set, or when a guided session already has stored items. An empty started session is not backfilled from a new plan. A session that has not started takes the new plan.

User swap of an exercise in an open session still updates that item. That is not a generator rebuild.

## Measurement

`routineVolumeMeasurement.test.ts` now calls the wrapper. `docs/training/ROUTINE_VOLUME_BASELINE.md` changed only the path header. Week fingerprints, seed share, and the weekly sets line numbers are the same remeasure as N-0020.

## Proof

- Focused: `buildProgramDaySession.test.ts`, preview, program-quality golden, and the volume harness, 34/34.
- `npm run typecheck`: 0 errors.
- Git Bash dual-path audit: 29/29.
- Catalogue QA: 357 rows, 0 governance issues.
- Default full Vitest: 158 files, 988 passed / 990 tests. Two failures were 5-second timeouts in `smallModuleMirrors.read` (`dedupes duplicate local_id rows`) and `moodService.deviceFirst` (`replayAllPendingMoodCheckinsForSync`). That default run is not a pass. It is N-0052.
- Full retry, default pool, `--testTimeout=30000`: 158 files / 990 tests PASS in 362.92s.

No device capture. The planned-set snapshot is not a new screen. Gym observations from the 2026-09-29 production APK are in `GYM_20260929_PRODUCTION_APK.md` and are not closed by these tests.
