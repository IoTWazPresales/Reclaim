// C:\Reclaim\app\src\lib\insights\contextBuilder.ts
import {
  listMoodCheckins,
  listSleepSessions,
  listDailyActivitySummaries,
  listMedDoseLogsRemoteLastNDays,
  listMeds,
  listTrainingSessions,
  computeAdherenceFromSchedule,
  listLatestInsightFeedback,
  type MoodCheckin,
  type SleepSession,
  type DailyActivitySummary,
  type MedDoseLog,
  type TrainingSessionRow,
  type InsightFeedbackLatestIndex,
  type InsightFeedbackRow,
} from '@/lib/api';
import { fetchHeartRateContextSummary } from '@/lib/health/fetchHeartRateContextSummary';
import { logger } from '@/lib/logger';
import type { InsightContext } from './InsightEngine';
import type { RestingHeartRateTrendSummary } from '@/lib/health/heartRateRestingSummary';
import { buildCalendarInsightContext } from './calendarInsightContext';
import { buildSleepInsightContext, sleepSessionDurationHours } from './sleepInsightContext';
import { buildTrainingInsightContext } from './trainingInsightContext';

function vitalsFromRestingSummary(summary: RestingHeartRateTrendSummary): InsightContext['vitals'] {
  return {
    restingHrTrendLabel: summary.trendLabel,
    restingHrSufficiency: summary.sufficiency,
  };
}

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

function average(values: number[]): number | undefined {
  if (!values.length) return undefined;
  const total = values.reduce((sum, v) => sum + v, 0);
  return total / values.length;
}

function parseTags(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .filter(Boolean)
      .map((t) => String(t).trim())
      .filter(Boolean);
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .filter(Boolean)
          .map((t) => String(t).trim())
          .filter(Boolean);
      }
    } catch {
      // ignore
    }
    return raw
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
}

function moodContext(moods: MoodCheckin[]): {
  mood: InsightContext['mood'];
  tags: string[];
  behavior: InsightContext['behavior'];
  flags: InsightContext['flags'];
} {
  if (!moods.length) {
    return { mood: undefined, tags: [], behavior: undefined, flags: undefined };
  }

  const parsed = moods.map((m) => {
    const moodVal = (m as any)?.rating ?? (m as any)?.mood ?? null;

    const tsRaw = (m as any)?.ts ?? (m as any)?.created_at ?? null;
    const ts = tsRaw ? new Date(tsRaw).getTime() : NaN;

    const tags = parseTags((m as any)?.tags);

    return {
      mood: typeof moodVal === 'number' ? moodVal : undefined,
      ts,
      created_at: (m as any)?.created_at ?? null,
      tags,
    };
  });

  const sorted = parsed.sort((a, b) => {
    const ta = Number.isFinite(a.ts) ? a.ts : new Date(a.created_at ?? 0).getTime();
    const tb = Number.isFinite(b.ts) ? b.ts : new Date(b.created_at ?? 0).getTime();
    return tb - ta;
  });

  const latest = sorted[0];
  const latestMood = latest?.mood;

  // Baseline = older window, excluding latest
  const baselineWindow = sorted
    .slice(1, 15)
    .map((e) => e.mood)
    .filter((v): v is number => typeof v === 'number');

  const baselineAverage = average(baselineWindow);

  const deltaVsBaseline =
    baselineAverage !== undefined && latestMood !== undefined ? latestMood - baselineAverage : undefined;

  // Trend = recent 3 vs older 7 (or baseline)
  const recentWindow = sorted
    .slice(0, 3)
    .map((e) => e.mood)
    .filter((v): v is number => typeof v === 'number');

  const recentAverage = average(recentWindow);

  const pastWindow = sorted
    .slice(3, 10)
    .map((e) => e.mood)
    .filter((v): v is number => typeof v === 'number');

  const pastAverage =
    pastWindow.length > 0
      ? average(pastWindow)
      : baselineAverage ??
        average(sorted.map((e) => e.mood).filter((v): v is number => typeof v === 'number'));

  const trend3dPct =
    recentAverage !== undefined && pastAverage !== undefined && pastAverage !== 0
      ? ((recentAverage - pastAverage) / pastAverage) * 100
      : undefined;

  // Use the most recent entry that actually has tags
  const tagSource = sorted.find((e) => (e.tags ?? []).length > 0);
  const tags = Array.from(new Set((tagSource?.tags ?? []).filter(Boolean)));

  // Behavior signal: daysSinceSocial
  let daysSinceSocial: number | undefined;
  const now = Date.now();

  const latestSocial = sorted.find((e) => (e.tags ?? []).some((t) => t === 'social' || t === 'connected'));
  if (latestSocial) {
    const t = Number.isFinite(latestSocial.ts)
      ? latestSocial.ts
      : new Date(latestSocial.created_at ?? 0).getTime();
    const diff = now - t;
    if (diff >= 0) daysSinceSocial = Math.floor(diff / MS_PER_DAY);
  }

  // Flags derived from tags (BOOLEAN to match InsightContext)
  const stressTags = new Set(['stressed', 'overwhelmed', 'anxious', 'stress']);
  const stress = tags.some((t) => stressTags.has(String(t).toLowerCase()));

  return {
    // NOTE: InsightContext['mood'] does NOT include baseline, so we do not return it.
    mood: {
      last: latestMood,
      deltaVsBaseline,
      trend3dPct,
    },
    tags,
    behavior: daysSinceSocial !== undefined ? { daysSinceSocial } : undefined,
    flags: { stress },
  };
}

