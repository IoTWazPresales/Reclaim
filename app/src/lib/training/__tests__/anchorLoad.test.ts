import { describe, expect, it } from 'vitest';
import { buildSessionFromProgramDay, getExerciseById, suggestLoading } from '../engine';
import { epleyWorkingWeightCeiling, getWeightStep } from '../progression';
import { BACK_SQUAT_MEAN_KG, FRONT_SQUAT_MEAN_KG } from '../anchorLoad';
import { runTargetMinutes } from '../runGuidance';
import type { TrainingGoal, UserState } from '../types';

const goals: Record<TrainingGoal, number> = {
  build_muscle: 0.51,
  build_strength: 0.47,
  lose_fat: 0.02,
  get_fitter: 0,
};

describe('personal baselines', () => {
  it('keeps a front squat under the squat the person entered', () => {
    const front = getExerciseById('front_squat');
    expect(front).toBeTruthy();
    const squatE1rm = 105;
    const weight = suggestLoading({
      exercise: front!,
      userState: { experienceLevel: 'advanced', estimated1RM: { squat: squatE1rm } },
      goalWeights: goals,
      plannedReps: 6,
      priority: 'primary',
    });
    const step = getWeightStep(front!);
    const squatWorking = epleyWorkingWeightCeiling(squatE1rm, 6, step);
    const frontWorking = epleyWorkingWeightCeiling(
      squatE1rm * (FRONT_SQUAT_MEAN_KG / BACK_SQUAT_MEAN_KG),
      6,
      step,
    );
    expect(weight).toBe(Math.min(frontWorking, squatWorking));
    expect(weight).toBeLessThan(90);
    expect(weight).not.toBe(140);
  });

  it('does not give calf raises the squat default', () => {
    const calf = getExerciseById('calf_raises');
    expect(calf).toBeTruthy();
    const weight = suggestLoading({
      exercise: calf!,
      userState: { experienceLevel: 'advanced', estimated1RM: { squat: 105 } },
      goalWeights: goals,
      plannedReps: 6,
      priority: 'isolation',
    });
    expect(weight).toBeLessThanOrEqual(16);
    expect(weight).not.toBe(140);
  });

  it('keeps an unlogged carry at the novice per-hand load and a short distance', () => {
    const carry = getExerciseById('farmer_walk');
    expect(carry).toBeTruthy();
    const userState: UserState = {
      experienceLevel: 'advanced',
      estimated1RM: { deadlift: 116.7 },
    };
    const weight = suggestLoading({
      exercise: carry!,
      userState,
      goalWeights: goals,
      plannedReps: 8,
      priority: 'accessory',
    });
    expect(weight).toBe(15);
  });

  it('does not stack two squat variations on a leg day', () => {
    const session = buildSessionFromProgramDay(
      { label: 'Legs', intents: [], template_key: 'legs', weekIndex: 1 },
      {
        goals,
        equipment_access: ['barbell', 'rack', 'dumbbells', 'bench', 'cable_machine'],
        experienceLevel: 'advanced',
        baselines: { squat: 105, deadlift: 116.7 },
        constraints: {},
      },
    );
    const kneeCompounds = session.exercises.filter((exercise) => {
      const id = exercise.exerciseId;
      return (
        exercise.intents.includes('knee_dominant') &&
        ['squat', 'front_squat', 'overhead_squat', 'zercher_squat', 'hack_squat'].includes(id)
      );
    });
    expect(kneeCompounds.map((exercise) => exercise.exerciseId)).toEqual(['squat']);
    expect(session.exercises.some((exercise) => exercise.exerciseId === 'overhead_squat')).toBe(false);
    const squat = session.exercises.find((exercise) => exercise.exerciseId === 'squat');
    expect(squat?.plannedSets[0]?.suggestedWeight).not.toBe(140);
    expect(squat?.plannedSets[0]?.suggestedWeight).toBeLessThanOrEqual(105);
  });
});

describe('run session length', () => {
  it('uses 20 minutes, then the 30 minute moderate session from week 3', () => {
    expect(runTargetMinutes(1)).toBe(20);
    expect(runTargetMinutes(2)).toBe(20);
    expect(runTargetMinutes(3)).toBe(30);
    expect(runTargetMinutes(4)).toBe(30);
    const week3 = buildSessionFromProgramDay(
      { label: 'Run', intents: [], template_key: 'run', weekIndex: 3 },
      { goals, equipment_access: [], constraints: {}, baselines: {} },
    );
    expect(week3.exercises).toEqual([]);
    expect(week3.estimatedDurationMinutes).toBe(30);
  });
});
