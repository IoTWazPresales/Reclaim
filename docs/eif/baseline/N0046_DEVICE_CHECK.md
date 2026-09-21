**UNABLE_TO_VERIFY — rendered UI / accessibility / deletion journey.**

The Stage 0 AVD failed with a dev-client socket timeout and System UI ANR. One
cold restart was attempted for N-0046: `Medium_Phone_API_36.1`, headless,
`-no-snapshot-load -no-window -no-audio -cores 2`; boot completed and installed
package was visible. Restarted Metro with `npx expo start --dev-client --localhost`,
ADB reverse 8081, correct `exp+reclaim-app` development-client URL. `/status`
returned `packager-status:running`. The initial launch showed unexpected EOF;
Reload input timed out after 15 seconds and the final capture shows
**Reclaim isn't responding**. Metro and emulator were stopped afterward.

Evidence: `.eif/audit/N-0046/current.png`, `current.xml`, `retry.png` (local only;
screenshots transferred with `adb pull`, not PowerShell binary redirection).
These show the dev launcher/error, not the changed product screens. N-0056 owns
the environment repair; N-0047 remains the separate live deletion journey.

When the environment is usable, with a throwaway account only:

1. Open Settings and Data & privacy; capture the "Delete account" button and
   confirmation. Check TalkBack labels, reachable Cancel/confirm, and large text.
2. Cancel once; confirm account/data/reminders remain unchanged.
3. Export any test data desired. Delete from one screen; expect Auth, never Welcome.
4. Restart: the deleted session must not return. Attempt login with the deleted
   account and confirm it cannot sign in; a new account remains possible.
5. Execute N-0047's multi-domain creation and snapshot verification separately.

Warren reviews visible changes in the final build; no intermediate approval stop.
