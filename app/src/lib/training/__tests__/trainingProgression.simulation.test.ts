import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TrainingSessionItemRow } from '@/lib/api';
import {
  buildNotificationWorkChain,
  simulateLogSetOnItems,
  simulateSkipSetOnItems,
} from '@/lib/training/trainingSessionProgression';

vi.mock('@/lib/training/engine', () => ({
  getExerciseById: (id: string) => ({ id, name: `Exercise ${id}` }),
}));

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
  } as unknown as TrainingSessionItemRow;
}

describe('training progression simulation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('3 exercises × 3 sets: listPendingWorkTargets shrinks as sets are logged', () => {
    let items = [
      item('a', 'ex1', [1, 2, 3]),
      item('b', 'ex2', [1, 2, 3]),
      item('c', 'ex3', [1, 2, 3]),
    ];

    expect(buildNotificationWorkChain(items).pending).toHaveLength(9);

    items = simulateLogSetOnItems(items, 'a', 1, 50, 8);
    items = simulateLogSetOnItems(items, 'a', 2, 50, 8);
    expect(buildNotificationWorkChain(items).pending).toHaveLength(7);
    expect(buildNotificationWorkChain(items).next?.setIndex).toBe(3);

    items = simulateLogSetOnItems(items, 'a', 3, 50, 8);
    expect(buildNotificationWorkChain(items).next?.exerciseId).toBe('ex2');
  });

  it('skip exercise removes all its sets from pending chain', () => {
    const items = [
      item('a', 'ex1', [1, 2]),
      { ...item('b', 'ex2', [1, 2]), skipped: true },
      item('c', 'ex3', [1]),
    ];

    const chain = buildNotificationWorkChain(items);
    expect(chain.pending.map((p) => p.exerciseId)).toEqual(['ex1', 'ex1', 'ex3']);
    expect(chain.pending.some((p) => p.exerciseId === 'ex2')).toBe(false);
  });

  it('sessionComplete when all non-skipped sets logged', () => {
    let items = [item('a', 'ex1', [1, 2]), item('b', 'ex2', [1])];
    items = simulateLogSetOnItems(items, 'a', 1, 50, 8);
    items = simulateLogSetOnItems(items, 'a', 2, 50, 8);
    items = simulateSkipSetOnItems(items, 'b', 1);

    const chain = buildNotificationWorkChain(items);
    expect(chain.sessionComplete).toBe(true);
    expect(chain.next).toBeNull();
  });
});
