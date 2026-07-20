import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NotificationResponse } from 'expo-notifications';

const persistMocks = vi.hoisted(() => ({
  applySetCompletion: vi.fn(),
  applySetSkip: vi.fn(),
  patchSessionItemPerformedInCache: vi.fn(),
  wasActionProcessed: vi.fn(),
  markActionProcessed: vi.fn(),
  reconcileNotifications: vi.fn(),
  clearTrainingIntentsForSession: vi.fn(),
  loadGuidedTrainingNotificationWorkChain: vi.fn(),
  scheduleGuidedTrainingAfterSetPersist: vi.fn(),
  scheduleGuidedTrainingNextSetFromDb: vi.fn(),
}));

vi.mock('@/lib/training/applySetCompletion', () => ({
  applySetCompletion: (...args: unknown[]) => persistMocks.applySetCompletion(...args),
  applySetSkip: (...args: unknown[]) => persistMocks.applySetSkip(...args),
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
  clearIntent: vi.fn(),
  hasIntent: vi.fn(async () => true),
}));

vi.mock('@/lib/notifications/trainingNotificationScheduler', () => ({
  clearTrainingIntentsForSession: (...args: unknown[]) =>
    persistMocks.clearTrainingIntentsForSession(...args),
}));

vi.mock('@/lib/notifications/NotificationScheduler', () => ({
  reconcileNotifications: (...args: unknown[]) => persistMocks.reconcileNotifications(...args),
}));

vi.mock('@/lib/training/scheduleGuidedTrainingAfterSetPersist', () => ({
  loadGuidedTrainingNotificationWorkChain: (...args: unknown[]) =>
    persistMocks.loadGuidedTrainingNotificationWorkChain(...args),
  scheduleGuidedTrainingAfterSetPersist: (...args: unknown[]) =>
    persistMocks.scheduleGuidedTrainingAfterSetPersist(...args),
  scheduleGuidedTrainingNextSetFromDb: (...args: unknown[]) =>
    persistMocks.scheduleGuidedTrainingNextSetFromDb(...args),
}));

vi.mock('@/lib/training/finalizeTrainingSession', () => ({
  finalizeTrainingSessionAndCleanup: vi.fn(async () => ({
    endedAt: '2026-06-24T12:00:00.000Z',
    wroteOnline: true,
    summary: {},
  })),
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

const response = {} as NotificationResponse;

function chainWithNext(overrides?: Partial<NonNullable<any>>) {
  return {
    pending: [],
    next: {
      sessionItemId: 'item-1',
      exerciseId: 'bench',
      exerciseName: 'Bench Press',
      setIndex: 1,
      suggestedWeight: 50,
      targetReps: 8,
      restSeconds: 90,
      ...overrides,
    },
    sessionComplete: false,
  };
}

describe('guidedTrainingNotificationActions persistence (fire-time derivation)', () => {
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
    persistMocks.wasActionProcessed.mockResolvedValue(false);
    persistMocks.markActionProcessed.mockResolvedValue(undefined);
    persistMocks.reconcileNotifications.mockResolvedValue(undefined);
    persistMocks.loadGuidedTrainingNotificationWorkChain.mockResolvedValue(chainWithNext());
    persistMocks.scheduleGuidedTrainingAfterSetPersist.mockResolvedValue({
      restSecondsAfterCompleted: 90,
      sessionComplete: false,
      nextSetIndex: 2,
      nextExerciseId: 'bench',
      nextSessionItemId: 'item-1',
    });
  });

  it('SET_DONE completes the DB-derived pending set (payload carries no set identity)', async () => {
    const handled = await handleGuidedTrainingNotificationAction({
      action: 'SET_DONE',
      key: 'done-key',
      response,
      data: { type: 'TRAINING_SET', sessionId: 'sess-1' },
    });

    expect(handled).toBe(true);
    expect(persistMocks.loadGuidedTrainingNotificationWorkChain).toHaveBeenCalledWith('sess-1');
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

  it('SKIP_SET persists through applySetSkip on the derived target before scheduling', async () => {
    const handled = await handleGuidedTrainingNotificationAction({
      action: 'SKIP_SET',
      key: 'skip-key',
      response,
      data: { type: 'TRAINING_SET', sessionId: 'sess-1' },
    });

    expect(handled).toBe(true);
    expect(persistMocks.applySetSkip).toHaveBeenCalledWith({
      sessionId: 'sess-1',
      sessionItemId: 'item-1',
      exerciseId: 'bench',
      setIndex: 1,
    });
    const skipOrder = persistMocks.applySetSkip.mock.invocationCallOrder[0];
    const scheduleOrder =
      persistMocks.scheduleGuidedTrainingAfterSetPersist.mock.invocationCallOrder[0];
    expect(skipOrder).toBeLessThan(scheduleOrder);
  });

  it('SET_DONE marks the response key processed BEFORE persisting (duplicate-delivery guard)', async () => {
    await handleGuidedTrainingNotificationAction({
      action: 'SET_DONE',
      key: 'order-key',
      response,
      data: { type: 'TRAINING_SET', sessionId: 'sess-1' },
    });

    const markOrder = persistMocks.markActionProcessed.mock.invocationCallOrder[0];
    const persistOrder = persistMocks.applySetCompletion.mock.invocationCallOrder[0];
    expect(markOrder).toBeLessThan(persistOrder);
  });

  it('SET_DONE with no pending work clears prompts and does not write', async () => {
    persistMocks.loadGuidedTrainingNotificationWorkChain.mockResolvedValue({
      pending: [],
      next: null,
      sessionComplete: true,
    });

    const handled = await handleGuidedTrainingNotificationAction({
      action: 'SET_DONE',
      key: 'complete-key',
      response,
      data: { type: 'TRAINING_SET', sessionId: 'sess-1' },
    });

    expect(handled).toBe(true);
    expect(persistMocks.applySetCompletion).not.toHaveBeenCalled();
    expect(persistMocks.clearTrainingIntentsForSession).toHaveBeenCalledWith('sess-1');
  });
});
