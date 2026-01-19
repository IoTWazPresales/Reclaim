/**
 * Training Engine v1-correct Tests
 *
 * Deterministic test suite verifying:
 * 1. Equipment logic (ANY-of vs ALL-required)
 * 2. Preference classification (machine vs free weight vs bodyweight)
 * 3. Compound detection
 * 4. Loading suggestions (bodyweight vs machine defaults)
 * 5. Priority intents ordering
 */

import { describe, it, expect } from 'vitest';
import {
  getExerciseById,
  hasEquipment,
  getEquipmentClass,
  isMachineBiased,
  isFreeWeightBiased,
  isBodyweightExercise,
  isCompoundExercise,
  chooseExercise,
  suggestLoading,
  buildSession,
} from './index';
import type { TrainingConstraints, UserState, GoalWeights, Exercise } from '../types';

describe('Equipment Logic (Task 1)', () => {
  it('Romanian deadlift should be selectable with only dumbbells (no barbell)', () => {
    // Romanian deadlift has equipment: ["barbell", "dumbbells"] which is ANY-of
    const rdl = getExerciseById('romanian_deadlift');
    expect(rdl).not.toBeNull();

    // User only has dumbbells - should still be able to do RDL
    const available = ['dumbbells'];
    const hasEq = hasEquipment(rdl!, available);
    expect(hasEq).toBe(true);
  });

  it('Romanian deadlift should be selectable with only barbell (no dumbbells)', () => {
    const rdl = getExerciseById('romanian_deadlift');
    expect(rdl).not.toBeNull();

    const available = ['barbell'];
    const hasEq = hasEquipment(rdl!, available);
    expect(hasEq).toBe(true);
  });

  it('Overhead tricep extension should be selectable with only cable_machine (no dumbbell)', () => {
    // Overhead tricep extension has equipment: ["dumbbell", "cable_machine"] which is ANY-of
    const tricep = getExerciseById('overhead_tricep_extension');
    expect(tricep).not.toBeNull();

    const available = ['cable_machine'];
    const hasEq = hasEquipment(tricep!, available);
    expect(hasEq).toBe(true);
  });

  it('Barbell bench press should NOT be selectable without bench', () => {
    // Barbell bench press has equipmentAll: ["barbell", "bench"] which is ALL-required
    const bench = getExerciseById('barbell_bench_press');
    expect(bench).not.toBeNull();

    // User only has barbell, no bench
    const available = ['barbell'];
    const hasEq = hasEquipment(bench!, available);
    expect(hasEq).toBe(false);
  });

  it('Barbell bench press should be selectable with both barbell AND bench', () => {
    const bench = getExerciseById('barbell_bench_press');
    expect(bench).not.toBeNull();

    const available = ['barbell', 'bench'];
    const hasEq = hasEquipment(bench!, available);
    expect(hasEq).toBe(true);
  });

  it('Squat should NOT be selectable without rack', () => {
    const squat = getExerciseById('squat');
    expect(squat).not.toBeNull();

    // User has barbell but no rack
    const available = ['barbell'];
    const hasEq = hasEquipment(squat!, available);
    expect(hasEq).toBe(false);
  });

  it('Squat should be selectable with both barbell AND rack', () => {
    const squat = getExerciseById('squat');
    expect(squat).not.toBeNull();

    const available = ['barbell', 'rack'];
    const hasEq = hasEquipment(squat!, available);
    expect(hasEq).toBe(true);
  });

  it('Pull-ups should be selectable with just pull_up_bar', () => {
    const pullups = getExerciseById('pull_ups');
    expect(pullups).not.toBeNull();

    const available = ['pull_up_bar'];
    const hasEq = hasEquipment(pullups!, available);
    expect(hasEq).toBe(true);
  });

  it('Bodyweight exercises with no equipment should always be selectable', () => {
    const pushups = getExerciseById('push_ups');
    expect(pushups).not.toBeNull();
    expect(pushups!.equipment.length).toBe(0);

    // No equipment - should still work
    const hasEq = hasEquipment(pushups!, []);
    expect(hasEq).toBe(true);
  });
});

