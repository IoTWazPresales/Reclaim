/**
 * The stick figure uses the catalog's first movement intent.
 * A name guess applies only when that intent is missing.
 */
import { describe, expect, it } from 'vitest';
import exercisesData from '@/lib/training/catalog/exercises.v1.json';
import type { MovementIntent } from '@/lib/training/types';
import {
  inferIntentFromExerciseLabel,
  primaryIntentForDiagram,
} from '@/lib/training/movementPatternCues';

const exercises = exercisesData as { id: string; name: string; intents: MovementIntent[] }[];

describe('inferIntentFromExerciseLabel', () => {
  it('maps squat / deadlift / bench by name', () => {
    expect(inferIntentFromExerciseLabel('Back Squat', 'barbell_back_squat')).toBe('knee_dominant');
    expect(inferIntentFromExerciseLabel('Romanian Deadlift', null)).toBe('hip_hinge');
    expect(inferIntentFromExerciseLabel('Barbell Bench Press', 'barbell_bench_press')).toBe(
      'horizontal_press',
    );
  });

  it('maps goblet squat / farmer carry / jump rope distinctly', () => {
    expect(inferIntentFromExerciseLabel('Goblet Squat', 'goblet_squat')).toBe('knee_dominant');
    expect(inferIntentFromExerciseLabel('Farmer Carry', 'farmer_carry')).toBe('carry');
    expect(inferIntentFromExerciseLabel('Jump Rope', 'jump_rope')).toBe('conditioning');
  });

  it('does not let row, raise, bench, or dip steal a different movement', () => {
    expect(inferIntentFromExerciseLabel('Glute Ham Raise', 'glute_ham_raise')).toBe('hip_hinge');
    expect(inferIntentFromExerciseLabel('Hanging Leg Raise', 'hanging_leg_raise')).toBe('trunk_stability');
    expect(inferIntentFromExerciseLabel('Upright Row', 'upright_row')).toBe('vertical_press');
    expect(inferIntentFromExerciseLabel('Bench Dips', 'bench_dips')).toBe('elbow_extension');
    expect(inferIntentFromExerciseLabel('Sled Push', 'sled_push')).toBe('knee_dominant');
    expect(inferIntentFromExerciseLabel("Waiter's Walk", 'waiters_walk')).toBe('carry');
    expect(inferIntentFromExerciseLabel('Sandbag Carry', 'sandbag_carry')).toBe('carry');
    expect(inferIntentFromExerciseLabel('Rowing Machine', 'rowing_machine')).toBe('conditioning');
    expect(inferIntentFromExerciseLabel('Pull-ups', 'pull_ups')).toBe('vertical_pull');
  });
});

describe('primaryIntentForDiagram', () => {
  it('uses the catalog movement even when the name would guess something else', () => {
    expect(primaryIntentForDiagram(['horizontal_press'], 'Pull-Up', 'pull_up')).toBe('horizontal_press');
    expect(primaryIntentForDiagram([], 'Pull-Up', 'pull_up')).toBe('vertical_pull');
  });

  it('draws every catalog exercise as its first movement intent', () => {
    const mismatches = exercises
      .filter((exercise) => exercise.intents.length > 0)
      .filter(
        (exercise) =>
          primaryIntentForDiagram(exercise.intents, exercise.name, exercise.id) !== exercise.intents[0],
      )
      .map((exercise) => exercise.id);
    expect(mismatches).toEqual([]);
  });
});
