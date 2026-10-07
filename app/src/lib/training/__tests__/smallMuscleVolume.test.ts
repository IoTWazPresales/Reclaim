import { describe, expect, it } from 'vitest';
import { buildSession, getExerciseById, isCompoundExercise } from '../engine';
import { setsForSmallMuscle, smallMuscleOf, weeklySmallMuscleSetTarget } from '../smallMuscleVolume';

const muscleHeavy = { build_muscle: 0.51, build_strength: 0.47, lose_fat: 0.02, get_fitter: 0 };

describe('small-muscle weekly sets', () => {
  it('aims at 10 weekly sets when building muscle is at least 40 percent of the goals', () => {
    expect(weeklySmallMuscleSetTarget(muscleHeavy)).toBe(10);
    expect(weeklySmallMuscleSetTarget({ build_muscle: 0, build_strength: 1, lose_fat: 0, get_fitter: 0 })).toBeNull();
  });

  it('splits 10 sets across two exercises when the muscle is trained once a week', () => {
    const curl = getExerciseById('dumbbell_curl');
    expect(curl).toBeTruthy();
    const first = setsForSmallMuscle({
      exercise: curl!,
      priority: 'isolation',
      goalWeights: muscleHeavy,
      sessionsThisWeek: 1,
      setsAlreadyThisSession: 0,
      isCompound: isCompoundExercise(curl!),
    });
    const second = setsForSmallMuscle({
      exercise: curl!,
      priority: 'isolation',
      goalWeights: muscleHeavy,
      sessionsThisWeek: 1,
      setsAlreadyThisSession: first ?? 0,
      isCompound: isCompoundExercise(curl!),
    });
    expect(first).toBe(8);
    expect(second).toBe(2);
    expect((first ?? 0) + (second ?? 0)).toBe(10);
  });

  it('plans about 10 direct biceps sets on a pull day for a muscle-building mix', () => {
    const session = buildSession({
      template: 'pull',
      goals: muscleHeavy,
      constraints: {
        availableEquipment: ['barbell', 'dumbbells', 'bench', 'rack', 'cable_machine', 'pull_up_bar'],
        injuries: [],
        forbiddenMovements: [],
        timeBudgetMinutes: 60,
      },
      userState: { experienceLevel: 'intermediate' },
    });
    const direct = session.exercises.filter(
      (item) => !isCompoundExercise(item.exercise) && smallMuscleOf(item.exercise) === 'biceps',
    );
    const sets = direct.reduce((total, item) => total + item.plannedSets.length, 0);
    expect(direct.length).toBeGreaterThanOrEqual(1);
    expect(sets).toBeGreaterThanOrEqual(8);
    expect(sets).toBeLessThanOrEqual(16);
  });
});
