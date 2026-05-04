import { describe, it, expect } from 'vitest';
import {
  getExerciseById,
  suggestLoading,
  buildSession,
  chooseExercise,
  isCompoundExercise,
} from '../engine';
import { getExerciseLoadingProfile, getExerciseIncrementKg } from '../exerciseLoadingProfile';
import { formatPlannedSetSummary } from '../loadDisplayFormat';
import type { TrainingConstraints, UserState, GoalWeights } from '../types';

const intermediate: UserState = { experienceLevel: 'intermediate', estimated1RM: {} };
const goalsBuild: GoalWeights = { build_muscle: 1, build_strength: 0 };
const fullEquipment: TrainingConstraints = {
  availableEquipment: ['barbell', 'dumbbells', 'bench', 'rack', 'cable_machine', 'pull_up_bar'],
  injuries: [],
  forbiddenMovements: [],
  timeBudgetMinutes: 60,
};

describe('exercise loading profile (Phase 1)', () => {
  it('lateral raise uses shoulder isolation loading, not vertical press / compound press scale', () => {
    const lat = getExerciseById('lateral_raises');
    expect(lat).not.toBeNull();
    const w = suggestLoading({
      exercise: lat!,
      userState: intermediate,
      goalWeights: goalsBuild,
      plannedReps: 12,
      priority: 'isolation',
    });
    expect(w).toBeGreaterThanOrEqual(6);
    expect(w).toBeLessThanOrEqual(20);
    expect(getExerciseLoadingProfile(lat!).loadingIntentKey).toBe('shoulder_isolation');
  });

  it('thruster default load is a hybrid, not full squat default', () => {
    const t = getExerciseById('thruster');
    expect(t).not.toBeNull();
    const w = suggestLoading({
      exercise: t!,
      userState: intermediate,
      goalWeights: goalsBuild,
      plannedReps: 8,
      priority: 'primary',
    });
    expect(w).toBeGreaterThanOrEqual(25);
    expect(w).toBeLessThan(65);
    expect(getExerciseLoadingProfile(t!).loadingIntentKey).toBe('thruster_blend');
  });

  it('close grip bench uses horizontal press defaults (not triceps isolation defaults)', () => {
    const cg = getExerciseById('close_grip_bench_press');
    expect(cg).not.toBeNull();
    const w = suggestLoading({
      exercise: cg!,
      userState: intermediate,
      goalWeights: goalsBuild,
      plannedReps: 8,
      priority: 'primary',
    });
    expect(w).toBeGreaterThanOrEqual(45);
    expect(getExerciseLoadingProfile(cg!).loadingIntentKey).toBe('horizontal_press');
  });

  it('farmers walk prescription reads as carry distance in summaries', () => {
    const fw = getExerciseById('farmer_walk');
    expect(fw).not.toBeNull();
    const profile = getExerciseLoadingProfile(fw!);
    expect(profile.prescriptionType).toBe('carry_distance');
    const line = formatPlannedSetSummary(fw!, { suggestedWeight: 25, targetReps: 40 });
    expect(line).toMatch(/m \/ set/i);
    expect(line).toMatch(/hand/i);
  });

  it('21s is deprioritized vs standard curls for elbow_flexion slot', () => {
    const curls = chooseExercise({
      intent: 'elbow_flexion',
      constraints: fullEquipment,
      userState: intermediate,
      goalWeights: goalsBuild,
      alreadySelected: [],
    });
    expect(curls.length).toBeGreaterThan(1);
    expect(curls[0]?.id).not.toBe('21s');
  });

  it('dumbbell curl uses 1 kg increments', () => {
    const curl = getExerciseById('dumbbell_curl');
    expect(curl).not.toBeNull();
    expect(getExerciseIncrementKg(curl!)).toBe(1);
  });

  it('barbell bench uses 2.5 kg increments', () => {
    const bp = getExerciseById('barbell_bench_press');
    expect(bp).not.toBeNull();
    expect(getExerciseIncrementKg(bp!)).toBe(2.5);
  });

  it('catalog: shoulder isolation exercises are not compound by engine', () => {
    const lat = getExerciseById('lateral_raises');
    expect(isCompoundExercise(lat!)).toBe(false);
  });
});

describe('buildSession smoke', () => {
  it('push template builds with extended optional intents', () => {
    const session = buildSession({
      template: 'push',
      goals: { build_muscle: 0.5, build_strength: 0.5 },
      constraints: fullEquipment,
      userState: { experienceLevel: 'intermediate' },
    });
    expect(session.exercises.length).toBeGreaterThanOrEqual(4);
  });
});
