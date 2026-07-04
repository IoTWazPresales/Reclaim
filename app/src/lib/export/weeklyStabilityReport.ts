/**
 * Weekly Stability Report — data assembly + share/export.
 * One source of truth for the report body: the same narrative that powers the
 * Sunday-evening notification, expanded with forecast accuracy for sharing.
 */
import { Share } from 'react-native';
import {
  listMoodCheckins,
  listSleepSessions,
  listTrainingSessions,
  listMeds,
  listMedDoseLogsForInsights,
  computeAdherenceFromSchedule,
  isScheduledMed,
  type MedDoseLog,
} from '@/lib/api';
import { getStreakStore } from '@/lib/streaks';
import { getForecastAccuracySummary } from '@/lib/forecastJournal';
import {
  buildWeeklyStabilityNarrative,
  type WeeklyStats,
} from '@/lib/notifications/weeklyNarrativeNotification';
import { logger } from '@/lib/logger';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function safeSummary(summary: unknown): Record<string, any> | null {
  if (!summary) return null;
  if (typeof summary === 'string') {
    try {
      const parsed = JSON.parse(summary);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }
  return typeof summary === 'object' ? (summary as Record<string, any>) : null;
}

/** Assemble this week's stats from the canonical stores (device-first). */
export async function buildWeeklyStabilityStats(): Promise<WeeklyStats> {
  const cutoff = Date.now() - WEEK_MS;

  const [checkins, sleepSessions, trainingSessions, meds, doseLogs, streaks] = await Promise.all([
    listMoodCheckins(60).catch(() => []),
    listSleepSessions(7).catch(() => []),
    listTrainingSessions(30).catch(() => []),
    listMeds().catch(() => []),
    listMedDoseLogsForInsights(7).catch(() => [] as MedDoseLog[]),
    getStreakStore().catch(() => null),
  ]);

  const weekRatings = (checkins as Array<{ mood?: number; created_at?: string }>)
    .filter((c) => new Date(c.created_at ?? 0).getTime() >= cutoff)
    .map((c) => c.mood)
    .filter((v): v is number => typeof v === 'number');
  const moodAvg = weekRatings.length
    ? weekRatings.reduce((s, v) => s + v, 0) / weekRatings.length
    : null;
  const moodTrend =
    weekRatings.length >= 4
      ? weekRatings[0] > weekRatings[weekRatings.length - 1]
        ? ('down' as const)
        : weekRatings[0] < weekRatings[weekRatings.length - 1]
          ? ('up' as const)
          : ('stable' as const)
      : null;

  const durations = (sleepSessions as Array<{ duration_minutes?: number | null; durationMinutes?: number | null }>)
    .map((s) => s.duration_minutes ?? s.durationMinutes)
    .filter((v): v is number => typeof v === 'number' && v > 0);
  const sleepAvgHours = durations.length
    ? durations.reduce((s, v) => s + v, 0) / durations.length / 60
    : null;

  const weekSessions = (trainingSessions as Array<{ started_at?: string | null; summary?: unknown }>).filter(
    (s) => s.started_at && new Date(s.started_at).getTime() >= cutoff,
  );
  const trainingPRCount = weekSessions.reduce((n, s) => {
    const prs = safeSummary(s.summary)?.prs;
    return n + (Array.isArray(prs) ? prs.length : 0);
  }, 0);

  const scheduledMeds = (meds as Parameters<typeof computeAdherenceFromSchedule>[1]).filter((m) =>
    isScheduledMed(m as any),
  );
  const adherence =
    scheduledMeds.length > 0
      ? computeAdherenceFromSchedule(doseLogs as MedDoseLog[], scheduledMeds, 7)
      : null;
  const medAdherencePct = adherence && adherence.scheduled > 0 ? adherence.pct : null;

  return {
    moodAvg,
    moodTrend,
    sleepAvgHours,
    trainingSessionCount: weekSessions.length,
    trainingPRCount,
    medAdherencePct,
    streakCount: streaks?.mood?.count ?? null,
  };
}

/** Full shareable report text (notification narrative + forecast accuracy). */
export async function composeWeeklyStabilityReportText(): Promise<string> {
  const stats = await buildWeeklyStabilityStats();
  const narrative = buildWeeklyStabilityNarrative(stats);
  const forecast = await getForecastAccuracySummary(7);

  const lines = [
    'Reclaim — Weekly Stability Report',
    new Date().toLocaleDateString(),
    '',
    narrative,
  ];
  if (forecast.line) {
    lines.push('', forecast.line);
  }
  return lines.join('\n');
}

/** Open the system share sheet with this week's stability report. */
export async function shareWeeklyStabilityReport(): Promise<void> {
  try {
    const text = await composeWeeklyStabilityReportText();
    await Share.share({ message: text, title: 'Weekly Stability Report' });
  } catch (e) {
    logger.warn('[WeeklyReport] share failed', e);
    throw e;
  }
}