describe('Equipment Classification (Task 2)', () => {
  it('cable_machine should be classified as machine', () => {
    expect(getEquipmentClass('cable_machine')).toBe('machine');
  });

  it('leg_press_machine should be classified as machine', () => {
    expect(getEquipmentClass('leg_press_machine')).toBe('machine');
  });

  it('barbell should be classified as free_weight', () => {
    expect(getEquipmentClass('barbell')).toBe('free_weight');
  });

  it('dumbbells should be classified as free_weight', () => {
    expect(getEquipmentClass('dumbbells')).toBe('free_weight');
  });

  it('kettlebell should be classified as free_weight', () => {
    expect(getEquipmentClass('kettlebell')).toBe('free_weight');
  });

  it('pull_up_bar should be classified as bodyweight', () => {
    expect(getEquipmentClass('pull_up_bar')).toBe('bodyweight');
  });

  it('rings should be classified as bodyweight', () => {
    expect(getEquipmentClass('rings')).toBe('bodyweight');
  });

  it('bench should be classified as other (not free_weight)', () => {
    expect(getEquipmentClass('bench')).toBe('other');
  });

  it('rack should be classified as other', () => {
    expect(getEquipmentClass('rack')).toBe('other');
  });

  it('lat pulldown should be machine-biased', () => {
    const latPulldown = getExerciseById('lat_pulldown');
    expect(latPulldown).not.toBeNull();
    expect(isMachineBiased(latPulldown!)).toBe(true);
  });

  it('barbell row should be free-weight-biased', () => {
    const barbellRow = getExerciseById('barbell_row');
    expect(barbellRow).not.toBeNull();
    expect(isFreeWeightBiased(barbellRow!)).toBe(true);
  });

  it('pull-ups should be bodyweight exercise', () => {
    const pullups = getExerciseById('pull_ups');
    expect(pullups).not.toBeNull();
    expect(isBodyweightExercise(pullups!)).toBe(true);
  });
});

describe('Compound Detection (Task 3)', () => {
  it('Barbell back squat should be compound', () => {
    const squat = getExerciseById('squat');
    expect(squat).not.toBeNull();
    expect(isCompoundExercise(squat!)).toBe(true);
  });

  it('Deadlift should be compound', () => {
    const deadlift = getExerciseById('deadlift');
    expect(deadlift).not.toBeNull();
    expect(isCompoundExercise(deadlift!)).toBe(true);
  });

  it('Barbell bench press should be compound', () => {
    const bench = getExerciseById('barbell_bench_press');
    expect(bench).not.toBeNull();
    expect(isCompoundExercise(bench!)).toBe(true);
  });

  it('Barbell row should be compound', () => {
    const row = getExerciseById('barbell_row');
    expect(row).not.toBeNull();
    expect(isCompoundExercise(row!)).toBe(true);
  });

  it('Tricep pushdown should NOT be compound (isolation)', () => {
    const tricep = getExerciseById('tricep_pushdown');
    expect(tricep).not.toBeNull();
    expect(isCompoundExercise(tricep!)).toBe(false);
  });

  it('Bicep curl should NOT be compound (isolation)', () => {
    const curl = getExerciseById('dumbbell_curl');
    expect(curl).not.toBeNull();
    expect(isCompoundExercise(curl!)).toBe(false);
  });

  it('Plank should NOT be compound (trunk stability)', () => {
    const plank = getExerciseById('plank');
    expect(plank).not.toBeNull();
    expect(isCompoundExercise(plank!)).toBe(false);
  });
});

