/**
 * N-0074 acceptance simulations S1-S8 (benchmark / follower exposures,
 * RIR-aware Epley, added bodyweight, rep restart).
 *
 * History rows are PerformanceHistoryItem records projected through the real
 * completedPerformanceHistory, so every ExercisePerformance has the canonical
 * shape (completedAt, evidence.status 'qualified', prescription.context with
 * DOUBLE_PROGRESSION_POLICY_VERSION, repRange and exposure). Rep ranges and
 * target reps come from rules.v1.json via getRepRange and EXPOSURE_ROLE_POLICY.
 * The operator's numbers are fixtures only (fixtures/operatorProfile.ts).
 */
import { describe, expect, it } from 'vitest';
import { getExerciseById, getRepRange, suggestPrescription } from '../engine';
import { completedPerformanceHistory, PERFORMANCE_HISTORY_SOURCE, type PerformanceHistoryItem } from '../performanceHistory';
import {
  ADDED_BW_RESTART_OFFSET, BENCHMARK_WINDOW_SESSIONS, DOUBLE_PROGRESSION_POLICY_VERSION, FOLLOWER_MISS_STREAK, FOLLOWER_STEP_DOWN,
  HISTORY_SESSIONS_PER_EXERCISE, UNLOGGED_RPE_RIR, epleyRestartReps, rirAwareE1RM, type ExposureContext,
} from '../progression';
import { EXPOSURE_ROLE_POLICY } from '../weeklyProgramme';
import { slotExposureContext, weekExposureBenchmarks } from '../exposureBenchmark';
import { formatPlannedSetSummary } from '../loadDisplayFormat';
import { formatWeight, formatWeightReps } from '../../../components/training/uiFormat';
import { programmeWeekProposal } from '../programmeWeekProposal';
import { materializePlannedSessionItems } from '../buildProgramDaySession';
import { OPERATOR_BASELINES, operatorPlan, operatorSnapshot } from './fixtures/operatorProfile';
import type { ExercisePrescription, GoalWeights, SessionPlan, UserState } from '../types';
import type { ExposureRole } from '../weeklyProgrammeTypes';

const GOALS: GoalWeights = { build_muscle: 0.5, build_strength: 0.5, lose_fat: 0, get_fitter: 0 };
const BASELINE_AT = '2026-11-01T00:00:00Z';
const SETS = 4;
const range = (role: ExposureRole) => getRepRange('primary', EXPOSURE_ROLE_POLICY[role].goals);
const ex = (id: string) => { const value = getExerciseById(id); if (!value) throw new Error(id); return value; };

type Step = {
  role?: ExposureRole;
  /** Accessory / non-exposure prescription (priority accessory, goal-blend range). */
  accessory?: boolean;
  /** Performed reps per set; defaults to the prescribed reps on every set. */
  reps?: (prescribed: number) => number[];
  /** Logged weight on every set; defaults to the prescribed load. */
  logWeight?: number;
  rpe?: number | null;
  skip?: boolean;
  adjusted?: boolean;
  label?: string;
};
type Row = { label: string; reps: number; weight: number; text: string; prescription: ExercisePrescription };

/** A follower's benchmark as the saved programme declares it (strength slot on weekday 1). */
function exposureFor(exerciseId: string, role: ExposureRole, dual: boolean): ExposureContext {
  const benchmarks = dual ? weekExposureBenchmarks([{ dayKey: '1', slots: [{ exerciseId, exposure: 'strength', repRange: range('strength') }] }]) : {};
  return slotExposureContext({ exerciseId, exposure: role, repRange: range(role), reps: EXPOSURE_ROLE_POLICY[role].targetReps }, benchmarks)!;
}

function state(exerciseId: string, items: PerformanceHistoryItem[], baseline?: number): UserState {
  const recent = completedPerformanceHistory(items, HISTORY_SESSIONS_PER_EXERCISE);
  return {
    experienceLevel: 'advanced',
    estimated1RM: baseline ? { [exerciseId]: baseline } : {},
    baselineUpdatedAt: baseline ? { [exerciseId]: BASELINE_AT } : {},
    performanceHistory: { source: PERFORMANCE_HISTORY_SOURCE, status: items.length ? 'available' : 'missing', requestedExerciseIds: [exerciseId] },
    lastSessionPerformance: recent[exerciseId]?.length ? { [exerciseId]: recent[exerciseId][0] } : {},
    recentSessionPerformance: recent,
  };
}

