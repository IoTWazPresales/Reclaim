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
 *
 * Called from Dashboard.tsx on mount / mood change.
 */

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/lib/logger';

const NUDGE_ID = 'mood-checkin-nudge';
const SAFETY_ID = 'mood-safety-alert';
const NUDGE_LAST_CHECKED_KEY = 'moodTrendAlert:nudgeScheduledAt';
const SAFETY_LAST_CHECKED_KEY = 'moodTrendAlert:safetyScheduledAt';
const SCHEDULE_INTERVAL_MS = 20 * 60 * 60 * 1000; // don't reschedule more than once per 20h

async function shouldReschedule(storageKey: string): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(storageKey);
    if (!raw) return true;
    const last = parseInt(raw, 10);
    return Date.now() - last > SCHEDULE_INTERVAL_MS;
  } catch {
    return true;
  }
}

async function markScheduled(storageKey: string): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey, String(Date.now()));
  } catch {
    // non-fatal
  }
}

function tomorrowAt(hours: number, minutes = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hours, minutes, 0, 0);
  return d;
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

    // ── Check-in nudge: 3+ days without logging ──────────────────────────
    if (daysSinceLog === null || daysSinceLog >= 3) {
      if (await shouldReschedule(NUDGE_LAST_CHECKED_KEY)) {
        await Notifications.cancelScheduledNotificationAsync(NUDGE_ID).catch((e) => { if (__DEV__) logger.debug('[moodTrendAlert]', e); });
        await Notifications.scheduleNotificationAsync({
          identifier: NUDGE_ID,
          content: {
            title: 'How are you doing?',
            body: "It's been a few days since your last check-in. One tap — Reclaim is listening.",
            data: { type: 'MOOD_NUDGE', dest: 'Mood' },
            categoryIdentifier: 'general',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: tomorrowAt(11, 0),
          },
        });
        await markScheduled(NUDGE_LAST_CHECKED_KEY);
        logger.info('[MoodTrendAlert] check-in nudge scheduled');
      }
    } else {
      // User logged recently — cancel any pending nudge
      await Notifications.cancelScheduledNotificationAsync(NUDGE_ID).catch((e) => { if (__DEV__) logger.debug('[moodTrendAlert]', e); });
    }

    // ── Safety alert: last log was low AND ≥ 2 days have passed ─────────
    const isLowMood = lastMoodScore !== null && lastMoodScore <= 2;
    const isStale = daysSinceLog !== null && daysSinceLog >= 2;

    if (isLowMood && isStale) {
      if (await shouldReschedule(SAFETY_LAST_CHECKED_KEY)) {
        await Notifications.cancelScheduledNotificationAsync(SAFETY_ID).catch((e) => { if (__DEV__) logger.debug('[moodTrendAlert]', e); });
        await Notifications.scheduleNotificationAsync({
          identifier: SAFETY_ID,
          content: {
            title: 'Checking in with you',
            body: 'Your last check-in showed a rough patch. How are you feeling now?',
            data: { type: 'MOOD_SAFETY', dest: 'Mood' },
            categoryIdentifier: 'general',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: tomorrowAt(10, 30),
          },
        });
        await markScheduled(SAFETY_LAST_CHECKED_KEY);
        logger.info('[MoodTrendAlert] safety alert scheduled (last score:', lastMoodScore, ')');
      }
    } else {
      await Notifications.cancelScheduledNotificationAsync(SAFETY_ID).catch((e) => { if (__DEV__) logger.debug('[moodTrendAlert]', e); });
    }
  } catch (e) {
    logger.warn('[MoodTrendAlert] failed (non-blocking):', e);
  }
}
