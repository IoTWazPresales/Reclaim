/**
 * Pure key helpers for training notification intents (no Expo imports — safe
 * for unit tests). One notification identity per session, updated in place.
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

/** OS notification identifier — one per session, updated in place. */
export function trainingNotificationIdentifier(sessionId: string): string {
  return `reclaim-training-${sessionId}`;
}

/** Separate OS id so stale check does not replace live set/rest tile. */
export function trainingStaleNotificationIdentifier(sessionId: string): string {
  return `reclaim-training-stale-${sessionId}`;
}

/** Legacy per-set intent prefixes (pre "dumb trigger" pipeline) — cleared on sight. */
export const LEGACY_TRAINING_INTENT_PREFIXES = [
  'training_rest:',
  'training_set:',
  'training_first:',
] as const;
