import type { SessionPlan } from './types';
import { getExerciseById } from './engine';

const MUSCLE_TO_BUCKET: Record<string, string> = {
  pectorals: 'Chest',
  anterior_deltoids: 'Shoulders',
  lateral_deltoids: 'Shoulders',
  posterior_deltoids: 'Shoulders',
  triceps: 'Arms',
  biceps: 'Arms',
  forearms: 'Arms',
  brachialis: 'Arms',
  lats: 'Back',
  rhomboids: 'Back',
  upper_traps: 'Back',
  erector_spinae: 'Back',
  mid_traps: 'Back',
  quadriceps: 'Legs',
  hamstrings: 'Legs',
  glutes: 'Legs',
  calves: 'Legs',
  adductors: 'Legs',
  abs: 'Core',
  obliques: 'Core',
  transverse_abdominis: 'Core',
};

const BUCKET_ORDER = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core'];

/** Sessions per week each primary muscle appears in (from planned session previews). */
export function computeWeeklyMuscleSessionCounts(plans: SessionPlan[]): Record<string, number> {
  const muscleSessions = new Map<string, Set<number>>();
  plans.forEach((plan, sessionIdx) => {
    const musclesInSession = new Set<string>();
    for (const ex of plan.exercises) {
      const exercise = ex.exercise ?? getExerciseById(ex.exerciseId);
      for (const m of exercise?.musclesPrimary ?? []) {
        musclesInSession.add(m);
      }
    }
    for (const m of musclesInSession) {
      if (!muscleSessions.has(m)) muscleSessions.set(m, new Set());
      muscleSessions.get(m)!.add(sessionIdx);
    }
  });
  const result: Record<string, number> = {};
  muscleSessions.forEach((sessions, muscle) => {
    result[muscle] = sessions.size;
  });
  return result;
}

/** e.g. "Chest 12 · Shoulders 10 · Arms 8" */
export function formatWeeklyMuscleSetLine(plans: SessionPlan[]): string | null {
  if (!plans.length) return null;
  const bucketSets = new Map<string, number>();
  for (const plan of plans) {
    for (const ex of plan.exercises) {
      const exercise = ex.exercise ?? getExerciseById(ex.exerciseId);
      const setCount = ex.plannedSets.length;
      for (const m of exercise?.musclesPrimary ?? []) {
        const bucket = MUSCLE_TO_BUCKET[m] ?? m;
        bucketSets.set(bucket, (bucketSets.get(bucket) ?? 0) + setCount);
      }
    }
  }
  const parts: string[] = [];
  for (const bucket of BUCKET_ORDER) {
    const v = bucketSets.get(bucket);
    if (v && v > 0) parts.push(`${bucket} ${v}`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}
