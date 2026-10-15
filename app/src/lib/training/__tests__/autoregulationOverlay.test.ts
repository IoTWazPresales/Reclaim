import { describe, expect, it } from 'vitest';
import type { TrainingSessionItemRow } from '@/lib/api';
import { getExerciseById } from '../engine';
import { applyAutoregulation, type AutoregulationInput } from '../runtime/autoregulation';
import { autoregulationOverlay, recommendSessionAdjustment } from '../autoregulationOverlay';
import { getAdjustedSetParams } from '../sessionDerivedState';
import { buildNotificationWorkChain } from '../trainingSessionProgression';
import { deriveActiveWorkTarget } from '../sessionWorkAuthority';

const bench = getExerciseById('barbell_bench_press')!;
const next = { setIndex: 2, suggestedWeight: 100, targetReps: 8, restSeconds: 90 };
const input: AutoregulationInput = {
  exerciseId: bench.id, currentSetIndex: 1, currentSetRpe: 9, currentSetWeight: 100,
  currentSetReps: 8, targetReps: 8, suggestedWeight: 100, previousSets: [],
  plannedSets: [{ ...next, setIndex: 1 }, next, { ...next, setIndex: 3 }],
};
const item = (): TrainingSessionItemRow => ({
  id: 'item', exercise_id: bench.id, planned: { sets: structuredClone(input.plannedSets) },
  performed: { sets: [{ setIndex: 1, weight: 100, reps: 8, rpe: 9, completedAt: '2026-10-15T10:00:00Z' }] },
  autoregulation_adjustments: null,
} as TrainingSessionItemRow);

