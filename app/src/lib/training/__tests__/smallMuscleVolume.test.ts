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
    expect(first).toBe(5);
    expect(second).toBe(5);
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

  it('a 50/50 advanced leg day does not put 8 working sets on one lift', () => {
    const session = buildSession({
      template: 'legs',
      goals: { build_muscle: 0.5, build_strength: 0.5, lose_fat: 0, get_fitter: 0 },
      constraints: {
        availableEquipment: ['barbell', 'dumbbells', 'bench', 'rack', 'cable_machine', 'leg_extension_machine', 'leg_curl_machine'],
        injuries: [],
        forbiddenMovements: [],
        timeBudgetMinutes: 75,
      },
      userState: { experienceLevel: 'advanced' },
      weeklyMuscleSessionCounts: { quadriceps: 2, hamstrings: 2 },
    });
    const knee = session.exercises.filter((item) => item.intents.includes('knee_dominant'));
    const hinge = session.exercises.filter((item) => item.intents.includes('hip_hinge'));
    expect(knee.length).toBeGreaterThanOrEqual(1);
    expect(hinge.length).toBeGreaterThanOrEqual(1);
    for (const item of session.exercises) {
      expect(item.plannedSets.length).toBeLessThanOrEqual(5);
    }
    const heavyKnee = knee.find((item) => isCompoundExercise(item.exercise));
    expect(heavyKnee?.plannedSets.length).toBe(4);
    const quadIsolation = knee.find(
      (item) => !isCompoundExercise(item.exercise) && (item.exercise.musclesPrimary ?? []).includes('quadriceps'),
    );
    const hamIsolation = hinge.find(
      (item) => !isCompoundExercise(item.exercise) && (item.exercise.musclesPrimary ?? []).includes('hamstrings'),
    );
    expect(quadIsolation?.exercise.id).toBe('leg_extensions');
    expect(quadIsolation?.plannedSets.length).toBe(4);
    expect(hamIsolation?.exercise.id).toBe('leg_curls');
    expect(hamIsolation?.plannedSets.length).toBe(4);
    const carry = session.exercises.find((item) => item.exercise.id === 'farmer_walk');
    expect(carry?.plannedSets.length).toBe(3);
  });
});
