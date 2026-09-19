# A1 command baseline — 2026-09-19

**Branch:** `fix/training-confident-ux` @ `cf12b4d` (A0)  
**CWD:** `C:\Reclaim\app`  
**Evidence class:** executable observation (this session)

Raw logs: `docs/eif/baseline/*.txt`

## `npm run typecheck` — VERIFIED

Exit **0**. `tsc --noEmit` printed no diagnostics.

```text
> reclaim-app@0.1.0 typecheck
> tsc --noEmit
```

## `npm test -- --reporter=verbose` — VERIFIED

Exit **0**.

```text
 Test Files  123 passed (123)
      Tests  772 passed (772)
   Start at  10:19:51
   Duration  135.86s
```

PHASE_2 (652b92b) was 121 files / 764 tests. Delta is additional tests landed after that baseline, not a harness yet (harness added in A3).

## `npm run audit:training-dual-paths` (Git bash) — VERIFIED

Host: `C:\Program Files\Git\bin\bash.exe`. Exit **0**.

```text
=== Summary: 27 passed, 0 failed ===
Audit PASSED — no known dual-path violations.
```

Includes split-writer checks (`scheduler.ts` removed, `buildFourWeekPlan` only producer).

## `npm run med-catalog-qa` — VERIFIED

Exit **0**.

```text
Total merged rows: 357
Governance validation issues: 0
Confidence bands: <0.6: 0; 0.6–0.8: 333; ≥0.8: 24
```

## AVD at A1 (pre N-0010 rebuild)

`adb devices`: `emulator-5554` (`sdk_gphone16k_x86_64`, API 36) **device**.

Installed package `com.fissioncorporation.reclaim`:

- `versionName=1.0.4`
- `versionCode=8`
- `targetSdk=36`
- `pkgFlags` does **not** list `DEBUGGABLE` on this binary

Source `app/app.config.ts` is `1.0.5` / `versionCode: 15`. A2 must install a HEAD debug client; until then runtime claims are **UNABLE_TO_VERIFY**.
