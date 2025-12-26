// sleepByDay.ts
import type { SleepSession } from '@/lib/api';
import { getLocalDayDateZA } from '@/lib/api';

const MS_PER_MIN = 60_000;

function startOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function addMinutes(map: Record<string, number>, dayKey: string, minutes: number) {
  if (!Number.isFinite(minutes) || minutes <= 0) return;
  map[dayKey] = (map[dayKey] ?? 0) + minutes;
}

/**
 * Produces { "YYYY-MM-DD": hoursSlept } for the last N days.
 * - Uses end_time's local day as the "sleep day" (typical interpretation)
 * - Splits sessions that cross midnight so attribution per day is accurate
 * - Aggregates multiple sessions per day (naps, fragmented sleep)
 */
export function buildSleepByDayZA(
  sessions: SleepSession[],
  days: number
): Record<string, number> {
  const minutesByDay: Record<string, number> = {};

  // Pre-seed keys so UI has continuous days (even if 0)
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    minutesByDay[getLocalDayDateZA(d)] = 0;
  }

  for (const s of sessions ?? []) {
    if (!s?.start_time || !s?.end_time) continue;

    const start = new Date(s.start_time);
    const end = new Date(s.end_time);
    if (!isFinite(start.getTime()) || !isFinite(end.getTime())) continue;
    if (end <= start) continue;

    // Clamp absurd sessions (optional guard)
    const totalMin = Math.min(24 * 60, Math.max(0, (end.getTime() - start.getTime()) / MS_PER_MIN));
    if (totalMin <= 0) continue;

    // Split across local day boundaries
    let cursor = new Date(start);
    let remainingEnd = end;

    while (cursor < remainingEnd) {
      const dayStart = startOfLocalDay(cursor);
      const nextDayStart = new Date(dayStart.getTime() + 24 * 60 * MS_PER_MIN);

      const chunkEnd = remainingEnd < nextDayStart ? remainingEnd : nextDayStart;
      const chunkMin = (chunkEnd.getTime() - cursor.getTime()) / MS_PER_MIN;

      // Attribute minutes to the local day of the chunkStart
      const dayKey = getLocalDayDateZA(cursor);
      addMinutes(minutesByDay, dayKey, chunkMin);

      cursor = chunkEnd;
    }
  }

  // Convert minutes → hours (1 decimal)
  const hoursByDay: Record<string, number> = {};
  for (const [day, mins] of Object.entries(minutesByDay)) {
    hoursByDay[day] = Math.round((mins / 60) * 10) / 10;
  }
  return hoursByDay;
}
