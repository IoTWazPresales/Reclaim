# N-0024 — harness caps and CI test command

Status: source-validated. The volume harness now fails if a measured new-plan session exceeds the written `volumeCaps`: 25 primary, 15 accessory, 10 isolation, and 120 sets in that session. It does not hard-assert a sets/muscle/week band. The audit's 10–20 sentence remains an example. CI's unit-test step is `npm test` (`vitest run`) on `main`, `reclaim/canonical-recovery-clean`, and `fix/training-confident-ux`. This does not make the routine scientifically correct.

Executor: Grok 4.7.

## What is asserted

| Check | Source of the number | Harness |
|---|---|---|
| Primary sets in one session ≤ 25 | `rules.v1.json` `volumeCaps.perIntent.primary` | `expect(capBreaches).toEqual([])` |
| Accessory sets in one session ≤ 15 | `volumeCaps.perIntent.accessory` | same |
| Isolation sets in one session ≤ 10 | `volumeCaps.perIntent.isolation` | same |
| Sets in one session ≤ 120 | `volumeCaps.perSession.total` | same |
| Weeks 1 and 4 fingerprints match | existing clone measurement | unchanged |
| Seed length 18 | existing seed list | unchanged |

The 100-scenario report was rewritten by the same test and its content did not change. No muscle/week minimum or maximum was added.

## CI

`.github/workflows/ci.yml` unit tests now run `npm test` from `app/`. That script is `vitest run`. The previous step was `npx vitest run --passWithNoTests`. The workflow also runs on `fix/training-confident-ux`, which is the programme branch. A GitHub Actions run was not observed from this machine.

## Proof

- Focused: `routineVolumeMeasurement.test.ts` 1/1.
- `npm run typecheck`: 0 errors.
- Default full Vitest: 161 files, 997 passed / 1003 tests, 488.03s. Six failures were 5-second timeouts in Health Connect permission use, `smallModuleMirrors.read`, `syncMetadataRepository`, two mood replay tests, and `MedDoseOfflineQueue.restore`. No assertion failed. That default run is N-0052. A concurrent Vitest then stalled this retry; it was stopped and the retry was run alone.
- Full retry, `--testTimeout=30000`: 161 files / 1003 tests PASS in 423.28s.

Do not treat the session caps as a weekly muscle budget. Do not mark the node complete from a GitHub Actions run that was not observed.
