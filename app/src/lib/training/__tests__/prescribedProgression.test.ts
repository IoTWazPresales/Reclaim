import { describe, expect, it } from 'vitest';
import { buildFourWeekPlan } from '../programPlanner';
import { programmeWeekProposal } from '../programmeWeekProposal';
import { materializePlannedSessionItems, plannedItemsForSession } from '../buildProgramDaySession';
import { completedPerformanceHistory, PERFORMANCE_HISTORY_SOURCE, type PerformanceHistoryItem } from '../performanceHistory';
import { getExerciseById, getRepRange, suggestPrescription } from '../engine';
import { prescribeReplacement } from '../exerciseSubstitution';
import type { TrainingProfileRow, TrainingSessionItemRow } from '../../api';
import type { TrainingProfileSnapshot, SessionPlan, UserState } from '../types';

const id = 'lateral_raises';
const exercise = getExerciseById(id)!;
const goalsA = { build_muscle: .46, build_strength: .46, lose_fat: .08, get_fitter: 0 };
const goalsB = { build_muscle: .4, build_strength: .4, lose_fat: .1, get_fitter: .1 };
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const profile = (goals = goalsA): TrainingProfileSnapshot => ({ goals, experienceLevel: 'advanced',
  equipment_access: ['barbell', 'dumbbells', 'bench', 'rack', 'floor', 'cable_machine', 'pull_up_bar', 'leg_press_machine', 'hack_squat_machine', 'chest_press_machine', 't_bar_row_machine', 'dip_station', 'ez_bar'],
  constraints: { injuries: [], forbiddenMovements: [], preferences: { muscle_frequency_preference: 'twice' } }, baselines: {} });
function setup(goals = goalsA) {
  const snapshot = profile(goals);
  const plan = buildFourWeekPlan(snapshot as unknown as TrainingProfileRow, [1, 2, 3, 4, 5], new Date('2026-11-02T12:00:00Z'));
  const session = [...programmeWeekProposal(plan, 1, snapshot).values()].find(s => s.exercises.some(e => e.exerciseId === id))!;
  return { snapshot, plan, session };
}
function record(session: SessionPlan, sequence: number, edit?: (item: PerformanceHistoryItem) => void): PerformanceHistoryItem {
  const date = new Date(Date.UTC(2026, 8, sequence + 1)).toISOString().slice(0, 10);
  const frozen = materializePlannedSessionItems(`session-${sequence}`, session).find(i => i.exerciseId === id)!;
  const item: PerformanceHistoryItem = { id: frozen.id, session_id: `session-${sequence}`, exercise_id: id, skipped: false,
    planned: frozen.planned, performed: { sets: frozen.planned.sets.map(s => ({ setIndex: s.setIndex, weight: s.suggestedWeight, reps: s.targetReps, rpe: 8, completedAt: `${date}T10:30:00Z` })) },
    training_sessions: { started_at: `${date}T10:00:00Z`, ended_at: `${date}T11:00:00Z` } };
  edit?.(item);
  return item;
}
function seed(session: SessionPlan, sequence = 0, reps?: number, rpes = [8, 8, 8]): PerformanceHistoryItem {
  return record(session, sequence, item => {
    item.planned!.sets!.forEach((set, i) => { set.suggestedWeight = 12; if (reps !== undefined) set.targetReps = reps;
      item.performed!.sets![i] = { ...item.performed!.sets![i], weight: 12, reps: set.targetReps!, rpe: rpes[i] }; });
  });
}
function history(items: PerformanceHistoryItem[]): Pick<UserState, 'performanceHistory' | 'lastSessionPerformance' | 'recentSessionPerformance'> {
  const recent = completedPerformanceHistory(items, 3);
  return { performanceHistory: { source: PERFORMANCE_HISTORY_SOURCE, status: 'available', requestedExerciseIds: [id] },
    lastSessionPerformance: { [id]: recent[id][0] }, recentSessionPerformance: recent };
}
function resolve(items: PerformanceHistoryItem[], extra: Partial<UserState> = {}, goals = goalsA, count = 3) {
  return suggestPrescription({ exercise, goalWeights: goals, priority: 'isolation', plannedReps: goals === goalsA ? 12 : 13,
    plannedSetCount: count, userState: { experienceLevel: 'advanced', ...history(items), ...extra } });
}

