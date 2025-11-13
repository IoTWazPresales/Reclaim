import {
  listMoodCheckins,
  listSleepSessions,
  listDailyActivitySummaries,
  listMedDoseLogsRemoteLastNDays,
  computeAdherence,
  type MoodCheckin,
  type SleepSession,
  type DailyActivitySummary,
  type MedDoseLog,
} from '@/lib/api';
import type { InsightContext } from './InsightEngine';

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

function average(values: number[]): number | undefined {
  if (!values.length) return undefined;
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

function moodContext(moods: MoodCheckin[]): {
  mood: InsightContext['mood'];
  tags: string[];
  behavior: InsightContext['behavior'];
} {
  if (!moods.length) {
    return { mood: undefined, tags: [], behavior: undefined };
  }

  const sorted = [...moods].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const latest = sorted[0];
  const latestMood = latest?.mood;

  const baselineWindow = sorted.slice(1, 15).map((entry) => entry.mood);
  const baselineAverage = average(baselineWindow);
  const deltaVsBaseline =
    baselineAverage !== undefined && baselineAverage !== 0 && latestMood !== undefined
      ? latestMood - baselineAverage
      : undefined;

  const recentWindow = sorted.slice(0, 3).map((entry) => entry.mood);
  const recentAverage = average(recentWindow);
  const pastWindow = sorted.slice(3, 10).map((entry) => entry.mood);
  const pastAverage =
    pastWindow.length > 0 ? average(pastWindow) : baselineAverage ?? average(sorted.map((m) => m.mood));

  const trend3dPct =
    recentAverage !== undefined && pastAverage !== undefined && pastAverage !== 0
      ? ((recentAverage - pastAverage) / pastAverage) * 100
      : undefined;

  const tags = Array.from(new Set((latest?.tags ?? []).filter(Boolean)));

  let daysSinceSocial: number | undefined;
  const now = Date.now();
  const latestSocial = sorted.find(
    (entry) => Array.isArray(entry.tags) && entry.tags.some((tag) => tag === 'social' || tag === 'connected'),
  );
  if (latestSocial?.created_at) {
    const diff = now - new Date(latestSocial.created_at).getTime();
    if (diff >= 0) {
      daysSinceSocial = Math.floor(diff / MS_PER_DAY);
    }
  }

  return {
    mood: {
      last: latestMood,
      deltaVsBaseline,
      trend3dPct,
      tags,
    },
    tags,
    behavior: daysSinceSocial !== undefined ? { daysSinceSocial } : undefined,
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

function sleepContext(sessions: SleepSession[]): InsightContext['sleep'] {
  if (!sessions.length) return undefined;
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.end_time).getTime() - new Date(a.end_time).getTime(),
  );

  const latest = sorted[0];
  const latestDuration = latest ? getDurationHours(latest) : undefined;
  const lastNight =
    latestDuration !== undefined
      ? {
          hours: Number(latestDuration.toFixed(2)),
        }
      : undefined;

  const durations = sorted.slice(0, 7).map((session) => getDurationHours(session)).filter(
    (value): value is number => value !== undefined,
  );
  const avgDuration = average(durations);

  const midpoints = sorted.map((session) => getMidpointMinutes(session)).filter(
    (value): value is number => value !== undefined,
  );

  const latestMidpoint = latest ? getMidpointMinutes(latest) : undefined;
  const baselineMidpoint = midpoints.length > 1 ? average(midpoints.slice(1, Math.min(midpoints.length, 8))) : undefined;
  const midpointDelta =
    latestMidpoint !== undefined && baselineMidpoint !== undefined
      ? Math.abs(latestMidpoint - baselineMidpoint)
      : undefined;

  return {
    lastNight: lastNight
      ? {
          ...lastNight,
          deltaMin: midpointDelta,
        }
      : undefined,
    avg7d: avgDuration ? { hours: Number(avgDuration.toFixed(2)) } : undefined,
    midpoint: midpointDelta !== undefined ? { deltaMin: midpointDelta } : undefined,
  };
}

function stepsContext(activity: DailyActivitySummary[]): InsightContext['steps'] {
  if (!activity.length) return undefined;
  const sorted = [...activity].sort(
    (a, b) => new Date(b.activity_date).getTime() - new Date(a.activity_date).getTime(),
  );
  const latest = sorted[0];
  const steps = latest?.steps ?? null;
  if (steps === null || steps === undefined) return undefined;
  return { lastDay: steps };
}

function medsContext(logs: MedDoseLog[]): InsightContext['meds'] {
  if (!logs.length) return undefined;
  const { pct } = computeAdherence(logs);
  return { adherencePct7d: pct };
}

export type InsightContextSourceData = {
  moods: MoodCheckin[];
  sleepSessions: SleepSession[];
  activity: DailyActivitySummary[];
  medLogs: MedDoseLog[];
};

export type InsightContextResult = {
  context: InsightContext;
  source: InsightContextSourceData;
};

export async function fetchInsightContext(): Promise<InsightContextResult> {
  const [moods, sleepSessions, activity, medLogs] = await Promise.all([
    listMoodCheckins(30),
    listSleepSessions(14),
    listDailyActivitySummaries(14),
    listMedDoseLogsRemoteLastNDays(7),
  ]);

  const { mood, tags, behavior } = moodContext(moods);
  const sleep = sleepContext(sleepSessions);
  const steps = stepsContext(activity);
  const meds = medsContext(medLogs);

  const insightContext: InsightContext = {
    mood,
    sleep,
    steps,
    meds,
    behavior,
    tags,
    flags: {
      stress: tags.includes('stressed') || tags.includes('overwhelmed') || tags.includes('anxious'),
    },
  };

  return {
    context: insightContext,
    source: {
      moods,
      sleepSessions,
      activity,
      medLogs,
    },
  };
}


