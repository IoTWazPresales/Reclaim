import { describe, expect, it } from 'vitest';
import { holdBlankSpinnerForMissingExercise } from '@/lib/training/sessionExercisePresence';

describe('holdBlankSpinnerForMissingExercise', () => {
  it('opens a run that has no lifting item', () => {
    expect(holdBlankSpinnerForMissingExercise(true, false)).toBe(false);
  });

  it('holds a spinner only when a non-run session has no current item', () => {
    expect(holdBlankSpinnerForMissingExercise(false, false)).toBe(true);
    expect(holdBlankSpinnerForMissingExercise(false, true)).toBe(false);
    expect(holdBlankSpinnerForMissingExercise(true, true)).toBe(false);
  });
});
