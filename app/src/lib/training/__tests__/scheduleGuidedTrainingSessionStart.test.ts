import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TrainingSessionItemRow } from '@/lib/api';

const startMocks = vi.hoisted(() => ({
  getTrainingSession: vi.fn(),
  scheduleTrainingNowPrompt: vi.fn(),
  scheduleTrainingTimedPrompt: vi.fn(),
  scheduleTrainingStaleSessionCheck: vi.fn(),
  startGuidedSessionFgs: vi.fn(),
  hasIntent: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  getTrainingSession: (...args: unknown[]) => startMocks.getTrainingSession(...args),
}));

vi.mock('@/lib/notifications/trainingNotificationScheduler', () => ({
  scheduleTrainingNowPrompt: (...args: unknown[]) => startMocks.scheduleTrainingNowPrompt(...args),
  scheduleTrainingTimedPrompt: (...args: unknown[]) =>
    startMocks.scheduleTrainingTimedPrompt(...args),
  scheduleTrainingStaleSessionCheck: (...args: unknown[]) =>
    startMocks.scheduleTrainingStaleSessionCheck(...args),
  clearTrainingTimedPrompt: vi.fn(),
  clearTrainingIntentsForSession: vi.fn(),
  trainingNowIntentKey: (sessionId: string) => `training_now:${sessionId}`,
  trainingTimedIntentKey: (sessionId: string) => `training_at:${sessionId}`,
}));

vi.mock('@/lib/training/guidedSessionFgs', () => ({
  startGuidedSessionFgs: (...args: unknown[]) => startMocks.startGuidedSessionFgs(...args),
  stopGuidedSessionFgs: vi.fn(),
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
    startMocks.scheduleTrainingNowPrompt.mockResolvedValue('training_now:sess-1');
    startMocks.scheduleTrainingTimedPrompt.mockResolvedValue('training_at:sess-1');
    startMocks.startGuidedSessionFgs.mockResolvedValue(true);
  });

  it('schedules a dumb first-set prompt from DB items (no lookahead payload)', async () => {
    const items = [item('a', 'ex1', [1, 2, 3]), item('b', 'ex2', [1])];
    startMocks.getTrainingSession.mockResolvedValue({ session: { id: 'sess-1' }, items });

    const result = await scheduleGuidedTrainingSessionStart('sess-1');

    expect(result.scheduled).toBe(true);
    expect(result.firstExerciseId).toBe('ex1');
    expect(result.firstSetIndex).toBe(1);
    expect(startMocks.scheduleTrainingNowPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'sess-1',
        kind: 'set',
        title: 'Session started',
        body: expect.stringContaining('Set 1'),
      }),
      { deferReconcile: true },
    );
    // The prompt call carries display strings only — never a session snapshot.
    const call = startMocks.scheduleTrainingNowPrompt.mock.calls[0][0] as Record<string, unknown>;
    expect(call).not.toHaveProperty('next');
    expect(call).not.toHaveProperty('nextAfter');
    expect(call).not.toHaveProperty('sessionItemId');
    expect(startMocks.startGuidedSessionFgs).toHaveBeenCalledWith('sess-1');
  });

  it('skips when a session prompt already exists', async () => {
    const items = [item('a', 'ex1', [1, 2])];
    startMocks.getTrainingSession.mockResolvedValue({ session: { id: 'sess-2' }, items });
    startMocks.hasIntent.mockResolvedValueOnce(true);

    const result = await scheduleGuidedTrainingSessionStart('sess-2');

    expect(result.scheduled).toBe(false);
    expect(startMocks.scheduleTrainingNowPrompt).not.toHaveBeenCalled();
    expect(startMocks.scheduleTrainingTimedPrompt).not.toHaveBeenCalled();
  });

  it('uses an absolute-timestamp prompt for prep countdown scheduling', async () => {
    const items = [item('a', 'squat', [1])];
    startMocks.getTrainingSession.mockResolvedValue({ session: { id: 'sess-3' }, items });

    const before = Date.now();
    await scheduleGuidedTrainingSessionStart('sess-3', { delaySeconds: 30 });

    expect(startMocks.scheduleTrainingNowPrompt).not.toHaveBeenCalled();
    expect(startMocks.scheduleTrainingTimedPrompt).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: 'sess-3', kind: 'set', title: 'Session started' }),
      { deferReconcile: true },
    );
    const call = startMocks.scheduleTrainingTimedPrompt.mock.calls[0][0] as { fireAtMs: number };
    expect(call.fireAtMs).toBeGreaterThanOrEqual(before + 30_000);
    expect(call.fireAtMs).toBeLessThanOrEqual(Date.now() + 31_000);
  });
});
