# N-0061 — one health session foreground service

Status: source and native compile validated on 2026-09-29. Not complete.
Guided, rest, Done, Doze, lock-screen and Wear paths are not yet proven on a device.

## What changed

Guided training, meditation and mindfulness no longer start the prohibited
background-actions library. They share one app-owned `HeadlessJsTaskService`,
`ReclaimSessionForegroundService`, type `health`, `exported=false`,
`stopWithTask=false`. The task name is stable: `ReclaimSessionForeground`.

The same domain and session does not stop and start again. A different domain
is refused. Stop runs only for the owning domain, including when the in-memory
owner was lost and the native service is still that domain. Swiping the phone
task away does not call `stopSelf`. Unmount of the training screen still stops
keep-awake only.

The foreground notification is created by the service (id 92911, channel
`reclaim_session_fgs`). It does not go through `setIntent` or
`reconcileNotifications`. Set completion stays on `applySetCompletion()`.

`react-native-background-actions` is removed from `app/package.json`. The plugin
still strips the old library service if a later prebuild finds it. N-0042 may
add the location type to this same service. This node does not.

## Proof so far

- `npm run typecheck` — 0 errors.
- `:app:compileDebugKotlin` — BUILD SUCCESSFUL in 1m 2s.
- `:app:assembleDebug` — BUILD SUCCESSFUL in 13m 45s. The merged debug manifest
  names `com.fissioncorporation.reclaim.ReclaimSessionForegroundService` and does
  not name the old library service. `adb install -r` of that debug APK succeeded
  on emulator-5554 without clearing data. The app was started again. A guided
  session was not run.
- Focused tests 12/12, including the start plan, the owner, the source-shape
  check, and the Health Connect location family still empty.
- Default full Vitest, after a concurrent run stalled with no further output
  during the native rebuild and was stopped: 153 files / 965 tests PASS. No
  timeout override. That stalled run is not a result.
- Git Bash dual-path audit 27/27. Catalogue QA 357 rows, 0 governance issues.
  Wrapper pytest 3/3.

## Not proven

The running emulator still has the previous debug install until the new APK is
installed. Opening a guided session, rest-timer ticks, watch Done, lock-screen
Done, and Doze survival are human checks. N-0017 and N-0042 stay non-compliant
until those paths pass.
