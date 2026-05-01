import { describe, it, expect } from 'vitest';
import { mergePerformedSetSlices } from './trainingSetCompletionPersistence';

describe('mergePerformedSetSlices', () => {
  it('incoming overrides same setIndex', () => {
    const merged = mergePerformedSetSlices(
      [{ setIndex: 1, weight: 10, reps: 5, completedAt: 't1' }],
      [{ setIndex: 1, weight: 12, reps: 5, completedAt: 't2' }],
    );
    expect(merged).toEqual([{ setIndex: 1, weight: 12, reps: 5, completedAt: 't2' }]);
  });

  it('sorts by setIndex', () => {
    const merged = mergePerformedSetSlices(
      [{ setIndex: 2, weight: 1, reps: 1, completedAt: 't' }],
      [{ setIndex: 1, weight: 2, reps: 2, completedAt: 't' }],
    );
    expect(merged.map((s) => s.setIndex)).toEqual([1, 2]);
  });

  it('treats null existing as empty', () => {
    const merged = mergePerformedSetSlices(null, [{ setIndex: 1, weight: 1, reps: 1, completedAt: 't' }]);
    expect(merged).toEqual([{ setIndex: 1, weight: 1, reps: 1, completedAt: 't' }]);
  });
});
