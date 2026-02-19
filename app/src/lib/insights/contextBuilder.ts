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
import type { InsightContext } from './InsightEngine';

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

function getDurationHours(session: SleepSession): number | undefined {
  if (!session?.start_time || !session?.end_time) return undefined;
  const start = new Date(session.start_time).getTime();
  const end = new Date(session.end_time).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return undefined;
  return (end - start) / MS_PER_HOUR;
}

function getMidpointMinutes(session: SleepSession): number | undefined {
  if (!session?.start_time || !session?.end_time) return undefined;
  const start = new Date(session.start_time).getTime();
  const end = new Date(session.end_time).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return undefined;
  const midpoint = new Date(start + (end - start) / 2);
  return midpoint.getHours() * 60 + midpoint.getMinutes();
}

// Absolute delta on a 1440-minute circle: [0..720]
function circularAbsDeltaMinutes(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return Math.min(diff, 1440 - diff);
}

// Signed delta on a 1440-minute circle: [-720..+720]
// positive => later, negative => earlier
function circularSignedDeltaMinutes(a: number, b: number): number {
  const raw = a - b;
  return ((raw + 720) % 1440) - 720;
}

const SLEEP_TARGET_HOURS = 8;

function normaliseQuality(raw: number | null | undefined): number | undefined {
  if (raw == null) return undefined;
  // Some sources return 0–1, others 0–100; normalise to 0–100
  return raw <= 1 ? Math.round(raw * 100) : Math.round(raw);
}

function normaliseEfficiency(raw: number | null | undefined): number | undefined {
  if (raw == null) return undefined;
  return raw <= 1 ? Math.round(raw * 100) : Math.round(raw);
}

function sleepContext(sessions: SleepSession[]): InsightContext['sleep'] {
  if (!sessions.length) return undefined;

  const sorted = [...sessions].sort((a, b) => new Date(b.end_time).getTime() - new Date(a.end_time).getTime());

  const latest = sorted[0];
  const latestDuration = latest ? getDurationHours(latest) : undefined;

  // Quality and stage metrics from the latest session
  const quality = normaliseQuality(latest?.quality);
  const efficiency = normaliseEfficiency(latest?.efficiency);
  const deepMinutes = latest?.metadata?.deepSleepMinutes ?? undefined;
  const remMinutes = latest?.metadata?.remSleepMinutes ?? undefined;

  const lastNight =
    latestDuration !== undefined
      ? {
          hours: Number(latestDuration.toFixed(2)),
          ...(quality !== undefined ? { quality } : {}),
          ...(efficiency !== undefined ? { efficiency } : {}),
          ...(deepMinutes !== undefined ? { deepMinutes } : {}),
          ...(remMinutes !== undefined ? { remMinutes } : {}),
        }
      : undefined;

  const durations = sorted
    .slice(0, 7)
    .map((s) => getDurationHours(s))
    .filter((v): v is number => v !== undefined);

  const avgDuration = average(durations);

  // Sleep debt: sum of (8h - actual) for each of last 7 nights (capped at 0 per night)
  const debtHours = durations.length > 0
    ? Number(Math.max(0, durations.reduce((acc, h) => acc + Math.max(0, SLEEP_TARGET_HOURS - h), 0)).toFixed(2))
    : undefined;

  const midpoints = sorted
    .map((s) => getMidpointMinutes(s))
    .filter((v): v is number => v !== undefined);

  const latestMidpoint = latest ? getMidpointMinutes(latest) : undefined;
  const baselineMidpoint =
    midpoints.length > 1 ? average(midpoints.slice(1, Math.min(midpoints.length, 8))) : undefined;

  const absDelta =
    latestMidpoint !== undefined && baselineMidpoint !== undefined
      ? circularAbsDeltaMinutes(latestMidpoint, baselineMidpoint)
      : undefined;

  const signedDelta =
    latestMidpoint !== undefined && baselineMidpoint !== undefined
      ? circularSignedDeltaMinutes(latestMidpoint, baselineMidpoint)
      : undefined;

  return {
    lastNight: lastNight ?? undefined,
    avg7d: avgDuration !== undefined ? { hours: Number(avgDuration.toFixed(2)) } : undefined,
    midpoint:
      absDelta !== undefined
        ? {
            deltaMin: absDelta,
            ...(signedDelta !== undefined ? { signedDeltaMin: signedDelta } : {}),
          }
        : undefined,
    ...(debtHours !== undefined ? { debtHours } : {}),
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
    .map(getDurationHours)
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

function trainingContext(sessions: TrainingSessionRow[]): InsightContext['training'] {
  const now = Date.now();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const sorted = [...sessions]
    .filter((s) => !!s.started_at)
    .sort((a, b) => new Date(b.started_at!).getTime() - new Date(a.started_at!).getTime());

  const latest = sorted[0];
  const latestTime = latest?.started_at ? new Date(latest.started_at).getTime() : null;

  const daysSinceLastSession =
    latestTime !== null ? Math.floor((now - latestTime) / MS_PER_DAY) : undefined;

  const weekMs = 7 * MS_PER_DAY;
  const weeklySessionCount = sorted.filter(
    (s) => s.started_at && now - new Date(s.started_at).getTime() < weekMs,
  ).length;

  const completedToday = sorted.some(
    (s) =>
      s.started_at &&
      new Date(s.started_at).getTime() >= todayStart.getTime() &&
      s.ended_at !== null,
  );

  return { daysSinceLastSession, weeklySessionCount, completedToday };
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
  const [moods, sleepSessions, activity, medLogs, meds, feedback, trainingSessions] = await Promise.all([
    listMoodCheckins(30),
    listSleepSessions(14),
    listDailyActivitySummaries(14),
    listMedDoseLogsRemoteLastNDays(7),
    listMeds(),
    listLatestInsightFeedback(250),
    listTrainingSessions(30),
  ]);

  const { mood, tags, behavior, flags } = moodContext(moods);
  const sleep = sleepContext(sleepSessions);
  const steps = stepsContext(activity);
  const medsContextResult = medsContext(medLogs, meds ?? []);
  const training = trainingContext(trainingSessions ?? []);
  const baseline = baselineContext(moods, sleepSessions, activity);

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
