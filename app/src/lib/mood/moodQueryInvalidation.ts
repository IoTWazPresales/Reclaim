/**
 * Central mood + insight cache invalidation for Phase 1 canonical mood model.
 * React Query remains non-authoritative; invalidation keeps UI aligned after writes/replays.
 */
import type { QueryClient } from '@tanstack/react-query';

export const MOOD_CANONICAL_QUERY_KEY = ['mood:canonical'] as const;

export function invalidateMoodAndInsightQueries(qc: QueryClient): Promise<void> {
  return Promise.all([
    qc.invalidateQueries({ queryKey: [...MOOD_CANONICAL_QUERY_KEY] }),
    qc.invalidateQueries({ queryKey: ['mood:checkins:7d'] }),
    qc.invalidateQueries({ queryKey: ['mood:daily:supabase'] }),
    qc.invalidateQueries({ queryKey: ['mood:local'] }),
    qc.invalidateQueries({ queryKey: ['mood_checkins:30'] }),
    qc.invalidateQueries({ queryKey: ['mood_checkins:all'] }),
    qc.invalidateQueries({ queryKey: ['timeline:mood'] }),
    qc.invalidateQueries({ queryKey: ['insights:feedback:latest250'] }),
  ]).then(() => undefined);
}
