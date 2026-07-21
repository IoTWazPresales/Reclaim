import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TrainingSessionItemRow } from '@/lib/api';

const mocks = vi.hoisted(() => ({
  getTrainingSession: vi.fn(),
  scheduleTrainingNowPrompt: vi.fn(),
  scheduleTrainingTimedPrompt: vi.fn(),
  clearTrainingTimedPrompt: vi.fn(),
  clearTrainingIntentsForSession: vi.fn(),
  scheduleTrainingStaleSessionCheck: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  getTrainingSession: (...args: unknown[]) => mocks.getTrainingSession(...args),
}));

vi.mock('@/lib/notifications/trainingNotificationScheduler', () => ({
  scheduleTrainingNowPrompt: (...args: unknown[]) => mocks.scheduleTrainingNowPrompt(...args),
  scheduleTrainingTimedPrompt: (...args: unknown[]) => mocks.scheduleTrainingTimedPrompt(...args),
  clearTrainingTimedPrompt: (...args: unknown[]) => mocks.clearTrainingTimedPrompt(...args),
  clearTrainingIntentsForSession: (...args: unknown[]) => mocks.clearTrainingIntentsForSession(...args),
  scheduleTrainingStaleSessionCheck: (...args: unknown[]) =>
    mocks.scheduleTrainingStaleSessionCheck(...args),
  trainingNowIntentKey: (id: string) => `training_now:${id}`,
  trainingTimedIntentKey: (id: string) => `training_at:${id}`,
}));

vi.mock('@/lib/notifications/NotificationIntentStore', () => ({
  hasIntent: vi.fn(async () => false),
}));

vi.mock('@/lib/training/engine', () => ({
  getExerciseById: (id: string) => ({ id, name: id === 'squat' ? 'Squat' : `Ex ${id}` }),
}));

import { scheduleGuidedTrainingAfterSetPersist } from '@/lib/training/scheduleGuidedTrainingAfterSetPersist';

function item(
  id: string,
  exerciseId: string,
  order: number,
  planned: number[],
  performed: number[] = [],
): TrainingSessionItemRow {
  return {
    id,
    exercise_id: exerciseId,
    order_index: order,
    planned: {
      sets: planned.map((setIndex) => ({
        setIndex,
        targetReps: 8,
        suggestedWeight: 50,
        restSeconds: setIndex < Math.max(...planned) ? 90 : undefined,
      })),
    },
    performed: {
      sets: performed.map((setIndex) => ({
        setIndex,
        weight: 50,
        reps: 8,
        completedAt: new Date().toISOString(),
      })),
    },
  } as TrainingSessionItemRow;
}

describe('scheduleGuidedTrainingAfterSetPersist cursor + rest parity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.scheduleTrainingNowPrompt.mockResolvedValue('k');
    mocks.scheduleTrainingTimedPrompt.mockResolvedValue('k');
    mocks.scheduleTrainingStaleSessionCheck.mockResolvedValue('k');
  });

  it('after jump cursor, next prompt names jumped exercise not session-order first', async () => {
    // Bench still has pending set 1; cursor jumped to squat (index 1) with set 1 done → next squat set 2
    const items = [
      item('i1', 'bench', 0, [1, 2], []),
      item('i2', 'squat', 1, [1, 2], [1]),
    ];
    mocks.getTrainingSession.mockResolvedValue({
      session: { id: 's1', current_exercise_index: 1 },
      items,
    });

    const result = await scheduleGuidedTrainingAfterSetPersist({
      sessionId: 's1',
      completedSessionItemId: 'i2',
      completedSetIndex: 1,
    });

    expect(result.nextExerciseId).toBe('squat');
    expect(result.nextSetIndex).toBe(2);
    const body = mocks.scheduleTrainingNowPrompt.mock.calls[0]?.[0]?.body as string;
    expect(body).toContain('Squat');
    expect(body).not.toMatch(/bench/i);
  });

  it('last set of exercise with next exercise yields between-exercise rest > 0', async () => {
    const items = [
      item('i1', 'bench', 0, [1, 2], [1, 2]),
      item('i2', 'squat', 1, [1, 2], []),
    ];
    mocks.getTrainingSession.mockResolvedValue({
      session: { id: 's1', current_exercise_index: 0 },
      items,
    });

    const result = await scheduleGuidedTrainingAfterSetPersist({
      sessionId: 's1',
      completedSessionItemId: 'i1',
      completedSetIndex: 2,
    });

    expect(result.restSecondsAfterCompleted).toBeGreaterThan(0);
    expect(result.nextExerciseId).toBe('squat');
  });
});