function record(exerciseId: string, sequence: number, prescription: ExercisePrescription, step: Step): PerformanceHistoryItem {
  const day = new Date(Date.UTC(2026, 10, 2 + sequence)).toISOString().slice(0, 10);
  const reps = step.reps?.(prescription.reps) ?? Array(SETS).fill(prescription.reps);
  const rpe = step.rpe === undefined ? 8 : step.rpe;
  return {
    id: `${exerciseId}-item-${sequence}`, session_id: `session-${sequence}`, exercise_id: exerciseId, skipped: false,
    planned: {
      sets: Array.from({ length: SETS }, (_, index) => ({ setIndex: index + 1, targetReps: prescription.reps, suggestedWeight: prescription.weight, restSeconds: 120 })),
      decisionTrace: { prescriptionContext: prescription.prescriptionContext },
    },
    performed: { sets: reps.map((count, index) => ({ setIndex: index + 1, weight: step.logWeight ?? prescription.weight, reps: count, ...(rpe == null ? {} : { rpe }), completedAt: `${day}T10:${10 + index}:00Z` })) },
    autoregulation_adjustments: step.adjusted ? { weight: { from: prescription.weight, to: step.logWeight } } : null,
    training_sessions: { started_at: `${day}T10:00:00Z`, ended_at: `${day}T11:00:00Z` },
  };
}

function text(exerciseId: string, reps: number, weight: number): string {
  const exercise = ex(exerciseId);
  return `${SETS}×${reps} @${formatWeight(weight, exercise).replace(/(\d)kg$/, '$1')}`;
}

/** Prescribe, then perform, each step in order; every prescription reads the history so far. */
function simulate(exerciseId: string, steps: Step[], options: { baseline?: number; dual?: boolean } = {}): Row[] {
  const exercise = ex(exerciseId);
  const items: PerformanceHistoryItem[] = [];
  const rows: Row[] = [];
  steps.forEach((step, sequence) => {
    const exposure = step.role ? exposureFor(exerciseId, step.role, options.dual === true) : undefined;
    const priority = step.accessory ? 'accessory' as const : 'primary' as const;
    const repRange = step.role ? range(step.role) : getRepRange(priority, GOALS);
    const plannedReps = step.role ? EXPOSURE_ROLE_POLICY[step.role].targetReps : repRange[1];
    const prescription = suggestPrescription({ exercise, plannedReps, priority, plannedSetCount: SETS, goalWeights: GOALS, repRange,
      userState: state(exerciseId, items, options.baseline), ...(exposure ? { exposure } : {}) });
    const label = step.label ?? (step.role === 'strength' ? 'Mon' : step.role === 'hypertrophy' ? 'Wed' : `#${sequence + 1}`);
    rows.push({ label, reps: prescription.reps, weight: prescription.weight, text: `${label} ${text(exerciseId, prescription.reps, prescription.weight)}`, prescription });
    if (!step.skip) items.push(record(exerciseId, sequence, prescription, step));
  });
  return rows;
}

const printed: Record<string, string> = {};
const print = (name: string, rows: Row[]) => { printed[name] = rows.map((row) => row.text).join(' → '); return rows.map((row) => row.text); };
const BENCH = 'barbell_bench_press';
const alternate = (count: number, extra: Partial<Step> = {}): Step[] => Array.from({ length: count }, (_, i) => ({ role: i % 2 === 0 ? 'strength' : 'hypertrophy', ...extra }));

