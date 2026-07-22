import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TrainingSessionItemRow } from '@/lib/api';

const apiMocks = vi.hoisted(() => ({
  getTrainingSession: vi.fn(),
  scheduleTrainingNowPrompt: vi.fn(),
  scheduleTrainingTimedPrompt: vi.fn(),
  clearTrainingTimedPrompt: vi.fn(),
  clearTrainingPromptIntentsForSession: vi.fn(),
  clearTrainingIntentsForSession: vi.fn(),
  scheduleTrainingStaleSessionCheck: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  getTrainingSession: (...args: unknown[]) => apiMocks.getTrainingSession(...args),
}));

vi.mock('@/lib/notifications/trainingNotificationScheduler', () => ({
  scheduleTrainingNowPrompt: (...args: unknown[]) => apiMocks.scheduleTrainingNowPrompt(...args),
  scheduleTrainingTimedPrompt: (...args: unknown[]) =>
    apiMocks.scheduleTrainingTimedPrompt(...args),
  clearTrainingTimedPrompt: (...args: unknown[]) => apiMocks.clearTrainingTimedPrompt(...args),
  clearTrainingPromptIntentsForSession: (...args: unknown[]) =>
    apiMocks.clearTrainingPromptIntentsForSession(...args),
  clearTrainingIntentsForSession: (...args: unknown[]) =>
    apiMocks.clearTrainingIntentsForSession(...args),
  scheduleTrainingStaleSessionCheck: (...args: unknown[]) =>
    apiMocks.scheduleTrainingStaleSessionCheck(...args),
  trainingNowIntentKey: (sessionId: string) => `training_now:${sessionId}`,
  trainingTimedIntentKey: (sessionId: string) => `training_at:${sessionId}`,
}));

vi.mock('@/lib/notifications/NotificationIntentStore', () => ({
  clearIntent: vi.fn(),
  hasIntent: vi.fn(async () => false),
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
    apiMocks.scheduleTrainingNowPrompt.mockResolvedValue('training_now:sess-1');
    apiMocks.clearTrainingTimedPrompt.mockResolvedValue(undefined);
  });

  it('loadGuidedTrainingNotificationWorkChain reads DB items', async () => {
    apiMocks.getTrainingSession.mockResolvedValue({
      session: { id: 'sess-1', current_exercise_index: 0 },
      items: [item('a', 'ex1', [1, 2], [1])],
    });

    const chain = await loadGuidedTrainingNotificationWorkChain('sess-1');
    expect(chain.next?.setIndex).toBe(2);
    expect(apiMocks.getTrainingSession).toHaveBeenCalledWith('sess-1');
  });

  it('loadGuidedTrainingNotificationWorkChain honours session cursor', async () => {
    apiMocks.getTrainingSession.mockResolvedValue({
      session: { id: 'sess-cursor', current_exercise_index: 1 },
      items: [item('a', 'ex1', [1], []), item('b', 'ex2', [1], [])],
    });

    const chain = await loadGuidedTrainingNotificationWorkChain('sess-cursor');
    expect(chain.next?.exerciseId).toBe('ex2');
    expect(chain.next?.setIndex).toBe(1);
  });

  it('replaces prompts with an immediate set prompt from DB pending work', async () => {
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
      sessionComplete: false,
    };

    const result = await scheduleGuidedTrainingNextSetFromDb('sess-1', { chain });

    expect(result.nextSetIndex).toBe(2);
    // Rest-end timed prompt is cleared; immediate "Next set" prompt replaces the tile.
    expect(apiMocks.clearTrainingTimedPrompt).toHaveBeenCalledWith('sess-1');
    expect(apiMocks.scheduleTrainingNowPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'sess-1',
        kind: 'set',
        title: 'Next set',
        body: expect.stringContaining('Set 2'),
      }),
      { deferReconcile: true },
    );
    expect(apiMocks.getTrainingSession).not.toHaveBeenCalled();
  });

  it('clears prompt slots and re-arms stale when session is complete', async () => {
    const result = await scheduleGuidedTrainingNextSetFromDb('sess-2', {
      chain: { pending: [], next: null, sessionComplete: true },
    });

    expect(result.sessionComplete).toBe(true);
    expect(apiMocks.clearTrainingPromptIntentsForSession).toHaveBeenCalledWith('sess-2');
    expect(apiMocks.scheduleTrainingStaleSessionCheck).toHaveBeenCalledWith(
      'sess-2',
      expect.any(Number),
      { deferReconcile: true },
    );
    expect(apiMocks.clearTrainingIntentsForSession).not.toHaveBeenCalled();
    expect(apiMocks.scheduleTrainingNowPrompt).not.toHaveBeenCalled();
  });
});
