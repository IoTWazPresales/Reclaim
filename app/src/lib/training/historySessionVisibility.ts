/**
 * Which finished sessions stay on the History list.
 *
 * Wall-clock longer than 8 hours used to hide the row. started_at is never
 * rewritten, so a real session closed the next day was hidden. A run has no
 * lifting sets; that empty summary is the session, not an abandoned open.
 */

const LONG_PAUSE_MINUTES = 480;

type HistorySession = {
  started_at?: string | null;
  ended_at?: string | null;
  summary?: unknown;
  decision_trace?: { run?: boolean } | null;
};

function summaryObject(summary: unknown): Record<string, unknown> | null {
  if (!summary) return null;
  if (typeof summary === 'string') {
    try {
      const parsed = JSON.parse(summary) as unknown;
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  if (typeof summary === 'object') return summary as Record<string, unknown>;
  return null;
}

export function isHistoryRun(session: HistorySession): boolean {
  return session.decision_trace?.run === true;
}

export function wallClockMinutes(startedAt: string | null | undefined, endedAt: string | null | undefined): number | null {
  if (!startedAt || !endedAt) return null;
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return Math.floor((end - start) / 60000);
}

export function closedAfterLongPause(
  startedAt: string | null | undefined,
  endedAt: string | null | undefined,
): boolean {
  const minutes = wallClockMinutes(startedAt, endedAt);
  return minutes != null && minutes > LONG_PAUSE_MINUTES;
}

export function sessionVisibleInHistory(session: HistorySession): boolean {
  if (!session.ended_at) return true;
  if (isHistoryRun(session)) return true;
  const summary = summaryObject(session.summary);
  if (!summary) return true;
  const exercises = Number(summary.exercisesCompleted ?? summary.exercises_completed ?? 0);
  const sets = Number(summary.totalSets ?? summary.total_sets ?? 0);
  return !(exercises === 0 && sets === 0);
}
