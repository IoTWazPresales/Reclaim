import { describe, expect, it } from 'vitest';
import type { TrainingSessionItemRow } from '@/lib/api';
import { getExerciseById, getExerciseTargetReps, getRepRange } from '../engine';
import { replacementCandidates, replacementEligibility, prescribeReplacement } from '../exerciseSubstitution';
import { completedPerformanceHistory, PERFORMANCE_HISTORY_SOURCE } from '../performanceHistory';
import { historyItem } from './fixtures/performanceHistory';
import { getAdjustedSetParams } from '../sessionDerivedState';
import type { TrainingProfileSnapshot } from '../types';

const ex = (id: string) => { const found = getExerciseById(id); if (!found) throw new Error(id); return found; };
const profile: TrainingProfileSnapshot = {
  goals: { build_muscle: 1, build_strength: 0, lose_fat: 0, get_fitter: 0 },
  equipment_access: ['barbell', 'bench', 'dumbbells', 'floor', 'pull_up_bar', 'cable', 'machine', 'rack'],
  baselines: { barbell_bench_press: 150 },
};
function item(id = 'barbell_bench_press'): TrainingSessionItemRow {
  return { id: 'item', session_id: 'session', exercise_id: id, order_index: 0, skipped: false, performed: null, created_at: '2026-10-15T10:00:00Z', autoregulation_adjustments: null,
    planned: { priority: 'primary', intents: ex(id).intents, sets: [1, 2, 3].map(setIndex => ({ setIndex, targetReps: 99, suggestedWeight: 120, restSeconds: 1 })), decisionTrace: { intent: ex(id).intents } },
  } as TrainingSessionItemRow;
}

describe('safe exercise-specific substitution', () => {
  it('barbell to dumbbell never transfers total-bar weight or old repetitions', () => {
    const source = item(); const before = JSON.stringify(source);
    const result = prescribeReplacement(source, ex('dumbbell_bench_press'), profile);
    expect(result.sets).toHaveLength(3);
    expect(result.sets.every(s => s.suggestedWeight === 0 && s.targetReps === getExerciseTargetReps(ex('dumbbell_bench_press'), getRepRange('primary', profile.goals)))).toBe(true);
    expect(result.decisionTrace).toMatchObject({ loadCalibration: 'uncalibrated', loadDisplayMode: 'per_dumbbell', replacementScope: 'session', originalPlanned: source.planned });
    expect(result.decisionTrace.progressionReason).toContain('enter a load');
    expect(JSON.stringify(source)).toBe(before);
  });
  it('uses only the replacement own baseline in its units', () => {
    const a = prescribeReplacement(item(), ex('dumbbell_bench_press'), { ...profile, baselines: { ...profile.baselines, dumbbell_bench_press: 30 } });
    const b = prescribeReplacement(item(), ex('dumbbell_bench_press'), { ...profile, baselines: { barbell_bench_press: 500, dumbbell_bench_press: 30 } });
    expect(a.sets).toEqual(b.sets);
    expect(a.sets[0].suggestedWeight).toBeGreaterThan(0);
    expect(a.sets[0].suggestedWeight).toBeLessThan(30);
  });
  it('machine to bodyweight clears external kg and recalculates reps', () => {
    const result = prescribeReplacement(item('lat_pulldown'), ex('pull_ups'), profile);
    expect(result.sets.every(s => s.suggestedWeight === 0 && s.targetReps !== 99)).toBe(true);
    expect(result.decisionTrace.loadCalibration).toBe('bodyweight');
  });
  it('replacement-specific 21s and time hold use the engine prescription', () => {
    expect(prescribeReplacement(item('dumbbell_curl'), ex('21s'), profile).sets[0].targetReps).toBe(21);
    const result = prescribeReplacement(item('hanging_leg_raise'), ex('plank'), profile);
    expect(result.sets[0].targetReps).toBe(getExerciseTargetReps(ex('plank'), getRepRange('primary', profile.goals)));
    expect(result.decisionTrace.prescriptionType).toBe('time_hold');
  });
  it.each([
    { equipment_access: ['floor'] },
    { constraints: { injuries: ['shoulder_impingement'] } },
    { constraints: { forbiddenMovements: ['horizontal_press'] } },
    { constraints: { preferences: { hatesExercises: ['dumbbell_bench_press'] } } },
  ])('filters restricted alternatives %j', extra => {
    const p = { ...profile, ...extra } as TrainingProfileSnapshot;
    expect(replacementEligibility(item(), ex('dumbbell_bench_press'), p).length).toBeGreaterThan(0);
    expect(replacementCandidates(item(), p).map(e => e.id)).not.toContain('dumbbell_bench_press');
  });
  it.each([1, 3])('refuses identity changes after %i performed sets, retaining frozen work', count => {
    const source = item(); source.performed = { sets: historyItem().performed!.sets!.slice(0, count) };
    const before = JSON.stringify(source);
    expect(replacementCandidates(source, profile)).toEqual([]);
    expect(() => prescribeReplacement(source, ex('dumbbell_bench_press'), profile)).toThrow('Work already recorded');
    expect(JSON.stringify(source)).toBe(before);
  });
  it('uses qualified own history but never partial, wrong-unit or unavailable history', () => {
    const id = 'dumbbell_bench_press';
    const recent = completedPerformanceHistory([historyItem(id, '2026-10-01', 8, 20)], 3);
    const p = { ...profile, performanceHistory: { source: PERFORMANCE_HISTORY_SOURCE, status: 'available' as const, requestedExerciseIds: [id] }, lastSessionPerformance: { [id]: recent[id][0] }, recentSessionPerformance: recent };
    expect(prescribeReplacement(item(), ex(id), p).sets[0].suggestedWeight).toBeGreaterThan(0);
    for (const invalid of [
      { ...p, performanceHistory: { ...p.performanceHistory, status: 'unavailable' as const } },
      { ...p, lastSessionPerformance: { [id]: { ...recent[id][0], sessionComplete: false } } },
      { ...p, lastSessionPerformance: { [id]: { ...recent[id][0], evidence: { ...recent[id][0].evidence!, loadDisplayMode: 'total_bar' as const } } } },
    ]) expect(prescribeReplacement(item(), ex(id), invalid).decisionTrace.loadCalibration).toBe('uncalibrated');
  });
  it('JSON reload preserves original frozen plan and canonical reader targets', () => {
    const original = item(); const planned = prescribeReplacement(original, ex('dumbbell_bench_press'), profile);
    const saved = JSON.parse(JSON.stringify({ ...original, exercise_id: 'dumbbell_bench_press', planned, autoregulation_adjustments: null }));
    expect(saved.planned.decisionTrace.originalPlanned).toEqual(original.planned);
    expect(getAdjustedSetParams(saved, 1, {}).weight).toBe(0);
    expect(saved.performed).toBeNull();
    expect(saved.planned.decisionTrace.replacementScope).toBe('session');
  });
  it('fails closed for missing context and skipped items', () => {
    expect(replacementCandidates(item(), null)).toEqual([]);
    expect(replacementCandidates({ ...item(), skipped: true }, profile)).toEqual([]);
  });
});
