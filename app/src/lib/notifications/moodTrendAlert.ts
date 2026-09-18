/**
 * moodTrendAlert.ts
 *
 * Schedules a proactive "check-in nudge" notification when the user
 * hasn't logged mood in 3+ days, and a "we noticed" safety alert when
 * their last logged mood was low AND it's been 2+ days without logging.
 *
 * This acts as a safety net — prompting re-engagement before
 * low-mood periods go unmonitored.
 *
 * Scheduling:
 *   - Normal nudge: fires if no log for 3 days, scheduled for 11am tomorrow.
 *   - Safety nudge: fires if last log was ≤ 2/5 AND ≥ 2 days since then.
 *   - Both are idempotent: only reschedule when criteria change.
 *   - OS writes go through setIntent() + reconcileNotifications() so the
 *     reconciler does not cancel a bare scheduleNotificationAsync entry.
 *
 * Called from Dashboard.tsx on mount / mood change.
 */

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/lib/logger';
import { setIntent, clearIntent } from '@/lib/notifications/NotificationIntentStore';
import { reconcileNotifications } from '@/lib/notifications/NotificationScheduler';

export const MOOD_NUDGE_INTENT_KEY = 'mood_checkin_nudge';
export const MOOD_SAFETY_INTENT_KEY = 'mood_safety_alert';
const NUDGE_LAST_CHECKED_KEY = 'moodTrendAlert:nudgeScheduledAt';
const SAFETY_LAST_CHECKED_KEY = 'moodTrendAlert:safetyScheduledAt';
const SCHEDULE_INTERVAL_MS = 20 * 60 * 60 * 1000; // don't reschedule more than once per 20h

async function shouldReschedule(storageKey: string): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(storageKey);
    if (!raw) return true;
    const last = parseInt(raw, 10);
    return Date.now() - last > SCHEDULE_INTERVAL_MS;
  } catch (e) {
    if (__DEV__) logger.debug('[moodTrendAlert] shouldReschedule', e);
    return true;
  }
}

async function markScheduled(storageKey: string): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey, String(Date.now()));
  } catch (e) {
    if (__DEV__) logger.debug('[moodTrendAlert] markScheduled', e);
  }
}

function tomorrowAt(hours: number, minutes = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

async function setOneShotIntent(input: {
  logicalKey: string;
  identifier: string;
  title: string;
  body: string;
  dest: string;
  notifType: string;
  triggerDate: Date;
}): Promise<void> {
  await setIntent(input.logicalKey, {
    type: 'ONE_SHOT',
    notifType: input.notifType,
    dest: input.dest,
    title: input.title,
    body: input.body,
    triggerDate: input.triggerDate.toISOString(),
    identifier: input.identifier,
    categoryIdentifier: 'general',
    channelId: 'reminder-chime',
  });
}

/**
 * Evaluate mood logs and schedule appropriate proactive notifications.
 *
 * @param lastMoodLogISO - ISO timestamp of the user's most recent mood log (or null if none)
 * @param lastMoodScore  - The mood score of that last log (1-5), or null
 */
export async function scheduleMoodTrendAlerts(
  lastMoodLogISO: string | null,
  lastMoodScore: number | null,
): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    const now = Date.now();
    const lastLogMs = lastMoodLogISO ? new Date(lastMoodLogISO).getTime() : null;
    const daysSinceLog = lastLogMs != null ? Math.floor((now - lastLogMs) / 86400000) : null;

    let changed = false;

    // ── Check-in nudge: 3+ days without logging ──────────────────────────
    if (daysSinceLog === null || daysSinceLog >= 3) {
      if (await shouldReschedule(NUDGE_LAST_CHECKED_KEY)) {
        await setOneShotIntent({
          logicalKey: MOOD_NUDGE_INTENT_KEY,
          identifier: MOOD_NUDGE_INTENT_KEY,
          title: 'How are you doing?',
          body: "It's been a few days since your last check-in. One tap — Reclaim is listening.",
          dest: 'Mood',
          notifType: 'MOOD_NUDGE',
          triggerDate: tomorrowAt(11, 0),
        });
        await markScheduled(NUDGE_LAST_CHECKED_KEY);
        changed = true;
        logger.info('[MoodTrendAlert] check-in nudge scheduled');
      }
    } else {
      await clearIntent(MOOD_NUDGE_INTENT_KEY);
      changed = true;
    }

    // ── Safety alert: last log was low AND ≥ 2 days have passed ─────────
    const isLowMood = lastMoodScore !== null && lastMoodScore <= 2;
    const isStale = daysSinceLog !== null && daysSinceLog >= 2;

    if (isLowMood && isStale) {
      if (await shouldReschedule(SAFETY_LAST_CHECKED_KEY)) {
        await setOneShotIntent({
          logicalKey: MOOD_SAFETY_INTENT_KEY,
          identifier: MOOD_SAFETY_INTENT_KEY,
          title: 'Checking in with you',
          body: 'Your last check-in showed a rough patch. How are you feeling now?',
          dest: 'Mood',
          notifType: 'MOOD_SAFETY',
          triggerDate: tomorrowAt(10, 30),
        });
        await markScheduled(SAFETY_LAST_CHECKED_KEY);
        changed = true;
        logger.info('[MoodTrendAlert] safety alert scheduled (last score:', lastMoodScore, ')');
      }
    } else {
      await clearIntent(MOOD_SAFETY_INTENT_KEY);
      changed = true;
    }

    if (changed) {
      await reconcileNotifications();
    }
  } catch (e) {
    logger.warn('[MoodTrendAlert] failed (non-blocking):', e);
  }
}