describe('N-0074 policy constants (named once, cited in ROUTINE_AUDIT.md)', () => {
  it('uses the approved defaults', () => {
    expect([BENCHMARK_WINDOW_SESSIONS, FOLLOWER_MISS_STREAK, FOLLOWER_STEP_DOWN, HISTORY_SESSIONS_PER_EXERCISE, ADDED_BW_RESTART_OFFSET]).toEqual([3, 2, 1, 6, 2]);
    expect(UNLOGGED_RPE_RIR).toEqual({ targetsMet: 2, targetMissed: 0 });
  });
  it('restarts at the Epley-equivalent reps clamped to [min, max - 1]', () => {
    expect(epleyRestartReps(90, 6, 95, range('strength'))).toBe(4);
    expect(epleyRestartReps(100, 6, 102.5, range('strength'))).toBe(5);
    expect(epleyRestartReps(50, 12, 52.5, getRepRange('accessory', GOALS))).toBe(10);
    expect(epleyRestartReps(20, 6, 40, range('strength'))).toBe(range('strength')[0]);
  });
});

describe('N-0074 acceptance simulations', () => {
  const baseline = OPERATOR_BASELINES.barbell_bench_press;

  it('S1 bench benchmark + follower, every set completed at RPE 8: the follower never drops when the benchmark adds load', () => {
    const rows = simulate(BENCH, alternate(10), { baseline, dual: true });
    expect(print('S1', rows)).toEqual([
      'Mon 4×5 @97.5', 'Wed 4×8 @90', 'Mon 4×6 @97.5', 'Wed 4×8 @92.5', 'Mon 4×5 @100',
      'Wed 4×8 @92.5', 'Mon 4×6 @100', 'Wed 4×8 @95', 'Mon 4×5 @102.5', 'Wed 4×8 @95',
    ]);
    const followers = rows.filter((row) => row.label === 'Wed');
    followers.forEach((row, i) => { if (i) expect(row.weight).toBeGreaterThanOrEqual(followers[i - 1].weight); });
    expect(rows[1].prescription.loadFollows).toBe('Weight follows your Monday Barbell Bench Press sets.');
    expect(rows[3].prescription.progression?.action).toBe('follow_benchmark');
    expect(rows[3].prescription.prescriptionContext).toEqual({ policyVersion: DOUBLE_PROGRESSION_POLICY_VERSION, repRange: range('hypertrophy'), exposure: 'hypertrophy' });
    expect(rows[2].prescription.prescriptionContext).toEqual({ policyVersion: DOUBLE_PROGRESSION_POLICY_VERSION, repRange: range('strength'), exposure: 'strength' });
  });

  it('S2 same with RPE not logged: identical to S1', () => {
    const rows = simulate(BENCH, alternate(10, { rpe: null }), { baseline, dual: true });
    print('S2', rows);
    expect(printed.S2).toBe(simulate(BENCH, alternate(10), { baseline, dual: true }).map((row) => row.text).join(' → '));
  });

  it('S3a follower misses twice: next follower is one step lighter until a follower session is completed; benchmark unaffected', () => {
    const miss = { reps: () => [8, 8, 7, 6] };
    const rows = simulate(BENCH, [
      { role: 'strength' }, { role: 'hypertrophy' }, { role: 'strength' },
      { role: 'hypertrophy', ...miss }, { role: 'hypertrophy', ...miss, label: 'Wed (Mon skipped)' },
      { role: 'hypertrophy', ...miss, label: 'Wed (Mon skipped)' }, { role: 'hypertrophy', label: 'Wed (Mon skipped)' },
      { role: 'hypertrophy', label: 'Wed (Mon skipped)' }, { role: 'strength' },
    ], { baseline, dual: true });
    expect(print('S3a', rows)).toEqual([
      'Mon 4×5 @97.5', 'Wed 4×8 @90', 'Mon 4×6 @97.5', 'Wed 4×8 @92.5', 'Wed (Mon skipped) 4×8 @92.5',
      'Wed (Mon skipped) 4×8 @90', 'Wed (Mon skipped) 4×8 @90', 'Wed (Mon skipped) 4×8 @92.5', 'Mon 4×5 @100',
    ]);
  });

  it('S3a with the benchmark progressing: the held follower stays one step below the derived load', () => {
    const miss = { reps: () => [8, 8, 7, 6] };
    const rows = simulate(BENCH, [
      { role: 'strength' }, { role: 'hypertrophy' }, { role: 'strength' }, { role: 'hypertrophy', ...miss },
      { role: 'strength' }, { role: 'hypertrophy', ...miss }, { role: 'strength' }, { role: 'hypertrophy' }, { role: 'strength' }, { role: 'hypertrophy' },
    ], { baseline, dual: true });
    expect(print('S3a-progressing', rows)).toEqual([
      'Mon 4×5 @97.5', 'Wed 4×8 @90', 'Mon 4×6 @97.5', 'Wed 4×8 @92.5', 'Mon 4×5 @100',
      'Wed 4×8 @92.5', 'Mon 4×6 @100', 'Wed 4×8 @92.5', 'Mon 4×5 @102.5', 'Wed 4×8 @95',
    ]);
  });

  it('S3b benchmark misses twice: existing deload rule; follower re-derives from the benchmark window', () => {
    const miss = { reps: () => [5, 5, 4, 4] };
    const rows = simulate(BENCH, [
      { role: 'strength' }, { role: 'hypertrophy' }, { role: 'strength' }, { role: 'hypertrophy' },
      { role: 'strength', ...miss }, { role: 'hypertrophy' }, { role: 'strength', ...miss }, { role: 'hypertrophy' }, { role: 'strength' }, { role: 'hypertrophy' },
    ], { baseline, dual: true });
    expect(print('S3b', rows)).toEqual([
      'Mon 4×5 @97.5', 'Wed 4×8 @90', 'Mon 4×6 @97.5', 'Wed 4×8 @92.5', 'Mon 4×5 @100',
      'Wed 4×8 @92.5', 'Mon 4×5 @100', 'Wed 4×8 @92.5', 'Mon 4×3 @90', 'Wed 4×8 @92.5',
    ]);
    expect(rows[8].prescription.progression?.action).toBe('deload');
    // Logged RPE 8 on the missed sets still counts two in reserve (A2), so the window keeps 100 x 5 -> 92.5.
    expect(rows[9].prescription.progression?.action).toBe('follow_benchmark');
  });

  it('S4 first week uses the baseline exactly as before; a skipped benchmark week keeps the last benchmark window', () => {
    const first = simulate(BENCH, [{ role: 'strength' }, { role: 'hypertrophy', skip: true }], { baseline, dual: true });
    const followerFirst = simulate(BENCH, [{ role: 'hypertrophy' }], { baseline, dual: true });
    expect(print('S4-first-week', [first[0], followerFirst[0]])).toEqual(['Mon 4×5 @97.5', 'Wed 4×8 @90']);
    // Same loads as the pre-N-0074 week (evidence weekly-policy-v5-20261105.md: Bench 4x5 @97.5 S, 4x8 @90 H).
    const skipped = simulate(BENCH, [{ role: 'strength' }, { role: 'hypertrophy' }, { role: 'hypertrophy', label: 'Wed (Mon skipped)' }], { baseline, dual: true });
    expect(print('S4-skipped', skipped)).toEqual(['Mon 4×5 @97.5', 'Wed 4×8 @90', 'Wed (Mon skipped) 4×8 @90']);
  });

  it('S5 squat single exposure, all completed, 5 kg step', () => {
    const rows = simulate('squat', Array.from({ length: 6 }, () => ({ role: 'strength' as const })), { baseline: OPERATOR_BASELINES.squat });
    expect(print('S5', rows).map((row) => row.replace('Mon ', ''))).toEqual(['4×5 @90', '4×6 @90', '4×4 @95', '4×5 @95', '4×6 @95', '4×4 @100']);
  });

  it('S6 pull-ups hypertrophy exposure from 0 kg, all completed', () => {
    const rows = simulate('pull_ups', Array.from({ length: 9 }, () => ({ role: 'hypertrophy' as const })));
    expect(print('S6', rows).map((row) => row.replace('Wed ', ''))).toEqual([
      '4×8 @Bodyweight', '4×9 @Bodyweight', '4×10 @Bodyweight', '4×11 @Bodyweight', '4×12 @Bodyweight',
      '4×10 @BW + 2.5 kg', '4×11 @BW + 2.5 kg', '4×12 @BW + 2.5 kg', '4×10 @BW + 5 kg',
    ]);
    expect(rows[5].prescription.progression?.action).toBe('add_weight');
    expect(rows.every((row) => !row.prescription.loadFollows)).toBe(true);
  });

  it('S6b lat pulldown accessory 4×12 @50 restarts at the Epley-equivalent reps, not the range minimum', () => {
    const accessory = getRepRange('accessory', GOALS);
    expect(accessory[1]).toBe(12);
    const exercise = ex('lat_pulldown');
    const item = record('lat_pulldown', 0, { reps: accessory[1], weight: 50, prescriptionContext: { policyVersion: DOUBLE_PROGRESSION_POLICY_VERSION, repRange: accessory } }, {});
    const next = suggestPrescription({ exercise, plannedReps: accessory[1], priority: 'accessory', plannedSetCount: SETS, goalWeights: GOALS, repRange: accessory, userState: state('lat_pulldown', [item]) });
    printed.S6b = `4×12 @50 → 4×${next.reps} @${next.weight}`;
    expect([next.reps, next.weight]).toEqual([10, 52.5]);
    expect(next.reps).toBeGreaterThan(accessory[0]);
  });

  it.each([false, true])('S7 pull-ups logged at +10 kg against a 0 kg prescription use the +10 kg evidence (adjusted=%s)', (adjusted) => {
    const rows = simulate('pull_ups', [
      { role: 'hypertrophy', reps: () => [12, 12, 12, 12], logWeight: 10, adjusted, label: 'logged' },
      { role: 'hypertrophy', label: 'next' }, { role: 'hypertrophy', label: 'after' },
    ]);
    print(`S7-adjusted-${adjusted}`, rows);
    expect(rows[0].weight).toBe(0);
    expect([rows[1].reps, rows[1].weight]).toEqual([8, 10]);
    expect(rows[1].weight).toBeGreaterThan(0);
    expect(rows[2].weight).toBe(10);
  });
});

