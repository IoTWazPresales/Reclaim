import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import type { TrainingSessionItemRow } from '@/lib/api';
import { persistAppliedSessionAdjustment } from '../sessionAdjustment';
import { recommendSessionAdjustment } from '../autoregulationOverlay';
import { getExerciseById } from '../engine';
import { getAdjustedSetParams } from '../sessionDerivedState';
import { trainingSessionQueryKey, type TrainingSessionQueryData } from '../sessionQueryPatch';
import { buildNotificationWorkChain } from '../trainingSessionProgression';

const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: { from: mocks.from } }));
vi.mock('@/lib/localData/database', () => ({ initializeLocalDatabase: vi.fn(), requireLocalDatabase: vi.fn() }));

const target = { setIndex: 2, targetReps: 8, suggestedWeight: 100, restSeconds: 90 };
const exercise = getExerciseById('barbell_bench_press')!;
const outcome = recommendSessionAdjustment({
  exerciseId: exercise.id, currentSetIndex: 1, currentSetRpe: 9,
  currentSetReps: 8, currentSetWeight: 100, suggestedWeight: 100, targetReps: 8,
  previousSets: [], plannedSets: [target],
}, target, exercise);

function setup(readError: unknown = null, writeError: unknown = null) {
  let saved: unknown;
  const q: any = {};
  q.select = vi.fn(() => q);
  q.eq = vi.fn(() => q);
  q.single = vi.fn(async () => ({ data: { autoregulation_adjustments: { 3: { weightDelta: -10, repsDelta: 0, reason: 'existing', appliedAt: '' } } }, error: readError }));
  q.update = vi.fn((value: unknown) => { saved = value; return { eq: vi.fn(async () => ({ error: writeError })) }; });
  mocks.from.mockReturnValue(q);
  const row = {
    id: 'item', exercise_id: exercise.id, planned: { sets: [target] },
    performed: { sets: [{ setIndex: 1, weight: 100, reps: 8, completedAt: '' }] },
    autoregulation_adjustments: null,
  } as unknown as TrainingSessionItemRow;
  const qc = new QueryClient();
  qc.setQueryData(trainingSessionQueryKey('session'), { session: { id: 'session' }, items: [row] });
  return { q, qc, row, saved: () => saved };
}
beforeEach(() => vi.clearAllMocks());

describe('R07 persisted overlay publication (real API and cache adapter)', () => {
  it('publishes only after the DB write and preserves frozen plan, completion and other adjustments', async () => {
    const { q, qc, row, saved } = setup();
    if (outcome.status !== 'applied') throw new Error(outcome.message);
    const before = JSON.stringify(row);
    const promise = persistAppliedSessionAdjustment(qc, 'session', row.id, outcome);
    expect(getAdjustedSetParams(qc.getQueryData<TrainingSessionQueryData>(trainingSessionQueryKey('session'))!.items[0], 2, {}).weight).toBe(100);
    await promise;
    expect(mocks.from).toHaveBeenCalledWith('training_session_items');
    expect(q.update).toHaveBeenCalledWith({ autoregulation_adjustments: expect.objectContaining({
      2: expect.objectContaining({ weightDelta: -5, repsDelta: 0, reason: outcome.message }),
      3: expect.objectContaining({ weightDelta: -10 }),
    }) });
    expect(Object.keys(saved() as object)).toEqual(['autoregulation_adjustments']);
    const cached = qc.getQueryData<TrainingSessionQueryData>(trainingSessionQueryKey('session'))!.items[0];
    expect(getAdjustedSetParams(cached, 2, {}).weight).toBe(95);
    const dbReload = { ...row, ...(saved() as object) };
    expect(buildNotificationWorkChain([JSON.parse(JSON.stringify(dbReload))]).next).toMatchObject({ suggestedWeight: 95, targetReps: 8 });
    expect(cached.planned).toBe(row.planned);
    expect(cached.performed).toBe(row.performed);
    expect(JSON.stringify(row)).toBe(before);
    qc.clear();
  });
  it.each(['read', 'write'])('retains the existing target and rejects a failed %s, without publishing a false success', async stage => {
    const err = new Error(`${stage} unavailable`);
    const { qc, q, row } = setup(stage === 'read' ? err : null, stage === 'write' ? err : null);
    if (outcome.status !== 'applied') throw new Error(outcome.message);
    await expect(persistAppliedSessionAdjustment(qc, 'session', row.id, outcome)).rejects.toThrow(`${stage} unavailable`);
    const cached = qc.getQueryData<TrainingSessionQueryData>(trainingSessionQueryKey('session'))!.items[0];
    expect(cached).toBe(row);
    expect(getAdjustedSetParams(cached, 2, {}).weight).toBe(100);
    if (stage === 'read') expect(q.update).not.toHaveBeenCalled();
    qc.clear();
  });
});
