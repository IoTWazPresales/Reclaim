import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TrainingSessionItemRow } from '@/lib/api';

const startMocks = vi.hoisted(() => ({
  getTrainingSession: vi.fn(),
  scheduleTrainingFirstSet: vi.fn(),
  hasIntent: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  getTrainingSession: (...args: unknown[]) => startMocks.getTrainingSession(...args),
}));

vi.mock('@/lib/notifications/trainingNotificationScheduler', () => ({
  scheduleTrainingFirstSet: (...args: unknown[]) => startMocks.scheduleTrainingFirstSet(...args),
  scheduleTrainingRest: vi.fn(),
  scheduleTrainingSet: vi.fn(),
  scheduleTrainingSetImmediate: vi.fn(),
}));

vi.mock('@/lib/notifications/NotificationIntentStore', () => ({
  clearIntent: vi.fn(),
  hasIntent: (...args: unknown[]) => startMocks.hasIntent(...args),
}));

vi.mock('@/lib/training/engine', () => ({
  getExerciseById: (id: string) => ({ id, name: `Exercise ${id}` }),
}));

import { scheduleGuidedTrainingSessionStart } from '@/lib/training/scheduleGuidedTrainingAfterSetPersist';

function item(
  id: string,
  exerciseId: string,
  planned: number[],
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
    performed: { sets: [] },
  } as unknown as TrainingSessionItemRow;
}

describe('scheduleGuidedTrainingSessionStart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    startMocks.hasIntent.mockResolvedValue(false);
    startMocks.scheduleTrainingFirstSet.mockResolvedValue(undefined);
  });

  it('schedules first pending set from DB items with lookahead chain', async () => {
    const items = [item('a', 'ex1', [1, 2, 3]), item('b', 'ex2', [1])];
    startMocks.getTrainingSession.mockResolvedValue({ session: { id: 'sess-1' }, items });

    const result = await scheduleGuidedTrainingSessionStart('sess-1');

    expect(result.scheduled).toBe(true);
    expect(result.firstExerciseId).toBe('ex1');
    expect(result.firstSetIndex).toBe(1);
    expect(startMocks.scheduleTrainingFirstSet).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'sess-1',
        sessionItemId: 'a',
        exerciseId: 'ex1',
        setIndex: 1,
        next: expect.objectContaining({ setIndex: 2, exerciseId: 'ex1' }),
        nextAfter: expect.objectContaining({ setIndex: 3, exerciseId: 'ex1' }),
        nextNextAfter: expect.objectContaining({ setIndex: 1, exerciseId: 'ex2' }),
      }),
      { deferReconcile: true },
    );
  });

  it('skips when first-set intent already exists', async () => {
    const items = [item('a', 'ex1', [1, 2])];
    startMocks.getTrainingSession.mockResolvedValue({ session: { id: 'sess-2' }, items });
    startMocks.hasIntent.mockResolvedValueOnce(true);

    const result = await scheduleGuidedTrainingSessionStart('sess-2');

    expect(result.scheduled).toBe(false);
    expect(startMocks.scheduleTrainingFirstSet).not.toHaveBeenCalled();
  });

  it('passes delaySeconds for prep countdown scheduling', async () => {
    const items = [item('a', 'squat', [1])];
    startMocks.getTrainingSession.mockResolvedValue({ session: { id: 'sess-3' }, items });

    await scheduleGuidedTrainingSessionStart('sess-3', { delaySeconds: 30 });

    expect(startMocks.scheduleTrainingFirstSet).toHaveBeenCalledWith(
      expect.objectContaining({ delaySeconds: 30 }),
      expect.any(Object),
    );
  });
});
