// C:\Reclaim\app\src\lib\insights\contextBuilder.ts

import {
  listMoodCheckins,
  listSleepSessions,
  listDailyActivitySummaries,
  listMedDoseLogsRemoteLastNDays,
  computeAdherence,
  listLatestInsightFeedback,
  type MoodCheckin,
  type SleepSession,
  type DailyActivitySummary,
  type MedDoseLog,
  type InsightFeedbackLatestIndex,
  type InsightFeedbackRow,
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

  const parsed = moods.map((m) => {
    const moodVal = (m as any)?.rating ?? (m as any)?.mood;
    const ts = (m as any)?.ts ?? (m as any)?.created_at;

    let tags: string[] = [];
    const rawTags = (m as any)?.tags;

    if (Array.isArray(rawTags)) {
      tags = rawTags.filter(Boolean).map((t: any) => String(t).trim()).filter(Boolean);
    } else if (typeof rawTags === 'string') {
      try {
        const parsedTags = JSON.parse(rawTags);
        if (Array.isArray(parsedTags)) {
          tags = parsedTags.filter(Boolean).map((t: any) => String(t).trim()).filter(Boolean);
        }
      } catch {
        tags = [];
      }
    }

    return {
      mood: typeof moodVal === 'number' ? moodVal : undefined,
      ts,
      created_at: (m as any)?.created_at,
      tags,
    };
  });

  const sorted = parsed.sort((a, b) => {
    const ta = new Date(a.ts ?? a.created_at ?? 0).getTime();
    const tb = new Date(b.ts ?? b.created_at ?? 0).getTime();
    return tb - ta;
  });

  const latest = sorted[0];
  const latestMood = latest?.mood;

  const baselineWindow = sorted
    .slice(1, 15)
    .map((entry) => entry.mood)
    .filter((v): v is number => typeof v === 'number');

  const baselineAverage = average(baselineWindow);

  const deltaVsBaseline =
    baselineAverage !== undefined && baselineAverage !== 0 && latestMood !== undefined
      ? latestMood - baselineAverage
      : undefined;

  const recentWindow = sorted
    .slice(0, 3)
    .map((entry) => entry.mood)
    .filter((v): v is number => typeof v === 'number');

  const recentAverage = average(recentWindow);

  const pastWindow = sorted
    .slice(3, 10)
    .map((entry) => entry.mood)
    .filter((v): v is number => typeof v === 'number');

  const pastAverage =
    pastWindow.length > 0
      ? average(pastWindow)
      : baselineAverage ??
        average(sorted.map((m) => m.mood).filter((v): v is number => typeof v === 'number'));

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

  if (latestSocial?.ts || latestSocial?.created_at) {
    const diff = now - new Date(latestSocial.ts ?? latestSocial.created_at).getTime();
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

// ✅ Correct circadian wrap-around on a 1440-minute circle
function circularDeltaMinutes(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return Math.min(diff, 1440 - diff);
}

function sleepContext(sessions: SleepSession[]): InsightContext['sleep'] {
  if (!sessions.length) return undefined;

  const sorted = [...sessions].sort((a, b) => new Date(b.end_time).getTime() - new Date(a.end_time).getTime());

  const latest = sorted[0];
  const latestDuration = latest ? getDurationHours(latest) : undefined;

  const lastNight =
    latestDuration !== undefined
      ? {
          hours: Number(latestDuration.toFixed(2)),
        }
      : undefined;

  const durations = sorted
    .slice(0, 7)
    .map((session) => getDurationHours(session))
    .filter((value): value is number => value !== undefined);

  const avgDuration = average(durations);

  const midpoints = sorted
    .map((session) => getMidpointMinutes(session))
    .filter((value): value is number => value !== undefined);

  const latestMidpoint = latest ? getMidpointMinutes(latest) : undefined;
  const baselineMidpoint = midpoints.length > 1 ? average(midpoints.slice(1, Math.min(midpoints.length, 8))) : undefined;

  const midpointDelta =
    latestMidpoint !== undefined && baselineMidpoint !== undefined
      ? circularDeltaMinutes(latestMidpoint, baselineMidpoint)
      : undefined;

  return {
    lastNight: lastNight ?? undefined,
    avg7d: avgDuration ? { hours: Number(avgDuration.toFixed(2)) } : undefined,
    midpoint: midpointDelta !== undefined ? { deltaMin: midpointDelta } : undefined,
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

  // ✅ NEW: latest feedback per insight_id (for suppression / ranking)
  insightFeedbackLatestById: InsightFeedbackLatestIndex;

  // Optional raw rows for debug screens / analytics; safe to omit later
  insightFeedbackRows?: InsightFeedbackRow[];
};

export type InsightContextResult = {
  context: InsightContext;
  source: InsightContextSourceData;
};

export async function fetchInsightContext(): Promise<InsightContextResult> {
  const [moods, sleepSessions, activity, medLogs, feedback] = await Promise.all([
    listMoodCheckins(30),
    listSleepSessions(14),
    listDailyActivitySummaries(14),
    listMedDoseLogsRemoteLastNDays(7),

    // ✅ Fetch “latest per insight_id” index (client-side reduce)
    listLatestInsightFeedback(250),
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
      insightFeedbackLatestById: feedback.latestByInsightId,
      insightFeedbackRows: feedback.rows, // optional debug
    },
  };
}
