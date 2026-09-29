/**
 * Reminder cancellation is an intent edit. NotificationScheduler is the only
 * caller of the OS schedule and cancel APIs; this module never touches them.
 *
 * Live guidance stays: an open training prompt, and the mindfulness or
 * meditation session tile. Those are a different authority from dose, mood,
 * sleep and other saved reminders.
 */
import { clearIntentsByPrefix, clearIntentsWhere } from './NotificationIntentStore';

const LIVE_GUIDANCE_PREFIXES = [
  'training_now:',
  'training_at:',
  'training_stale:',
  'training_active:',
] as const;

const LIVE_GUIDANCE_KEYS = new Set([
  'mindfulness_session_active',
  'meditation_session_active',
]);

export function isLiveGuidanceIntentKey(logicalKey: string): boolean {
  if (LIVE_GUIDANCE_KEYS.has(logicalKey)) return true;
  return LIVE_GUIDANCE_PREFIXES.some((prefix) => logicalKey.startsWith(prefix));
}

/** Dose reminders for one medication, including snooze keys. Refill intents stay. */
export async function clearMedReminderIntents(medId: string): Promise<void> {
  await clearIntentsByPrefix(`med:${medId}:`);
}

/** Drop saved reminder intents. Open session guidance is left in the store. */
export async function clearReminderIntentsPreservingGuidance(): Promise<number> {
  return clearIntentsWhere((logicalKey) => !isLiveGuidanceIntentKey(logicalKey));
}
