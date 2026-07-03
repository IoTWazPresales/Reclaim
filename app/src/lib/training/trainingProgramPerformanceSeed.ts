/**
 * Batches last known set logs for common compounds so program preview / session build
 * can use double-progression without blocking on a per-exercise waterfall.
 * Supabase is best-effort; failures return {}.
 */
import type { UserState } from './types';
import { TRAINING_PERF_SEED_EXERCISE_IDS } from './trainingProgramPerformanceSeedIds';

export { TRAINING_PERF_SEED_EXERCISE_IDS } from './trainingProgramPerformanceSeedIds';

export type LastSessionPerformanceMap = NonNullable<UserState['lastSessionPerformance']>;
export type RecentSessionPerformanceMap = NonNullable<UserState['recentSessionPerformance']>;

export type TrainingPerformanceSeed = {
  lastSessionPerformance: LastSessionPerformanceMap;
  /** Newest-first per-session history (for hold-streak / deload detection). */
  recentSessionPerformance: RecentSessionPerformanceMap;
};

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

/**
 * Fetches last + recent (3-session) performance for the seed exercise set.
 * Never throws; returns empty maps on any failure.
 */
export async function loadTrainingPerformanceSeed(): Promise<TrainingPerformanceSeed> {
  const empty: TrainingPerformanceSeed = {
    lastSessionPerformance: {},
    recentSessionPerformance: {},
  };
  try {
    const { getRecentExercisePerformances } = await import('../api');
    const recent = (await getRecentExercisePerformances(
      TRAINING_PERF_SEED_EXERCISE_IDS,
      3,
    )) as RecentSessionPerformanceMap;
    const last: LastSessionPerformanceMap = {};
    for (const [exId, sessions] of Object.entries(recent)) {
      if (sessions[0]) last[exId] = sessions[0];
    }
    return { lastSessionPerformance: last, recentSessionPerformance: recent };
  } catch {
    return empty;
  }
}
