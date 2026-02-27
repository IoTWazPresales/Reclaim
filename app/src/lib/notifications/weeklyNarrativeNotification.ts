import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/lib/logger';

export const WEEKLY_NARRATIVE_NOTIFICATION_ID = 'reclaim-weekly-narrative';
const LAST_WEEK_KEY = '@reclaim/weekly_narrative/lastWeekNumber';

/** ISO week number 1–53 */
function isoWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

async function shouldRescheduleThisWeek(): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(LAST_WEEK_KEY);
    if (!stored) return true;
    return parseInt(stored, 10) !== isoWeekNumber(new Date());
  } catch {
    return true;
  }
}

export type WeeklyStats = {
  moodAvg: number | null;
  moodTrend: 'up' | 'down' | 'stable' | null;
  sleepAvgHours: number | null;
  trainingSessionCount: number;
  medAdherencePct: number | null;
  streakCount: number | null;
};

function buildNarrative(stats: WeeklyStats): string {
  const parts: string[] = [];

  // Mood
  if (stats.moodAvg !== null) {
    const moodStr = stats.moodAvg >= 4 ? 'high' : stats.moodAvg >= 3 ? 'moderate' : 'low';
    const trendSuffix =
      stats.moodTrend === 'up'
        ? ', trending up'
        : stats.moodTrend === 'down'
          ? ', trending down'
          : '';
    parts.push(`Mood: ${moodStr}${trendSuffix}`);
  }

  // Sleep
  if (stats.sleepAvgHours !== null) {
    parts.push(`Sleep avg: ${stats.sleepAvgHours.toFixed(1)}h`);
  }

  // Training
  if (stats.trainingSessionCount > 0) {
    parts.push(`Training: ${stats.trainingSessionCount} session${stats.trainingSessionCount !== 1 ? 's' : ''}`);
  }

  // Meds
  if (stats.medAdherencePct !== null) {
    parts.push(`Meds: ${Math.round(stats.medAdherencePct)}% adherence`);
  }

  // Streak
  if (stats.streakCount !== null && stats.streakCount > 0) {
    parts.push(`${stats.streakCount}-day streak`);
  }

  if (!parts.length) {
    return 'Open Reclaim to see your weekly summary and stay on track.';
  }

  const summary = parts.join(' · ');

  // Forward-looking sentence
  let forward = '';
  if (stats.moodTrend === 'down' && stats.trainingSessionCount === 0) {
    forward = ' A single training session next week could shift the pattern.';
  } else if (stats.moodTrend === 'up') {
    forward = ' Keep the momentum going.';
  } else if (stats.streakCount !== null && stats.streakCount >= 7) {
    forward = ' Your consistency is compounding.';
  }

  return summary + forward;
}

/**
 * Schedule the weekly narrative notification for Sunday at 19:30.
 * Idempotent — skips if already scheduled this week.
 */
export async function scheduleWeeklyNarrativeNotification(stats: WeeklyStats): Promise<void> {
  try {
    if (!(await shouldRescheduleThisWeek())) return;

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    const narrative = buildNarrative(stats);

    await Notifications.cancelScheduledNotificationAsync(WEEKLY_NARRATIVE_NOTIFICATION_ID).catch(
      () => {},
    );

    // Sunday = weekday 1 in Expo's calendar trigger (1=Sunday … 7=Saturday)
    await Notifications.scheduleNotificationAsync({
      identifier: WEEKLY_NARRATIVE_NOTIFICATION_ID,
      content: {
        title: 'Your week in Reclaim',
        body: narrative,
        data: {
          type: 'WEEKLY_NARRATIVE',
          dest: 'Home',
          appTag: 'reclaim',
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 1, // Sunday
        hour: 19,
        minute: 30,
      } as Notifications.WeeklyTriggerInput,
    });

    await AsyncStorage.setItem(LAST_WEEK_KEY, String(isoWeekNumber(new Date())));

    logger.debug('[WeeklyNarrative] Scheduled for Sunday 19:30');
  } catch (e) {
    if (__DEV__) logger.debug('[WeeklyNarrative] schedule failed (non-blocking)', e);
  }
}
