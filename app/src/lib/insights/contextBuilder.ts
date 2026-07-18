// C:\Reclaim\app\src\lib\insights\contextBuilder.ts
//
// Input policy (local-first where promoted):
// - Mood: `listMoodCheckins` → device-first canonical merge (server + pending outbox) via moodService.
// - Sleep: `listSleepSessionsForInsights` → SQLite mirror ∪ remote; empty remote does not erase local rows.
// - Med adherence: `listMedDoseLogsForInsights` → local AsyncStorage logs merged with `meds_log` (deduped by med+slot).
// - Activity daily, training, feedback: remote-first here; no localData reader for activity in this slice (see bypass in release notes if needed).
// - Each `Promise.all` arm `.catch`es so one failed source does not zero the full context.
import {
  listMoodCheckins,
  listSleepSessionsForInsights,
  listDailyActivitySummaries,
  listMedDoseLogsForInsights,
  listMeds,
  listTrainingSessions,
  computeAdherenceFromSchedule,
  isScheduledMed,
  listLatestInsightFeedback,
  type Med,
  type MoodCheckin,
  type SleepSession,
  type DailyActivitySummary,
  type MedDoseLog,
  type TrainingSessionRow,
  type InsightFeedbackLatestIndex,
  type InsightFeedbackRow,
  type MedSchedule,
} from '@/lib/api';
import { fetchHeartRateContextSummary } from '@/lib/health/fetchHeartRateContextSummary';
import { logger } from '@/lib/logger';
import type { InsightContext } from './InsightEngine';
import type { RestingHeartRateTrendSummary } from '@/lib/health/heartRateRestingSummary';
import { buildCalendarInsightContext } from './calendarInsightContext';
import { buildSleepInsightContext, sleepSessionDurationHours } from './sleepInsightContext';
import { buildTrainingInsightContext } from './trainingInsightContext';
import { buildMedicationInsightHints } from './medicationInsightHints';
import {
  aggregateMedDomainOverlapForMeds,
  buildFusionInsightHints,
  insightContextToFusionUserState,
} from '@/lib/medCatalogFusion';

function vitalsFromRestingSummary(summary: RestingHeartRateTrendSummary): InsightContext['vitals'] {
  return {
    restingHrTrendLabel: summary.trendLabel,
    restingHrSufficiency: summary.sufficiency,
  };
}

/** Canonical insight lookback windows — single source for insights + med-detail context. */
export const INSIGHT_MOOD_LOOKBACK_DAYS = 30;
export const INSIGHT_SLEEP_LOOKBACK_DAYS = 14;
export const INSIGHT_MED_LOG_LOOKBACK_DAYS = 7;
export const INSIGHT_ACTIVITY_LOOKBACK_DAYS = 14;
export const INSIGHT_TRAINING_LOOKBACK_DAYS = 30;

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

/** Mood trend windows use calendar age, not “last N logs regardless of date”. */
export const MOOD_TREND_RECENT_MAX_AGE_DAYS = 3;
export const MOOD_TREND_PAST_MIN_AGE_DAYS = 3;
export const MOOD_TREND_PAST_MAX_AGE_DAYS = 10;

