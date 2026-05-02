import type { QueryClient } from '@tanstack/react-query';

/**
 * After queued doses replay to Supabase (`meds_log`), invalidate caches that read remote history.
 * Operational truth for “logged from notification while offline” was the durable queue; acknowledged rows now live on server.
 */
export function invalidateQueriesAfterMedDoseReplay(qc: QueryClient, syncedCount: number): Promise<void> {
  if (syncedCount <= 0) return Promise.resolve();
  return Promise.all([
    qc.invalidateQueries({ queryKey: ['meds'] }),
    qc.invalidateQueries({ queryKey: ['meds:logs:7d'] }),
    qc.invalidateQueries({ queryKey: ['timeline:meds'] }),
    qc.invalidateQueries({ queryKey: ['meds:events:30d'] }),
    qc.invalidateQueries({ queryKey: ['insights:feedback:latest250'] }),
    qc.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'med_logs' }),
  ]).then(() => undefined);
}

/**
 * After offline training ops replay to Supabase, refresh historical session caches.
 * Does not invalidate active-session queries (`training:session:*`): guided runtime stays locally authoritative.
 */
export function invalidateQueriesAfterTrainingOfflineReplay(qc: QueryClient, successCount: number): Promise<void> {
  if (successCount <= 0) return Promise.resolve();
  return Promise.all([
    qc.invalidateQueries({ queryKey: ['training:sessions'] }),
    qc.invalidateQueries({ queryKey: ['training:sessions:analytics'] }),
  ]).then(() => undefined);
}
