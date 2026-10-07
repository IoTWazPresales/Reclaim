/** Counts the account already stores. No comparison with other people. */

export type AccountWindowInput = {
  nowMs: number;
  sessions: Array<{
    endedAt: string | null;
    totalSets?: number | null;
    totalVolume?: number | null;
  }>;
  sleep: Array<{
    endTime: string | null;
    startTime?: string | null;
    durationMinutes?: number | null;
  }>;
  mood: Array<{ at: string | null }>;
};

export type AccountWindowSummary = {
  days: number;
  sessions: number;
  sets: number;
  volumeKg: number;
  sleepHours: number;
  moodCheckins: number;
};

function withinDays(iso: string | null, nowMs: number, days: number): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return false;
  const start = nowMs - days * 24 * 60 * 60 * 1000;
  return t >= start && t <= nowMs;
}

export function summarizeAccountWindow(input: AccountWindowInput, days: number): AccountWindowSummary {
  let sessions = 0;
  let sets = 0;
  let volumeKg = 0;
  for (const row of input.sessions) {
    if (!withinDays(row.endedAt, input.nowMs, days)) continue;
    sessions += 1;
    sets += Number.isFinite(row.totalSets) ? Math.max(0, row.totalSets ?? 0) : 0;
    volumeKg += Number.isFinite(row.totalVolume) ? Math.max(0, row.totalVolume ?? 0) : 0;
  }
  let sleepMinutes = 0;
  for (const row of input.sleep) {
    if (!withinDays(row.endTime, input.nowMs, days)) continue;
    let minutes = row.durationMinutes;
    if (!(minutes != null && Number.isFinite(minutes) && minutes > 0) && row.startTime && row.endTime) {
      minutes = (new Date(row.endTime).getTime() - new Date(row.startTime).getTime()) / 60000;
    }
    if (minutes != null && Number.isFinite(minutes) && minutes > 0 && minutes < 24 * 60) {
      sleepMinutes += minutes;
    }
  }
  let moodCheckins = 0;
  for (const row of input.mood) {
    if (withinDays(row.at, input.nowMs, days)) moodCheckins += 1;
  }
  return {
    days,
    sessions,
    sets,
    volumeKg: Math.round(volumeKg),
    sleepHours: Math.round((sleepMinutes / 60) * 10) / 10,
    moodCheckins,
  };
}
