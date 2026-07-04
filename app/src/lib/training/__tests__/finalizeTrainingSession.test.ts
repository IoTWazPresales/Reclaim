import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TrainingSessionItemRow } from '@/lib/api';

const finalizeMocks = vi.hoisted(() => ({
  updateTrainingSession: vi.fn(),
  logTrainingEvent: vi.fn(),
  clearTrainingIntentsForSession: vi.fn(),
  reconcileNotifications: vi.fn(),
  mergeHealthConnectActiveEnergyIntoTrainingSummary: vi.fn(),
  isNetworkAvailable: vi.fn(),
  enqueueOperation: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  getTrainingSession: vi.fn(),
  updateTrainingSession: (...args: unknown[]) => finalizeMocks.updateTrainingSession(...args),
}));

vi.mock('@/data/TrainingRepository', () => ({
  logTrainingEvent: (...args: unknown[]) => finalizeMocks.logTrainingEvent(...args),
}));

vi.mock('@/lib/health/healthConnectService', () => ({
  mergeHealthConnectActiveEnergyIntoTrainingSummary: (...args: unknown[]) =>
    finalizeMocks.mergeHealthConnectActiveEnergyIntoTrainingSummary(...args),
}));

vi.mock('@/lib/training/offlineQueue', () => ({
  enqueueOperation: (...args: unknown[]) => finalizeMocks.enqueueOperation(...args),
}));

vi.mock('@/lib/training/offlineSync', () => ({
  isNetworkAvailable: (...args: unknown[]) => finalizeMocks.isNetworkAvailable(...args),
}));

vi.mock('@/lib/training/sessionWriteBuffer', () => ({
  TRAINING_SESSION_BUFFER_WRITES_ENABLED: false,
  flushBufferedSessionWrites: vi.fn(),
}));

vi.mock('@/lib/notifications/trainingNotificationScheduler', () => ({
  clearTrainingIntentsForSession: (...args: unknown[]) =>
    finalizeMocks.clearTrainingIntentsForSession(...args),
}));

vi.mock('@/lib/notifications/NotificationScheduler', () => ({
  reconcileNotifications: (...args: unknown[]) => finalizeMocks.reconcileNotifications(...args),
}));

vi.mock('@/lib/health/exerciseSessionWriter', () => ({
  consumeOpenTrainingSessionStart: vi.fn(() => null),
  writeTrainingExerciseSessionToHealthConnect: vi.fn().mockResolvedValue({ wrote: false }),
}));

import {
  finalizeTrainingSession,
  finalizeTrainingSessionAndCleanup,
  clearTrainingSessionNotificationIntents,
} from '@/lib/training/finalizeTrainingSession';

function sessionItem(id: string): TrainingSessionItemRow {
  return {
    id,
    exercise_id: 'bench',
    order_index: 0,
    skipped: false,
    planned: {
      sets: [{ setIndex: 1, targetReps: 8, suggestedWeight: 50, restSeconds: 90 }],
    },
    performed: {
      sets: [{ setIndex: 1, weight: 50, reps: 8, completedAt: '2026-06-24T12:00:00.000Z' }],
    },
  } as unknown as TrainingSessionItemRow;
}

describe('finalizeTrainingSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    finalizeMocks.isNetworkAvailable.mockResolvedValue(true);
    finalizeMocks.updateTrainingSession.mockResolvedValue(undefined);
    finalizeMocks.logTrainingEvent.mockResolvedValue(undefined);
    finalizeMocks.mergeHealthConnectActiveEnergyIntoTrainingSummary.mockResolvedValue({});
    finalizeMocks.clearTrainingIntentsForSession.mockResolvedValue(undefined);
    finalizeMocks.reconcileNotifications.mockResolvedValue(undefined);
  });

  it('sets ended_at and summary on session row', async () => {
    const items = [sessionItem('item-1')];
    const result = await finalizeTrainingSession({
      sessionId: 'sess-1',
      items,
      startedAt: '2026-06-24T11:00:00.000Z',
    });

    expect(result.wroteOnline).toBe(true);
    expect(result.summary.totalSets).toBe(1);
    expect(finalizeMocks.updateTrainingSession).toHaveBeenCalledWith(
      'sess-1',
      expect.objectContaining({
        endedAt: expect.any(String),
        summary: expect.objectContaining({ exercisesCompleted: 1 }),
      }),
    );
  });

  it('clearTrainingSessionNotificationIntents clears session prompts then reconciles', async () => {
    await clearTrainingSessionNotificationIntents('sess-2');

    expect(finalizeMocks.clearTrainingIntentsForSession).toHaveBeenCalledWith('sess-2');
    expect(finalizeMocks.reconcileNotifications).toHaveBeenCalled();
  });

  it('finalizeTrainingSessionAndCleanup finalizes then clears intents', async () => {
    const items = [sessionItem('item-1')];
    await finalizeTrainingSessionAndCleanup({
      sessionId: 'sess-3',
      items,
      startedAt: '2026-06-24T11:00:00.000Z',
    });

    expect(finalizeMocks.updateTrainingSession).toHaveBeenCalled();
    expect(finalizeMocks.clearTrainingIntentsForSession).toHaveBeenCalledWith('sess-3');
  });
});
