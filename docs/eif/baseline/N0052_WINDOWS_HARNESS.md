# N-0052 — Windows full-harness timeout

Status: source-validated. The standard command is `npm test -- --reporter=verbose` from `app/`. It passes because `app/vitest.config.ts` sets `testTimeout` to 30 seconds. The script stays `vitest run`, so CI's `npm test` uses the same budget. No assertion was removed. No test file was excluded. The pool stays `threads` with `fileParallelism: false`. `maxWorkers` is not set.

Executor: Grok 4.7.

## Why 30 seconds

Vitest's default test timeout is 5 seconds. On this Windows host a cold sqlite import in the serial suite takes longer than that. Recorded failures were timeouts, not wrong assertions: `smallModuleMirrors.read`, mood replay, and the same class in earlier nodes. A worker cap stalled the suite. The fork pool closed its channel. The run that finishes is the thread pool with no worker cap and a 30-second test budget.

One mood import test still sets its own 20-second budget. That test passed inside that budget. It was not lengthened and its assertion was not changed.

## Proof

- Focused harness shape: `windowsHarnessTimeout.test.ts` 1/1.
- Focused mood legacy import: `moodCanonical.test.ts` 2/2. The legacy import took 6377 ms, which the 5-second default would have failed.
- Focused sqlite read: `smallModuleMirrors.read.test.ts` 1/1.
- Focused mood outbox and restart: `moodService.deviceFirst.test.ts` 7/7. The restart-like reload took 8095 ms.
- `npm run typecheck`: 0 errors.
- Standard full command, no extra timeout flag: 169 files / 1040 tests PASS in 369.29s. The process exited. It was not left running.

Stage 0 already reproduced the 5-second failure. This node does not repeat a failing default run.
