/**
 * Personal baselines beat the population load table.
 * ROUTINE_AUDIT.md "Prescription rules (2026-10-07)".
 */
import type { Exercise, UserState } from './types';
import { epleyWorkingWeightCeiling, getWeightStep } from './progression';

/**
 * Gullett et al. reported mean 1RM values of 69.2 kg for the front squat and
 * 88.3 kg for the back squat in the same trained adults.
 * J Strength Cond Res. 2009;23(1):284-292.
 */
export const FRONT_SQUAT_MEAN_KG = 69.2;
export const BACK_SQUAT_MEAN_KG = 88.3;

/** Short walk. Not derived from a rep range. ROUTINE_AUDIT.md. */
export const CARRY_FINISHER_METERS = 20;

/**
 * Beginner free-weight carry row in suggestLoading.
 * Used only when that carry has no history and no baseline.
 */
export const NOVICE_CARRY_KG_PER_HAND = 15;

const SQUAT_FAMILY = new Set([
  'squat',
  'front_squat',
  'goblet_squat',
  'hack_squat',
  'leg_press',
  'overhead_squat',
  'zercher_squat',
  'bulgarian_split_squat',
]);
const HINGE_FAMILY = new Set([
  'deadlift',
  'romanian_deadlift',
  'sumo_deadlift',
  'good_mornings',
  'hip_thrust',
]);
const BENCH_FAMILY = new Set([
  'barbell_bench_press',
  'dumbbell_bench_press',
  'incline_bench_press',
  'decline_bench_press',
]);
const PRESS_FAMILY = new Set([
  'overhead_press',
  'dumbbell_shoulder_press',
  'arnold_press',
  'landmine_press',
]);
const ROW_FAMILY = new Set(['barbell_row', 'dumbbell_row', 'pendlay_row', 't_bar_row']);

function anchorExerciseId(exerciseId: string): string | null {
  if (SQUAT_FAMILY.has(exerciseId)) return 'squat';
  if (HINGE_FAMILY.has(exerciseId)) return 'deadlift';
  if (BENCH_FAMILY.has(exerciseId)) return 'barbell_bench_press';
  if (PRESS_FAMILY.has(exerciseId)) return 'overhead_press';
  if (ROW_FAMILY.has(exerciseId)) return 'barbell_row';
  return null;
}

/**
 * Working kilograms for a variation, from the anchor the person actually entered.
 * Returns null when this exercise is the anchor, or when that anchor was not entered.
 * The result is never above the anchor's own working weight for the same reps.
 */
export function anchoredWorkingKg(
  exercise: Exercise,
  userState: UserState,
  plannedReps: number,
  populationKg: number,
): number | null {
  const anchorId = anchorExerciseId(exercise.id);
  if (!anchorId || anchorId === exercise.id) return null;
  const oneRM = userState.estimated1RM?.[anchorId];
  if (!(typeof oneRM === 'number' && oneRM > 0)) return null;

  const step = getWeightStep(exercise);
  const ceiling = epleyWorkingWeightCeiling(oneRM, plannedReps, step);
  if (!(ceiling > 0)) return null;

  if (exercise.id === 'front_squat' || exercise.id === 'overhead_squat') {
    const scaled = epleyWorkingWeightCeiling(
      oneRM * (FRONT_SQUAT_MEAN_KG / BACK_SQUAT_MEAN_KG),
      plannedReps,
      step,
    );
    return Math.min(scaled, ceiling);
  }

  return Math.min(populationKg, ceiling);
}
