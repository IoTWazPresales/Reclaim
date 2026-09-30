# N-0039 — session calorie source of truth

Status: source-validated. A finished session reads Health Connect active calories for its own window, stores provenance, and reads that window again. The stored grain is the session total. Per-set calories were not invented. A live watch-sync was not run.

Executor: Grok 4.7.

## Hypothesis rank

| Id | Claim | Result |
|---|---|---|
| (a) | Active calories are never requested | False for the finish path. Session start requests `ActiveCaloriesBurned` read together with the exercise-session write. |
| (b) | The watch syncs into Health Connect after the session ends | Not disproven here. No watch was worn in this session. A single read at finish can miss records that land later. |
| (c) | The app never reads the session window | False. `healthConnectGetActiveEnergyForSessionWindow` reads `ActiveCaloriesBurned` for the start/end interval and prorates overlap. |
| (d) | The app reads once and never reads again | Was true. Close enrichment read once inside the close timeout and did not store a read time. |

## Summary fields

These are keys on the session `summary` JSON. No column was added.

| Key | Meaning |
|---|---|
| `activeCaloriesKcal` | Prorated Health Connect active-calorie total for the session window. A later read replaces it only when that later total is greater, or when no positive total is stored. A later empty or smaller read does not wipe a larger one. |
| `energySource` | `health_connect` when the stored total came from that read. |
| `energyWindow` | `{ start, end }` of the session. A read for a different window is ignored. |
| `energyReadAt` | ISO time of the read that produced the stored total. |
| `energyRereadPending` | True from close until 30 minutes after `ended_at`. The next read after that sets it false. |

`ActiveCaloriesBurned` records are time intervals. They do not name a set. No per-set calorie field is written.

## When the re-read runs

- About 60 seconds after close, if that JavaScript process is still alive.
- When training history is shown, for a session whose summary still has `energyRereadPending`, and at least 60 seconds after the previous attempt in that process.

Both waits are time for Health Connect to ingest a late sync. They are not training-load constants. A process killed before either attempt does not invent a total. Opening history within 30 minutes of the end is the retry.

## Proof

- Focused: `sessionCalorieReread.test.ts` 9/9, plus close, finalize, and exercise-session writer 9/9.
- `npm run typecheck`: 0 errors.
- Dual-path: 29 passed, 0 failed.
- Catalogue QA: 357 rows, 0 governance issues.
- Default full Vitest hung after a 5-second mood timeout and one mood assertion (`expected 2 to be 1`) with the log frozen. That run was stopped. It is the N-0052 class, not a calorie assertion.
- Full retry, `--testTimeout=30000`: 162 files / 1012 tests PASS in 381.42s.

Do not treat this as proof that a worn watch's calories appear on a device. That check is in HUMAN_CHECKS.
