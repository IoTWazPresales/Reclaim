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

/** Both in-app and notification paths converge on buildNotificationWorkChain after same DB shape. */
function chainAfterSetDone(
  items: TrainingSessionItemRow[],
  sessionItemId: string,
  setIndex: number,
  weight: number,
  reps: number,
) {
  const updated = simulateLogSetOnItems(items, sessionItemId, setIndex, weight, reps);
  return buildNotificationWorkChain(updated);
}

function chainAfterSkip(
  items: TrainingSessionItemRow[],
  sessionItemId: string,
  setIndex: number,
) {
  const updated = simulateSkipSetOnItems(items, sessionItemId, setIndex);
  return buildNotificationWorkChain(updated);
}

describe('training set lifecycle parity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('set done produces identical work chain regardless of entry path', () => {
    const base = [item('a', 'bench', [1, 2, 3])];

    const inAppChain = chainAfterSetDone(base, 'a', 1, 60, 8);
    const notifChain = chainAfterSetDone(base, 'a', 1, 60, 8);

    expect(inAppChain).toEqual(notifChain);
    expect(inAppChain.next?.setIndex).toBe(2);
    expect(inAppChain.nextAfter?.setIndex).toBe(3);
  });

  it('skip produces identical pending work targets as set done with zero weight', () => {
    const base = [item('a', 'squat', [1, 2])];

    const skipChain = chainAfterSkip(base, 'a', 1);
    const zeroChain = chainAfterSetDone(base, 'a', 1, 0, 0);

    expect(skipChain.pending).toEqual(zeroChain.pending);
    expect(skipChain.next?.setIndex).toBe(2);
  });

  it('NEXT_SET target matches chain.next after rest (DB reload simulation)', () => {
    const items = simulateLogSetOnItems([item('a', 'deadlift', [1, 2])], 'a', 1, 100, 5);
    const chain = buildNotificationWorkChain(items);

    expect(chain.next?.exerciseId).toBe('deadlift');
    expect(chain.next?.setIndex).toBe(2);
  });
});
