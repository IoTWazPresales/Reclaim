# N-0026 source of truth — notification permission off first render

Date: 2026-09-22  
Run: `R20260922A`

## Observed baseline

- `RootNavigator` holds the splash in the `notifications` startup phase until
  `runStartupNotificationPermissionGate()` resolves.
- That gate calls `ensureNotificationPermission()`, which calls
  `Notifications.requestPermissionsAsync()` when permission is not already granted.
- `useNotifications()` can call the same requesting helper after the transient startup
  deferral flag is cleared.

This makes an OS permission prompt part of first render and makes prompt timing dependent
on a race between the startup gate and the mounted notification hook.

## Implementation boundary

- First render may inspect the existing notification permission state, but must never
  request permission or wait for notification reconciliation.
- Permission requests remain available only from explicit user actions that enable a
  notification feature.
- Badge clearing and intent reconciliation remain on the canonical reconciler path and
  run after startup without holding the splash.
- No notification scheduling or cancellation invariant changes are in scope.

## Acceptance evidence required

- Focused Vitest proves startup does not request or await notification permission before
  rendering.
- Full typecheck, full verbose Vitest, and Git Bash dual-path audit pass.
- An ADB time-to-first-render log is captured against the already-running canonical Expo
  development environment; restarting the app process for measurement is allowed, but
  the emulator and Metro environment are not recreated.

## Implemented and source-verified

- `RootNavigator` now releases the startup phase before starting notification
  housekeeping.
- Startup and the mounted notification hook inspect the existing grant without calling
  the OS request API. Explicit feature actions retain the requesting helper.
- Badge clearing starts as background work; the mounted notification hook performs the
  one canonical startup reconciliation after its categories are ready, avoiding a new
  concurrent reconciler race.
- Focused startup test: 1/1 passed.
- Typecheck: passed with zero errors.
- Full verbose Vitest: 145 files / 918 tests passed.
- Git Bash dual-path audit: 27/27 passed.
- Medication catalogue QA: 357 rows / zero governance issues.

## ADB timing attempt and blocker

The already-running emulator, Metro process, installed package, app data, and native
project were preserved. The required measurement restarted only the app process:

```text
adb shell am force-stop com.fissioncorporation.reclaim
adb shell am start -W -n com.fissioncorporation.reclaim/.MainActivity
LaunchState: COLD
Activity: com.fissioncorporation.reclaim/expo.modules.devlauncher.launcher.DevLauncherActivity
TotalTime: 6679
WaitTime: 6683
```

That value measures the development launcher, not the Reclaim UI, so it is not claimed
as time-to-product-render. Selecting the live `http://10.0.2.2:8081` development server
advanced to `MainActivity`, but the screen remained blank. Metro `/status` still returned
`packager-status:running`, ADB reverse remained present, and logcat supplied the concrete
failure from the new process:

```text
okhttp.OkHttpClient: Callback failure for call to http://10.0.2.2:8081/...
java.net.ProtocolException: Expected leading [0-9a-fA-F] character but was 0xd
... BundleDownloader.processMultipartResponse
```

This is a malformed multipart/chunked bundle response on the current canonical
development path. It is distinct from the historical manual-APK ClassNotFoundException
and socket timeout. No old APK was installed, no app data was cleared, and neither Metro
nor the emulator was restarted. Per the operator stop condition, runtime verification
stops here. Local diagnostic captures are under `.eif/audit/N-0026/` and are not release
evidence.

Human continuation:

1. End the currently running `npm run android` terminal when convenient.
2. Remove the current Reclaim development build from the emulator if that is the chosen
   reset.
3. Tell the next agent to continue. It must use `cd C:\Reclaim\app` then
   `npm run android`; it must not install a historical APK or clear unrelated emulator
   state.
4. Repeat the ADB time-to-actual-Reclaim-render measurement. Do not complete N-0026 from
   the 6679 ms launcher timing alone.