function moodEntryTs(e: { ts: number; created_at: string | null }): number {
  return Number.isFinite(e.ts) ? e.ts : new Date(e.created_at ?? 0).getTime();
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

  const sorted = parsed.sort((a, b) => moodEntryTs(b) - moodEntryTs(a));

  const now = Date.now();
  const latest = sorted[0];
  const latestTs = latest ? moodEntryTs(latest) : NaN;
  const latestAgeDays =
    Number.isFinite(latestTs) && latestTs > 0 ? (now - latestTs) / MS_PER_DAY : Number.POSITIVE_INFINITY;
  const latestIsFresh = latestAgeDays <= MOOD_TREND_RECENT_MAX_AGE_DAYS;
  const latestMood = latestIsFresh ? latest?.mood : undefined;

  // Baseline = older window, excluding latest (still useful when latest is fresh)
  const baselineWindow = sorted
    .slice(1, 15)
    .map((e) => e.mood)
    .filter((v): v is number => typeof v === 'number');

  const baselineAverage = average(baselineWindow);

  const deltaVsBaseline =
    baselineAverage !== undefined && latestMood !== undefined ? latestMood - baselineAverage : undefined;

  // Trend = logs in last 3 calendar days vs logs 3–10 days ago (not index slices of stale history)
  const recentWindow = sorted
    .filter((e) => {
      const age = (now - moodEntryTs(e)) / MS_PER_DAY;
      return age >= 0 && age <= MOOD_TREND_RECENT_MAX_AGE_DAYS;
    })
    .map((e) => e.mood)
    .filter((v): v is number => typeof v === 'number');

  const recentAverage = average(recentWindow);

  const pastWindow = sorted
    .filter((e) => {
      const age = (now - moodEntryTs(e)) / MS_PER_DAY;
      return age > MOOD_TREND_PAST_MIN_AGE_DAYS && age <= MOOD_TREND_PAST_MAX_AGE_DAYS;
    })
    .map((e) => e.mood)
    .filter((v): v is number => typeof v === 'number');

  const pastAverage =
    pastWindow.length > 0
      ? average(pastWindow)
      : latestIsFresh
        ? baselineAverage ??
          average(sorted.map((e) => e.mood).filter((v): v is number => typeof v === 'number'))
        : undefined;

  const trend3dPct =
    latestIsFresh &&
    recentAverage !== undefined &&
    pastAverage !== undefined &&
    pastAverage !== 0 &&
    recentWindow.length > 0
      ? ((recentAverage - pastAverage) / pastAverage) * 100
      : undefined;

  // Use the most recent entry that actually has tags (freshness not required for tags alone)
  const tagSource = sorted.find((e) => (e.tags ?? []).length > 0);
  const tags = Array.from(new Set((tagSource?.tags ?? []).filter(Boolean)));

  // Behavior signal: daysSinceSocial
  let daysSinceSocial: number | undefined;

  const latestSocial = sorted.find((e) => (e.tags ?? []).some((t) => t === 'social' || t === 'connected'));
  if (latestSocial) {
    const t = moodEntryTs(latestSocial);
    const diff = now - t;
    if (diff >= 0) daysSinceSocial = Math.floor(diff / MS_PER_DAY);
  }

  // Flags derived from tags (BOOLEAN to match InsightContext)
  const stressTags = new Set(['stressed', 'overwhelmed', 'anxious', 'stress']);
  const stress = tags.some((t) => stressTags.has(String(t).toLowerCase()));

  const moodSlice =
    latestMood !== undefined || deltaVsBaseline !== undefined || trend3dPct !== undefined
      ? {
          ...(latestMood !== undefined ? { last: latestMood } : {}),
          ...(deltaVsBaseline !== undefined ? { deltaVsBaseline } : {}),
          ...(trend3dPct !== undefined ? { trend3dPct } : {}),
        }
      : undefined;

  return {
    mood: moodSlice,
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

function medsContext(
  logs: MedDoseLog[],
  meds: { id?: string; name?: string; schedule?: MedSchedule }[],
  fusionSlice: Pick<InsightContext, 'mood' | 'sleep' | 'training' | 'flags' | 'tags'>,
): InsightContext['meds'] {
  if (!meds.length && !logs.length) return undefined;

  const fusionUserState = insightContextToFusionUserState(fusionSlice);
  const domainOverlap = aggregateMedDomainOverlapForMeds(meds, fusionUserState);

  const hints = [
    ...buildMedicationInsightHints(logs, meds, domainOverlap),
    ...buildFusionInsightHints(domainOverlap),
  ];
  const dedupedHints: string[] = [];
  for (const h of hints) {
    if (!dedupedHints.includes(h)) dedupedHints.push(h);
  }

  const hasScheduled = meds.some((m) => m.id && isScheduledMed(m as Pick<Med, 'schedule'>));
  const adherencePct7d = hasScheduled ? computeAdherenceFromSchedule(logs, meds, 7).pct : undefined;

  if (
    adherencePct7d === undefined &&
    dedupedHints.length === 0 &&
    Object.keys(domainOverlap).length === 0
  ) {
    return undefined;
  }

  const out: NonNullable<InsightContext['meds']> = {};
  if (adherencePct7d !== undefined) out.adherencePct7d = adherencePct7d;
  if (dedupedHints.length) out.contextHints = dedupedHints.slice(0, 3);
  if (Object.keys(domainOverlap).length) out.domainOverlap = domainOverlap;
  return out;
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
  // `listMoodCheckins` → canonical merged server + pending outbox (moodService).
  // Sleep/med insight paths prefer local + merge (see module header). Other inputs use Supabase; failures are isolated.
  const [moods, sleepSessions, activity, medLogs, meds, feedback, trainingSessions, restingHrSummary, calendar] =
    await Promise.all([
      listMoodCheckins(INSIGHT_MOOD_LOOKBACK_DAYS).catch((e) => {
        logger.warn('[insights] listMoodCheckins failed; mood context empty', e);
        return [] as MoodCheckin[];
      }),
      listSleepSessionsForInsights(INSIGHT_SLEEP_LOOKBACK_DAYS).catch((e) => {
        logger.warn('[insights] listSleepSessionsForInsights failed; sleep context empty', e);
        return [] as SleepSession[];
      }),
      listDailyActivitySummaries(INSIGHT_ACTIVITY_LOOKBACK_DAYS).catch((e) => {
        logger.warn('[insights] listDailyActivitySummaries failed; steps empty', e);
        return [] as DailyActivitySummary[];
      }),
      listMedDoseLogsForInsights(INSIGHT_MED_LOG_LOOKBACK_DAYS).catch((e) => {
        logger.warn('[insights] listMedDoseLogsForInsights failed; med log slice empty', e);
        return [] as MedDoseLog[];
      }),
      listMeds().catch((e) => {
        logger.warn('[insights] listMeds failed; med schedule list empty', e);
        return [] as Awaited<ReturnType<typeof listMeds>>;
      }),
      listLatestInsightFeedback(250).catch((e) => {
        logger.warn('[insights] listLatestInsightFeedback failed; feedback index empty', e);
        return { latestByInsightId: {} as InsightFeedbackLatestIndex, rows: [] as InsightFeedbackRow[] };
      }),
      listTrainingSessions(INSIGHT_TRAINING_LOOKBACK_DAYS).catch((e) => {
        logger.warn('[insights] listTrainingSessions failed; training slice empty', e);
        return [] as TrainingSessionRow[];
      }),
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
  const training = buildTrainingInsightContext(trainingSessions ?? []);
  const fusionSlice = { mood, sleep, training, flags, tags };
  const medsContextResult = medsContext(medLogs, meds ?? [], fusionSlice);
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
