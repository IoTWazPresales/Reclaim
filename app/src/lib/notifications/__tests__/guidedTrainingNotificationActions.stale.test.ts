import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NotificationResponse } from 'expo-notifications';

const staleMocks = vi.hoisted(() => ({
  applySetCompletion: vi.fn(),
  applySetSkip: vi.fn(),
  getTrainingSessionItemById: vi.fn(),
  wasActionProcessed: vi.fn(),
  markActionProcessed: vi.fn(),
  clearIntent: vi.fn(),
  reconcileNotifications: vi.fn(),
  scheduleGuidedTrainingAfterSetPersist: vi.fn(),
}));

vi.mock('@/lib/training/applySetCompletion', () => ({
  applySetCompletion: (...args: unknown[]) => staleMocks.applySetCompletion(...args),
  applySetSkip: (...args: unknown[]) => staleMocks.applySetSkip(...args),
}));

vi.mock('@/data/TrainingRepository', () => ({
  getTrainingSessionItemById: (...args: unknown[]) => staleMocks.getTrainingSessionItemById(...args),
}));

vi.mock('@/lib/training/sessionQueryPatch', () => ({
  patchSessionItemPerformedInCache: vi.fn(),
}));

vi.mock('@/lib/notifications/ActionIdempotencyStore', () => ({
  wasActionProcessed: (...args: unknown[]) => staleMocks.wasActionProcessed(...args),
  markActionProcessed: (...args: unknown[]) => staleMocks.markActionProcessed(...args),
}));

vi.mock('@/lib/notifications/NotificationIntentStore', () => ({
  setIntent: vi.fn(),
  clearIntent: (...args: unknown[]) => staleMocks.clearIntent(...args),
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

vi.mock('@/lib/notifications/trainingNotificationScheduler', () => ({
  scheduleTrainingRest: vi.fn(),
  scheduleTrainingSet: vi.fn(),
  scheduleTrainingSetImmediate: vi.fn(),
}));

vi.mock('@/lib/notifications/NotificationScheduler', () => ({
  reconcileNotifications: (...args: unknown[]) => staleMocks.reconcileNotifications(...args),
}));

vi.mock('@/lib/training/scheduleGuidedTrainingAfterSetPersist', () => ({
  loadGuidedTrainingNotificationWorkChain: vi.fn(),
  scheduleGuidedTrainingAfterSetPersist: (...args: unknown[]) =>
    staleMocks.scheduleGuidedTrainingAfterSetPersist(...args),
  scheduleGuidedTrainingNextSetFromDb: vi.fn(),
}));

vi.mock('@/navigation/nav', () => ({ safeNavigate: vi.fn() }));
vi.mock('@/lib/queryClient', () => ({ queryClient: { invalidateQueries: vi.fn() } }));

import { handleGuidedTrainingNotificationAction } from '@/lib/notifications/guidedTrainingNotificationActions';

const response = {} as NotificationResponse;

const performedItem = {
  id: 'item-1',
  planned: { sets: [{ setIndex: 1, restSeconds: 90 }, { setIndex: 2, restSeconds: 90 }] },
  performed: {
    sets: [{ setIndex: 1, weight: 50, reps: 8, completedAt: '2026-06-24T12:00:00.000Z' }],
  },
};

describe('guidedTrainingNotificationActions stale payload rejection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    staleMocks.wasActionProcessed.mockResolvedValue(false);
    staleMocks.markActionProcessed.mockResolvedValue(undefined);
    staleMocks.clearIntent.mockResolvedValue(undefined);
    staleMocks.reconcileNotifications.mockResolvedValue(undefined);
    staleMocks.getTrainingSessionItemById.mockResolvedValue(performedItem);
  });

  it('SET_DONE skips when set already performed on item', async () => {
    const handled = await handleGuidedTrainingNotificationAction({
      action: 'SET_DONE',
      key: 'stale-done',
      response,
      data: {
        type: 'TRAINING_SET',
        sessionId: 'sess-1',
        sessionItemId: 'item-1',
        exerciseId: 'bench',
        setIndex: 1,
        suggestedWeight: 50,
        targetReps: 8,
      },
    });

    expect(handled).toBe(true);
    expect(staleMocks.applySetCompletion).not.toHaveBeenCalled();
    expect(staleMocks.scheduleGuidedTrainingAfterSetPersist).not.toHaveBeenCalled();
    expect(staleMocks.clearIntent).toHaveBeenCalledWith('training_set:sess-1:bench:1');
  });

  it('SET_DONE does not call applySetCompletion when stale', async () => {
    await handleGuidedTrainingNotificationAction({
      action: 'SET_DONE',
      key: 'stale-done-2',
      response,
      data: {
        type: 'TRAINING_SET',
        sessionId: 'sess-1',
        sessionItemId: 'item-1',
        exerciseId: 'bench',
        setIndex: 1,
      },
    });

    expect(staleMocks.applySetCompletion).not.toHaveBeenCalled();
  });

  it('SKIP_SET skips when set already performed', async () => {
    const handled = await handleGuidedTrainingNotificationAction({
      action: 'SKIP_SET',
      key: 'stale-skip',
      response,
      data: {
        type: 'TRAINING_SET',
        sessionId: 'sess-1',
        sessionItemId: 'item-1',
        exerciseId: 'bench',
        setIndex: 1,
      },
    });

    expect(handled).toBe(true);
    expect(staleMocks.applySetSkip).not.toHaveBeenCalled();
    expect(staleMocks.scheduleGuidedTrainingAfterSetPersist).not.toHaveBeenCalled();
  });
});
