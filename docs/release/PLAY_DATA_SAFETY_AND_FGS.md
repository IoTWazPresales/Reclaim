# Play Console draft — foreground service and Data Safety

Draft for the operator to submit. This file is not a Play Console submission.

Package `com.fissioncorporation.reclaim`. One foreground service, `ReclaimSessionForegroundService`, types `health` and `location`. Location is added only while a run is in progress. Strength sessions use the health type. The app does not start a second foreground service.

## Foreground service declaration

- Health: a guided training, mindfulness, or meditation session is in progress. The notification shows the session and keeps the timer alive when the phone is locked.
- Location: a run the person started, and only after fine location is allowed. The route is stored for that run. Points within 200 m of the saved home fix are left off the saved route.
- The user starts the session. The service stops when the session is finished or deleted.
- A demo video is still required in Play Console. It has not been recorded.

## Data Safety answers to paste from the current permissions

Collected, and shared only with the signed-in account's own backend (Supabase) and, when the person connects it, Health Connect:

- Account: email and auth identifiers, for sign-in.
- Health Connect reads: sleep, heart rate, oxygen saturation, respiratory rate, body temperature, steps, active calories. Resting heart rate, HRV, and total calories are not requested.
- Health Connect writes: an exercise session. A run can include a route.
- App data the person enters: training sets, mood check-ins, medications and dose logs, meditation and mindfulness sessions.
- Location: fine location during a run, used for the route. It is not used for ads.
- Diagnostics: Sentry events for crashes and the named product events already in the app.

Not collected: contacts, photos, advertising id, financial info. Data is not sold. Account deletion is in Data & Privacy and calls the deployed `delete-account` function.

The operator submits this in Play Console. The leaked-password dashboard switch is a separate Supabase step, not a Play form.
