import type { QueryClient } from '@tanstack/react-query';

/** DB `SleepSession` rows (`start_time` / `end_time`) — Dashboard, Mood, arc. */
export const SLEEP_SESSIONS_30D_DB_KEY = ['sleep:sessions:30d'] as const;

/**
 * Legacy UI rows (`startTime` / `endTime`) — SleepScreen only.
 * Must stay separate from {@link SLEEP_SESSIONS_30D_DB_KEY}: sharing one cache caused
 * history to wipe when Dashboard/Mood wrote snake_case rows that Sleep filtered out.
 */
export const SLEEP_SESSIONS_30D_UI_KEY = ['sleep:sessions:30d:ui'] as const;

/** Invalidate both 30d sleep history shapes after sync / import / log. */
export function invalidateSleepSessions30dQueries(qc: QueryClient): Promise<void> {
  return Promise.all([
    qc.invalidateQueries({ queryKey: [...SLEEP_SESSIONS_30D_DB_KEY] }),
    qc.invalidateQueries({ queryKey: [...SLEEP_SESSIONS_30D_UI_KEY] }),
  ]).then(() => undefined);
}