describe('N-0074 A2 RIR-aware Epley', () => {
  it('counts RIR from logged RPE, or from met / missed targets when RPE is absent', () => {
    const context = { policyVersion: DOUBLE_PROGRESSION_POLICY_VERSION, repRange: range('strength') as [number, number] };
    const planned = [1, 2, 3, 4].map((setIndex) => ({ setIndex, targetReps: 5, suggestedWeight: 100 }));
    const performed = (reps: number[], rpe?: number) => reps.map((count, i) => ({ setIndex: i + 1, weight: 100, reps: count, completedAt: 'x', ...(rpe ? { rpe } : {}) }));
    const e = (reps: number[], rpe?: number) => rirAwareE1RM({ sets: performed(reps, rpe), prescription: { sets: planned, context, adjusted: false } });
    expect(e([5, 5, 5, 5], 8)).toBeCloseTo(100 * (1 + 7 / 30));
    expect(e([5, 5, 5, 5])).toBeCloseTo(100 * (1 + 7 / 30));
    expect(e([5, 5, 5, 4])).toBeCloseTo(100 * (1 + 5 / 30));
    expect(e([5, 5, 5, 5], 10)).toBeCloseTo(100 * (1 + 5 / 30));
  });
});

describe('N-0074 A3 display strings', () => {
  it('shows Bodyweight at 0 and BW + N kg above 0 from the load profile, external loads unchanged', () => {
    const pull = ex('pull_ups');
    expect(formatPlannedSetSummary(pull, { targetReps: 8, suggestedWeight: 0 })).toBe('Bodyweight · 8 reps');
    expect(formatPlannedSetSummary(pull, { targetReps: 10, suggestedWeight: 2.5 })).toBe('BW + 2.5 kg · 10 reps');
    expect(formatWeight(5, pull)).toBe('BW + 5 kg');
    expect(formatWeightReps(10, 12, ex('weighted_pull_ups'))).toBe('BW + 10 kg × 12');
    expect(formatWeight(0, ex('tricep_dips'))).toBe('Bodyweight');
    expect(formatWeight(97.5, ex(BENCH))).toBe('97.5kg');
    expect(formatPlannedSetSummary(ex('push_ups'), { targetReps: 12, suggestedWeight: 0 })).toBe('Bodyweight · 12 reps');
  });
});

