import type { MoodCheckin, SleepSession } from '@/lib/api';
import { formatLocalDateYYYYMMDD } from '@/components/meds/medDoseLogUtils';
import type { MedDoseRow } from '@/components/meds/medDetailTypes';
import { logWhenDate } from '@/components/meds/medDoseLogUtils';

export type MoodSignals = {
  latest: number | undefined;
  trend3dPct: number | undefined;
  tags: string[];
};

export type SleepSignals = {
  lastNightHours: number | undefined;
  avg7dHours: number | undefined;
  sparseData: boolean;
};

export type AdherenceSignals = {
  adherencePct7d: number;
  missedDoses3d: number | undefined;
  hasUnknownStatus: boolean;
};

export function computeMoodSignals(moods: MoodCheckin[]): MoodSignals {
  if (!moods.length) return { latest: undefined, trend3dPct: undefined, tags: [] };

  const sorted = [...moods].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const latest = sorted[0];
  const latestMood = (latest as { rating?: number; mood?: number })?.rating ?? (latest as { mood?: number })?.mood;
  const latestTags = Array.isArray((latest as { tags?: unknown[] })?.tags)
    ? (latest as { tags: unknown[] }).tags.filter(Boolean).map((t) => String(t).toLowerCase())
    : [];

  const recent3 = sorted
    .slice(0, 3)
    .map((m) => (m as { rating?: number; mood?: number })?.rating ?? (m as { mood?: number })?.mood)
    .filter((v): v is number => typeof v === 'number');
  const previous3 = sorted
    .slice(3, 6)
    .map((m) => (m as { rating?: number; mood?: number })?.rating ?? (m as { mood?: number })?.mood)
    .filter((v): v is number => typeof v === 'number');

  let trend3dPct: number | undefined;

  if (sorted.length >= 6 && recent3.length > 0 && previous3.length > 0) {
    const distinctDays = new Set<string>();
    for (const m of sorted.slice(0, 6)) {
      distinctDays.add(formatLocalDateYYYYMMDD(new Date(m.created_at)));
    }

    if (distinctDays.size >= 3) {
      const recentAvg = recent3.reduce((a, b) => a + b, 0) / recent3.length;
      const previousAvg = previous3.reduce((a, b) => a + b, 0) / previous3.length;
      if (previousAvg !== 0) {
        trend3dPct = ((recentAvg - previousAvg) / previousAvg) * 100;
      }
    }
  }

  return {
    latest: typeof latestMood === 'number' ? latestMood : undefined,
    trend3dPct,
    tags: latestTags,
  };
}

function getSleepDurationHours(s: SleepSession): number | undefined {
  if (!s.start_time || !s.end_time) return undefined;
  const start = new Date(s.start_time).getTime();
  const end = new Date(s.end_time).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return undefined;
  return (end - start) / (1000 * 60 * 60);
}

function groupSleepByDate(sessions: SleepSession[]): Map<string, number> {
  const dayMap = new Map<string, number>();
  for (const session of sessions) {
    const duration = getSleepDurationHours(session);
    if (duration === undefined) continue;
    const dayKey = formatLocalDateYYYYMMDD(new Date(session.end_time));
    dayMap.set(dayKey, (dayMap.get(dayKey) ?? 0) + duration);
  }
  return dayMap;
}

function isNightSession(session: SleepSession): boolean {
  if (!session.start_time || !session.end_time) return false;
  const startHour = new Date(session.start_time).getHours();
  const endHour = new Date(session.end_time).getHours();
  return startHour >= 18 || endHour < 12;
}

export function computeSleepSignals(sessions: SleepSession[]): SleepSignals {
  if (!sessions.length) return { lastNightHours: undefined, avg7dHours: undefined, sparseData: false };

  const dayMap = groupSleepByDate(sessions);
  const sparseData = dayMap.size < 3;

  const now = new Date();
  let totalHours = 0;
  for (let i = 0; i < 7; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    totalHours += dayMap.get(formatLocalDateYYYYMMDD(date)) ?? 0;
  }
  const avg7dHours = sparseData ? undefined : totalHours / 7;

  const sorted = [...sessions].sort((a, b) => new Date(b.end_time).getTime() - new Date(a.end_time).getTime());
  const nightSessions = sorted.filter(isNightSession);
  let lastNightHours: number | undefined;
  if (nightSessions.length > 0) {
    lastNightHours = getSleepDurationHours(nightSessions[0]);
  } else if (sorted.length > 0) {
    lastNightHours = getSleepDurationHours(sorted[0]);
  }

  return { lastNightHours, avg7dHours, sparseData };
}

export function computeAdherenceSignals(medLogs: MedDoseRow[]): AdherenceSignals {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const logs7d = medLogs.filter((l) => logWhenDate(l) >= sevenDaysAgo);
  const logs3d = medLogs.filter((l) => logWhenDate(l) >= threeDaysAgo);

  const taken7d = logs7d.filter((l) => l.status === 'taken').length;
  const total7d = logs7d.length || 1;
  const adherencePct7d = Math.round((taken7d / total7d) * 100);

  const knownStatusLogs3d = logs3d.filter(
    (l) => l.status === 'taken' || l.status === 'missed' || l.status === 'skipped',
  );
  const unknownStatusCount = logs3d.length - knownStatusLogs3d.length;
  const unknownStatusPct = logs3d.length > 0 ? (unknownStatusCount / logs3d.length) * 100 : 0;

  let missedDoses3d: number | undefined;
  let hasUnknownStatus = false;

  if (unknownStatusPct > 30) {
    missedDoses3d = undefined;
    hasUnknownStatus = true;
  } else {
    missedDoses3d = knownStatusLogs3d.filter((l) => l.status === 'missed' || l.status === 'skipped').length;
    hasUnknownStatus = unknownStatusCount > 0;
  }

  return { adherencePct7d, missedDoses3d, hasUnknownStatus };
}
