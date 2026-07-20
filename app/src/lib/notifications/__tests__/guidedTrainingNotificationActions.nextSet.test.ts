import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NotificationResponse } from 'expo-notifications';

const nextSetMocks = vi.hoisted(() => ({
  loadGuidedTrainingNotificationWorkChain: vi.fn(),
  scheduleGuidedTrainingNextSetFromDb: vi.fn(),
  wasActionProcessed: vi.fn(),
  markActionProcessed: vi.fn(),
  reconcileNotifications: vi.fn(),
  clearTrainingIntentsForSession: vi.fn(),
}));

vi.mock('@/lib/training/scheduleGuidedTrainingAfterSetPersist', () => ({
  loadGuidedTrainingNotificationWorkChain: (...args: unknown[]) =>
    nextSetMocks.loadGuidedTrainingNotificationWorkChain(...args),
  scheduleGuidedTrainingNextSetFromDb: (...args: unknown[]) =>
    nextSetMocks.scheduleGuidedTrainingNextSetFromDb(...args),
  scheduleGuidedTrainingAfterSetPersist: vi.fn(),
}));

vi.mock('@/lib/training/finalizeTrainingSession', () => ({
  finalizeTrainingSessionAndCleanup: vi.fn(async () => ({
    endedAt: '2026-06-24T12:00:00.000Z',
    wroteOnline: true,
    summary: {},
  })),
}));

vi.mock('@/lib/notifications/ActionIdempotencyStore', () => ({
  wasActionProcessed: (...args: unknown[]) => nextSetMocks.wasActionProcessed(...args),
  markActionProcessed: (...args: unknown[]) => nextSetMocks.markActionProcessed(...args),
}));

vi.mock('@/lib/notifications/NotificationIntentStore', () => ({
  setIntent: vi.fn(),
  clearIntent: vi.fn(),
  hasIntent: vi.fn(async () => true),
}));

vi.mock('@/lib/notifications/NotificationScheduler', () => ({
  reconcileNotifications: (...args: unknown[]) => nextSetMocks.reconcileNotifications(...args),
}));

vi.mock('@/lib/notifications/trainingNotificationScheduler', () => ({
  clearTrainingIntentsForSession: (...args: unknown[]) =>
    nextSetMocks.clearTrainingIntentsForSession(...args),
}));

vi.mock('@/lib/training/applySetCompletion', () => ({
  applySetCompletion: vi.fn(),
  applySetSkip: vi.fn(),
}));

vi.mock('@/lib/training/sessionQueryPatch', () => ({
  patchSessionItemPerformedInCache: vi.fn(),
}));

vi.mock('@/lib/training/guidedPendingExternalRestStore', () => ({
  savePendingGuidedExternalRest: vi.fn(async () => undefined),
  takePendingGuidedExternalRest: vi.fn(async () => null),
  clearPendingGuidedExternalRest: vi.fn(async () => undefined),
}));

vi.mock('@/navigation/nav', () => ({
  safeNavigate: vi.fn(),
}));

vi.mock('@/lib/queryClient', () => ({
  queryClient: { invalidateQueries: vi.fn() },
}));

vi.mock('@/lib/api', () => ({
  updateSessionCursorState: vi.fn(async () => undefined),
}));

import { handleGuidedTrainingNotificationAction } from '@/lib/notifications/guidedTrainingNotificationActions';
import { safeNavigate } from '@/navigation/nav';

const response = {} as NotificationResponse;

function dbChainNext(exerciseId: string, setIndex: number, sessionItemId = 'item-db') {
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

  it('derives the next set from the DB — the rest payload carries no plan snapshot', async () => {
    nextSetMocks.loadGuidedTrainingNotificationWorkChain.mockResolvedValue(dbChainNext('squat', 2));

    const handled = await handleGuidedTrainingNotificationAction({
      action: 'NEXT_SET',
      key: 'next-key',
      response,
      data: { type: 'TRAINING_REST', sessionId: 'sess-1' },
    });

    expect(handled).toBe(true);
    expect(nextSetMocks.loadGuidedTrainingNotificationWorkChain).toHaveBeenCalledWith('sess-1');
    expect(nextSetMocks.scheduleGuidedTrainingNextSetFromDb).toHaveBeenCalledWith('sess-1', {
      deferReconcile: true,
      chain: expect.objectContaining({
        next: expect.objectContaining({ exerciseId: 'squat', setIndex: 2 }),
      }),
    });
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

  it('duplicate NEXT_SET delivery (same response key) is skipped', async () => {
    nextSetMocks.loadGuidedTrainingNotificationWorkChain.mockResolvedValue(dbChainNext('squat', 2));
    nextSetMocks.wasActionProcessed.mockResolvedValue(true);

    const handled = await handleGuidedTrainingNotificationAction({
      action: 'NEXT_SET',
      key: 'next-key-dup',
      response,
      data: { type: 'TRAINING_REST', sessionId: 'sess-2' },
    });

    expect(handled).toBe(true);
    expect(nextSetMocks.scheduleGuidedTrainingNextSetFromDb).not.toHaveBeenCalled();
  });

  it('clears session prompts when DB shows session complete', async () => {
    nextSetMocks.loadGuidedTrainingNotificationWorkChain.mockResolvedValue({
      pending: [],
      next: null,
      sessionComplete: true,
    });

    const handled = await handleGuidedTrainingNotificationAction({
      action: 'NEXT_SET',
      key: 'next-key-3',
      response,
      data: { type: 'TRAINING_REST', sessionId: 'sess-3' },
    });

    expect(handled).toBe(true);
    expect(nextSetMocks.scheduleGuidedTrainingNextSetFromDb).not.toHaveBeenCalled();
    expect(nextSetMocks.clearTrainingIntentsForSession).toHaveBeenCalledWith('sess-3');
    expect(safeNavigate).toHaveBeenCalledWith('App', { screen: 'Training' });
  });
});
