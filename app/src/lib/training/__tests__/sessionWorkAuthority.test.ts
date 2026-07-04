import { describe, it, expect } from 'vitest';
import type { TrainingSessionItemRow } from '@/lib/api';
import {
  deriveActiveWorkTarget,
  getFirstPendingSetIndexOnItem,
  isExerciseFullyLoggedOnItem,
  isSetPerformedOnItem,
  resolveExerciseIndexFromSession,
  resolveNotificationPresentation,
} from '@/lib/training/sessionWorkAuthority';

function item(
  id: string,
  exerciseId: string,
  planned: number[],
  performed: number[] = [],
): TrainingSessionItemRow {
  return {
    id,
    exercise_id: exerciseId,
    order_index: 0,
    planned: {
      sets: planned.map((setIndex) => ({
        setIndex,
        targetReps: 8,
        suggestedWeight: 50,
        restSeconds: 90,
      })),
    },
    performed: {
      sets: performed.map((setIndex) => ({
        setIndex,
        weight: 50,
        reps: 8,
        completedAt: '2026-01-01T00:00:00.000Z',
      })),
    },
  } as TrainingSessionItemRow;
}

describe('sessionWorkAuthority', () => {
  it('first pending set skips performed indices', () => {
    const row = item('a', 'ex1', [1, 2, 3], [1]);
    expect(getFirstPendingSetIndexOnItem(row)).toBe(2);
    expect(isSetPerformedOnItem(row, 1)).toBe(true);
    expect(isSetPerformedOnItem(row, 2)).toBe(false);
  });

  it('deriveActiveWorkTarget scans forward from cursor', () => {
    const items = [
      item('a', 'ex1', [1], [1]),
      item('b', 'ex2', [1, 2], []),
    ];
    expect(deriveActiveWorkTarget(items, 0)?.setIndex).toBe(1);
    expect(deriveActiveWorkTarget(items, 0)?.exerciseId).toBe('ex2');
  });

  it('resolveNotificationPresentation always derives work from DB, ignoring backward hints', () => {
    const items = [item('a', 'ex1', [1, 2, 3], [1])];
    const pres = resolveNotificationPresentation(items, 0, {
      exerciseId: 'ex1',
      setIndex: 1,
    });
    // Hint pointed at an already-performed set — derived work is the real pending one.
    expect(pres.work?.setIndex).toBe(2);
    expect(pres.cursorExerciseIndex).toBe(0);
  });

  it('resolveExerciseIndexFromSession clamps cursor', () => {
    const items = [item('a', 'ex1', [1]), item('b', 'ex2', [1])];
    expect(resolveExerciseIndexFromSession(items, { current_exercise_index: 99 })).toBe(1);
  });

  it('isExerciseFullyLoggedOnItem requires every planned index, not just count', () => {
    const row = item('a', 'ex1', [1, 2, 3], [1, 3]);
    expect(getFirstPendingSetIndexOnItem(row)).toBe(2);
    expect(isExerciseFullyLoggedOnItem(row)).toBe(false);
  });
});
