import { describe, expect, it } from 'vitest';
import { getExerciseById, suggestLoading, explainAppliedProgression } from '../engine';
import { epleyRpe8WorkingWeight, epleyWorkingWeightCeiling, getWeightStep } from '../progression';
import { canonicalPerformance } from './fixtures/performanceHistory';
import { PERFORMANCE_HISTORY_SOURCE } from '../performanceHistory';
import { prescribeReplacement, replacementPlanningProfile } from '../exerciseSubstitution';
import { anchoredWorkingKg, anchorLoadEvidence } from '../anchorLoad';
import { prepareTrainingSetup } from '../setupDraft';
import { dryRunTrainingGeneration } from '../preview';
import { buildFourWeekPlan, generateProgramDays } from '../programPlanner';
import { programmeWeekProposal } from '../programmeWeekProposal';
import { programDayInput, frozenSessionProjection } from '../programmeProjection';
import { buildProgramDaySession, materializePlannedSessionItems, plannedItemsForSession } from '../buildProgramDaySession';
import type { TrainingSessionItemRow, TrainingProfileRow } from '../../api';
import type { UserState, TrainingProfileSnapshot } from '../types';

const goals = { build_muscle: .4, build_strength: .4, lose_fat: .1, get_fitter: .1 };
const ex = (id: string) => getExerciseById(id)!;
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
function history(id: string): UserState {
  const perf = canonicalPerformance(id, [1, 2, 3].map(setIndex => ({ setIndex, weight: 20, reps: 7, completedAt: '2026-10-31T10:00:00Z' })), '2026-10-31');
  return { experienceLevel: 'intermediate', lastSessionPerformance: { [id]: perf }, recentSessionPerformance: { [id]: [perf] }, performanceHistory: { source: PERFORMANCE_HISTORY_SOURCE, status: 'available', requestedExerciseIds: [id] } };
}
const load = (id: string, userState: UserState, plannedReps = 13) => suggestLoading({ exercise: ex(id), userState, goalWeights: goals, plannedReps });

