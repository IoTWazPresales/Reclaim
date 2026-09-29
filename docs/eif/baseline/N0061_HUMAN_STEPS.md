# N-0061 device proof

Install the debug build that contains `ReclaimSessionForegroundService` over the
current app without clearing data (`adb install -r` of the new `app-debug.apk`,
or `npm run android` from `app/` while Metro stays up). Then, signed in:

1. Start a guided session. Confirm one ongoing notification, "Reclaim training in progress", and that a second session service is not running (`adb shell dumpsys activity services ReclaimSessionForegroundService`).
2. Leave the training screen and reopen the phone app. Guidance and the notification must still be up.
3. Swipe the app out of Recents. The notification must remain. Open the app again and confirm the session is still the same one.
4. Complete a set from the phone and, if the watch is paired, from the watch. Both must go through the existing Done path. Do not expect a second completion workflow.
5. Let a rest timer reach its end with the screen off. The rest-end tick must still fire.
6. End the session. The notification must leave. A mindfulness or meditation start after that must be able to take the same service. Starting one while guided is still open must refuse.
7. Optional: leave the session open, put the emulator in Doze, and confirm the notification is still present afterward.

Record the exact limitation if the watch or Doze step cannot be run. This does not complete N-0061, N-0017, or N-0042.
