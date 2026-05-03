import { describe, it, expect } from 'vitest';
import {
  evaluateGuidedExternalRestTransition,
  getFirstPendingSetIndexForItem,
  type GuidedExternalSetDonePayload,
} from '@/lib/training/guidedExternalSetDoneTransition';
import type { TrainingSessionItemRow } from '@/lib/api';
import type { SessionRuntimeState } from '@/lib/training/types';

function item(
  id: string,
  exerciseId: string,
  performed: number[],
  plannedCount: number,
): TrainingSessionItemRow {
  const sets = Array.from({ length: plannedCount }, (_, i) => ({
    setIndex: i + 1,
    suggestedWeight: 60,
    targetReps: 8,
    restSeconds: 90,
  }));
  return {
    id,
    exercise_id: exerciseId,
    order_index: 0,
    skipped: false,
    planned: { sets } as any,
    performed: {
      sets: performed.map((si) => ({
        setIndex: si,
        weight: 60,
        reps: 8,
        completedAt: new Date().toISOString(),
      })),
    } as any,
  } as TrainingSessionItemRow;
}

const basePayload = (over: Partial<GuidedExternalSetDonePayload> = {}): GuidedExternalSetDonePayload => ({
  completedSessionItemId: 's_item_0',
  completedExerciseId: 'squat',
  completedSetIndex: 1,
  weight: 60,
  reps: 8,
  completedAtIso: new Date().toISOString(),
  restSecondsAfterCompleted: 90,
  nextSessionItemId: 's_item_0',
  nextExerciseId: 'squat',
  nextSetIndex: 2,
  idempotencyKey: 'set_done:s:squat:1',
  sourceActionAtMs: Date.now(),
  ...over,
});

describe('evaluateGuidedExternalRestTransition', () => {
  it('accepts when first pending on next item matches payload nextSetIndex', () => {
    const items = [item('s_item_0', 'squat', [1], 3)];
    const runtime: SessionRuntimeState | null = null;
    const optimistic = {};
    const r = evaluateGuidedExternalRestTransition({
      items,
      runtimeState: runtime,
      optimisticPerformedSets: optimistic,
      payload: basePayload(),
    });
    expect(r.accept).toBe(true);
  });

  it('rejects when user is ahead of payload next set (stale)', () => {
    const items = [item('s_item_0', 'squat', [1, 2], 3)];
    const r = evaluateGuidedExternalRestTransition({
      items,
      runtimeState: null,
      optimisticPerformedSets: {},
      payload: basePayload({ nextSetIndex: 2 }),
    });
    expect(r.accept).toBe(false);
    if (!r.accept) expect(r.reason).toBe('ahead_of_payload');
  });

  it('accepts lag case: set 1 not in props yet but next pending is still set 1', () => {
    const lagItem = item('s_item_0', 'squat', [], 3);
    const r = evaluateGuidedExternalRestTransition({
      items: [lagItem],
      runtimeState: null,
      optimisticPerformedSets: {},
      payload: basePayload({ completedSetIndex: 1, nextSetIndex: 2 }),
    });
    expect(r.accept).toBe(true);
  });
});

describe('getFirstPendingSetIndexForItem', () => {
  it('returns first planned index not in performed', () => {
    const itm = item('i', 'sq', [1], 3);
    expect(getFirstPendingSetIndexForItem(itm, null, {})).toBe(2);
  });
});