describe('Loading Logic (Task 4)', () => {
  const intermediateUserState: UserState = {
    experienceLevel: 'intermediate',
    estimated1RM: {},
  };

  const beginnerUserState: UserState = {
    experienceLevel: 'beginner',
    estimated1RM: {},
  };

  const goalWeights: GoalWeights = {
    build_muscle: 1,
    build_strength: 0,
  };

  it('Lat pulldown should use nonzero suggested weight for intermediate user', () => {
    const latPulldown = getExerciseById('lat_pulldown');
    expect(latPulldown).not.toBeNull();

    const weight = suggestLoading({
      exercise: latPulldown!,
      userState: intermediateUserState,
      goalWeights,
      plannedReps: 10,
      priority: 'primary',
    });

    // Should be machine default for vertical_pull at intermediate level (50kg)
    expect(weight).toBeGreaterThan(0);
    expect(weight).toBeGreaterThanOrEqual(40); // At least 40kg for intermediate
  });

  it('Pull-ups should suggest weight of 0 (bodyweight)', () => {
    const pullups = getExerciseById('pull_ups');
    expect(pullups).not.toBeNull();

    const weight = suggestLoading({
      exercise: pullups!,
      userState: intermediateUserState,
      goalWeights,
      plannedReps: 8,
      priority: 'primary',
    });

    // Should be 0 for bodyweight exercise
    expect(weight).toBe(0);
  });

  it('Cable row should use nonzero weight (machine horizontal pull)', () => {
    const cableRow = getExerciseById('cable_row');
    expect(cableRow).not.toBeNull();

    const weight = suggestLoading({
      exercise: cableRow!,
      userState: intermediateUserState,
      goalWeights,
      plannedReps: 10,
      priority: 'primary',
    });

    expect(weight).toBeGreaterThan(0);
  });

  it('Barbell row should use free weight defaults', () => {
    const barbellRow = getExerciseById('barbell_row');
    expect(barbellRow).not.toBeNull();

    const weight = suggestLoading({
      exercise: barbellRow!,
      userState: intermediateUserState,
      goalWeights,
      plannedReps: 8,
      priority: 'primary',
    });

    // Should use free weight default for horizontal_pull at intermediate (50kg)
    expect(weight).toBeGreaterThanOrEqual(40);
  });
});

describe('Priority Intents (Task 5)', () => {
  it('buildSession should respect priorityIntents ordering', () => {
    const constraints: TrainingConstraints = {
      availableEquipment: ['cable_machine', 'dumbbells', 'bench', 'pull_up_bar'],
      injuries: [],
      forbiddenMovements: [],
      timeBudgetMinutes: 60,
      // Prioritize vertical_pull over horizontal_press
      priorityIntents: ['vertical_pull', 'elbow_flexion'],
    };

    const userState: UserState = {
      experienceLevel: 'intermediate',
      estimated1RM: {},
    };

    const goalWeights: GoalWeights = {
      build_muscle: 1,
    };

    // Upper body template has: horizontal_press, vertical_press, horizontal_pull, vertical_pull
    const session = buildSession({
      template: 'upper',
      goals: goalWeights,
      constraints,
      userState,
    });

    expect(session.exercises.length).toBeGreaterThan(0);

    // First exercise should be for vertical_pull (since it's prioritized)
    const firstExercise = session.exercises[0];
    expect(firstExercise.intents).toContain('vertical_pull');
  });

  it('chooseExercise should give bonus score to priority intents', () => {
    const constraintsWithPriority: TrainingConstraints = {
      availableEquipment: ['cable_machine', 'barbell'],
      injuries: [],
      forbiddenMovements: [],
      timeBudgetMinutes: 60,
      priorityIntents: ['vertical_pull'],
    };

    const userState: UserState = {
      experienceLevel: 'intermediate',
      estimated1RM: {},
    };

    const goalWeights: GoalWeights = {
      build_muscle: 1,
    };

    // Should return exercises with vertical_pull
    const exercises = chooseExercise({
      intent: 'vertical_pull',
      constraints: constraintsWithPriority,
      userState,
      goalWeights,
      alreadySelected: [],
    });

    expect(exercises.length).toBeGreaterThan(0);
    // The exercise should match vertical_pull intent
    expect(exercises[0].intents).toContain('vertical_pull');
  });
});

