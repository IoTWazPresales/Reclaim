import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NotificationResponse } from 'expo-notifications';

const persistMocks = vi.hoisted(() => ({
  applySetCompletion: vi.fn(),
  applySetSkip: vi.fn(),
  getTrainingSessionItemById: vi.fn(),
  patchSessionItemPerformedInCache: vi.fn(),
  wasActionProcessed: vi.fn(),
  markActionProcessed: vi.fn(),
  clearIntent: vi.fn(),
  reconcileNotifications: vi.fn(),
  scheduleTrainingRest: vi.fn(),
  scheduleTrainingSet: vi.fn(),
  scheduleTrainingSetImmediate: vi.fn(),
}));

vi.mock('@/lib/training/applySetCompletion', () => ({
  applySetCompletion: (...args: unknown[]) => persistMocks.applySetCompletion(...args),
  applySetSkip: (...args: unknown[]) => persistMocks.applySetSkip(...args),
}));

vi.mock('@/data/TrainingRepository', () => ({
  getTrainingSessionItemById: (...args: unknown[]) => persistMocks.getTrainingSessionItemById(...args),
}));

vi.mock('@/lib/training/sessionQueryPatch', () => ({
  patchSessionItemPerformedInCache: (...args: unknown[]) =>
    persistMocks.patchSessionItemPerformedInCache(...args),
}));

vi.mock('@/lib/notifications/ActionIdempotencyStore', () => ({
  wasActionProcessed: (...args: unknown[]) => persistMocks.wasActionProcessed(...args),
  markActionProcessed: (...args: unknown[]) => persistMocks.markActionProcessed(...args),
}));

vi.mock('@/lib/notifications/NotificationIntentStore', () => ({
  setIntent: vi.fn(),
  clearIntent: (...args: unknown[]) => persistMocks.clearIntent(...args),
  hasIntent: vi.fn(async () => true),
}));

vi.mock('@/lib/notifications/guidedNotificationActionEvidence', () => ({
  evaluateGuidedSetDoneAcceptance: vi.fn(async () => ({
    accept: true,
    reason: 'ok',
    evidence: {},
    detail: {},
  })),
}));

vi.mock('@/lib/notifications/NotificationScheduler', () => ({
  reconcileNotifications: (...args: unknown[]) => persistMocks.reconcileNotifications(...args),
}));

vi.mock('@/lib/notifications/trainingNotificationScheduler', () => ({
  scheduleTrainingRest: (...args: unknown[]) => persistMocks.scheduleTrainingRest(...args),
  scheduleTrainingSet: (...args: unknown[]) => persistMocks.scheduleTrainingSet(...args),
  scheduleTrainingSetImmediate: (...args: unknown[]) => persistMocks.scheduleTrainingSetImmediate(...args),
}));

vi.mock('@/navigation/nav', () => ({
  safeNavigate: vi.fn(),
}));

vi.mock('@/lib/queryClient', () => ({
  queryClient: { invalidateQueries: vi.fn() },
}));

import { handleGuidedTrainingNotificationAction } from '@/lib/notifications/guidedTrainingNotificationActions';

const response = {} as NotificationResponse;

describe('guidedTrainingNotificationActions persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    persistMocks.applySetCompletion.mockResolvedValue({
      wroteOnline: true,
      completedAt: '2026-06-24T12:00:00.000Z',
      setLogId: 'item-1_set_1_1',
    });
    persistMocks.applySetSkip.mockResolvedValue({
      wroteOnline: true,
      completedAt: '2026-06-24T12:00:00.000Z',
      setLogId: 'item-1_set_1_1',
    });
    persistMocks.getTrainingSessionItemById.mockResolvedValue({
      id: 'item-1',
      planned: { sets: [{ setIndex: 1, restSeconds: 90 }, { setIndex: 2, restSeconds: 90 }] },
      performed: { sets: [] },
    });
    persistMocks.wasActionProcessed.mockResolvedValue(false);
    persistMocks.markActionProcessed.mockResolvedValue(undefined);
    persistMocks.clearIntent.mockResolvedValue(undefined);
    persistMocks.reconcileNotifications.mockResolvedValue(undefined);
    persistMocks.scheduleTrainingRest.mockResolvedValue(undefined);
    persistMocks.scheduleTrainingSet.mockResolvedValue(undefined);
    persistMocks.scheduleTrainingSetImmediate.mockResolvedValue(undefined);
  });

  it('SKIP_SET persists through applySetSkip before scheduling', async () => {
    const handled = await handleGuidedTrainingNotificationAction({
      action: 'SKIP_SET',
      key: 'skip-key',
      response,
      data: {
        type: 'TRAINING_SET',
        sessionId: 'sess-1',
        sessionItemId: 'item-1',
        exerciseId: 'bench',
        setIndex: 1,
        nextSessionItemId: 'item-1',
        nextExerciseId: 'bench',
        nextSetIndex: 2,
      },
    });

    expect(handled).toBe(true);
    expect(persistMocks.applySetSkip).toHaveBeenCalledWith({
      sessionId: 'sess-1',
      sessionItemId: 'item-1',
      exerciseId: 'bench',
      setIndex: 1,
    });
    expect(persistMocks.patchSessionItemPerformedInCache).toHaveBeenCalled();
    const skipOrder = persistMocks.applySetSkip.mock.invocationCallOrder[0];
    const scheduleOrder = persistMocks.scheduleTrainingSet.mock.invocationCallOrder[0];
    expect(skipOrder).toBeLessThan(scheduleOrder);
  });

  it('SET_DONE persists through applySetCompletion', async () => {
    const handled = await handleGuidedTrainingNotificationAction({
      action: 'SET_DONE',
      key: 'done-key',
      response,
      data: {
        type: 'TRAINING_SET',
        sessionId: 'sess-1',
        sessionItemId: 'item-1',
        exerciseId: 'bench',
        setIndex: 1,
        suggestedWeight: 50,
        targetReps: 8,
        nextSessionItemId: 'item-1',
        nextExerciseId: 'bench',
        nextSetIndex: 2,
      },
    });

    expect(handled).toBe(true);
    expect(persistMocks.applySetCompletion).toHaveBeenCalledWith({
      sessionId: 'sess-1',
      sessionItemId: 'item-1',
      exerciseId: 'bench',
      setIndex: 1,
      weight: 50,
      reps: 8,
    });
    expect(persistMocks.patchSessionItemPerformedInCache).toHaveBeenCalled();
  });
});
