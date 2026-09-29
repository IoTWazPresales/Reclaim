# Programme escalations — PRG-20260917T222550

## Current interpretation - 2026-09-28 checkpoint

Historical environment-stop sections below are retained as evidence, not current
instructions to reinstall. N-0056 recovered through the canonical Expo workflow;
the current bounded check finds no attached ADB device or reachable Metro. Its
ledger blocker remains stale under N-0053. No new root cause is claimed. N-0065
rendered acceptance is queued in `baseline/N0065_DEVICE_CHECK.md`.

Open release blockers include N-0063 live anonymous app_logs reads, N-0061/N-0017
guided transport compliance, N-0059/N-0066 notification races, N-0047 end-to-end
erasure, remaining journeys and N-0053/N-0054 gate debt. N-0067 owns unsupported
category headings discovered in the N-0065 copy review. Continue the scheduled
source nodes without repeating historical recovery or payload-guessing loops.

## N-0052 recurrence during N-0065 validation

2026-09-28: default full verbose suite finished 147/150 files and 950/953 tests
passing; three unchanged tests exceeded the 5000ms timeout (routine measurement,
meditation canonical read, mood mirror deduplication). No assertion failure.
N-0065 evidence records the bounded 30000ms retry separately. Do not call a retry
a fix for the default-run gate or restart historical pool experiments.

## N-0029 legacy System32 acceptance lacks ripgrep

2026-09-28: LF checkout hardening and the canonical Git Bash audit pass. The legacy
System32 Bash acceptance reaches WSL and fails because `rg` is unavailable (status 127).
No environment installation or networking change was attempted. Exact check and next
steps: `baseline/N0029_SYSTEM32_CHECK.md`. Keep this criterion unverified; continue
independent source nodes after recording evidence.

## N-0027 closure — existing N-0053 gate contract blocker

2026-09-28: source implementation pushed at `429cee8`, EV-0035 recorded, full 923/923,
types 0 and dual-path 27/27. Wrapper `complete` accepted the node but rejected status
closure with `QUALITY_GATE: N-0027 required dimensions/verification/acceptance incomplete`.
The intended event is preserved in LEDGER_PENDING. Continue N-0028; do not infer a
completed node or live Sentry receipt from source gates.

## N-0056 emulator retry — operator-requested stop

2026-09-21 R20260921B: Android boot completed and installed Reclaim 1.0.5/vc15 launched, but screenshot `.eif/audit/N-0056/launch.png` shows **System UI isn't responding**. Metro initially responded; later status timed out. No usable product UI/journey verified. Per Warren's latest explicit instruction, stop until he removes Reclaim and says continue; then reinstall and retry. No uninstall or data clearing performed. Root cause is not diagnosed and app reinstall may not address the Android-level ANR. Details: `baseline/N0056_RETRY.md`.

## N-0019 / N-0063 live anonymous app_logs read access — release blocker

Linked read-only catalog inspection confirms anon SELECT privilege and the PUBLIC permissive SELECT policy `((auth.uid() = user_id) OR (auth.uid() IS NULL))` on app_logs. Anonymous callers satisfy the second branch for every row; newer owner-only policies do not override permissive OR semantics. RLS is enabled but this configuration remains unsafe. The same unsafe recipe is checked in at `app/Documentation/SUPABASE_MISSING_TABLES.sql`. No actual log rows were queried and no breach is asserted. Sleep owner policies do exist live. N-0063 owns correction and synthetic isolation proof; the additional live migration requires explicit approval under AGENTS section 8. Exact metadata/command and operator steps: `baseline/N0019_RLS_ASSESSMENT.md`, `baseline/N0019_HUMAN_CHECKS.md`. Do not equate prior zero advisor ERROR with secure RLS or release readiness.

## N-0017 / N-0061 actual FGS transport contradicts invariant 5

The plugin registers `com.asterinet.react.bgactions.RNBackgroundActionsTask`; the guided helper directly imports `react-native-background-actions`. The mandate explicitly prohibits that transport. No Metro/Babel alias replaces it. Per AGENTS section 8, N-0017 is paused on this concrete contradiction; N-0061 is the chartered one-native-service correction, including existing shared owners. Do not call the current native library service compliant or silently add a second service. Source map and eventual foreground fix entry points: `baseline/N0017_TRANSPORT_CONTRADICTION.md`. Continue independent N-0018; no request to halt for approval.

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
