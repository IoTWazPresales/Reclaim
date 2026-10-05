# N-0047 wipe counts — 2026-10-05

## Operator waiver, later the same day

The operator accepted the missing emulator sleep seed because sleep already works on the retained account. A count-only check found that account still present, with 230 `sleep_sessions` rows and 1 `sleep_prefs` row. `sleep_candidates` was 0. Those rows were not deleted. The earlier orphan query was a select count. Delete account ran only in the throwaway session.



Live throwaway wipe on emulator-5554. No email, user id, or password is recorded here.

## What the app created, then deleted

Mood was saved during onboarding. One medication was saved. A strength program was saved and a normal-mode session was started, then minimized. Delete account was cancelled once, then confirmed. The busy screen read that the data request was finishing. The result alert was “Account deleted” and the next screen was Login, not Welcome. Signing in again with that account returned invalid login credentials.

The retained account was signed back in afterwards. Its medication card, sleep signal, and the 1 October in-progress session were still present. That session was not ended.

## Counts

Management API, project ref `bgtosdgrvjwlpqxqjvdf`, 2026-10-05:

- Auth users for the throwaway address: 0.
- Orphan rows (user key not null and absent from `auth.users`) on all 29 tables in `docs/schema/user_keyed_tables.json`: 0. `profiles` was counted on `id`. Tables: activity_daily, app_logs, entries, insight_feedback, logs, medication_logs, medication_schedules, meditation_sessions, meds, meds_log, mindfulness_events, mood_checkins, mood_entries, profiles, routine_suggestions, routine_templates, run_homes, run_routes, run_sessions, sleep_candidates, sleep_prefs, sleep_sessions, training_events, training_post_session_checkins, training_profiles, training_program_days, training_program_instances, training_sessions, vitals_daily.

`app_logs` is in that zero. Null `user_id` rows were not counted as orphans and were not attributed to the deleted account.

## Sleep was not seeded

Onboarding continued without connecting sleep. Health Connect was connected and Import latest data found no sleep session. The installed client can read sleep and write exercise sessions only. It cannot insert `sleep_sessions`. Desired wake was not saved, so `sleep_prefs` was not written either. A zero orphan count on `sleep_sessions` does not prove a sleep row was deleted, because none was created.

N-0047 stays open on that gap. Do not mark the account-deletion journey passed.

## Advisors the same day

`npx supabase db advisors --linked --level warn --type security`: zero ERROR. Two WARNs, unchanged from 2026-10-02: `extension_in_public` for `moddatetime`, and leaked-password protection disabled. The extension was not moved. The dashboard toggle was not changed.
