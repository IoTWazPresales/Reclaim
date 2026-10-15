/** Canonical history for candidate exercises. Absence and retrieval failure stay distinct. */
import type { UserState, TrainingProfileSnapshot, PerformanceHistoryStatus } from './types';
import catalog from './catalog/exercises.v1.json';
import { logger } from '@/lib/logger';
import { PERFORMANCE_HISTORY_SOURCE } from './performanceHistory';

export { TRAINING_PERF_SEED_EXERCISE_IDS } from './trainingProgramPerformanceSeedIds';
export type LastSessionPerformanceMap = NonNullable<UserState['lastSessionPerformance']>;
export type RecentSessionPerformanceMap = NonNullable<UserState['recentSessionPerformance']>;
export type TrainingPerformanceSeed = PerformanceHistoryStatus & {
  performanceHistory: PerformanceHistoryStatus;
  lastSessionPerformance: LastSessionPerformanceMap;
  recentSessionPerformance: RecentSessionPerformanceMap;
};

/** Default covers every catalogue candidate; callers can supply planned/candidate IDs. */
export async function loadTrainingPerformanceSeed(exerciseIds: string[] = catalog.map(exercise => exercise.id)): Promise<TrainingPerformanceSeed> {
  const requestedExerciseIds = [...new Set(exerciseIds)].sort();
  const finish = (status: PerformanceHistoryStatus['status'], recent: RecentSessionPerformanceMap = {}): TrainingPerformanceSeed => {
    const performanceHistory = { source: PERFORMANCE_HISTORY_SOURCE, status, requestedExerciseIds };
    const last = Object.fromEntries(Object.entries(recent).filter(([, sessions]) => sessions.length).map(([id, sessions]) => [id, sessions[0]]));
    return { ...performanceHistory, performanceHistory, lastSessionPerformance: last, recentSessionPerformance: recent };
  };
  if (!requestedExerciseIds.length) return finish('missing');
  try {
    const { getRecentExercisePerformances } = await import('../api');
    const recent = await getRecentExercisePerformances(requestedExerciseIds, 3);
    return finish(Object.values(recent).some(sessions => sessions.length) ? 'available' : 'missing', recent);
  } catch (error) {
    if (__DEV__) logger.debug('[performance seed] history unavailable', error);
    return finish('unavailable');
  }
}

/** Compatibility map API; planning callers must use the status-carrying seed. */
export async function loadLastSessionPerformanceSeed(): Promise<LastSessionPerformanceMap> {
  const seed = await loadTrainingPerformanceSeed();
  if (seed.status === 'unavailable') throw new Error('Training performance history unavailable');
  return seed.lastSessionPerformance;
}

/** Clear stale snapshot history even when fresh history is absent or unavailable. */
export function withTrainingPerformanceSeed(profile: TrainingProfileSnapshot, seed: TrainingPerformanceSeed | undefined): TrainingProfileSnapshot {
  return {
    ...profile,
    performanceHistory: seed?.performanceHistory ?? { source: PERFORMANCE_HISTORY_SOURCE, status: 'unavailable', requestedExerciseIds: [] },
    lastSessionPerformance: seed?.lastSessionPerformance ?? {},
    recentSessionPerformance: seed?.recentSessionPerformance ?? {},
  };
}
