import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TrainingSessionItemRow } from '@/lib/api';

const apiMocks = vi.hoisted(() => ({
  getTrainingSession: vi.fn(),
  scheduleTrainingSetImmediate: vi.fn(),
  clearIntent: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  getTrainingSession: (...args: unknown[]) => apiMocks.getTrainingSession(...args),
}));

vi.mock('@/lib/notifications/trainingNotificationScheduler', () => ({
  scheduleTrainingRest: vi.fn(),
  scheduleTrainingSet: vi.fn(),
  scheduleTrainingSetImmediate: (...args: unknown[]) =>
    apiMocks.scheduleTrainingSetImmediate(...args),
}));

vi.mock('@/lib/notifications/NotificationIntentStore', () => ({
  clearIntent: (...args: unknown[]) => apiMocks.clearIntent(...args),
}));

vi.mock('@/lib/training/engine', () => ({
  getExerciseById: (id: string) => ({ id, name: `Exercise ${id}` }),
}));

import {
  loadGuidedTrainingNotificationWorkChain,
  scheduleGuidedTrainingNextSetFromDb,
} from '@/lib/training/scheduleGuidedTrainingAfterSetPersist';

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

describe('scheduleGuidedTrainingNextSetFromDb', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.scheduleTrainingSetImmediate.mockResolvedValue(undefined);
    apiMocks.clearIntent.mockResolvedValue(undefined);
  });

  it('loadGuidedTrainingNotificationWorkChain reads DB items', async () => {
    apiMocks.getTrainingSession.mockResolvedValue({
      session: { id: 'sess-1' },
      items: [item('a', 'ex1', [1, 2], [1])],
    });

    const chain = await loadGuidedTrainingNotificationWorkChain('sess-1');
    expect(chain.next?.setIndex).toBe(2);
    expect(apiMocks.getTrainingSession).toHaveBeenCalledWith('sess-1');
  });

  it('schedules immediate set from DB pending work', async () => {
    const items = [item('a', 'ex1', [1, 2, 3], [1])];
    const chain = {
      pending: [],
      next: {
        sessionItemId: 'a',
        exerciseId: 'ex1',
        exerciseName: 'Exercise ex1',
        setIndex: 2,
        suggestedWeight: 50,
        targetReps: 8,
        restSeconds: 90,
      },
      nextAfter: {
        sessionItemId: 'a',
        exerciseId: 'ex1',
        exerciseName: 'Exercise ex1',
        setIndex: 3,
        suggestedWeight: 50,
        targetReps: 8,
        restSeconds: 90,
      },
      nextNextAfter: null,
      sessionComplete: false,
    };

    const result = await scheduleGuidedTrainingNextSetFromDb('sess-1', { chain });

    expect(result.nextSetIndex).toBe(2);
    expect(apiMocks.clearIntent).toHaveBeenCalledWith('training_rest:sess-1:ex1:2');
    expect(apiMocks.clearIntent).toHaveBeenCalledWith('training_set:sess-1:ex1:2');
    expect(apiMocks.scheduleTrainingSetImmediate).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'sess-1',
        exerciseId: 'ex1',
        setIndex: 2,
        next: chain.nextAfter,
      }),
      { deferReconcile: true },
    );
    expect(apiMocks.getTrainingSession).not.toHaveBeenCalled();
  });
});
