import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadSleepSettings } from '@/lib/sleepSettings';
import type { InsightMatch } from '@/lib/insights/InsightEngine';
import { logger } from '@/lib/logger';

export const DAILY_SIGNAL_NOTIFICATION_ID = 'reclaim-daily-signal';
const LAST_SCHEDULED_KEY = '@reclaim/daily_signal/lastScheduled';
const LAST_INSIGHT_KEY = '@reclaim/daily_signal/lastInsightId';

/** Returns true if we haven't scheduled today yet, or the insight has changed. */
async function shouldReschedule(insightId: string): Promise<boolean> {
  try {
    const [lastDate, lastId] = await Promise.all([
      AsyncStorage.getItem(LAST_SCHEDULED_KEY),
      AsyncStorage.getItem(LAST_INSIGHT_KEY),
    ]);

    if (!lastDate) return true;

    const today = new Date().toDateString();
    if (new Date(lastDate).toDateString() !== today) return true;

    // Same day but insight changed → reschedule with new content
    return lastId !== insightId;
  } catch {
    return true;
  }
}

/**
 * Schedule the daily signal notification for tomorrow morning.
 * Called client-side whenever the app is foregrounded and the top insight is available.
 * Content is pre-computed (insight message) and embedded at schedule time.
 * Cancels any previous version and re-schedules with fresh content.
 */
export async function scheduleDailySignalNotification(insight: InsightMatch): Promise<void> {
  try {
    const insightId = String(insight.id ?? insight.sourceTag ?? '').trim();
    if (!insightId) return;

    if (!(await shouldReschedule(insightId))) return;

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    const sleepSettings = await loadSleepSettings();
    const wakeHHMM = sleepSettings?.typicalWakeHHMM;

    // Default to 08:00; add 20 minutes after wake time if set
    let hour = 8;
    let minute = 20;

    if (wakeHHMM) {
      const parts = wakeHHMM.split(':').map(Number);
      const h = parts[0] ?? 8;
      const m = parts[1] ?? 0;
      if (!isNaN(h) && !isNaN(m)) {
        const totalMin = h * 60 + m + 20;
        hour = Math.floor(totalMin / 60) % 24;
        minute = totalMin % 60;
      }
    }

    // Cancel previous daily signal
    await Notifications.cancelScheduledNotificationAsync(DAILY_SIGNAL_NOTIFICATION_ID).catch(
      () => {},
    );

    // Truncate message to fit a push notification body (150 chars max)
    const body =
      insight.message.length > 150 ? insight.message.slice(0, 147) + '…' : insight.message;

    // Build a concrete Date for tomorrow at the target wake time
    const notifDate = new Date();
    notifDate.setDate(notifDate.getDate() + 1);
    notifDate.setHours(hour, minute, 0, 0);

    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_SIGNAL_NOTIFICATION_ID,
      content: {
        title: 'Your signal for today',
        body,
        data: {
          type: 'DAILY_SIGNAL',
          dest: 'Home',
          insightId,
          appTag: 'reclaim',
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: notifDate,
      } as Notifications.DateTriggerInput,
    });

    await Promise.all([
      AsyncStorage.setItem(LAST_SCHEDULED_KEY, new Date().toISOString()),
      AsyncStorage.setItem(LAST_INSIGHT_KEY, insightId),
    ]);

    logger.debug('[DailySignal] Scheduled for', `${hour}:${String(minute).padStart(2, '0')}`, {
      insightId,
    });
  } catch (e) {
    if (__DEV__) logger.debug('[DailySignal] schedule failed (non-blocking)', e);
  }
}
