import { describe, it, expect } from 'vitest';
import type { TrainingSessionItemRow } from '@/lib/api';
import {
  computeRestSecondsAfterCompletingSet,
  isSetAlreadyPerformedOnItem,
  buildGuidedSnapshotAfterNotificationSetDone,
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

  describe('isSetAlreadyPerformedOnItem', () => {
    it('detects performed set index', () => {
      const row = {
        performed: { sets: [{ setIndex: 1 }] },
      } as TrainingSessionItemRow;
      expect(isSetAlreadyPerformedOnItem(row, 1)).toBe(true);
      expect(isSetAlreadyPerformedOnItem(row, 2)).toBe(false);
    });
  });

  describe('buildGuidedSnapshotAfterNotificationSetDone', () => {
    it('positions snapshot at next work item + set index', () => {
      const items = [
        {
          id: 'a',
          exercise_id: 'sq',
          order_index: 0,
          planned: { sets: [{ setIndex: 1 }, { setIndex: 2 }] },
          performed: { sets: [] },
        },
        {
          id: 'b',
          exercise_id: 'dl',
          order_index: 1,
          planned: { sets: [{ setIndex: 1 }] },
          performed: { sets: [] },
        },
      ] as unknown as TrainingSessionItemRow[];

      const snap = buildGuidedSnapshotAfterNotificationSetDone({
        sessionId: 'sess',
        items,
        nextSessionItemId: 'a',
        nextExerciseId: 'sq',
        nextSetIndex: 2,
        restSecondsAfterCompleted: 90,
      });
      expect(snap).not.toBeNull();
      expect(snap!.sessionId).toBe('sess');
      expect(snap!.sessionItemId).toBe('a');
      expect(snap!.exerciseId).toBe('sq');
      expect(snap!.currentSetIndex).toBe(2);
      expect(snap!.phase).toBe('rest');
      expect(snap!.currentExerciseIndex).toBe(0);
    });
  });
});
