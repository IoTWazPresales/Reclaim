/**
 * Weekly Stability Report — Sunday evening notification.
 * Routed through the intent store + reconcileNotifications (single pipeline);
 * a bare scheduleNotificationAsync entry without a logicalKey would be
 * cancelled by the reconciler on its next pass.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { logger } from '@/lib/logger';
import { setIntent } from '@/lib/notifications/NotificationIntentStore';
import { reconcileNotifications } from '@/lib/notifications/NotificationScheduler';

export const WEEKLY_REPORT_INTENT_KEY = 'weekly_report';
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
  /** PRs recorded across this week's sessions. */
  trainingPRCount?: number;
  medAdherencePct: number | null;
  streakCount: number | null;
  /** One insight line for the week (from the insight engine). */
  insightLine?: string | null;
  /** One focus for next week (from the forecast/action model). */
  focusLine?: string | null;
};

export function buildWeeklyStabilityNarrative(stats: WeeklyStats): string {
  const parts: string[] = [];

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

  if (stats.sleepAvgHours !== null) {
    parts.push(`Sleep avg: ${stats.sleepAvgHours.toFixed(1)}h`);
  }

  if (stats.trainingSessionCount > 0) {
    const prSuffix =
      stats.trainingPRCount && stats.trainingPRCount > 0 ? ` (${stats.trainingPRCount} PR${stats.trainingPRCount > 1 ? 's' : ''})` : '';
    parts.push(`Training: ${stats.trainingSessionCount} session${stats.trainingSessionCount !== 1 ? 's' : ''}${prSuffix}`);
  }

  if (stats.medAdherencePct !== null) {
    parts.push(`Meds: ${Math.round(stats.medAdherencePct)}% adherence`);
  }

  if (stats.streakCount !== null && stats.streakCount > 0) {
    parts.push(`${stats.streakCount}-day streak`);
  }

  if (!parts.length) {
    return 'Open Reclaim to see your weekly stability report.';
  }

  let out = parts.join(' · ');

  if (stats.insightLine) {
    out += `\nInsight: ${stats.insightLine}`;
  }

  const focus =
    stats.focusLine ??
    (stats.moodTrend === 'down' && stats.trainingSessionCount === 0
      ? 'One training session next week could shift the pattern.'
      : stats.moodTrend === 'up'
        ? 'Keep the momentum going.'
        : stats.streakCount !== null && stats.streakCount >= 7
          ? 'Your consistency is compounding.'
          : null);
  if (focus) {
    out += `\nFocus: ${focus}`;
  }

  return out;
}

/**
 * Schedule the Weekly Stability Report for Sunday at 19:30 (intent + reconcile).
 * Idempotent — content refreshes at most once per calendar week.
 */
export async function scheduleWeeklyNarrativeNotification(stats: WeeklyStats): Promise<void> {
  try {
    if (!(await shouldRescheduleThisWeek())) return;

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;

    const narrative = buildWeeklyStabilityNarrative(stats);

    await setIntent(WEEKLY_REPORT_INTENT_KEY, {
      type: 'WEEKLY_REPORT',
      weekday: 1, // Sunday (Expo calendar trigger: 1=Sunday … 7=Saturday)
      hour: 19,
      minute: 30,
      title: 'Weekly Stability Report',
      body: narrative,
    });
    await reconcileNotifications();

    await AsyncStorage.setItem(LAST_WEEK_KEY, String(isoWeekNumber(new Date())));

    logger.debug('[WeeklyReport] Intent set for Sunday 19:30');
  } catch (e) {
    if (__DEV__) logger.debug('[WeeklyReport] schedule failed (non-blocking)', e);
  }
}