describe('working load is distinct from the Epley ceiling', () => {
  it('attributes a lower adaptive load separately when the proposal is already within the working limit', () => {
    const user = history('shrugs');
    const reason = explainAppliedProgression(ex('shrugs'), user, [5, 9], 19, 3)!;
    expect(reason).toContain('RPE 8 working limit (2 reps in reserve): 21kg');
    expect(reason).toContain('Qualified history proposed 20kg; the current load adjustment limits it.');
    expect(reason).not.toContain('qualified history limits it at RPE 8');
  });

  it('preserves non-repetition carry loading rather than interpreting metres as reps in reserve', () => {
    const user: UserState = { experienceLevel: 'intermediate', estimated1RM: { farmer_walk: 100 } };
    expect(load('farmer_walk', user, 20)).toBe(60);
    expect(load('farmer_walk', { ...user, prescriptionPolicy: 'v1' }, 20)).toBe(60);
    expect(explainAppliedProgression(ex('farmer_walk'), user, [5, 9], 60, 20)).not.toContain('RPE 8');
  });

  it('does not replace a valid sub-step anchor with a population default', () => {
    const user: UserState = { experienceLevel: 'advanced', estimated1RM: { squat: 1 }, prescriptionPolicy: 'v2' };
    expect(anchoredWorkingKg(ex('front_squat'), user, 13, 140)).toBe(0);
    expect(load('front_squat', user)).toBe(0);
    expect(load('front_squat', { ...user, prescriptionPolicy: 'v1' })).toBeGreaterThan(0);
  });

  it('separates scaled same-unit anchor capacity and working load without inventing a DB anchor', () => {
    const user: UserState = { experienceLevel: 'advanced', estimated1RM: { squat: 105, barbell_bench_press: 200 } };
    const weight = load('front_squat', user, 6);
    // 105 * (69.2/88.3) = 82.2876 e1RM; ceiling68.57 ->65, RPE8 limit64.96 ->60.
    expect(weight).toBe(60);
    const reason = explainAppliedProgression(ex('front_squat'), user, [5, 7], weight, 6)!;
    expect(reason).toContain('same-unit anchor baseline');
    expect(reason).toContain('Epley ceiling: 65kg');
    expect(reason).toContain('RPE 8 working limit (2 reps in reserve): 60kg');
    expect(reason).toContain('Applied working weight: 60kg');
    expect(anchorLoadEvidence(ex('dumbbell_bench_press'), user)).toBeUndefined();
    expect(explainAppliedProgression(ex('dumbbell_bench_press'), user, [5, 7], 0, 6)).toBeUndefined();
  });

  it('honors a newly entered baseline through the actual replacement profile adapter', () => {
    const id = 'dumbbell_bench_press';
    const user = history(id);
    const row: TrainingProfileRow = { id: 'synthetic', user_id: 'synthetic', days_per_week: 3, preferred_time_window: {}, created_at: '', updated_at: '', goals, equipment_access: ['barbell', 'bench', 'dumbbells', 'rack'], baselines: { [id]: 12 }, constraints: { experienceLevel: 'intermediate', baselineUpdatedAt: { [id]: '2026-11-01T00:00:00Z' } } };
    const profile = { ...replacementPlanningProfile(row)!, performanceHistory: user.performanceHistory, lastSessionPerformance: user.lastSessionPerformance, recentSessionPerformance: user.recentSessionPerformance };
    expect(profile.baselineUpdatedAt).toEqual(row.constraints?.baselineUpdatedAt);
    const source: TrainingSessionItemRow = { id: 'synthetic', session_id: 'synthetic', exercise_id: 'barbell_bench_press', order_index: 0, created_at: '', skipped: false, performed: null, autoregulation_adjustments: null,
      planned: { priority: 'primary', intents: ['horizontal_press'], decisionTrace: {}, sets: [{ setIndex: 1, targetReps: 13, suggestedWeight: 999, restSeconds: 90 }] } };
    const before = clone(source);
    const replacement = prescribeReplacement(source, ex(id), profile);
    expect(replacement.sets[0].suggestedWeight).toBe(Math.floor(12 / (1 + (replacement.sets[0].targetReps + 2) / 30)));
    expect(replacement.decisionTrace.progressionReason).toContain('Your saved exercise baseline governs');
    expect(source).toEqual(before);
    expect(profile.baselines?.[id]).toBe(12);
  });

  it('reproduces the old shrug ceiling and leaves two reps in reserve for a new build', () => {
    const user = history('shrugs');
    const before = clone(user);
    // Old resolver used the target-rep ceiling, rounded nearest: 17.209 -> 17.
    expect(epleyWorkingWeightCeiling(20 * (1 + 7 / 30), 13, 1)).toBe(17);
    expect(load('shrugs', user)).toBe(16); // 24.6667 / (1 + 15/30), floor 1kg.
    const reason = explainAppliedProgression(ex('shrugs'), user, [11, 15], 16, 13)!;
    expect(reason).toContain('Epley ceiling: 17kg at 13 reps');
    expect(reason).toContain('RPE 8 working limit (2 reps in reserve): 16kg');
    expect(reason).toContain('Applied working weight: 16kg');
    expect(user).toEqual(before);
  });

  it.each([
    ['barbell_bench_press', 65, 15],
    ['dumbbell_bench_press', 66, 16],
    ['cable_row', 65, 15],
    ['leg_press', 65, 15],
  ] as const)('%s floors baseline, history and substitution loads in the exercise unit', (id, baselineWeight, historyWeight) => {
    const baseline: UserState = { experienceLevel: 'intermediate', estimated1RM: { [id]: 100 } };
    expect(load(id, baseline)).toBe(baselineWeight);
    expect(load(id, history(id))).toBe(historyWeight);
    for (const user of [baseline, history(id)]) {
      const source: TrainingSessionItemRow = { id: 'synthetic', session_id: 'synthetic', exercise_id: 'synthetic-original', order_index: 0, created_at: '', skipped: false, performed: null, autoregulation_adjustments: null,
        planned: { priority: 'primary', intents: ex(id).intents, decisionTrace: {}, sets: [{ setIndex: 1, targetReps: 13, suggestedWeight: 999, restSeconds: 90 }] } };
      // A real, different exercise with the same intent is the replacement source.
      source.exercise_id = id === 'barbell_bench_press' ? 'dumbbell_bench_press' : id === 'dumbbell_bench_press' ? 'barbell_bench_press' : id === 'cable_row' ? 'barbell_row' : 'squat';
      const profile: TrainingProfileSnapshot = { goals, equipment_access: ['barbell', 'bench', 'dumbbells', 'rack', 'cable_machine', 'leg_press_machine'], baselines: user.estimated1RM, ...user };
      const before = clone(source);
      const result = prescribeReplacement(source, ex(id), profile);
      const reps = result.sets[0].targetReps;
      expect(result.sets[0].suggestedWeight).toBe(load(id, user, reps));
      expect(result.decisionTrace.progressionReason).toContain('Epley ceiling:');
      expect(result.decisionTrace.progressionReason).toContain('Applied working weight:');
      expect(source).toEqual(before);
    }
  });

  it('keeps v1 replay, floors tiny loads to zero and rejects invalid formula inputs', () => {
    expect(load('barbell_bench_press', { experienceLevel: 'intermediate', estimated1RM: { barbell_bench_press: 100 }, prescriptionPolicy: 'v1' })).toBe(70);
    expect(load('barbell_bench_press', { experienceLevel: 'intermediate', estimated1RM: { barbell_bench_press: 1 } })).toBe(0);
    for (const args of [[NaN, 13, 1], [100, Infinity, 1], [100, 13, 0], [0, 13, 1]]) expect(epleyRpe8WorkingWeight(...args as [number, number, number])).toBe(0);
    for (const reps of [1, 7, 13, 21]) for (const step of [1, 2.5, 5]) {
      const weight = epleyRpe8WorkingWeight(100, reps, step);
      expect(weight).toBeLessThanOrEqual(100 / (1 + (reps + 2) / 30));
      expect(weight + step).toBeGreaterThan(100 / (1 + (reps + 2) / 30));
    }
  });

  it('preview == saved == started for numeric baseline loads, preserving frozen and guided rows', () => {
    const draft = { goals, selectedWeekdays: [1, 2, 3, 4, 5], equipment: ['barbell', 'rack', 'bench', 'dumbbells', 'cable_machine', 'floor', 'pull_up_bar'], constraints: [], baselines: { bench_press: 80, squat: 100, deadlift: 120, overhead_press: 50, row: 70 }, baselineReps: { bench_press: 7, squat: 7, deadlift: 7, overhead_press: 7, row: 7 }, experienceLevel: 'intermediate' as const, trainingMode: 'strength' as const };
    const setup = prepareTrainingSetup(draft);
    const plan = buildFourWeekPlan(setup.profile, setup.selectedWeekdaysJs, new Date(2026, 10, 2));
    const saved = clone({ plan, profile: setup.programSnapshot });
    for (const row of generateProgramDays('synthetic', 'synthetic', saved.plan, new Date(2026, 10, 2)).filter(day => day.week_index === 1)) {
      const preview = dryRunTrainingGeneration(draft, { targetWeekday: row.day_index, weekIndex: 1 })!;
      const proposal = programmeWeekProposal(saved.plan, 1, saved.profile).get(row.day_index)!;
      const direct = buildProgramDaySession(programDayInput(row, saved.plan), saved.profile);
      expect(preview.exercises).toEqual(proposal.exercises);
      expect(direct.exercises).toEqual(proposal.exercises);
      const started = clone(materializePlannedSessionItems('synthetic', proposal));
      for (const item of started) {
        expect(item.planned.sets).toEqual(proposal.exercises.find(e => e.exerciseId === item.exerciseId)!.plannedSets);
        const rm = setup.snapshot.baselines?.[item.exerciseId];
        if (rm) for (const set of item.planned.sets) expect(set.suggestedWeight).toBe(Math.floor(rm / (1 + (set.targetReps + 2) / 30) / getWeightStep(ex(item.exerciseId))) * getWeightStep(ex(item.exerciseId)));
      }
      started[0].planned.sets[0].suggestedWeight = 999;
      for (const input of [{ startedAt: '2026-10-01T10:00:00Z', notificationMode: 'normal' as const }, { startedAt: null, notificationMode: 'guided' as const }]) expect(plannedItemsForSession({ ...input, frozenItems: started, rebuiltPlan: proposal, sessionId: 'synthetic' })).toBe(started);
      const rows: TrainingSessionItemRow[] = started.map(item => ({ id: item.id, exercise_id: item.exerciseId, session_id: 'synthetic', order_index: item.orderIndex, autoregulation_adjustments: null, skipped: false, created_at: '', planned: item.planned, performed: null }));
      expect(frozenSessionProjection(proposal, rows).exercises[0].plannedSets[0].suggestedWeight).toBe(999);
    }
  });
});
