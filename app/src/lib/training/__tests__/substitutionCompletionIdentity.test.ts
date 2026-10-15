import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn() }));
vi.mock('@/data/TrainingRepository', () => ({ getTrainingSessionItemById: mocks.read, updateTrainingSessionItem: mocks.write }));
import { mergePerformedSetsIntoSessionItemFromDb } from '../trainingSetCompletionPersistence';
const completed = { setIndex: 1, weight: 100, reps: 5, completedAt: '2026-10-15T10:00:00Z' };
beforeEach(() => vi.clearAllMocks());
it('rejects stale completion instead of relabelling original performed work', async () => {
  mocks.read.mockResolvedValue({ exercise_id: 'dumbbell_bench_press', performed: null });
  await expect(mergePerformedSetsIntoSessionItemFromDb('item', [completed], 'barbell_bench_press')).rejects.toThrow('identity changed');
  expect(mocks.write).not.toHaveBeenCalled();
});
it('preserves matching completed work and its canonical set indices', async () => {
  mocks.read.mockResolvedValue({ exercise_id: 'barbell_bench_press', performed: { sets: [completed] } });
  await mergePerformedSetsIntoSessionItemFromDb('item', [{ ...completed, setIndex: 2 }], 'barbell_bench_press');
  expect(mocks.write).toHaveBeenCalledWith('item', { performed: { sets: [completed, { ...completed, setIndex: 2 }] } });
});
it('retains unidentified legacy replay rather than attaching it to a replacement', async () => {
  mocks.read.mockResolvedValue({ exercise_id: 'dumbbell_bench_press', planned: { decisionTrace: { replacedFrom: 'barbell_bench_press' } }, performed: null });
  await expect(mergePerformedSetsIntoSessionItemFromDb('item', [completed])).rejects.toThrow('identity changed');
  expect(mocks.write).not.toHaveBeenCalled();
});