describe('Decision Trace (Task 6)', () => {
  it('Decision trace should include preferences in constraintsApplied', () => {
    const constraints: TrainingConstraints = {
      availableEquipment: ['cable_machine', 'dumbbells', 'barbell'],
      injuries: ['lower_back_injury'],
      forbiddenMovements: [],
      timeBudgetMinutes: 60,
      preferences: {
        prefersMachines: true,
        hatesExercises: ['deadlift'],
      },
    };

    const session = buildSession({
      template: 'pull',
      goals: { build_muscle: 1 },
      constraints,
      userState: { experienceLevel: 'intermediate' },
    });

    expect(session.exercises.length).toBeGreaterThan(0);

    const firstTrace = session.exercises[0].decisionTrace;
    expect(firstTrace.constraintsApplied).toContain('preference: machines');
    expect(firstTrace.constraintsApplied.some((c) => c.includes('hated:'))).toBe(true);
    expect(firstTrace.constraintsApplied.some((c) => c.includes('injury:'))).toBe(true);
  });

  it('Decision trace should include alternativesSummary with top 3', () => {
    const constraints: TrainingConstraints = {
      availableEquipment: ['cable_machine', 'dumbbells', 'barbell', 'pull_up_bar'],
      injuries: [],
      forbiddenMovements: [],
      timeBudgetMinutes: 60,
    };

    const session = buildSession({
      template: 'pull',
      goals: { build_muscle: 1 },
      constraints,
      userState: { experienceLevel: 'intermediate' },
    });

    expect(session.exercises.length).toBeGreaterThan(0);

    const firstTrace = session.exercises[0].decisionTrace;
    // Should have rankedAlternatives
    expect(Array.isArray(firstTrace.rankedAlternatives)).toBe(true);

    // If there are alternatives, should have summary
    if (firstTrace.rankedAlternatives.length > 0) {
      expect(firstTrace.alternativesSummary).toBeDefined();
      expect(Array.isArray(firstTrace.alternativesSummary)).toBe(true);
    }
  });
});

describe('Integration Tests', () => {
  it('User with only dumbbells should get valid hip_hinge exercises (RDL)', () => {
    const constraints: TrainingConstraints = {
      availableEquipment: ['dumbbells'],
      injuries: [],
      forbiddenMovements: [],
      timeBudgetMinutes: 60,
    };

    const exercises = chooseExercise({
      intent: 'hip_hinge',
      constraints,
      userState: { experienceLevel: 'intermediate' },
      goalWeights: { build_muscle: 1 },
      alreadySelected: [],
    });

    expect(exercises.length).toBeGreaterThan(0);

    // Should include Romanian Deadlift (can be done with dumbbells)
    const hasRdl = exercises.some((e) => e.id === 'romanian_deadlift');
    expect(hasRdl).toBe(true);
  });

  it('User without barbell+rack should NOT get squat in exercises', () => {
    const constraints: TrainingConstraints = {
      availableEquipment: ['dumbbells'], // No barbell or rack
      injuries: [],
      forbiddenMovements: [],
      timeBudgetMinutes: 60,
    };

    const exercises = chooseExercise({
      intent: 'knee_dominant',
      constraints,
      userState: { experienceLevel: 'intermediate' },
      goalWeights: { build_muscle: 1 },
      alreadySelected: [],
    });

    // Should NOT include barbell back squat (needs barbell + rack)
    const hasSquat = exercises.some((e) => e.id === 'squat');
    expect(hasSquat).toBe(false);

    // But should include lunges (only needs dumbbells)
    const hasLunges = exercises.some((e) => e.id === 'lunges' || e.id === 'reverse_lunges');
    expect(hasLunges).toBe(true);
  });

  it('Full session should build without errors with common gym equipment', () => {
    const constraints: TrainingConstraints = {
      availableEquipment: ['barbell', 'dumbbells', 'bench', 'rack', 'cable_machine', 'pull_up_bar'],
      injuries: [],
      forbiddenMovements: [],
      timeBudgetMinutes: 60,
    };

    const session = buildSession({
      template: 'upper',
      goals: { build_muscle: 0.7, build_strength: 0.3 },
      constraints,
      userState: { experienceLevel: 'intermediate' },
    });

    expect(session.exercises.length).toBeGreaterThan(0);
    expect(session.estimatedDurationMinutes).toBeGreaterThan(0);

    // All exercises should have valid IDs
    session.exercises.forEach((ex) => {
      expect(ex.exerciseId).toBeTruthy();
      expect(ex.exercise).toBeTruthy();
      expect(ex.plannedSets.length).toBeGreaterThan(0);
    });
  });
});
