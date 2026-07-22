/**
 * Pure key helpers for training notification intents (no Expo imports — safe
 * for unit tests).
 *
 * Intent slots (logical keys):
 * - `training_now:{sessionId}`  — immediate prompt (set / rest started)
 * - `training_at:{sessionId}`   — absolute-timestamp prompt (rest end)
 * - `training_stale:{sessionId}` — "still open?" safety net
 *
 * OS identifiers are deliberately separate for now vs at so scheduling the
 * timed rest-end alarm cannot cancel/replace the live rest tile.
 */

/** Intent key for the immediate prompt of a session. */
export function trainingNowIntentKey(sessionId: string): string {
  return `training_now:${sessionId}`;
}

/** Intent key for the timed (absolute timestamp) prompt of a session. */
export function trainingTimedIntentKey(sessionId: string): string {
  return `training_at:${sessionId}`;
}

/** Intent key for proactive "still open?" stale-session check. */
export function trainingStaleIntentKey(sessionId: string): string {
  return `training_stale:${sessionId}`;
}

/**
 * Legacy sticky session-active intent key (pre-FGS). Cleared on sight; do not schedule.
 * Ongoing session tile is now the native guided-session Foreground Service.
 */
export function trainingActiveIntentKey(sessionId: string): string {
  return `training_active:${sessionId}`;
}

/** OS id for the immediate (now) set/rest tile. */
export function trainingNowNotificationIdentifier(sessionId: string): string {
  return `reclaim-training-${sessionId}`;
}

/**
 * @deprecated Prefer trainingNowNotificationIdentifier — same value (now-slot only).
 * Kept so older call sites keep compiling during the now/at id split.
 */
export function trainingNotificationIdentifier(sessionId: string): string {
  return trainingNowNotificationIdentifier(sessionId);
}

/** OS id for the timed (at) rest-end / countdown prompt — must not share now-slot id. */
export function trainingTimedNotificationIdentifier(sessionId: string): string {
  return `reclaim-training-at-${sessionId}`;
}

/** Separate OS id so stale check does not replace live set/rest tile. */
export function trainingStaleNotificationIdentifier(sessionId: string): string {
  return `reclaim-training-stale-${sessionId}`;
}

/** Separate OS id for the ongoing session-active tile. */
export function trainingActiveNotificationIdentifier(sessionId: string): string {
  return `reclaim-training-active-${sessionId}`;
}

/** Legacy per-set intent prefixes (pre "dumb trigger" pipeline) — cleared on sight. */
export const LEGACY_TRAINING_INTENT_PREFIXES = [
  'training_rest:',
  'training_set:',
  'training_first:',
] as const;