describe('the existing planner progresses the frozen prescription as one reps/load decision', () => {
  it.each([goalsA, goalsB])('crosses two weight increases through real history, weekly validation and materialization (%j)', goals => {
    const { snapshot, plan, session } = setup(goals);
    const records = [seed(session)];
    const originalPlan = clone(plan);
    const range = getRepRange('isolation', goals);
    const first = records[0].planned!.sets![0].targetReps!;
    let expectedReps = first, expectedWeight = 12;
    for (let n = 1; n <= 14; n++) {
      expectedReps++;
      if (expectedReps > range[1]) { expectedReps = range[0]; expectedWeight++; }
      const proposals = programmeWeekProposal(plan, 1, { ...snapshot, ...history(records) });
      const next = [...proposals.values()].find(s => s.exercises.some(e => e.exerciseId === id))!;
      expect(next.weeklyValidation!.status).not.toBe('invalid');
      expect(next.weeklyValidation!.issues.filter(i => i.severity === 'error')).toEqual([]);
      for (const proposal of proposals.values()) {
        const lateral = proposal.exercises.find(e => e.exerciseId === id);
        if (lateral) expect(lateral.plannedSets.map(s => [s.targetReps, s.suggestedWeight])).toEqual(Array(3).fill([expectedReps, expectedWeight]));
      }
      const again = programmeWeekProposal(plan, 1, { ...snapshot, ...history(records) });
      expect([...again.values()].map(s => s.exercises)).toEqual([...proposals.values()].map(s => s.exercises));
      const frozen = materializePlannedSessionItems('confirmed', next);
      for (const state of [{ startedAt: '2026-11-01', notificationMode: 'normal' as const }, { startedAt: null, notificationMode: 'guided' as const }]) {
        expect(plannedItemsForSession({ ...state, frozenItems: frozen, rebuiltPlan: session, sessionId: 'confirmed' })).toBe(frozen);
      }
      records.unshift(record(next, n));
    }
    expect(expectedWeight).toBe(14);
    expect(plan).toEqual(originalPlan);
    // Allocation structure, identity, volume and rest remain the original writer's output.
    expect(records[0].planned!.sets).toHaveLength(3);
  });

  it('qualifies each frozen target, not merely total reps or the highest observed set', () => {
    const { session } = setup();
    const item = seed(session, 1, 13);
    item.performed!.sets![2].reps = 12;
    item.performed!.sets![0].reps = 20;
    expect(resolve([item])).toMatchObject({ reps: 13, weight: 12, progression: { action: 'hold' } });
    item.performed!.sets![2].reps = 13;
    expect(resolve([item])).toMatchObject({ reps: 14, weight: 12 });
  });

  it('holds difficult work and deloads only two comparable unsuccessful attempts without improvement', () => {
    const { session } = setup();
    const older = seed(session, 1, 13, [8, 9, 8]), newer = seed(session, 2, 13, [8, 9, 8]);
    expect(resolve([older])).toMatchObject({ reps: 13, weight: 12 });
    expect(resolve([newer, older])).toMatchObject({ reps: 9, weight: 11 });
    older.performed!.sets![1].rpe = 10;
    expect(resolve([newer, older])).toMatchObject({ reps: 13, weight: 12 });
  });

  it('distinguishes repeated misses from improving reps and successful prescribed work', () => {
    const { session } = setup();
    const older = seed(session, 1, 13), newer = seed(session, 2, 13);
    for (const item of [older, newer]) item.performed!.sets!.forEach((set, i) => { if (i > 0) set.reps = 12; });
    expect(resolve([newer, older])).toMatchObject({ reps: 9, weight: 11 });
    newer.performed!.sets![1].reps = 13;
    expect(resolve([newer, older])).toMatchObject({ reps: 13, weight: 12 });
    newer.performed!.sets![2].reps = 13;
    expect(resolve([newer, older])).toMatchObject({ reps: 14, weight: 12 });
  });

  it.each(['partial', 'skipped', 'unfinished', 'mixed', 'adjusted'] as const)('%s work is a barrier, never earned progression or stagnation', kind => {
    const { snapshot, plan, session } = setup();
    const item = seed(session, 2, 13);
    if (kind === 'partial') item.performed!.sets!.pop();
    if (kind === 'skipped') item.skipped = true;
    if (kind === 'unfinished') item.training_sessions!.ended_at = null;
    if (kind === 'mixed') item.performed!.sets![1].weight = 11;
    if (kind === 'adjusted') item.autoregulation_adjustments = { '2': { weight: 11, reps: 12 } };
    const older = seed(session, 1, 13, [9, 9, 9]);
    expect(resolve([item, older])).toMatchObject({ reps: 13, weight: 12, progression: { action: 'hold' } });
    const newer = seed(session, 3, 13, [9, 9, 9]);
    expect(resolve([newer, item, older])).toMatchObject({ reps: 13, weight: 12 });
    expect([...programmeWeekProposal(plan, 1, { ...snapshot, ...history([item, older]) }).values()][0].weeklyValidation!.status).not.toBe('invalid');
  });

  it('keeps RPE optional without ignoring any reported high effort', () => {
    const { session } = setup();
    const item = seed(session);
    item.performed!.sets!.forEach(s => { delete s.rpe; });
    expect(resolve([item])).toMatchObject({ reps: 13, weight: 12 });
    item.performed!.sets![0].rpe = 7;
    expect(resolve([item])).toMatchObject({ reps: 13, weight: 12 });
    item.performed!.sets![2].rpe = 9;
    expect(resolve([item])).toMatchObject({ reps: 12, weight: 12 });
  });

  it('honors newer/tied/invalid baseline dates, older baselines yield, cleared timestamps do not govern', () => {
    const { session } = setup(); const item = seed(session);
    for (const date of ['2026-11-01', item.training_sessions!.started_at!, 'invalid']) {
      expect(resolve([item], { estimated1RM: { [id]: 12 }, baselineUpdatedAt: { [id]: date } })).toMatchObject({ reps: 12, weight: 8 });
    }
    expect(resolve([item], { estimated1RM: { [id]: 12 }, baselineUpdatedAt: { [id]: '2026-01-01' } })).toMatchObject({ reps: 13, weight: 12 });
    expect(resolve([item], { estimated1RM: { [id]: 0 }, baselineUpdatedAt: { [id]: '2026-11-01' } })).toMatchObject({ reps: 13, weight: 12 });
  });

  it('repeats unknown/changed ranges once, rejects missing prescription evidence and changed volume for earned progression', () => {
    const { session } = setup(); const item = seed(session);
    delete item.planned!.decisionTrace!.prescriptionContext;
    expect(resolve([item])).toMatchObject({ reps: 12, weight: 12, progression: { action: 'hold' } });
    const known = seed(session);
    expect(resolve([known], {}, goalsB)).toMatchObject({ reps: 12, weight: 12 });
    expect(resolve([known], {}, goalsA, 4)).toMatchObject({ reps: 12, weight: 12 });
    item.planned!.sets = item.planned!.sets!.map(s => ({ setIndex: s.setIndex }));
    expect(resolve([item]).progression).toBeUndefined();
  });

  it('establishes the first confirmed load without an immediate increase', () => {
    const { session } = setup(); const item = seed(session);
    item.planned!.sets!.forEach(s => { s.suggestedWeight = 0; s.loadRequiresConfirmation = true; });
    expect(resolve([item])).toMatchObject({ reps: 12, weight: 12, progression: { action: 'hold' } });
  });

  it('compares last/recent evidence semantically, including the original prescription', () => {
    const { session } = setup(); const item = seed(session);
    const state = history([item]);
    const recent = clone(state.recentSessionPerformance!);
    recent[id][0] = Object.fromEntries(Object.entries(recent[id][0]).reverse()) as typeof recent[typeof id][number];
    expect(resolve([item], { recentSessionPerformance: recent })).toMatchObject({ reps: 13, weight: 12 });
    recent[id][0].prescription!.sets[0].targetReps = 15;
    expect(resolve([item], { recentSessionPerformance: recent }).progression).toBeUndefined();
  });

  it('replacement uses the same pair, own evidence and frozen set count', () => {
    const { session, snapshot } = setup(); const item = seed(session);
    const source = { id: 'original', session_id: 'session', exercise_id: 'rear_delt_flyes', skipped: false, performed: null, planned: clone(item.planned) } as TrainingSessionItemRow;
    const before = clone(source);
    const replacement = prescribeReplacement(source, exercise, { ...snapshot, ...history([item]) });
    expect(replacement.sets.map(s => [s.targetReps, s.suggestedWeight])).toEqual(Array(3).fill([13, 12]));
    expect(replacement.decisionTrace.prescriptionContext).toBeDefined();
    expect(source).toEqual(before);
  });
});
