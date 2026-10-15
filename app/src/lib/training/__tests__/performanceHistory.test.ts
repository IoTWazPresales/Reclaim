import { describe, expect, it } from 'vitest';
import { completedPerformanceHistory, isQualifiedPerformance } from '../performanceHistory';
import { deriveProgressionDecision, explainAppliedProgression, getExerciseById, suggestLoading } from '../engine';
import { historyItem } from './fixtures/performanceHistory';
import { buildProgramDaySession } from '../buildProgramDaySession';
import { buildFourWeekPlan } from '../programPlanner';
import type { TrainingProfileSnapshot, UserState } from '../types';

const bench = getExerciseById('barbell_bench_press')!;
const goals = { build_muscle: 1, build_strength: 0, lose_fat: 0, get_fitter: 0 };
function state(items: ReturnType<typeof historyItem>[]): UserState {
  const recent = completedPerformanceHistory(items, 3);
  return { experienceLevel: 'intermediate', recentSessionPerformance: recent,
    lastSessionPerformance: Object.fromEntries(Object.entries(recent).map(([id, sessions]) => [id, sessions[0]])) };
}

describe('canonical history to decision', () => {
  it('uses frozen working sets without a set-log replica and does not mutate stored rows', () => {
    const item = historyItem();
    const before = structuredClone(item);
    const user = state([item]);
    expect(isQualifiedPerformance(bench, user.lastSessionPerformance![bench.id])).toBe(true);
    expect(deriveProgressionDecision(bench, user, [6, 8])?.nextWeight).toBe(62.5);
    expect(item).toEqual(before);
    expect(user.lastSessionPerformance![bench.id].evidence).toMatchObject({ source: 'training_session_items.performed.sets', loadUnit: 'kg', loadDisplayMode: 'total_bar', plannedSetIndices: [1, 2, 3] });
  });

  it.each(['unfinished', 'partial', 'skipped', 'missing_plan', 'missing_performed', 'duplicate', 'extra', 'missing_timestamp', 'mixed', 'invalid_rpe', 'external_zero', 'missing_weight'])('rejects %s latest work instead of falling back to older success', (kind) => {
    const item = historyItem(bench.id, '2026-10-02');
    if (kind === 'unfinished') item.training_sessions!.ended_at = null;
    if (kind === 'partial') item.performed!.sets!.pop();
    if (kind === 'skipped') item.skipped = true;
    if (kind === 'missing_plan') item.planned = null;
    if (kind === 'missing_performed') item.performed = null;
    if (kind === 'duplicate') item.performed!.sets![2].setIndex = 1;
    if (kind === 'extra') item.performed!.sets!.push({ ...item.performed!.sets![0], setIndex: 4 });
    if (kind === 'missing_timestamp') item.performed!.sets![0].completedAt = '';
    if (kind === 'mixed') item.performed!.sets![0].weight = 40;
    if (kind === 'invalid_rpe') item.performed!.sets![0].rpe = NaN;
    if (kind === 'external_zero') item.performed!.sets!.forEach(set => { set.weight = 0; });
    if (kind === 'missing_weight') delete (item.performed!.sets![0] as Partial<import('../types').SetLog>).weight;
    const user = state([historyItem(), item]);
    expect(user.lastSessionPerformance![bench.id].date).toContain('2026-10-02');
    expect(deriveProgressionDecision(bench, user, [6, 8])).toBeNull();
  });

  it('does not skip an incomplete session to construct two stagnant sessions', () => {
    const middle = historyItem(bench.id, '2026-10-02', 6);
    middle.performed!.sets!.pop();
    expect(deriveProgressionDecision(bench, state([historyItem(bench.id, '2026-10-03', 6), middle, historyItem(bench.id, '2026-10-01', 6)]), [6, 8])?.action).toBe('hold');
  });

  it('recognizes improving reps below the top and preserves the two-hold deload', () => {
    const older = historyItem(bench.id, '2026-10-01', 6);
    const improved = historyItem(bench.id, '2026-10-02', 7);
    expect(deriveProgressionDecision(bench, state([older, improved]), [6, 8])?.action).toBe('hold');
    improved.performed!.sets!.forEach(set => { set.reps = 6; });
    const decision = deriveProgressionDecision(bench, state([older, improved]), [6, 8]);
    expect(decision).toMatchObject({ action: 'deload', nextWeight: 55, incrementKg: 0 });
  });

  it('rejects mismatched exercise, unit, source, duplicate sessions and legacy numeric input', () => {
    for (const change of [
      (u: UserState) => { u.lastSessionPerformance![bench.id].exerciseId = 'barbell_row'; },
      (u: UserState) => { (u.lastSessionPerformance![bench.id].evidence! as any).loadUnit = 'lb'; },
      (u: UserState) => { u.lastSessionPerformance![bench.id].evidence!.loadDisplayMode = 'per_dumbbell'; },
      (u: UserState) => { delete u.lastSessionPerformance![bench.id].evidence; },
    ]) {
      const user = state([historyItem()]); change(user);
      expect(deriveProgressionDecision(bench, user, [6, 8])).toBeNull();
    }
    const item = historyItem();
    const duplicate = { ...structuredClone(item), id: 'second-item' };
    expect(deriveProgressionDecision(bench, state([item, duplicate]), [6, 8])).toBeNull();
  });

  it('distinguishes bodyweight zero, assistance and carry/time units', () => {
    const push = getExerciseById('push_ups')!;
    const user = state([historyItem(push.id, '2026-10-01', 12, 0)]);
    expect(deriveProgressionDecision(push, user, [8, 12])?.action).toBe('add_weight');
    expect(explainAppliedProgression(push, user, [8, 12], 0, 10)).toContain('10 reps per set, no added load');
    for (const id of ['farmer_walk', 'plank', 'assisted_pull_ups']) {
      const exercise = getExerciseById(id)!;
      expect(exercise).toBeTruthy();
      expect(deriveProgressionDecision(exercise, state([historyItem(id)]), [6, 8])).toBeNull();
    }
  });

  it('reports rounded increments and deload targets without promising an unapplied change', () => {
    const user = state([historyItem(bench.id, '2026-10-01', 8, 61)]);
    const decision = deriveProgressionDecision(bench, user, [6, 8])!;
    expect(decision.nextWeight).toBe(62.5);
    expect(decision.incrementKg).toBe(1.5);
    expect(explainAppliedProgression(bench, user, [6, 8], 62.5, 7)).toContain('+1.5kg');
    const stuck = state([historyItem(bench.id, '2026-10-01', 6, 2.5), historyItem(bench.id, '2026-10-02', 6, 2.5)]);
    const floor = deriveProgressionDecision(bench, stuck, [6, 8])!;
    expect(floor.nextWeight).toBe(2.5);
    expect(floor.reason).toContain('target, rounded to implement step/minimum');
  });

  it('rejects a recent incomplete session even when a caller passes an older successful last map', () => {
    const user = state([historyItem()]);
    const newer = historyItem(bench.id, '2026-10-02'); newer.performed!.sets!.pop();
    user.recentSessionPerformance = completedPerformanceHistory([newer, historyItem()], 3);
    expect(deriveProgressionDecision(bench, user, [6, 8])).toBeNull();
  });

  it('preserves D-P2-01 ceiling over several ended sessions and describes actual prescribed work', () => {
    const user = state([historyItem(bench.id, '2026-10-01', 12, 80), historyItem(bench.id, '2026-10-02', 12, 82.5), historyItem(bench.id, '2026-10-03', 12, 85)]);
    user.estimated1RM = { [bench.id]: 80 };
    const proposed = deriveProgressionDecision(bench, user, [8, 12]);
    const applied = suggestLoading({ exercise: bench, userState: user, goalWeights: goals, plannedReps: 10 });
    expect(proposed?.nextWeight).toBe(87.5);
    expect(applied).toBe(60);
    const reason = explainAppliedProgression(bench, user, [8, 12], applied, 10);
    expect(reason).toContain('Prescribed 60kg for 10 reps per set');
    expect(reason).toContain('87.5kg');
    expect(reason).toContain('your saved exercise baseline limits it');
    expect(reason).not.toContain('+2.5kg');
  });

  it('passes qualification and the applied reason through the committed R04 allocated-day path', () => {
    const user = state([historyItem(bench.id, '2026-10-01', 12, 80)]);
    const profile: TrainingProfileSnapshot = { goals, equipment_access: ['barbell', 'rack', 'bench', 'floor', 'dumbbells', 'cables', 'machines', 'pull_up_bar'], baselines: { [bench.id]: 80 }, ...user };
    const plan = buildFourWeekPlan(profile as import('../../api').TrainingProfileRow, [1, 3, 5], new Date('2026-10-01'));
    const day = Object.values(plan.weeks[0].days).find(d => d.allocation?.slots.some(slot => slot.exerciseId === bench.id))!;
    expect(day).toBeTruthy();
    const session = buildProgramDaySession({ label: day.label, intents: day.intents, template_key: day.template, allocation: day.allocation }, profile);
    const work = session.exercises.find(ex => ex.exerciseId === bench.id)!;
    expect(work).toBeTruthy();
    expect(work.decisionTrace.progressionReason).toContain(`Prescribed ${work.plannedSets[0].suggestedWeight}kg for ${work.plannedSets[0].targetReps} reps per set`);
    expect(work.decisionTrace.progressionReason).toContain('your saved exercise baseline limits it');
  });
});
