/**
 * Pick the session that best represents "last night" / primary nights for insights.
 * Avoids treating a short morning nap as overnight sleep.
 */
import type { SleepSession } from '@/lib/api';

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;

/** Shorter than this → nap / fragment, not a primary night. */
export const MIN_PRIMARY_NIGHT_HOURS = 2.5;

/**
 * Midpoint local minutes: night-like if in [20:00, 24:00) ∪ [00:00, 08:00).
 * A short 08:30–09:00 nap (midpoint ~08:45) is excluded.
 */
export function isNightLikeMidpointMinutes(midpointMinutes: number): boolean {
  return midpointMinutes >= 20 * 60 || midpointMinutes < 8 * 60;
}

export function sleepSessionDurationHours(session: Pick<SleepSession, 'start_time' | 'end_time'>): number | undefined {
  if (!session?.start_time || !session?.end_time) return undefined;
  const start = new Date(session.start_time).getTime();
  const end = new Date(session.end_time).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return undefined;
  return (end - start) / MS_PER_HOUR;
}

export function sleepSessionMidpointMinutes(
  session: Pick<SleepSession, 'start_time' | 'end_time'>,
): number | undefined {
  if (!session?.start_time || !session?.end_time) return undefined;
  const start = new Date(session.start_time).getTime();
  const end = new Date(session.end_time).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return undefined;
  const midpoint = new Date(start + (end - start) / 2);
  return midpoint.getHours() * 60 + midpoint.getMinutes();
}

export type PrimaryNightPick = {
  session: SleepSession;
  hours: number;
};

/**
 * Among sessions, prefer longest night-like bout ≥ MIN_PRIMARY_NIGHT_HOURS.
 * Falls back to longest bout ≥ min hours (even if midpoint odd), never to a short nap.
 */
export function selectPrimaryNight(sessions: SleepSession[]): PrimaryNightPick | null {
  if (!sessions.length) return null;

  const scored = sessions
    .map((session) => {
      const hours = sleepSessionDurationHours(session);
      const midpoint = sleepSessionMidpointMinutes(session);
      if (hours == null || midpoint == null) return null;
      return { session, hours, midpoint, nightLike: isNightLikeMidpointMinutes(midpoint) };
    })
    .filter((x): x is NonNullable<typeof x> => x != null && x.hours >= MIN_PRIMARY_NIGHT_HOURS);

  if (!scored.length) return null;

  const nightLike = scored.filter((s) => s.nightLike);
  const pool = nightLike.length ? nightLike : scored;
  pool.sort((a, b) => {
    if (b.hours !== a.hours) return b.hours - a.hours;
    return new Date(b.session.end_time).getTime() - new Date(a.session.end_time).getTime();
  });
  const best = pool[0];
  return { session: best.session, hours: best.hours };
}

/**
 * Up to `limit` primary nights for 7d averages: for each calendar end-date, keep the
 * best primary bout that day, then take the most recent `limit` days.
 */
export function selectPrimaryNightsForAverage(
  sessions: SleepSession[],
  limit = 7,
): PrimaryNightPick[] {
  const byDay = new Map<string, PrimaryNightPick>();
  for (const session of sessions) {
    const pick = selectPrimaryNight([session]);
    if (!pick) continue;
    const dayKey = new Date(session.end_time).toISOString().slice(0, 10);
    const existing = byDay.get(dayKey);
    if (!existing || pick.hours > existing.hours) byDay.set(dayKey, pick);
  }
  return [...byDay.values()]
    .sort((a, b) => new Date(b.session.end_time).getTime() - new Date(a.session.end_time).getTime())
    .slice(0, limit);
}
