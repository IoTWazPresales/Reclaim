import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NotificationResponse } from 'expo-notifications';
import type { TrainingSessionItemRow } from '@/lib/api';

const nextSetMocks = vi.hoisted(() => ({
  loadGuidedTrainingNotificationWorkChain: vi.fn(),
  scheduleGuidedTrainingNextSetFromDb: vi.fn(),
  wasActionProcessed: vi.fn(),
  markActionProcessed: vi.fn(),
  reconcileNotifications: vi.fn(),
  scheduleTrainingSetImmediate: vi.fn(),
  clearIntent: vi.fn(),
}));

vi.mock('@/lib/training/scheduleGuidedTrainingAfterSetPersist', () => ({
  loadGuidedTrainingNotificationWorkChain: (...args: unknown[]) =>
    nextSetMocks.loadGuidedTrainingNotificationWorkChain(...args),
  scheduleGuidedTrainingNextSetFromDb: (...args: unknown[]) =>
    nextSetMocks.scheduleGuidedTrainingNextSetFromDb(...args),
  scheduleGuidedTrainingAfterSetPersist: vi.fn(),
}));

vi.mock('@/lib/notifications/ActionIdempotencyStore', () => ({
  wasActionProcessed: (...args: unknown[]) => nextSetMocks.wasActionProcessed(...args),
  markActionProcessed: (...args: unknown[]) => nextSetMocks.markActionProcessed(...args),
}));

vi.mock('@/lib/notifications/NotificationIntentStore', () => ({
  setIntent: vi.fn(),
  clearIntent: (...args: unknown[]) => nextSetMocks.clearIntent(...args),
  hasIntent: vi.fn(async () => true),
}));

vi.mock('@/lib/notifications/NotificationScheduler', () => ({
  reconcileNotifications: (...args: unknown[]) => nextSetMocks.reconcileNotifications(...args),
}));

vi.mock('@/lib/notifications/trainingNotificationScheduler', () => ({
  scheduleTrainingSetImmediate: (...args: unknown[]) =>
    nextSetMocks.scheduleTrainingSetImmediate(...args),
}));

vi.mock('@/lib/training/applySetCompletion', () => ({
  applySetCompletion: vi.fn(),
  applySetSkip: vi.fn(),
}));

vi.mock('@/data/TrainingRepository', () => ({
  getTrainingSessionItemById: vi.fn(),
}));

vi.mock('@/lib/training/sessionQueryPatch', () => ({
  patchSessionItemPerformedInCache: vi.fn(),
}));

vi.mock('@/lib/notifications/guidedNotificationActionEvidence', () => ({
  evaluateGuidedSetDoneAcceptance: vi.fn(async () => ({
    accept: true,
    reason: 'ok',
    evidence: {},
    detail: {},
  })),
}));

vi.mock('@/navigation/nav', () => ({
  safeNavigate: vi.fn(),
}));

vi.mock('@/lib/queryClient', () => ({
  queryClient: { invalidateQueries: vi.fn() },
}));

import { handleGuidedTrainingNotificationAction } from '@/lib/notifications/guidedTrainingNotificationActions';
import { safeNavigate } from '@/navigation/nav';

const response = {} as NotificationResponse;

function dbChainNext(
  exerciseId: string,
  setIndex: number,
  sessionItemId = 'item-db',
) {
  return {
    pending: [],
    next: {
      sessionItemId,
      exerciseId,
      exerciseName: `Exercise ${exerciseId}`,
      setIndex,
      suggestedWeight: 60,
      targetReps: 8,
      restSeconds: 90,
    },
    nextAfter: null,
    nextNextAfter: null,
    sessionComplete: false,
  };
}

describe('guidedTrainingNotificationActions NEXT_SET (DB-derived)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nextSetMocks.wasActionProcessed.mockResolvedValue(false);
    nextSetMocks.markActionProcessed.mockResolvedValue(undefined);
    nextSetMocks.reconcileNotifications.mockResolvedValue(undefined);
    nextSetMocks.scheduleGuidedTrainingNextSetFromDb.mockResolvedValue({
      restSecondsAfterCompleted: 0,
      sessionComplete: false,
      nextSetIndex: 2,
      nextExerciseId: 'squat',
      nextSessionItemId: 'item-db',
    });
  });

  it('schedules from DB chain, not stale REST payload lookahead', async () => {
    nextSetMocks.loadGuidedTrainingNotificationWorkChain.mockResolvedValue(
      dbChainNext('squat', 2),
    );

    const handled = await handleGuidedTrainingNotificationAction({
      action: 'NEXT_SET',
      key: 'next-key',
      response,
      data: {
        type: 'TRAINING_REST',
        sessionId: 'sess-1',
        // Stale payload says bench set 1 — must be ignored
        nextSessionItemId: 'item-stale',
        nextExerciseId: 'bench',
        nextSetIndex: 1,
        nextAfterSessionItemId: 'item-stale-2',
        nextAfterExerciseId: 'bench',
        nextAfterSetIndex: 2,
      },
    });

    expect(handled).toBe(true);
    expect(nextSetMocks.loadGuidedTrainingNotificationWorkChain).toHaveBeenCalledWith('sess-1');
    expect(nextSetMocks.scheduleGuidedTrainingNextSetFromDb).toHaveBeenCalledWith('sess-1', {
      deferReconcile: true,
      chain: expect.objectContaining({
        next: expect.objectContaining({ exerciseId: 'squat', setIndex: 2 }),
      }),
    });
    expect(nextSetMocks.scheduleTrainingSetImmediate).not.toHaveBeenCalled();
    expect(safeNavigate).toHaveBeenCalledWith('App', {
      screen: 'Training',
      params: {
        notification: {
          action: 'next_set',
          sessionId: 'sess-1',
          exerciseId: 'squat',
          setIndex: 2,
        },
      },
    });
  });

  it('uses DB-derived idempotency key when payload disagrees', async () => {
    nextSetMocks.loadGuidedTrainingNotificationWorkChain.mockResolvedValue(
      dbChainNext('deadlift', 3),
    );

    await handleGuidedTrainingNotificationAction({
      action: 'NEXT_SET',
      key: 'next-key-2',
      response,
      data: {
        type: 'TRAINING_REST',
        sessionId: 'sess-2',
        nextExerciseId: 'bench',
        nextSetIndex: 1,
      },
    });

    expect(nextSetMocks.wasActionProcessed).toHaveBeenCalledWith('next_set:sess-2:deadlift:3');
  });

  it('skips scheduling when DB shows session complete', async () => {
    nextSetMocks.loadGuidedTrainingNotificationWorkChain.mockResolvedValue({
      pending: [],
      next: null,
      nextAfter: null,
      nextNextAfter: null,
      sessionComplete: true,
    });

    const handled = await handleGuidedTrainingNotificationAction({
      action: 'NEXT_SET',
      key: 'next-key-3',
      response,
      data: {
        type: 'TRAINING_REST',
        sessionId: 'sess-3',
        nextExerciseId: 'bench',
        nextSetIndex: 1,
      },
    });

    expect(handled).toBe(true);
    expect(nextSetMocks.scheduleGuidedTrainingNextSetFromDb).not.toHaveBeenCalled();
    expect(safeNavigate).toHaveBeenCalledWith('App', { screen: 'Training' });
  });
});
