/**
 * Batches last known set logs for common compounds so program preview / session build
 * can use suggestLoading progression without blocking on a per-exercise waterfall.
 * Supabase is best-effort; failures return {}.
 */
import type { UserState } from './types';
import { TRAINING_PERF_SEED_EXERCISE_IDS } from './trainingProgramPerformanceSeedIds';

export { TRAINING_PERF_SEED_EXERCISE_IDS } from './trainingProgramPerformanceSeedIds';

export type LastSessionPerformanceMap = NonNullable<UserState['lastSessionPerformance']>;

/**
 * Fetches last performance for a fixed exercise id set. Never throws; returns {} on any failure
 * (offline, no session, not logged in).
 */
export async function loadLastSessionPerformanceSeed(): Promise<LastSessionPerformanceMap> {
  try {
    const { getLastExercisePerformances } = await import('../api');
    const raw = await getLastExercisePerformances(TRAINING_PERF_SEED_EXERCISE_IDS);
    return raw as LastSessionPerformanceMap;
  } catch {
    return {};
  }
}
