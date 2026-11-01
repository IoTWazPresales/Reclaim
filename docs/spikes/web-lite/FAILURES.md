# Build and runtime observations

The spike records failures encountered, rather than claiming every unavailable
native API has been executed. No deployment or physical Safari test was performed.

| Attempt | Result | Resolution / remaining limit |
| --- | --- | --- |
| Initial clean-worktree preparation | A relative-path mistake briefly created `app/app`; the export log path did not exist. | Removed only those newly created paths. Retried from `app/` with correct paths. No product finding. |
| Shared `node_modules` junction + `npx expo export -p web` | Metro resolved Expo AppEntry to `C:\Reclaim\app\node_modules\expo`, then could not resolve `../../App` outside the clean worktree. | Removed the junction and installed the locked dependencies in the spike worktree. No source/config workaround committed. |
| Export attempted while dependency installation was incomplete | `expo` command not recognized; a direct CLI retry reported it could not resolve `react-native`. | Waited for `npm ci --ignore-scripts` to finish. These are environment failures, not app incompatibilities. |
| Original mobile entry, all web variants disabled, `npx expo export -p web` | **App build failure:** unable to resolve `./wa-sqlite/wa-sqlite.wasm` from `expo-sqlite/web/worker.ts`. Import chain: SQLite → localData/database → localFirstCachePrime → LocalFirstHydration → App.tsx. The WASM file exists; the default Metro configuration does not treat this extension as an asset. | Web-only database module avoids SQLite runtime. An alternative is Metro WASM asset configuration plus the required isolation headers, unnecessary for online-only Lite. |
| Initial typecheck while variants were temporarily disabled for baseline export | TS6053 for renamed `.web` files discovered before their rename. | Restored variants; later stable-tree typechecks exit zero. No app type error remained. |
| Placeholder new-account signup | Supabase settings required email confirmation; placeholder address was rejected with HTTP 400. | No test account was created. Operator subsequently explicitly authorized the operator account. Used a server-generated one-time link; did not send email or change the password. |
| Web-only prototype export | **Pass:** 989 modules, 31 assets, 11 JS bundles; main AppEntry about 2.07 MB uncompressed. | Composition removes mobile bootstrap without package/config/native edits. Lazy chunks for excluded mobile helpers are still emitted by the shared API graph; no claim that all excluded code is tree-shaken away. |
| Chromium desktop and 390×844 journeys | No JavaScript page errors. Initial browser emitted a missing-resource 404 consistent with the absent `/favicon.ico`, and React Native Web warned that native-driver animation falls back to JS. | Cosmetic favicon and animation/performance cleanup remain. Native animation warning is not a missing training capability. |
| Intentionally offline manual write | Expected network failures; UI shows “Not saved. Web Lite requires a connection to Supabase; reconnect and retry.” No queued browser data and no third server set. | `offlineQueue.web.ts` fails closed. Online-only capability, not offline parity. |
| Playwright WebKit on Windows, installed revision 2248 | `browser.newContext: Error setting storage state: Protocol error (Console.enable): 'Console' domain was not found`. Its helper did not close cleanly and was stopped by its exact process ID. | Tooling/engine protocol mismatch. **UNABLE_TO_VERIFY** WebKit; no physical iPhone Safari claim. |
| First full Vitest run | **Pass:** all 1,531 tests in 208 files. | Before the two new guard tests were discovered. |
| Final default threaded full run | Stalled after the mood repository tests; no output from 00:29:06 until stopped around 00:33:20 local time. | Recorded as a harness stall, not a passing run. |
| Separate-process retry | `--pool=forks --maxWorkers=1` exited with Node `ERR_IPC_CHANNEL_CLOSED` after the same suite. | No assertion-failure result is inferred from the worker transport error. Final fallback uses the configured thread pool with reproducibly shuffled file order, `--sequence.shuffle.files --sequence.seed=20261102`; individual test ordering and the 30-second budget remain unchanged. **All 1,533 tests / 209 files pass** in this final run. |

Nonfatal tooling warnings also included old `baseline-browser-mapping` data,
`NO_COLOR`/`FORCE_COLOR`, dependency deprecations/audit notices during installation,
and Git line-ending notices for generated test fixtures. No dependency upgrades
were made. Test-generated tracked snapshots and the volume report are restored to
the branch baseline before staging; unrelated local data are never included.
