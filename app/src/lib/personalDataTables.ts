/**
 * Cloud personal-data tables for GDPR export/delete.
 * Kept in a leaf module so tests do not load NotificationScheduler / Expo.
 *
 * Server-side delete (N-0037 Edge Function `delete-account`) is the SoT for
 * RLS-blocked and extra tables. The client list is the RLS-allowed fallback
 * if the function is not deployed yet.
 */

/**
 * Cloud tables keyed by `user_id` that the **client** may delete under current
 * repo RLS. Order: children/leaves before parents. `training_sessions`
 * CASCADE-deletes `training_session_items` and `training_set_logs`.
 */
export const PERSONAL_DATA_USER_ID_DELETE_TABLES = [
  'training_post_session_checkins',
  'mood_checkins',
  'mood_entries',
  'meds_log',
  'meds',
  'sleep_sessions',
  'sleep_candidates',
  'mindfulness_events',
  'meditation_sessions',
  'entries',
  'training_sessions',
  'training_program_days',
  'training_program_instances',
  'training_profiles',
] as const;

/** Child tables removed by FK CASCADE when `training_sessions` rows are deleted. */
export const PERSONAL_DATA_TRAINING_SESSION_CASCADE_TABLES = [
  'training_session_items',
  'training_set_logs',
] as const;

/**
 * Append-only in repo SQL (`DELETE USING false`). Client delete cannot succeed.
 * Service-role Edge Function must wipe these.
 */
export const PERSONAL_DATA_RLS_BLOCKED_DELETE_TABLES = ['training_events'] as const;

/**
 * Deployed delete-account v1 deletes these first. Routine suggestions reference
 * templates; both routine tables have NO ACTION auth-user foreign keys.
 * These are service-role only: do not widen the client fallback without a
 * verified DELETE policy for each table.
 */
export const PERSONAL_DATA_SERVICE_ROLE_PRIORITY_TABLES = [
  'routine_suggestions',
  'routine_templates',
  'insight_feedback',
  'medication_logs',
  'medication_schedules',
] as const;

/**
 * User-keyed tables the client must not delete (no DELETE policy, or SET NULL
 * on auth cascade). Service role covers them.
 */
export const PERSONAL_DATA_SERVICE_ROLE_EXTRA_TABLES = [
  'sleep_prefs',
  'activity_daily',
  'logs',
  'app_logs',
] as const;

/** Tables keyed by `id` = auth user id, not `user_id`. */
export const PERSONAL_DATA_ID_KEYED_DELETE_TABLES = ['profiles'] as const;

/**
 * May be missing in live DB (no CREATE in current SQL, or added by a later node).
 * Service role skips 42P01 / "does not exist".
 */
export const PERSONAL_DATA_OPTIONAL_USER_ID_TABLES = [
  'vitals_daily',
  'run_sessions',
  'run_routes',
] as const;

/** Full user-keyed inventory the service-role deleter must cover. */
export const PERSONAL_DATA_SERVICE_ROLE_USER_ID_TABLES = [
  ...PERSONAL_DATA_SERVICE_ROLE_PRIORITY_TABLES,
  ...PERSONAL_DATA_USER_ID_DELETE_TABLES,
  ...PERSONAL_DATA_RLS_BLOCKED_DELETE_TABLES,
  ...PERSONAL_DATA_SERVICE_ROLE_EXTRA_TABLES,
  ...PERSONAL_DATA_OPTIONAL_USER_ID_TABLES,
] as const;
