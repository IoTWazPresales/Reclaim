# N-0042 — run location on the one foreground service

Source shape, 2026-09-30. Device and live-database proof are in `docs/eif/HUMAN_CHECKS.md`.

- One service: `ReclaimSessionForegroundService`. Manifest type `health|location`. Location is passed to `startForeground` only when `needsLocation` is true.
- Fine location is requested at run start when it is not already granted. `ACCESS_COARSE_LOCATION` and `READ_EXERCISE_ROUTES` are not declared.
- Cue key `training_run:{sessionId}`, type `TRAINING_RUN`, reconciled by `NotificationScheduler`. No set-Done category.
- Route tables: `run_homes`, `run_sessions`, `run_routes`. RLS is `auth.uid() = user_id`. Home radius is 200 m and is a privacy choice. No saved home stores the track unchanged.
- Migration `app/supabase/migrations/20260930140000_run_routes.sql` is in the repo and was not applied. The CLI reached project `bgtosdgrvjwlpqxqjvdf`, then the pooler connection timed out. The schema snapshot includes those three tables from the migration file, not from a fresh catalog query. Refresh it after apply.
- Do not deploy the updated `delete-account` function before the migration. After apply, the three tables are required delete targets.
- Finish writes Health Connect exercise type 56 with `exerciseRoute`. Strength stays type 70 and has no route.
- No pace, heart-rate zone, or running minute table was added.