function stepsContext(activity: DailyActivitySummary[]): InsightContext['steps'] {
  if (!activity.length) return undefined;
  const sorted = [...activity].sort((a, b) => new Date(b.activity_date).getTime() - new Date(a.activity_date).getTime());
  const latest = sorted[0];
  const steps = latest?.steps ?? null;
  if (steps === null || steps === undefined) return undefined;
  return { lastDay: steps };
}

function medsContext(logs: MedDoseLog[], meds: { id?: string; schedule?: { times: string[]; days: number[] } }[]): InsightContext['meds'] {
  if (!meds.length) return undefined;
  const { pct } = computeAdherenceFromSchedule(logs, meds, 7);
  return { adherencePct7d: pct };
}

function baselineContext(
  moods: MoodCheckin[],
  sleepSessions: SleepSession[],
  activity: DailyActivitySummary[],
): InsightContext['baseline'] {
  // Mood baseline: average of last 30 entries (excluding the very latest to avoid circular)
  const moodValues = moods
    .slice(0, 30)
    .map((m) => {
      const v = (m as any)?.rating ?? (m as any)?.mood ?? null;
      return typeof v === 'number' ? v : null;
    })
    .filter((v): v is number => v !== null);
  const moodAvg = moodValues.length >= 5 ? average(moodValues) : undefined;

  // Sleep baseline: average hours over last 14 sessions
  const sleepHours = sleepSessions
    .slice(0, 14)
    .map(sleepSessionDurationHours)
    .filter((v): v is number => v !== undefined);
  const sleepAvgHours = sleepHours.length >= 5 ? average(sleepHours) : undefined;

  // Steps baseline: average over last 14 days
  const stepsArr = activity
    .slice(0, 14)
    .map((a) => a?.steps ?? null)
    .filter((v): v is number => v !== null);
  const stepsAvg = stepsArr.length >= 5 ? average(stepsArr) : undefined;

  return {
    moodAvg: moodAvg !== undefined ? Number(moodAvg.toFixed(2)) : undefined,
    sleepAvgHours: sleepAvgHours !== undefined ? Number(sleepAvgHours.toFixed(2)) : undefined,
    stepsAvg: stepsAvg !== undefined ? Math.round(stepsAvg) : undefined,
  };
}

export type InsightContextSourceData = {
  moods: MoodCheckin[];
  sleepSessions: SleepSession[];
  activity: DailyActivitySummary[];
  medLogs: MedDoseLog[];
  trainingSessions: TrainingSessionRow[];
  insightFeedbackLatestById: InsightFeedbackLatestIndex;
  insightFeedbackRows?: InsightFeedbackRow[];
};

export type InsightContextResult = {
  context: InsightContext;
  source: InsightContextSourceData;
};

export async function fetchInsightContext(): Promise<InsightContextResult> {
  // `listMoodCheckins` delegates to canonical merged server + pending outbox (see api.ts).
  const [moods, sleepSessions, activity, medLogs, meds, feedback, trainingSessions, restingHrSummary, calendar] =
    await Promise.all([
      listMoodCheckins(30),
      listSleepSessions(14),
      listDailyActivitySummaries(14),
      listMedDoseLogsRemoteLastNDays(7),
      listMeds(),
      listLatestInsightFeedback(250),
      listTrainingSessions(30),
      fetchHeartRateContextSummary().catch((e) => {
        logger.warn('[insights] fetchHeartRateContextSummary failed; vitals omitted', e);
        return null;
      }),
      buildCalendarInsightContext().catch((e) => {
        logger.warn('[insights] buildCalendarInsightContext failed; calendar omitted', e);
        return undefined;
      }),
    ]);

  const { mood, tags, behavior, flags } = moodContext(moods);
  const sleep = buildSleepInsightContext(sleepSessions);
  const steps = stepsContext(activity);
  const medsContextResult = medsContext(medLogs, meds ?? []);
  const training = buildTrainingInsightContext(trainingSessions ?? []);
  const baseline = baselineContext(moods, sleepSessions, activity);
  const vitals = restingHrSummary ? vitalsFromRestingSummary(restingHrSummary) : undefined;

  const insightContext: InsightContext = {
    mood,
    sleep,
    steps,
    meds: medsContextResult,
    behavior,
    tags,
    flags,
    training,
    baseline,
    ...(vitals ? { vitals } : {}),
    ...(calendar ? { calendar } : {}),
  };

  return {
    context: insightContext,
    source: {
      moods,
      sleepSessions,
      activity,
      medLogs,
      trainingSessions: trainingSessions ?? [],
      insightFeedbackLatestById: feedback.latestByInsightId,
      insightFeedbackRows: feedback.rows,
    },
  };
}
