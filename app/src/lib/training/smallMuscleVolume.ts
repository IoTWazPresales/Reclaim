/**
 * Direct weekly sets for small muscles.
 * Schoenfeld, Ogborn, and Krieger, J Sports Sci. 2017;35(11):1073-1082.
 * PMID 27433992. Categories were <5, 5–9, and 10+ sets per muscle per week.
 * Mean size gains were 5.4%, 6.6%, and 9.8%. The 10+ comparison was a trend
 * (P = 0.074). Each added weekly set was associated with a larger effect
 * (P = 0.002). ROUTINE_AUDIT.md "Small-muscle volume (2026-10-07)".
 */
import type { Exercise, ExercisePriority, ExperienceLevel, GoalWeights, MovementIntent } from './types';

const SMALL_MUSCLES = new Set([
  'biceps',
  'triceps',
  'brachialis',
  'forearms',
  'calves',
  'lateral_deltoids',
  'rear_deltoids',
]);

export function muscleBuildingShare(goalWeights: GoalWeights): number {
  const values = Object.values(goalWeights).filter((weight): weight is number => typeof weight === 'number' && weight > 0);
  const sum = values.reduce((total, weight) => total + weight, 0);
  if (sum <= 0) return 0;
  return (goalWeights.build_muscle ?? 0) / sum;
}

/**
 * Weekly hard sets for one muscle, from the goal mix and training age.
 * Null means the goal-blend set count stands.
 *
 * Schoenfeld, Ogborn, and Krieger 2017: at least 10 weekly sets was the
 * category with the largest mean gain, and the ceiling was not known.
 * Schoenfeld, Contreras, Krieger, et al. 2019, trained men: about 30–45
 * weekly sets grew more muscle than about 6–9 and did not grow more
 * strength. Baz-Valle et al. 2022: in lifters with at least a year of
 * training, about 12–20 weekly sets for quads and biceps, with no clear
 * extra gain above 20. ROUTINE_AUDIT.md.
 * Beginners stay at 10. Intermediate and advanced use 16, inside 12–20,
 * when building muscle is at least 40% of the goals.
 */
export function weeklySmallMuscleSetTarget(
  goalWeights: GoalWeights,
  experience: ExperienceLevel = 'beginner',
): number | null {
  const share = muscleBuildingShare(goalWeights);
  const trained = experience === 'intermediate' || experience === 'advanced';
  if (share >= 0.4) return trained ? 16 : 10;
  if (share >= 0.25) return trained ? 10 : 5;
  return null;
}

/** The muscle whose weekly sets this compound pattern fills. */
export function majorMuscleForIntent(intent: MovementIntent): string | null {
  switch (intent) {
    case 'horizontal_press':
      return 'pectorals';
    case 'vertical_press':
      return 'anterior_deltoids';
    case 'horizontal_pull':
    case 'vertical_pull':
      return 'lats';
    case 'knee_dominant':
      return 'quadriceps';
    case 'hip_hinge':
      return 'hamstrings';
    default:
      return null;
  }
}

export function smallMuscleOf(exercise: Exercise): string | null {
  const primary = exercise.musclesPrimary ?? [];
  return primary.find((muscle) => SMALL_MUSCLES.has(muscle)) ?? null;
}

/**
 * Sets for this exercise inside one session.
 * 0 means the weekly budget for that muscle is already filled.
 * null means this exercise is not a small-muscle isolation.
 * At most 6 sets on one exercise; the rest waits for another exercise or another day.
 */
export function setsForSmallMuscle(input: {
  exercise: Exercise;
  priority: ExercisePriority;
  goalWeights: GoalWeights;
  experience?: ExperienceLevel;
  sessionsThisWeek: number | undefined;
  setsAlreadyThisSession: number;
  isCompound: boolean;
}): number | null {
  if (input.isCompound) return null;
  if (input.priority === 'primary') return null;
  const muscle = smallMuscleOf(input.exercise);
  if (!muscle) return null;
  const weekly = weeklySmallMuscleSetTarget(input.goalWeights, input.experience ?? 'beginner');
  if (weekly == null) return null;
  const sessions = Math.max(1, input.sessionsThisWeek ?? 1);
  const sessionBudget = Math.ceil(weekly / sessions);
  const remain = sessionBudget - input.setsAlreadyThisSession;
  if (remain <= 0) return 0;
  return Math.min(8, remain);
}

/** Sets for the compound pattern on this day. One exercise may hold the day's share, up to 8. */
export function setsForMajorPattern(input: {
  goalWeights: GoalWeights;
  experience?: ExperienceLevel;
  sessionsThisWeek: number | undefined;
  setsAlreadyThisSession: number;
}): number | null {
  const weekly = weeklySmallMuscleSetTarget(input.goalWeights, input.experience ?? 'beginner');
  if (weekly == null) return null;
  const sessions = Math.max(1, input.sessionsThisWeek ?? 1);
  const sessionBudget = Math.ceil(weekly / sessions);
  const remain = sessionBudget - input.setsAlreadyThisSession;
  if (remain <= 0) return 0;
  return Math.min(8, remain);
}
