# Programme escalations — PRG-20260917T222550

## N-0052 Windows test runner instability (R20260920D)

Stage 0 default thread-pool run stalled after a source-scan timeout. A full run with `--maxWorkers=2` completed with 804/807 passing: two five-second cold-import timeouts in mood tests and a following assertion affected by the timed-out test's remaining work. With Metro stopped, `--maxWorkers=2 --testTimeout=30000` stalled after the first suite. `--pool=forks --maxWorkers=1 --testTimeout=30000` failed with `ERR_IPC_CHANNEL_CLOSED` after that suite. Node v24.13.0; Vitest v4.0.8.

Current discriminator: configured thread pool without a worker limit, `npm test -- --reporter=verbose --testTimeout=30000`, Metro stopped. No assertions removed and no test files excluded. Logs: `.eif/audit/stage0-vitest.txt`, `N0044-vitest.txt`, `N0044-vitest-isolated.txt`, `N0044-vitest-forks.txt`, `N0044-vitest-final.txt`.

This finding is chartered as N-0052. It is not evidence of a product bug and is not a waiver of the final full-harness gate.
