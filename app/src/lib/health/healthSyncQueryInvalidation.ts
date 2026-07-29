/**
 * After successful provider→Supabase health sync, refresh React Query caches that read sleep summaries from server.
 * React Query is not durable truth; invalidation aligns UI with acknowledged imported/synced health rows.
 */
import type { QueryClient } from '@tanstack/react-query';

export type HealthSyncInvalidateInput = {
  sleepSynced: boolean;
  activitySynced: boolean;
  debug?: {
    sleepSyncStatus?: string;
    saveError?: unknown;
  };
};

/** Mirrors Dashboard `runHealthSync` should-invalidate policy. */
export function shouldInvalidateAfterHealthSyncResult(r: HealthSyncInvalidateInput): boolean {
  return (
    r.sleepSynced ||
    r.activitySynced ||
    r.debug?.sleepSyncStatus === 'write_failed' ||
    !!r.debug?.saveError
  );
}

/**
 * Invalidates sleep/last-sleep keys used by Dashboard, Sleep screen, and sleep ring tiles.
 * Call when health sync may have written new `sleep_sessions` or related summary rows.
 */
export function invalidateHealthSyncSummaryQueries(
  qc: QueryClient,
  r: HealthSyncInvalidateInput,
): Promise<void> {
  if (!shouldInvalidateAfterHealthSyncResult(r)) return Promise.resolve();
  return Promise.all([
    qc.invalidateQueries({ queryKey: ['dashboard:lastSleep'] }),
    qc.invalidateQueries({ queryKey: ['sleep:last'] }),
    qc.invalidateQueries({ queryKey: ['sleep:sessions:30d'] }),
    qc.invalidateQueries({ queryKey: ['sleep:sessions:30d:ui'] }),
    qc.invalidateQueries({ queryKey: ['sleep:sessions:ring'] }),
    qc.invalidateQueries({ queryKey: ['sleep:settings'] }),
  ]).then(() => undefined);
}
