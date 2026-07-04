// C:\Reclaim\app\src\hooks\useMeditationScheduler.tsx

import { getLatestWakeTime } from '@/lib/health/getLatestWakeTime';
import { type MeditationType } from '@/lib/meditations';
import {
  type MeditationSource,
  serializeMeditationSource,
} from '@/lib/meditationSources';
import type { MeditationAutoRule } from '@/lib/meditationSettings';
import { logger } from '@/lib/logger';
import { setIntent, clearIntent } from '@/lib/notifications/NotificationIntentStore';
import { reconcileNotifications } from '@/lib/notifications/NotificationScheduler';
import * as Notifications from 'expo-notifications';

const MEDITATION_INTENT_PREFIX = 'meditation:';

/**
 * Generate a unique rule ID from a rule for intent key.
 */
function getRuleId(rule: MeditationAutoRule): string {
  if (rule.mode === 'fixed_time') {
    return `fixed_time:${rule.type}:${rule.hour}:${rule.minute}`;
  } else {
    return `after_wake:${rule.type}:${rule.offsetMinutes}`;
  }
}

/**
 * Extract a MeditationType from a source, if it's a built-in/script meditation.
 * Returns null for external/audio.
 */
function meditationTypeFromSource(source: MeditationSource): MeditationType | null {
  if (source.kind === 'script') return source.scriptId;
  if (source.kind === 'built_in') return source.type;
  return null;
}

/**
 * Build the deep link used by the notification tap.
 */
function deeplinkForSource(source: MeditationSource) {
  try {
    const encoded = encodeURIComponent(serializeMeditationSource(source));
    return `reclaim://meditation?source=${encoded}&autoStart=true`;
  } catch {
    const type = meditationTypeFromSource(source);
    if (type) return `reclaim://meditation?type=${encodeURIComponent(type)}&autoStart=true`;
    return `reclaim://meditation?autoStart=true`;
  }
}

function labelForSource(source: MeditationSource) {
  const type = meditationTypeFromSource(source);
  if (type) return String(type).replace(/_/g, ' ');

  if (source.kind === 'audio') return source.title;
  if (source.kind === 'external') return source.title;

  return 'Meditation';
}

/**
 * Schedule a daily repeating meditation reminder at a fixed local time.
 * Uses intent system; reconcile will schedule with appTag.
 * Channel 'meditation' is ensured by ensureReclaimChannels (useNotifications on app start).
 */
export async function scheduleMeditationAtTime(
  source: MeditationSource,
  hour: number,
  minute: number,
  rule: MeditationAutoRule,
  _userId?: string | null
): Promise<string> {
  // PHASE 3 FIX: Check notification permissions before scheduling
  const { granted, status } = await Notifications.getPermissionsAsync();
  if (!granted && status !== 'granted') {
    logger.warn('[MEDITATION] Notification permission not granted; skipping meditation schedule');
    throw new Error('Notification permission not granted');
  }

  const ruleId = getRuleId(rule);
  const logicalKey = `${MEDITATION_INTENT_PREFIX}${ruleId}`;
  const url = deeplinkForSource(source);
  const label = labelForSource(source);

  await setIntent(logicalKey, {
    type: 'MEDITATION_FIXED',
    hour,
    minute,
    url,
    title: 'Meditation',
    body: `Time for ${label}.`,
    // PHASE 5 FIX: Explicit appTag ensures these notifications are managed by reconciler
    appTag: 'reclaim',
  });

  await reconcileNotifications();
  return logicalKey;
}

/**
 * Schedule a one-shot meditation reminder offset from the last sleep end.
 * Uses intent system; reconcile recomputes wake time each run.
 */
export async function scheduleMeditationAfterWake(
  source: MeditationSource,
  offsetMinutes: number,
  rule: MeditationAutoRule,
  _userId?: string | null
): Promise<string | null> {
  // Wake time is recomputed on every reconcile — intent is the source of truth.
  const { granted, status } = await Notifications.getPermissionsAsync();
  if (!granted && status !== 'granted') {
    logger.warn('[MEDITATION] Notification permission not granted; skipping after-wake meditation schedule');
    return null;
  }

  const ruleId = getRuleId(rule);
  const logicalKey = `${MEDITATION_INTENT_PREFIX}${ruleId}`;
  const url = deeplinkForSource(source);
  const label = labelForSource(source);
  const wakeResult = await getLatestWakeTime();
  const fallbackReason = wakeResult
    ? null
    : `Couldn't detect wake time yet; we'll schedule after your next wake sync.`;

  await setIntent(logicalKey, {
    type: 'MEDITATION_AFTER_WAKE',
    offsetMinutes,
    url,
    fallbackHour: rule.mode === 'fixed_time' ? rule.hour : 8,
    fallbackMinute: rule.mode === 'fixed_time' ? rule.minute : 0,
    title: 'After-wake meditation',
    body: fallbackReason
      ? `Ready for ${label}? ${fallbackReason}`
      : `Ready for ${label}?`,
    appTag: 'reclaim',
  });

  await reconcileNotifications();
  return logicalKey;
}

/**
 * Cancel a meditation rule's notification by clearing its intent.
 */
export async function cancelMeditationRule(
  rule: MeditationAutoRule,
  _userId?: string | null
): Promise<void> {
  const ruleId = getRuleId(rule);
  const logicalKey = `${MEDITATION_INTENT_PREFIX}${ruleId}`;
  await clearIntent(logicalKey);
  await reconcileNotifications();
}
