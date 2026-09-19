/**
 * Cloud personal-data tables for GDPR export/delete.
 * Kept in a leaf module so tests do not load NotificationScheduler / Expo.
 */

/**
 * Cloud tables keyed by `user_id` that account-delete must attempt.
 * Order: children/leaves before parents. `training_sessions` CASCADE-deletes
 * `training_session_items` and `training_set_logs`.
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
 * Live DB UNKNOWN — do not fail the rest of account delete on this table.
 */
export const PERSONAL_DATA_RLS_BLOCKED_DELETE_TABLES = ['training_events'] as const;
