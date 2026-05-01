import { describe, expect, it } from 'vitest';
import {
  deriveRecoveryProgressFromStageCompletion,
  type StoredRecoveryProgress,
} from '@/lib/recovery';

function baseProgress(partial: Partial<StoredRecoveryProgress> = {}): StoredRecoveryProgress {
  return {
    currentStageId: 'foundation',
    startedAt: '2026-04-01T00:00:00.000Z',
    completedStageIds: [],
    currentWeek: 1,
    recoveryType: null,
    ...partial,
  };
}

describe('deriveRecoveryProgressFromStageCompletion', () => {
  it('does not change progress when stage is not complete', () => {
    const current = baseProgress();
    const next = deriveRecoveryProgressFromStageCompletion(current, false);
    expect(next).toBe(current);
  });

  it('advances to the next stage and marks current stage completed', () => {
    const current = baseProgress({
      currentStageId: 'foundation',
      currentWeek: 1,
    });
    const next = deriveRecoveryProgressFromStageCompletion(current, true);
    expect(next.currentStageId).toBe('stabilize');
    expect(next.currentWeek).toBe(4);
    expect(next.completedStageIds).toContain('foundation');
  });

  it('is idempotent when current stage was already completed', () => {
    const current = baseProgress({
      currentStageId: 'stabilize',
      currentWeek: 4,
      completedStageIds: ['foundation', 'stabilize'],
    });
    const next = deriveRecoveryProgressFromStageCompletion(current, true);
    expect(next).toBe(current);
  });

  it('marks thrive completed without advancing beyond thrive', () => {
    const current = baseProgress({
      currentStageId: 'thrive',
      currentWeek: 10,
      completedStageIds: ['foundation', 'stabilize', 'optimize'],
    });
    const next = deriveRecoveryProgressFromStageCompletion(current, true);
    expect(next.currentStageId).toBe('thrive');
    expect(next.currentWeek).toBe(10);
    expect(next.completedStageIds).toEqual([
      'foundation',
      'stabilize',
      'optimize',
      'thrive',
    ]);
  });
});
