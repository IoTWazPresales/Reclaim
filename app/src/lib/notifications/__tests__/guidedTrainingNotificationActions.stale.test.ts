/**
 * With dumb triggers there is no payload snapshot to go stale: any tap derives
 * the pending set from the DB at fire time. What must still hold:
 * 1. Duplicate deliveries of the SAME response (replay / background task races)
 *    never double-log — the response key is claimed before any write.
 * 2. Concurrent duplicate deliveries in the same runtime are serialized by the
 *    in-flight guard so the second one cannot derive a NEWER target and log it.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NotificationResponse } from 'expo-notifications';

const staleMocks = vi.hoisted(() => {
  const processed = new Set<string>();
  return {
    processed,
    applySetCompletion: vi.fn(),
    applySetSkip: vi.fn(),
    patchSessionItemPerformedInCache: vi.fn(),
    wasActionProcessed: vi.fn(async (key: string) => processed.has(key)),
    markActionProcessed: vi.fn(async (key: string) => {
      processed.add(key);
    }),
    reconcileNotifications: vi.fn(),
    clearTrainingIntentsForSession: vi.fn(),
    loadGuidedTrainingNotificationWorkChain: vi.fn(),
    scheduleGuidedTrainingAfterSetPersist: vi.fn(),
    scheduleGuidedTrainingNextSetFromDb: vi.fn(),
  };
});

vi.mock('@/lib/training/applySetCompletion', () => ({
  applySetCompletion: (...args: unknown[]) => staleMocks.applySetCompletion(...args),
  applySetSkip: (...args: unknown[]) => staleMocks.applySetSkip(...args),
}));

vi.mock('@/lib/training/sessionQueryPatch', () => ({
  patchSessionItemPerformedInCache: (...args: unknown[]) =>
    staleMocks.patchSessionItemPerformedInCache(...args),
}));

vi.mock('@/lib/notifications/ActionIdempotencyStore', () => ({
  wasActionProcessed: (...args: unknown[]) => staleMocks.wasActionProcessed(...(args as [string])),
  markActionProcessed: (...args: unknown[]) => staleMocks.markActionProcessed(...(args as [string])),
}));

vi.mock('@/lib/notifications/NotificationIntentStore', () => ({
  setIntent: vi.fn(),
  clearIntent: vi.fn(),
  hasIntent: vi.fn(async () => true),
}));

vi.mock('@/lib/notifications/trainingNotificationScheduler', () => ({
  clearTrainingIntentsForSession: (...args: unknown[]) =>
    staleMocks.clearTrainingIntentsForSession(...args),
}));

vi.mock('@/lib/notifications/NotificationScheduler', () => ({
  reconcileNotifications: (...args: unknown[]) => staleMocks.reconcileNotifications(...args),
}));

vi.mock('@/lib/training/scheduleGuidedTrainingAfterSetPersist', () => ({
  loadGuidedTrainingNotificationWorkChain: (...args: unknown[]) =>
    staleMocks.loadGuidedTrainingNotificationWorkChain(...args),
  scheduleGuidedTrainingAfterSetPersist: (...args: unknown[]) =>
    staleMocks.scheduleGuidedTrainingAfterSetPersist(...args),
  scheduleGuidedTrainingNextSetFromDb: (...args: unknown[]) =>
    staleMocks.scheduleGuidedTrainingNextSetFromDb(...args),
}));

vi.mock('@/navigation/nav', () => ({
  safeNavigate: vi.fn(),
}));

vi.mock('@/lib/queryClient', () => ({
  queryClient: { invalidateQueries: vi.fn() },
}));

import { handleGuidedTrainingNotificationAction } from '@/lib/notifications/guidedTrainingNotificationActions';

const response = {} as NotificationResponse;

function chain(setIndex: number) {
  return {
    pending: [],
    next: {
      sessionItemId: 'item-1',
      exerciseId: 'bench',
      exerciseName: 'Bench Press',
      setIndex,
      suggestedWeight: 50,
      targetReps: 8,
      restSeconds: 90,
    },
    sessionComplete: false,
  };
}

describe('guidedTrainingNotificationActions duplicate-delivery safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    staleMocks.processed.clear();
    staleMocks.applySetCompletion.mockResolvedValue({
      wroteOnline: true,
      completedAt: '2026-06-24T12:00:00.000Z',
    });
    staleMocks.applySetSkip.mockResolvedValue({
      wroteOnline: true,
      completedAt: '2026-06-24T12:00:00.000Z',
    });
    staleMocks.reconcileNotifications.mockResolvedValue(undefined);
    staleMocks.loadGuidedTrainingNotificationWorkChain.mockResolvedValue(chain(1));
    staleMocks.scheduleGuidedTrainingAfterSetPersist.mockResolvedValue({
      restSecondsAfterCompleted: 90,
      sessionComplete: false,
      nextSetIndex: 2,
      nextExerciseId: 'bench',
      nextSessionItemId: 'item-1',
    });
  });

  it('replayed SET_DONE (same response key) does not double-log even after DB advanced', async () => {
    await handleGuidedTrainingNotificationAction({
      action: 'SET_DONE',
      key: 'resp-1::SET_DONE::2026-06-24T12:00:00.000Z',
      response,
      data: { type: 'TRAINING_SET', sessionId: 'sess-1' },
    });
    expect(staleMocks.applySetCompletion).toHaveBeenCalledTimes(1);

    // DB has advanced to set 2 — a replay of the SAME response must not log it.
    staleMocks.loadGuidedTrainingNotificationWorkChain.mockResolvedValue(chain(2));
    await handleGuidedTrainingNotificationAction({
      action: 'SET_DONE',
      key: 'resp-1::SET_DONE::2026-06-24T12:00:00.000Z',
      response,
      data: { type: 'TRAINING_SET', sessionId: 'sess-1' },
    });

    expect(staleMocks.applySetCompletion).toHaveBeenCalledTimes(1);
  });

  it('concurrent duplicate SET_DONE deliveries write exactly once (in-flight guard)', async () => {
    // Slow persist so the duplicate delivery arrives while the first is mid-write.
    staleMocks.applySetCompletion.mockImplementation(
      () =>
        new Promise((res) =>
          setTimeout(() => res({ wroteOnline: true, completedAt: '2026-06-24T12:05:01.000Z' }), 10),
        ),
    );

    const first = handleGuidedTrainingNotificationAction({
      action: 'SET_DONE',
      key: 'resp-2::SET_DONE::2026-06-24T12:05:00.000Z',
      response,
      data: { type: 'TRAINING_SET', sessionId: 'sess-1' },
    });
    const second = handleGuidedTrainingNotificationAction({
      action: 'SET_DONE',
      key: 'resp-2::SET_DONE::2026-06-24T12:05:00.000Z',
      response,
      data: { type: 'TRAINING_SET', sessionId: 'sess-1' },
    });

    await Promise.all([first, second]);

    expect(staleMocks.applySetCompletion).toHaveBeenCalledTimes(1);
  });

  it('a NEW prompt revision (different issuedAt salt in key) is processed normally', async () => {
    await handleGuidedTrainingNotificationAction({
      action: 'SET_DONE',
      key: 'resp-3::SET_DONE::2026-06-24T12:00:00.000Z',
      response,
      data: { type: 'TRAINING_SET', sessionId: 'sess-1' },
    });
    staleMocks.loadGuidedTrainingNotificationWorkChain.mockResolvedValue(chain(2));
    await handleGuidedTrainingNotificationAction({
      action: 'SET_DONE',
      key: 'resp-3::SET_DONE::2026-06-24T12:02:00.000Z',
      response,
      data: { type: 'TRAINING_SET', sessionId: 'sess-1' },
    });

    expect(staleMocks.applySetCompletion).toHaveBeenCalledTimes(2);
    expect(staleMocks.applySetCompletion).toHaveBeenLastCalledWith(
      expect.objectContaining({ setIndex: 2 }),
    );
  });
});
