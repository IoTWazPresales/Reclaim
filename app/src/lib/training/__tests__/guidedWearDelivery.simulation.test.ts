/**
 * Headless simulation of Wear Done → after-persist schedule (no device).
 * Run: npx vitest run src/lib/training/__tests__/guidedWearDelivery.simulation.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TrainingSessionItemRow } from '@/lib/api';
import { computeRestSecondsAfterCompletingSet } from '@/lib/training/guidedSetCompletionCanonical';
import { buildNotificationWorkChain } from '@/lib/training/trainingNotificationWorkPlan';
import { guidedNotificationOverlayChoice } from '@/lib/training/guidedNotificationRoute';

function item(
  id: string,
  exerciseId: string,
  order: number,
  planned: { setIndex: number; restSeconds?: number }[],
  performed: number[] = [],
): TrainingSessionItemRow {
  return {
    id,
    exercise_id: exerciseId,
    order_index: order,
    planned: {
      sets: planned.map((p) => ({
        setIndex: p.setIndex,
        targetReps: 8,
        suggestedWeight: 60,
        restSeconds: p.restSeconds,
      })),
    },
    performed: {
      sets: performed.map((setIndex) => ({
        setIndex,
        weight: 60,
        reps: 8,
        completedAt: new Date().toISOString(),
      })),
    },
  } as TrainingSessionItemRow;
}

describe('guided Wear delivery simulation (headless)', () => {
  it('cursor jump: chain next is jumped exercise, not session-order pending[0]', () => {
    const items = [
      item('a', 'bench', 0, [{ setIndex: 1, restSeconds: 90 }, { setIndex: 2, restSeconds: 90 }], []),
      item('b', 'row', 1, [{ setIndex: 1, restSeconds: 90 }, { setIndex: 2 }], [1]),
    ];
    const fromStart = buildNotificationWorkChain(items, { startExerciseIndex: 0 });
    const fromJump = buildNotificationWorkChain(items, { startExerciseIndex: 1 });
    expect(fromStart.next?.exerciseId).toBe('bench');
    expect(fromJump.next?.exerciseId).toBe('row');
    expect(fromJump.next?.setIndex).toBe(2);
  });

  it('between-exercise rest parity: last set without restSeconds + hasNextExercise → 90', () => {
    const planned = [
      { setIndex: 1, restSeconds: 90 },
      { setIndex: 2 },
    ];
    expect(computeRestSecondsAfterCompletingSet(planned, 2, undefined)).toBe(0);
    expect(
      computeRestSecondsAfterCompletingSet(planned, 2, undefined, {
        hasNextExercise: true,
        betweenExerciseRestSeconds: 90,
      }),
    ).toBe(90);
  });

  it('Wear Next-set deep-link does not open Done confirm overlay', () => {
    expect(
      guidedNotificationOverlayChoice({
        action: 'set_done',
        fromRestNextSet: true,
        isActiveSetAlreadyPerformed: false,
      }),
    ).toBe('none');
  });

  it('already-performed set suppresses overlay Done', () => {
    expect(
      guidedNotificationOverlayChoice({
        action: 'set_done',
        isActiveSetAlreadyPerformed: true,
      }),
    ).toBe('none');
  });
});
