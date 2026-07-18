import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { TrainingSessionItemRow } from '@/lib/api';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async () => null),
    setItem: vi.fn(async () => undefined),
    removeItem: vi.fn(async () => undefined),
  },
}));

vi.mock('@/lib/api', () => ({
  getTrainingSession: vi.fn(),
  updateTrainingSession: vi.fn(),
}));

vi.mock('@/data/TrainingRepository', () => ({
  logTrainingEvent: vi.fn(),
}));

vi.mock('@/lib/health/healthConnectService', () => ({
  mergeHealthConnectActiveEnergyIntoTrainingSummary: vi.fn(),
}));

vi.mock('@/lib/health/exerciseSessionWriter', () => ({
  consumeOpenTrainingSessionStart: vi.fn(() => null),
  writeTrainingExerciseSessionToHealthConnect: vi.fn(),
}));

vi.mock('@/lib/training/offlineQueue', () => ({
  enqueueOperation: vi.fn(),
  loadOfflineQueue: vi.fn(async () => []),
}));

vi.mock('@/lib/training/sessionWriteBuffer', () => ({
  TRAINING_SESSION_BUFFER_WRITES_ENABLED: false,
  flushBufferedSessionWrites: vi.fn(),
}));

vi.mock('@/lib/notifications/trainingNotificationScheduler', () => ({
  clearTrainingIntentsForSession: vi.fn(),
}));

vi.mock('@/lib/notifications/NotificationScheduler', () => ({
  reconcileNotifications: vi.fn(),
}));

vi.mock('@/lib/training/engine', () => ({
  getExerciseById: (id: string) => ({ id, name: `Exercise ${id}` }),
}));

import { isSessionWorkComplete } from '../closeTrainingSession';

function item(
  id: string,
  exerciseId: string,
  planned: number[],
  performed: number[] = [],
  skipped = false,
): TrainingSessionItemRow {
  return {
    id,
    exercise_id: exerciseId,
    order_index: 0,
    skipped,
    planned: {
      sets: planned.map((setIndex) => ({
        setIndex,
        targetReps: 8,
        suggestedWeight: 50,
        restSeconds: 90,
      })),
      priority: 'primary',
      intents: [],
      decisionTrace: {},
    },
    performed: {
      sets: performed.map((setIndex) => ({
        setIndex,
        weight: 50,
        reps: 8,
        completedAt: '2026-01-01T00:00:00.000Z',
      })),
    },
  } as unknown as TrainingSessionItemRow;
}

describe('isSessionWorkComplete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is false when later exercises still have pending work (skip/jump safe)', () => {
    const items = [
      item('a', 'ex1', [1], [1]),
      item('b', 'ex2', [1], [], true),
      item('c', 'ex3', [1], []),
    ];
    expect(isSessionWorkComplete(items)).toBe(false);
  });

  it('is true when all non-skipped planned sets are performed', () => {
    const items = [
      item('a', 'ex1', [1], [1]),
      item('b', 'ex2', [1], [], true),
      item('c', 'ex3', [1], [1]),
    ];
    expect(isSessionWorkComplete(items)).toBe(true);
  });
});
