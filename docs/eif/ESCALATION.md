# Programme escalations — PRG-20260917T222550

## N-0051 / N-0058 account-switch race found in combined review

Security advisor ERRORs are resolved, but Stage 1 is not closed. **N-0058 source fix validated 2026-09-21:** captured JWT/confirmed-user binding, response userId check, serialized guarded auth storage, navigation exclusion through cleanup, and mutually exclusive data reset. Deferred and real-SDK race probes plus full 900-test suite pass. Original finding and re-review: `baseline/N0051_STAGE1_REVIEW.md`. Live deletion/visual proof remains blocked by N-0056 and final review; no live wrong-account deletion has been observed or attempted.

## N-0046 / N-0047 / N-0056 AVD retry cannot render the app

The prescribed cold restart succeeded at Android boot/package checks but not the product journey. Metro `/status` was healthy; dev launcher showed unexpected EOF on localhost:8081, Reload input timed out at 15 seconds, and the final screenshot shows Reclaim ANR. Exact commands/methods and captures: `baseline/N0046_DEVICE_CHECK.md`, `.eif/audit/N-0046/`. Both owned processes stopped. Do not repeatedly restart or call this a visual pass. Continue source-side; N-0056 owns environment recovery and N-0047 remains unverified.

## N-0044 / N-0053 completion payload contract unavailable

N-0044 implementation is pushed at `137055d`, 807/807 application tests and other gates pass, EV-0017 recorded. `complete` rejects `QUALITY_GATE: required dimensions/verification/acceptance incomplete`. Node acceptance succeeded but quality and verification remain empty.

N-0053 adds public CLI help/inspection, explicit node-event forwarding with fresh revisions, and lease release. Four public validation probes found that `node.quality` requires `dim` and `node.verification` requires an undocumented recognised `kind`; `mechanical` is rejected. `help event` gives no event payload schema. Do not spend another discovery loop guessing. Required input: public gate payload contract (allowed verification kinds, status/evidence structure, and any required dimensions), without reading EIF runtime internals. No gate override is authorised or implemented. Wrapper tests 14/14; validated partial implementation can be pushed while closure stays blocked.

## N-0054 historical gate debt

Public `inspect health` reports 11 completed nodes with invalid gates: N-0002, N-0003, N-0005, N-0006, N-0012, N-0013, N-0014, N-0015, N-0036, N-0037, N-0038. N-0001 now derives ready, affecting nodes that depend on it. No runtime changes caused this session; public replay/health exposed the debt. Must reconcile actual evidence through the wrapper before release; do not relabel prior checks as independent verification.

## N-0052 Windows test runner instability (R20260920D)

Stage 0 default thread-pool run stalled after a source-scan timeout. A full run with `--maxWorkers=2` completed with 804/807 passing: two five-second cold-import timeouts in mood tests and a following assertion affected by the timed-out test's remaining work. With Metro stopped, `--maxWorkers=2 --testTimeout=30000` stalled after the first suite. `--pool=forks --maxWorkers=1 --testTimeout=30000` failed with `ERR_IPC_CHANNEL_CLOSED` after that suite. Node v24.13.0; Vitest v4.0.8.

Current discriminator: configured thread pool without a worker limit, `npm test -- --reporter=verbose --testTimeout=30000`, Metro stopped. No assertions removed and no test files excluded. Logs: `.eif/audit/stage0-vitest.txt`, `N0044-vitest.txt`, `N0044-vitest-isolated.txt`, `N0044-vitest-forks.txt`, `N0044-vitest-final.txt`.

This finding is chartered as N-0052. It is not evidence of a product bug and is not a waiver of the final full-harness gate.