describe('R07 applied adjustment contract', () => {
  it('reproduces the audited zero-delta adapter and corrects 100 → 95 through the real reader', () => {
    const result = applyAutoregulation(input);
    expect(result.adjustedWeight).toBe(95);
    const row = item();
    const frozen = JSON.stringify({ planned: row.planned, performed: row.performed });
    row.autoregulation_adjustments = { 2: { weightDelta: result.adjustment?.weightDelta ?? 0, repsDelta: result.adjustment?.targetRepsDelta ?? 0, reason: 'old', appliedAt: '' } };
    expect(getAdjustedSetParams(row, 2, {}).weight).toBe(100);
    const applied = recommendSessionAdjustment(input, next, bench);
    expect(applied.status).toBe('applied');
    if (applied.status !== 'applied') throw new Error(applied.message);
    expect(applied).toMatchObject({ weightKg: 95, reps: 8, loadConvention: 'total_bar', overlay: { weightDelta: -5, repsDelta: 0 } });
    row.autoregulation_adjustments = { 2: { ...applied.overlay, appliedAt: '2026-10-15T10:01:00Z' } };
    const reload = JSON.parse(JSON.stringify(row)) as TrainingSessionItemRow;
    expect(getAdjustedSetParams(reload, 2, {})).toMatchObject({ weight: 95, reps: 8, autoregMessage: applied.message });
    expect(buildNotificationWorkChain([reload]).next).toMatchObject({ suggestedWeight: 95, targetReps: 8, setIndex: 2 });
    expect(getAdjustedSetParams(reload, 3, {}).weight).toBe(100);
    expect(JSON.stringify({ planned: row.planned, performed: row.performed })).toBe(frozen);
  });

  it.each([
    ['barbell_bench_press', 100, 10, 90, 6],
    ['dumbbell_bench_press', 21, 9, 20, 8],
    ['push_ups', 0, 10, 0, 6],
  ])('projects weight/reps for %s with equipment rounding and reload', (id, weight, rpe, expectedWeight, expectedReps) => {
    const exercise = getExerciseById(id)!;
    expect(exercise).toBeDefined();
    const target = { ...next, suggestedWeight: weight, setIndex: 3 };
    const outcome = recommendSessionAdjustment({ ...input, exerciseId: id, currentSetIndex: 2, currentSetWeight: weight, suggestedWeight: weight, currentSetRpe: rpe }, target, exercise);
    expect(outcome.status).toBe('applied');
    if (outcome.status !== 'applied') throw new Error(outcome.message);
    const row = item();
    row.exercise_id = id;
    row.planned = { ...row.planned!, sets: [target] };
    row.autoregulation_adjustments = { 3: { ...outcome.overlay, appliedAt: '' } };
    const reload = JSON.parse(JSON.stringify(row));
    expect(getAdjustedSetParams(reload, 3, {})).toMatchObject({ weight: expectedWeight, reps: expectedReps });
    expect(buildNotificationWorkChain([reload]).next).toMatchObject({ suggestedWeight: expectedWeight, targetReps: expectedReps });
    expect(outcome.message).toContain(`${expectedReps} reps`);
    if (id === 'push_ups') expect(outcome.message.toLowerCase()).toContain('bodyweight');
    if (id.startsWith('dumbbell')) expect(outcome.message.toLowerCase()).toContain('per dumbbell');
  });

  it('uses absolute targets relative to the next frozen prescription, without compounding overlays', () => {
    const outcome = recommendSessionAdjustment(input, { ...next, suggestedWeight: 110 }, bench);
    expect(outcome).toMatchObject({ status: 'applied', weightKg: 95, overlay: { weightDelta: -15 } });
  });

  it('rest and guidance target the adjusted pending set after jumping into partially completed work', () => {
    const complete = item();
    complete.performed!.sets = complete.planned!.sets.map(set => ({ setIndex: set.setIndex, weight: 100, reps: 8, completedAt: '' }));
    const partial = { ...item(), id: 'partial' };
    partial.autoregulation_adjustments = { 2: { weightDelta: -5, repsDelta: -2, reason: 'saved', appliedAt: '' } };
    const rows = [complete, { ...item(), id: 'skip', skipped: true }, partial];
    const phone = deriveActiveWorkTarget(rows, 0)!;
    expect(phone).toMatchObject({ sessionItemId: 'partial', setIndex: 2 });
    expect(getAdjustedSetParams(rows[phone.exerciseIndex], phone.setIndex, {})).toMatchObject({ weight: 95, reps: 6 });
    expect(buildNotificationWorkChain(rows, { startExerciseIndex: 0 }).next).toMatchObject({ sessionItemId: 'partial', setIndex: 2, suggestedWeight: 95, targetReps: 6 });
  });

  it('leaves assistance reduction unapproved, and safely projects explicit rep-only assistance', () => {
    const assisted = getExerciseById('assisted_pull_ups')!;
    expect(recommendSessionAdjustment({ ...input, exerciseId: assisted.id }, next, assisted)).toMatchObject({ status: 'unchanged', reason: 'unsupported_units' });
    const result = applyAutoregulation(input);
    const outcome = autoregulationOverlay({ ...result, adjustedWeight: undefined, adjustedReps: 6 }, next, assisted);
    expect(outcome.status).toBe('applied');
    if (outcome.status !== 'applied') throw new Error(outcome.message);
    expect(outcome.message).toContain('100kg assist');
    const row = item();
    row.exercise_id = assisted.id;
    row.autoregulation_adjustments = { 2: { ...outcome.overlay, appliedAt: '' } };
    expect(buildNotificationWorkChain([JSON.parse(JSON.stringify(row))]).next).toMatchObject({ suggestedWeight: 100, targetReps: 6 });
  });

  it.each(['farmer_walk', 'plank', '21s'])('does not interpret %s units as simple reps', id => {
    expect(recommendSessionAdjustment({ ...input, exerciseId: id }, next, getExerciseById(id))).toMatchObject({ status: 'unchanged', reason: 'unsupported_units' });
  });

  it.each([
    { currentSetWeight: NaN }, { currentSetWeight: -1 }, { currentSetReps: 0 },
    { currentSetReps: 1.5 }, { targetReps: 0 }, { currentSetRpe: NaN }, { currentSetRpe: 11 },
  ])('reports invalid input without a promised adjustment: %j', patch => {
    expect(recommendSessionAdjustment({ ...input, ...patch }, next, bench)).toMatchObject({ status: 'unchanged', reason: 'invalid_input' });
  });
  it('reports absent RPE and absent next set explicitly', () => {
    expect(recommendSessionAdjustment({ ...input, currentSetRpe: undefined }, next, bench)).toMatchObject({ status: 'unchanged', reason: 'no_recommendation', message: expect.stringContaining('No RPE') });
    expect(recommendSessionAdjustment(input, undefined, bench)).toMatchObject({ status: 'unchanged', reason: 'no_next_set' });
  });
  it('does not activate automatic set skipping or multiplier-only fatigue output', () => {
    const result = applyAutoregulation(input);
    expect(autoregulationOverlay({ ...result, adjustment: { ...result.adjustment!, skipRemainingSets: true } }, next, bench)).toMatchObject({ status: 'unchanged', reason: 'skip_advisory' });
    expect(autoregulationOverlay({ ...result, adjustedWeight: undefined }, next, bench)).toMatchObject({ status: 'unchanged', reason: 'no_recommendation' });
  });
  it('does not promise a reduction rounded back to the same load', () => {
    expect(recommendSessionAdjustment({ ...input, suggestedWeight: 10 }, { ...next, suggestedWeight: 10 }, bench)).toMatchObject({ status: 'unchanged', reason: 'no_effect' });
  });
  it.each([{ weightDelta: NaN, repsDelta: 0 }, { weightDelta: -101, repsDelta: 0 }, { weightDelta: 0, repsDelta: -8 }])('rejects corrupt persisted overlays for every consumer: %j', delta => {
    const row = item();
    row.autoregulation_adjustments = { 2: { ...delta, reason: 'bad', appliedAt: '' } };
    expect(getAdjustedSetParams(row, 2, {})).toMatchObject({ weight: 100, reps: 8, autoregMessage: expect.stringContaining('invalid') });
    expect(buildNotificationWorkChain([row]).next).toMatchObject({ suggestedWeight: 100, targetReps: 8 });
  });
  it('retains R06 unit qualification for inconsistent bodyweight and uncalibrated external load', () => {
    expect(recommendSessionAdjustment({ ...input, exerciseId: 'push_ups' }, next, getExerciseById('push_ups'))).toMatchObject({ status: 'unchanged', reason: 'unsupported_units' });
    expect(recommendSessionAdjustment({ ...input, suggestedWeight: 0, currentSetWeight: 0 }, { ...next, suggestedWeight: 0 }, bench)).toMatchObject({ status: 'unchanged', reason: 'unsupported_units' });
  });
  it('never rewrites already completed work or summary inputs', () => {
    const row = item();
    row.autoregulation_adjustments = { 1: { weightDelta: -5, repsDelta: -2, reason: 'old', appliedAt: '' } };
    expect(getAdjustedSetParams(row, 1, {})).toEqual({ weight: 100, reps: 8 });
    expect(row.performed?.sets[0]).toMatchObject({ weight: 100, reps: 8, rpe: 9 });
  });
});
