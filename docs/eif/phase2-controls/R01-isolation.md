# R01 repository-gate isolation — 2026-10-14

Baseline commit: `18d21abd86cf01433c82dcc7516bac91c677f155` on
`fix/training-confident-ux`. A detached worktree at `C:\Reclaim-R01-verify`
contained that commit plus only R01 wrapper, registry, evidence and N-0068
ledger/progress files. Its `app/` source and migration were unchanged from
baseline HEAD. `app/node_modules` was a junction to the existing installation.
The original working tree was not reset, cleaned or overwritten.

| Gate | Full working tree | Isolated R01 checkout |
|---|---|---|
| `npm run typecheck` | Exit 1: TS2304 `estimate1RM`, `TrainingSetupScreen.tsx:939` | Exit 0, no errors |
| `npm test -- --reporter=verbose` | Exit 1: 8 failed, 1082 passed (185 files) | Exit 1: 4 failed, 1081 passed (184 files), 259.97 s |

The working tree's removed `estimate1RM` import and remaining call are in
uncommitted `TrainingSetupScreen.tsx` changes, outside R01. The isolated
checkout shows this error does not arise from R01. Its four test failures
occur with committed app files: the `routineVolumeMeasurement` seed count
(31 versus 18), the `runSession` migration assertion (`uuid` versus expected
`text`), and two `weeklyVolumeModel` caps (15 versus 10; 6 versus 2).
The full working tree also fails the seed and two cap cases. Its uncommitted
migration fixes the `runSession` assertion, while five additional failures
appear in `balancedHypertrophy`, `experienceLevelLoads`, `smallMuscleVolume`,
`wednesdayPushShape`, and preview equivalence. None of those modules or the
migration is in the R01 change set.

The isolated typecheck output was:

```
> reclaim-app@0.1.0 typecheck
> tsc --noEmit
```

Full isolated Vitest output remains at
`C:\Reclaim-R01-verify\R01-isolated-vitest.txt` (exit 1). This comparison
isolates the failures; it does not turn a failing full-suite gate into a pass.
The final Python wrapper suite and waiver delta remain valid for unchanged
source/test hashes recorded in `R01-independent-review.md`. Dual-path and
catalogue checks previously passed on the full working tree. A scoped source
checkpoint can preserve verified R01 controls, while N-0068 completion remains
blocked by the full suite, pending operator scope acceptance, and a pushed
criterion-level packet plus review of the committed source.
