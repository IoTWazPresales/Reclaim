/**
 * Unit tests for exercise-name → movement-pattern diagram heuristics.
 */
import { describe, expect, it } from 'vitest';
import {
  inferIntentFromExerciseLabel,
  primaryIntentForDiagram,
} from '@/lib/training/movementPatternCues';

describe('inferIntentFromExerciseLabel', () => {
  it('maps squat / deadlift / bench by name', () => {
    expect(inferIntentFromExerciseLabel('Back Squat', 'barbell_back_squat')).toBe('knee_dominant');
    expect(inferIntentFromExerciseLabel('Romanian Deadlift', null)).toBe('hip_hinge');
    expect(inferIntentFromExerciseLabel('Barbell Bench Press', 'barbell_bench_press')).toBe(
      'horizontal_press',
    );
  });

  it('prefers name heuristic over mismatched intents', () => {
    expect(primaryIntentForDiagram(['horizontal_press'], 'Pull-Up', 'pull_up')).toBe('vertical_pull');
  });
});
