# N-0066 — device check for rest-end timer identity

Source tests do not prove OS, watch, or foreground-service behaviour.
Do not mark N-0066 complete from them. Do not mark N-0061, N-0017, or N-0042
complete from this check.

On the retained emulator session (do not reinstall, clear data, or change
networking):

1. Start a guided session and begin a rest. Confirm the live rest tile and the
   rest-end prompt are the current ones.
2. While a rest is counting, replace or skip that rest so a newer prompt is
   armed before the old timer would have fired. The old timer must not replace
   the newer prompt and must not dismiss the newer now-slot tile.
3. End the session before a rest timer fires. The closed session must not get
   a new rest-end prompt from the timer that was already armed.
4. Let one rest finish normally. The rest-complete prompt may appear, and the
   previous rest tile for that same prompt may go away.
5. Opening the phone must not stop guidance. Wear, lock-screen, and Doze remain
   the N-0061 human check.

This session did not run those steps. No runtime pass is claimed.
