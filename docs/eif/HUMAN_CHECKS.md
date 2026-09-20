# Human checks — PRG-20260917T222550

Device, Play Console, and live-DB steps the agent cannot complete. Continue the programme; do not block other nodes on these.

## N-0037 server-side account deletion

1. Deploy Edge Function `app/supabase/functions/delete-account` (`supabase functions deploy delete-account --project-ref <ref>`). Confirm `SUPABASE_SERVICE_ROLE_KEY` is available to the function (default on hosted Supabase).
2. Create a **throwaway test user** (not a real account). Seed at least one row in `training_events` plus one training session.
3. Sign in as that user → Data & Privacy → delete account.
4. From `app/`:

```
$env:SUPABASE_URL="https://<ref>.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="<service-role>"
$env:DELETED_USER_ID="<uuid>"
npx tsx scripts/verify-account-deletion.ts
```

Expect: `OK zero rows for <uuid>` and exit 0. Every listed table is 0 or skipped as missing.

## R0 calorie source-of-truth (phone + watch)

Why a session may show no calories after a watch-worn workout. Ranked hypotheses:

- (a) never requested
- (b) the watch app syncs to Health Connect late or not at all
- (c) the app never reads calories for the session window
- (d) it reads once, before sync, and never re-reads

**Cheapest discriminating test (your phone):**

1. Wear the watch, complete a Reclaim guided session (note `started_at` / `ended_at` from session history).
2. Open Health Connect → App permissions → Reclaim. Confirm Active calories + Heart rate are allowed.
3. In Health Connect (or Samsung Health / Wear companion), confirm an ActiveCaloriesBurned and HeartRate record exists overlapping that window. If they appear minutes later, (b) is confirmed.
4. Foreground Reclaim after that sync. If calories appear only then, (d) is confirmed. If they never appear despite HC records, (c) remains.
5. Optional ADB (when HEAD debug client is installed):

```
adb logcat -d | findstr /i "HealthConnect session window energy"
```

Record which of (a)–(d) you observed. Do not invent per-set calories if HC records are session-wide.

## C-G guided smoke / Doze / OEM FGS (N-0025)

Requires HEAD debug client (N-0010) on a real device.

1. Start a guided session, lock the phone, confirm rest-end / next-set still fire.
2. `adb shell dumpsys deviceidle force-idle` then wait for the next rest-end. Confirm FGS notification stays.
3. On an OEM device with aggressive battery (Samsung/Xiaomi): start guided, leave the app 15+ minutes. Confirm FGS not killed. If killed, capture `adb shell dumpsys activity services` and OEM battery screenshot.

## R3 running — Play / policy / demo video

When R3 ships (not before):

1. Play Console Data Safety: add **precise location**.
2. Update the public privacy policy for GPS route + Health Connect exercise route.
3. Declare `FOREGROUND_SERVICE_LOCATION` and record the Play FGS demo video (location type, one FGS).
4. Real-device watch check: run/walk audio + haptics mirrored to Wear under the same invariant as guided lifting (opening the phone does not cancel watch guidance).

## N-0010 HEAD debug client accept

`dumpsys` already VERIFIED at 1.0.5 / versionCode 15 / DEBUGGABLE. Operator: confirm the logged-in product screens on that client.
