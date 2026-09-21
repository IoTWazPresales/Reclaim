# N-0017 native transport contradiction — source inspection, 2026-09-21

AGENTS.md invariant 5 and the programme mandate require the native guided FGS and
explicitly forbid background-actions. The actual tree contradicts that premise:

- `app/src/lib/training/guidedSessionFgs.ts` directly imports
  `react-native-background-actions` and starts/stops BackgroundService.
- `app/plugins/withGuidedSessionForegroundService.js` registers
  `com.asterinet.react.bgactions.RNBackgroundActionsTask`, type `health`; it does
  not supply a separate first-party native guided service.
- `app/package.json` declares background-actions ^4.1.0; Metro/Babel do not alias
  it to another implementation. `system/backgroundActionsOwner.ts` shares ownership.

This is a real native Android FGS provided by the forbidden library, not an Expo
sticky notification. Calling it native alone does not resolve the explicit ban.
No native transport was replaced and no native/AVD compliance was claimed here.

Per AGENTS section 8, pause N-0017 on this contradiction and continue N-0018.
N-0061 is the chartered corrective native-transport node, not a prose-only TODO.
Its scope includes the existing shared owners and one-service invariant, so a
local import swap or unverified new second service is not an acceptable fix.

## Foreground source map for the eventual N-0017 resume

`useNotifications` startup and AppState->active both force the cooldown bypass.
The foreground permission-granted branch also invalidates the plan fingerprint.
Both lifecycle paths call clearStaleTrainingIntentsIfNoActiveSession, which uses
only the most recent ten sessions and a twelve-hour cutoff before clearing all
training intent prefixes and stopping the guided FGS. That is not authoritative
proof that the live guided session ended. Remove lifecycle teardown, preserve
action/offline queue replay, and test single-flight/cooldown behavior when resumed.

N-0059 owns native cancellation outside the reconciler. N-0060 owns unprotected
intent array writes and stale asynchronous firedAt acknowledgement. All are in
wave 2 and must resolve before its combined verification can close.

The source tree is unchanged from N-0058's validated 638ccfb for this diagnostic:
141 files / 900 tests, types 0, dual-path 27/27, catalogue 357/0, wrapper 14/14.
These are reused same-tree checks, not a claimed fresh full run for this document.
