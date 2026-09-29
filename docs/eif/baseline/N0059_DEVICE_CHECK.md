# N-0059 — device check for cancellation authority

Source tests do not prove OS behaviour. Do not mark N-0059 complete from them.

On the retained emulator session (do not reinstall, clear data, or change
networking):

1. Open Settings. Confirm both former "Cancel all notifications" buttons now
   say "Clear reminder notifications".
2. With a medication reminder and a different reminder still scheduled, cancel
   reminders for one medication. The other medication reminder and any open
   training, mindfulness, or meditation guidance must still be scheduled.
3. Tap "Clear reminder notifications". Saved dose, refill, and sleep reminder
   intents should drop. An open guided, mindfulness, or meditation prompt must
   stay. Daily reminders that come from notification settings may return on
   the reconcile that follows.
4. Do not use this check as the N-0061 guided/rest/Done/Doze/Wear journey, and
   do not use it as the N-0066 rest-timer identity check.

This session did not open Settings or run those steps. Metro was left up.
No runtime pass is claimed.
