import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TrainingSessionItemRow } from '@/lib/api';
import {
  buildNotificationWorkChain,
  listPendingWorkTargets,
} from '@/lib/training/trainingNotificationWorkPlan';

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
  } as TrainingSessionItemRow;
}

describe('trainingNotificationWorkPlan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists pending sets in order across exercises', () => {
    const items = [item('a', 'ex1', [1, 2], [1]), item('b', 'ex2', [1], [])];
    const pending = listPendingWorkTargets(items);
    expect(pending.map((p) => `${p.exerciseId}:${p.setIndex}`)).toEqual(['ex1:2', 'ex2:1']);
  });

  it('builds next target from DB-shaped performed state (no lookahead chain)', () => {
    const items = [item('a', 'ex1', [1, 2, 3], [1])];
    const chain = buildNotificationWorkChain(items);
    expect(chain.sessionComplete).toBe(false);
    expect(chain.next?.setIndex).toBe(2);
    // Dumb triggers: only the immediate next target is derived — no nextAfter snapshot.
    expect('nextAfter' in chain).toBe(false);
  });

  it('when cursor is set, next follows cursor (not session-order first pending)', () => {
    const items = [
      item('a', 'ex1', [1, 2], []),
      item('b', 'ex2', [1], []),
    ];
    const fromStart = buildNotificationWorkChain(items);
    expect(fromStart.next?.exerciseId).toBe('ex1');
    expect(fromStart.next?.setIndex).toBe(1);

    const fromJump = buildNotificationWorkChain(items, { startExerciseIndex: 1 });
    expect(fromJump.next?.exerciseId).toBe('ex2');
    expect(fromJump.next?.setIndex).toBe(1);
    // Full pending list still session-order for callers that need it.
    expect(fromJump.pending.map((p) => p.exerciseId)).toEqual(['ex1', 'ex1', 'ex2']);
  });
});