describe('N-0074 S8 historical replay', () => {
  it('v1 replay ignores declared exposures and stays byte-identical', () => {
    const exercise = ex(BENCH);
    const items = [record(BENCH, 0, { reps: 5, weight: 97.5, prescriptionContext: { policyVersion: DOUBLE_PROGRESSION_POLICY_VERSION, repRange: range('strength'), exposure: 'strength' } }, {})];
    const userState: UserState = { ...state(BENCH, items, baseline()), prescriptionPolicy: 'v1' };
    const input = { exercise, plannedReps: 8, priority: 'primary' as const, plannedSetCount: SETS, goalWeights: GOALS, repRange: range('hypertrophy'), userState };
    expect(JSON.stringify(suggestPrescription({ ...input, exposure: exposureFor(BENCH, 'hypertrophy', true) }))).toBe(JSON.stringify(suggestPrescription(input)));
  });
  function baseline() { return OPERATOR_BASELINES.barbell_bench_press; }
});

describe('N-0074 end to end through the saved v5 programme and the R05 validator', () => {
  it('records exposure roles, shows the follower copy and validates the follower load', () => {
    const plan = operatorPlan(5);
    const profile = { ...operatorSnapshot(), baselineUpdatedAt: { [BENCH]: BASELINE_AT } };
    const week = programmeWeekProposal(plan, 1, profile);
    const holding = (exposure: ExposureRole) => [...week].find(([, session]) => session.exercises.some((item) => item.exerciseId === BENCH && item.decisionTrace.prescriptionContext?.exposure === exposure));
    const [mondayKey, monday] = holding('strength')!;
    const [, wednesday] = holding('hypertrophy')!;
    const follower = wednesday.exercises.find((item) => item.exerciseId === BENCH)!;
    expect(follower.decisionTrace.loadFollows).toBe(`Weight follows your Monday ${ex(BENCH).name} sets.`);
    expect(mondayKey).toBe(1);
    // Perform Monday exactly as prescribed, through the materialized frozen item shape.
    const frozen = materializePlannedSessionItems('mon-1', monday).find((item) => item.exerciseId === BENCH)!;
    const item: PerformanceHistoryItem = { id: frozen.id, session_id: 'mon-1', exercise_id: BENCH, skipped: false, planned: frozen.planned,
      performed: { sets: frozen.planned.sets.map((set) => ({ setIndex: set.setIndex, weight: set.suggestedWeight, reps: set.targetReps, rpe: 8, completedAt: '2026-11-09T10:30:00Z' })) },
      training_sessions: { started_at: '2026-11-09T10:00:00Z', ended_at: '2026-11-09T11:00:00Z' } };
    const recent = completedPerformanceHistory([item], HISTORY_SESSIONS_PER_EXERCISE);
    const withHistory = { ...profile, performanceHistory: { source: PERFORMANCE_HISTORY_SOURCE, status: 'available' as const, requestedExerciseIds: [BENCH] },
      lastSessionPerformance: { [BENCH]: recent[BENCH][0] }, recentSessionPerformance: recent };
    const next = programmeWeekProposal(plan, 1, withHistory);
    const find = (exposure: ExposureRole): SessionPlan => [...next.values()].find((session) => session.exercises.some((entry) => entry.exerciseId === BENCH && entry.decisionTrace.prescriptionContext?.exposure === exposure))!;
    const sets = (session: SessionPlan) => session.exercises.find((entry) => entry.exerciseId === BENCH)!.plannedSets.map((set) => [set.targetReps, set.suggestedWeight]);
    expect(sets(find('strength'))[0]).toEqual([6, 97.5]);
    expect(sets(find('hypertrophy'))[0]).toEqual([8, 90]);
    const validation = find('hypertrophy').weeklyValidation!;
    expect(validation.issues.filter((issue) => issue.severity === 'error')).toEqual([]);
    expect(validation.status).not.toBe('invalid');
  });
});

describe('N-0074 printed sequences', () => {
  it('prints S1-S7 for the evidence record', () => {
    // Runs last in this file; the sequences above populate `printed`.
    for (const [name, line] of Object.entries(printed)) console.log(`[N-0074] ${name}: ${line}`);
    expect(Object.keys(printed).length).toBeGreaterThan(0);
  });
});
