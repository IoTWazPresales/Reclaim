import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  logTrainingSet: vi.fn(),
  logTrainingEvent: vi.fn(),
  mergePerformedSetsIntoSessionItemFromDb: vi.fn(),
  enqueueOperation: vi.fn(),
  isNetworkAvailable: vi.fn(),
  upsertBufferedSessionSetLog: vi.fn(),
}));

vi.mock('@/data/TrainingRepository', () => ({
  logTrainingSet: (...args: unknown[]) => mocks.logTrainingSet(...args),
  logTrainingEvent: (...args: unknown[]) => mocks.logTrainingEvent(...args),
}));

vi.mock('@/lib/training/trainingSetCompletionPersistence', () => ({
  mergePerformedSetsIntoSessionItemFromDb: (...args: unknown[]) =>
    mocks.mergePerformedSetsIntoSessionItemFromDb(...args),
}));

vi.mock('@/lib/training/offlineQueue', () => ({
  enqueueOperation: (...args: unknown[]) => mocks.enqueueOperation(...args),
}));

vi.mock('@/lib/training/offlineSync', () => ({
  isNetworkAvailable: (...args: unknown[]) => mocks.isNetworkAvailable(...args),
}));

vi.mock('@/lib/training/sessionWriteBuffer', () => ({
  TRAINING_SESSION_BUFFER_WRITES_ENABLED: false,
  upsertBufferedSessionSetLog: (...args: unknown[]) => mocks.upsertBufferedSessionSetLog(...args),
}));

import { applySetCompletion, applySetSkip } from '@/lib/training/applySetCompletion';

const baseInput = {
  sessionId: 'sess-1',
  sessionItemId: 'item-1',
  exerciseId: 'bench',
  setIndex: 2,
  weight: 60,
  reps: 8,
};

describe('applySetCompletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.logTrainingSet.mockResolvedValue({});
    mocks.logTrainingEvent.mockResolvedValue(undefined);
    mocks.mergePerformedSetsIntoSessionItemFromDb.mockResolvedValue(undefined);
    mocks.enqueueOperation.mockResolvedValue(undefined);
    mocks.isNetworkAvailable.mockResolvedValue(true);
  });

  it('persists online set log and merges performed', async () => {
    const result = await applySetCompletion(baseInput);

    expect(mocks.logTrainingSet).toHaveBeenCalledTimes(1);
    expect(mocks.mergePerformedSetsIntoSessionItemFromDb).toHaveBeenCalledWith('item-1', [
      expect.objectContaining({
        setIndex: 2,
        weight: 60,
        reps: 8,
      }),
    ]);
    expect(mocks.enqueueOperation).not.toHaveBeenCalled();
    expect(result.wroteOnline).toBe(true);
    expect(result.setLogId).toContain('item-1_set_2');
  });

  it('enqueues offline when network is unavailable', async () => {
    mocks.isNetworkAvailable.mockResolvedValue(false);

    const result = await applySetCompletion(baseInput);

    expect(mocks.logTrainingSet).not.toHaveBeenCalled();
    expect(mocks.mergePerformedSetsIntoSessionItemFromDb).not.toHaveBeenCalled();
    expect(mocks.enqueueOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'insertSetLog',
        sessionItemId: 'item-1',
        payload: expect.objectContaining({ setIndex: 2, weight: 60, reps: 8 }),
      }),
    );
    expect(result.wroteOnline).toBe(false);
  });

  it('enqueues when online write fails after retries', async () => {
    mocks.logTrainingSet.mockRejectedValue(new Error('network blip'));

    const result = await applySetCompletion(baseInput);

    expect(mocks.logTrainingSet).toHaveBeenCalledTimes(3);
    expect(mocks.mergePerformedSetsIntoSessionItemFromDb).not.toHaveBeenCalled();
    expect(mocks.enqueueOperation).toHaveBeenCalledTimes(1);
    expect(result.wroteOnline).toBe(false);
  });
});

describe('applySetSkip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.logTrainingSet.mockResolvedValue({});
    mocks.logTrainingEvent.mockResolvedValue(undefined);
    mocks.mergePerformedSetsIntoSessionItemFromDb.mockResolvedValue(undefined);
    mocks.enqueueOperation.mockResolvedValue(undefined);
    mocks.isNetworkAvailable.mockResolvedValue(true);
  });

  it('writes zero-weight/reps set and emits skip event', async () => {
    await applySetSkip({
      sessionId: 'sess-1',
      sessionItemId: 'item-1',
      exerciseId: 'bench',
      setIndex: 1,
    });

    expect(mocks.logTrainingSet).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionItemId: 'item-1',
        setIndex: 1,
        weight: 0,
        reps: 0,
      }),
    );
    expect(mocks.logTrainingEvent).toHaveBeenCalledWith('training_set_skipped', {
      exerciseId: 'bench',
      sessionId: 'sess-1',
      setIndex: 1,
    });
  });
});
