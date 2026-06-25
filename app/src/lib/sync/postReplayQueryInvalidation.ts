import type { QueryClient } from '@tanstack/react-query';

/**
 * True when a React Query key reads medication dose history that should refresh after
 * offline queue replay to `meds_log` (includes `med_logs:30`, `meds:logs:7d`, `meds:logs:30d`, etc.).
 */
export function isMedDoseLogRelatedQueryKey(queryKey: unknown): boolean {
  if (!Array.isArray(queryKey) || queryKey.length === 0) return false;
  const first = queryKey[0];
  if (typeof first !== 'string') return false;
  if (first === 'med_logs' || first.startsWith('med_logs')) return true;
  if (first.startsWith('meds:logs:')) return true;
  return false;
}

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
    qc.invalidateQueries({ predicate: (q) => isMedDoseLogRelatedQueryKey(q.queryKey) }),
  ]).then(() => undefined);
}

/**
 * After offline training ops replay to Supabase, refresh session caches from server truth.
 * Active `training:session:*` queries are invalidated so performed.sets matches DB after replay.
 */
export function invalidateQueriesAfterTrainingOfflineReplay(qc: QueryClient, successCount: number): Promise<void> {
  if (successCount <= 0) return Promise.resolve();
  return Promise.all([
    qc.invalidateQueries({ queryKey: ['training:sessions'] }),
    qc.invalidateQueries({ queryKey: ['training:sessions:analytics'] }),
    qc.invalidateQueries({ queryKey: ['training:set_logs'] }),
    qc.invalidateQueries({
      predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'training:session',
    }),
  ]).then(() => undefined);
}
