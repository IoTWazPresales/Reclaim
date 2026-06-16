import { describe, it, expect } from 'vitest';
import type { TrainingSessionItemRow } from '@/lib/api';
import {
  computeRestSecondsAfterCompletingSet,
  isSetAlreadyPerformedOnItem,
} from '@/lib/training/guidedSetCompletionCanonical';

describe('guidedSetCompletionCanonical', () => {
  describe('computeRestSecondsAfterCompletingSet', () => {
    it('uses restSeconds on the completed set row (not the next lookahead row)', () => {
      const planned = [
        { setIndex: 1, restSeconds: 120 },
        { setIndex: 2, restSeconds: 60 },
      ];
      expect(computeRestSecondsAfterCompletingSet(planned, 1, undefined)).toBeGreaterThan(0);
      expect(computeRestSecondsAfterCompletingSet(planned, 2, undefined)).toBeGreaterThan(0);
    });

    it('returns 0 when planned set has no rest', () => {
      const planned = [{ setIndex: 1 }];
      expect(computeRestSecondsAfterCompletingSet(planned, 1, undefined)).toBe(0);
    });
  });

  it('stale set index is marked performed when that set already logged', () => {
    const row = {
      performed: { sets: [{ setIndex: 1 }, { setIndex: 2 }] },
    } as TrainingSessionItemRow;
    expect(isSetAlreadyPerformedOnItem(row, 1)).toBe(true);
    expect(isSetAlreadyPerformedOnItem(row, 3)).toBe(false);
  });
});
