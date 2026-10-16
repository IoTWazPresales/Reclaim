import { afterAll, describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import catalog from '../catalog/exercises.v1.json';
import { prepareTrainingSetup, type TrainingSetupDraft } from '../setupDraft';
import { buildFourWeekPlan, generateProgramDays } from '../programPlanner';
import { programmeWeekProposal } from '../programmeWeekProposal';
import { assertStartableProgramme, buildProgramDaySession, materializePlannedSessionItems } from '../buildProgramDaySession';
import { frozenSessionProjection, programDayInput, weeklyProgrammeSummary } from '../programmeProjection';
import { completedPerformanceHistory, PERFORMANCE_HISTORY_SOURCE } from '../performanceHistory';
import { withTrainingPerformanceSeed } from '../trainingProgramPerformanceSeed';
import { deriveProgressionDecision, explainAppliedProgression, getExerciseById, suggestLoading } from '../engine';
import { recommendSessionAdjustment } from '../autoregulationOverlay';
import { getAdjustedSetParams } from '../sessionDerivedState';
import { buildNotificationWorkChain } from '../trainingSessionProgression';
import { prescribeReplacement, replacementCandidates } from '../exerciseSubstitution';
import { historyItem } from './fixtures/performanceHistory';
import type { TrainingSessionItemRow } from '../../api';
import oracle from '../../../../../docs/training/recovery/evidence/R10-requirements.json';
import historical from '../../../../../docs/training/recovery/evidence/R10-before-programmes.json';

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const equipment = ['barbell', 'dumbbells', 'bench', 'rack', 'floor', 'cable_machine', 'pull_up_bar', 'leg_press_machine', 'hack_squat_machine', 'chest_press_machine', 't_bar_row_machine', 'dip_station', 'ez_bar'];
export const draft: TrainingSetupDraft = {
  goals: { build_muscle: 50, build_strength: 50, lose_fat: 0, get_fitter: 0 },
  selectedWeekdays: [1, 2, 3, 4, 5], equipment, constraints: [],
  baselines: { bench_press: 80, squat: 100, deadlift: 120, overhead_press: 50, row: 70 },
  baselineReps: { bench_press: 8, squat: 5, deadlift: 5, overhead_press: 8, row: 8 },
  muscleFrequency: 'twice', experienceLevel: 'advanced', trainingMode: 'strength', includeSkillWork: false,
};
export function programme(extra: Partial<TrainingSetupDraft> = {}) {
  const setup = prepareTrainingSetup({ ...draft, ...extra });
  return { ...setup, plan: buildFourWeekPlan(setup.profile, setup.selectedWeekdaysJs, new Date(2026, 9, 12)) };
}

// Literal requirements from ROUTINE_AUDIT.md, Balanced week (2026-10-09).
// No defineWeeklyRequirements/policy-table import and no generated targets as oracle.
const majorSets = Object.fromEntries(Object.entries(oracle.balancedHalfMuscleHalfStrength.weekly).map(([n, requirement]) => [n, requirement.setsPerMajorOwner]));
const majorOwners = oracle.balancedHalfMuscleHalfStrength.majorOwners;
const region = (owner: string) => ({ upper_pectorals: 'pectorals', lower_pectorals: 'pectorals', gastrocnemius: 'calves', soleus: 'calves', upper_traps: 'traps' }[owner] ?? owner);
export function inspectBalanced(f: ReturnType<typeof programme>, weekIndex: number, proposals = programmeWeekProposal(f.plan, weekIndex, f.snapshot)) {
  const errors: string[] = [];
  const counts: Record<string, number> = {};
  const exposures: Record<string, Set<number>> = {};
  const week = f.plan.weeks.find(w => w.weekIndex === weekIndex)!;
  if (proposals.size !== f.selectedWeekdaysJs.length) errors.push('missing day');
  for (const day of f.selectedWeekdaysJs) {
    const session = proposals.get(day);
    if (!session || !session.exercises.length) { errors.push('empty workout'); continue; }
    const slots = week.days[day].allocation!.slots;
    if (session.exercises.length !== slots.length) errors.push('incomplete workout');
    if (session.exercises.reduce((n, e) => n + e.plannedSets.length, 0) > 24) errors.push('set budget');
    if (!(session.estimatedDurationMinutes > 0 && session.estimatedDurationMinutes <= 60)) errors.push('time budget');
    const seen = new Set<string>();
    for (const [index, item] of session.exercises.entries()) {
      if (seen.has(item.exerciseId)) errors.push('duplicate exercise');
      seen.add(item.exerciseId);
      const slot = slots[index];
      if (!slot || slot.exerciseId !== item.exerciseId) { errors.push('delivered identity'); continue; }
      // Allocation ownership is used only to locate delivered work, never its required quantity.
      const actual = catalog.find(e => e.id === item.exerciseId)!;
      const owner = region(actual.musclesPrimary[0]);
      if (owner !== region(slot.owner)) errors.push('owner mismatch');
      counts[owner] = (counts[owner] ?? 0) + item.plannedSets.length;
      (exposures[owner] ??= new Set()).add(day);
      const expectedSets = slot.dose === 'heavy' ? 4 : slot.dose === 'follow' ? 2 : 3;
      if (item.plannedSets.length !== expectedSets) errors.push('dose');
      const expectedReps = slot.dose === 'heavy' ? 7 : 12;
      const expectedRest = slot.dose === 'heavy' ? 135 : 55;
      for (const [i, set] of item.plannedSets.entries()) {
        if (set.setIndex !== i + 1 || set.targetReps !== expectedReps || set.restSeconds !== expectedRest) errors.push('prescription');
        if (!Number.isFinite(set.suggestedWeight) || set.suggestedWeight < 0) errors.push('load');
      }
      if (!item.decisionTrace.selectionReason) errors.push('explanation');
    }
  }
  for (const owner of majorOwners) {
    if (counts[owner] !== majorSets[f.selectedWeekdaysJs.length]) errors.push(`weekly ${owner}`);
    if (exposures[owner]?.size !== (f.selectedWeekdaysJs.length === 2 ? 1 : 2)) errors.push(`exposure ${owner}`);
  }
  for (const owner of oracle.balancedHalfMuscleHalfStrength.supportOwners) {
    if (counts[owner] !== undefined && ![3, 6].includes(counts[owner])) errors.push(`direct support ${owner}`);
  }
  if (f.selectedWeekdaysJs.length === 5) for (const [ordinal, day] of f.selectedWeekdaysJs.entries()) {
    const first = proposals.get(day)?.exercises[0];
    if (!first || region(catalog.find(e => e.id === first.exerciseId)!.musclesPrimary[0]) !== oracle.balancedHalfMuscleHalfStrength.requiredFirstOwnersByFiveDayOrdinal[ordinal]) errors.push('five-day coherence');
  }
  return { errors, counts };
}

const captures: unknown[] = [];
afterAll(() => {
  if (process.env.R10_CAPTURE) writeFileSync(process.env.R10_CAPTURE, JSON.stringify(captures, (key, value) => key === 'sessions' ? value.map(([day, s]: [number, ReturnType<typeof buildProgramDaySession>]) => ({
    day, template: s.template, estimatedMinutes: s.estimatedDurationMinutes,
    status: s.programmeValidation?.status, issueCodes: [...new Set(s.programmeValidation?.issues.map(i => i.code))],
    exercises: s.exercises.map(e => ({ id: e.exerciseId, sets: e.plannedSets, reason: e.decisionTrace.progressionReason ?? e.decisionTrace.selectionReason })),
  })) : value, 2));
});
describe('R10 independent whole-programme acceptance', () => {
  for (const n of [2, 3, 4, 5, 6]) for (const experienceLevel of ['beginner', 'advanced'] as const) it(`balanced ${n} days ${experienceLevel}: independent weekly requirements, weeks 1–4`, () => {
    const f = programme({ selectedWeekdays: Array.from({ length: n }, (_, i) => i + 1), experienceLevel });
    const firstWeekWork = [...programmeWeekProposal(f.plan, 1, f.snapshot)].map(([day, s]) => [day, s.exercises.map(e => [e.exerciseId, e.plannedSets])]);
    for (const week of [1, 2, 3, 4]) {
      const proposals = programmeWeekProposal(f.plan, week, f.snapshot);
      const check = inspectBalanced(f, week, proposals);
      expect(check.errors).toEqual([]);
      expect([...proposals].map(([day, s]) => [day, s.exercises.map(e => [e.exerciseId, e.plannedSets])])).toEqual(firstWeekWork);
      for (const plan of proposals.values()) expect(() => assertStartableProgramme(plan)).not.toThrow();
      if (experienceLevel === 'advanced') captures.push({ scenario: `balanced-${n}`, week, check, sessions: [...proposals] });
    }
  });

  it('retains known-bad Phase 1 empty, back-less pull and missing hybrid runs as rejected examples', () => {
    const bad = historical.scenarios;
    const needsStrengthReview = (plans: Array<{ exercises: Array<{ id: string }> }>) => plans.some(p => p.exercises.length === 0);
    const needsHybridReview = (days: Array<{ run: boolean }>) => !days.some(d => d.run);
    expect(needsStrengthReview(bad.bodyweight.plans)).toBe(true);
    const pull = bad.dumbbells.plans.find(p => p.label.startsWith('Pull'))!;
    expect(pull.exercises.some(e => catalog.find(c => c.id === e.id)?.musclesPrimary[0] === 'lats')).toBe(false);
    expect(needsHybridReview(bad.hybrid2.days)).toBe(true);
    expect(needsHybridReview(bad.hybrid3.days)).toBe(true);
  });

  it('original 46/46/8 five-day account has equal major dose and stable chest practice, not duplicate compounds in a day', () => {
    const f = programme({ goals: { build_muscle: 46, build_strength: 46, lose_fat: 8, get_fitter: 0 } });
    for (const week of [1, 2, 3, 4]) {
      const proposals = programmeWeekProposal(f.plan, week, f.snapshot);
      const totals: Record<string, number> = {};
      for (const [day, session] of proposals) for (const [i, item] of session.exercises.entries()) {
        const slot = f.plan.weeks[week - 1].days[day].allocation!.slots[i];
        totals[region(slot.owner)] = (totals[region(slot.owner)] ?? 0) + item.plannedSets.length;
        expect(item.plannedSets.length).toBeLessThanOrEqual(5);
      }
      expect(majorOwners.map(owner => totals[owner])).toEqual([10, 10, 10, 10]);
      const chest = [...proposals.values()].flatMap(s => s.exercises.filter(e => e.exerciseId === 'barbell_bench_press'));
      expect(chest).toHaveLength(2);
      expect(chest[0].plannedSets).toEqual(chest[1].plannedSets);
      captures.push({ scenario: 'original-five-day', week, totals, sessions: [...proposals] });
    }
  });

  it('rejects empty/incomplete delivered work and correlated lowered allocation plus work', () => {
    for (const damage of ['empty', 'missing', 'lowered', 'reps', 'time', 'load', 'owner'] as const) {
      const f = programme(); const proposals = programmeWeekProposal(f.plan, 1, f.snapshot); const session = proposals.get(1)!;
      if (damage === 'empty') session.exercises = [];
      if (damage === 'missing') session.exercises.pop();
      if (damage === 'lowered') { session.exercises[0].plannedSets.pop(); f.plan.weeks[0].days[1].allocation!.slots[0].setCount--; }
      if (damage === 'reps') session.exercises[0].plannedSets[0].targetReps = 1;
      if (damage === 'time') session.estimatedDurationMinutes = 61;
      if (damage === 'load') session.exercises[0].plannedSets[0].suggestedWeight = -1;
      if (damage === 'owner') { f.plan.weeks[0].days[1].allocation!.slots[0].owner = 'triceps'; f.plan.weeks[0].compilation!.requirements[0].owner = 'triceps'; }
      expect(inspectBalanced(f, 1, proposals).errors.length).toBeGreaterThan(0);
    }
  });

  for (const limited of [['floor'], ['dumbbells', 'bench', 'floor']]) it(`explicitly rejects infeasible ${limited.join('/')} weeks rather than starting incomplete work`, () => {
    const f = programme({ equipment: limited });
    for (const week of [1, 2, 3, 4]) {
      const proposals = programmeWeekProposal(f.plan, week, f.snapshot);
      for (const session of proposals.values()) {
        expect(session.programmeValidation?.status).toBe('infeasible');
        expect(session.programmeValidation?.issues.some(i => i.code === 'weekly_requirement_unmet')).toBe(true);
        expect(() => materializePlannedSessionItems('synthetic', session)).toThrow();
      }
      captures.push({ scenario: `infeasible-${limited.join('-')}`, week, sessions: [...proposals] });
    }
  });

  for (const restriction of ['injury', 'forbidden', 'disliked'] as const) it(`never delivers known ineligible chest work: ${restriction}`, () => {
    const f = programme();
    if (restriction === 'injury') f.snapshot.constraints!.injuries = ['shoulder_impingement'];
    if (restriction === 'forbidden') f.snapshot.constraints!.forbiddenMovements = ['horizontal_press'];
    if (restriction === 'disliked') f.snapshot.constraints!.preferences!.hatesExercises = ['barbell_bench_press'];
    // Generate against the restricted saved profile, not just an eligibility helper.
    f.plan = buildFourWeekPlan({ ...f.profile, ...f.snapshot } as typeof f.profile, f.selectedWeekdaysJs, new Date(2026, 9, 12));
    for (const week of [1, 2, 3, 4]) for (const session of programmeWeekProposal(f.plan, week, f.snapshot).values()) {
      expect(session.exercises.some(e => e.exerciseId === 'barbell_bench_press')).toBe(false);
      if (restriction === 'forbidden') expect(session.exercises.some(e => e.exercise.intents.includes('horizontal_press'))).toBe(false);
    }
  });

  for (const n of [2, 3, 4, 5, 6]) for (const trainingMode of ['running', 'hybrid'] as const) it(`${trainingMode} ${n} days preserves run semantics and explicit hybrid infeasibility`, () => {
    const f = programme({ trainingMode, selectedWeekdays: Array.from({ length: n }, (_, i) => i + 1) });
    for (const week of [1, 2, 3, 4]) {
      const savedWeek = f.plan.weeks[week - 1]; const proposals = programmeWeekProposal(f.plan, week, f.snapshot);
      if (trainingMode === 'hybrid' && n < 4) {
        for (const s of proposals.values()) expect(s.programmeValidation?.issues.some(i => i.code === 'hybrid_has_no_run')).toBe(true);
      } else {
        const runs = Object.values(savedWeek.days).filter(d => d.template === 'run' || d.scheduledRun);
        expect(runs.length).toBeGreaterThan(0);
        for (const day of runs) {
          if (day.scheduledRun) expect(['upper', 'push', 'pull'].includes(day.template)).toBe(true);
          if (trainingMode === 'running') {
            const run = proposals.get(day.weekday)!;
            expect(run.estimatedDurationMinutes).toBe(week < 3 ? 20 : 30);
            expect(run.exercises).toEqual([]);
          }
        }
      }
    }
  });

  it('save/rename/reorder preserves whole-week work and frozen sessions amid future history changes', () => {
    const f = programme(); const before = programmeWeekProposal(f.plan, 1, f.snapshot);
    const saved = clone(f.plan); saved.weeks.reverse();
    for (const row of generateProgramDays('synthetic', 'synthetic', saved, new Date(2026, 9, 12)).filter(r => r.week_index === 1)) {
      const renamed = buildProgramDaySession(programDayInput({ ...row, label: 'Renamed' }, saved), f.snapshot);
      expect(renamed.exercises).toEqual(before.get(row.day_index)!.exercises);
    }
    const frozen = materializePlannedSessionItems('synthetic', before.get(1)!);
    const rows: TrainingSessionItemRow[] = frozen.map(i => ({ id: i.id, session_id: 'synthetic', order_index: i.orderIndex, created_at: '2026-10-13T10:00:00Z', autoregulation_adjustments: null, exercise_id: i.exerciseId, planned: i.planned, performed: null, skipped: false }));
    const original = clone(rows);
    const history = completedPerformanceHistory([historyItem('barbell_bench_press', '2026-10-13', 12, 80)], 3);
    const seedInfo = { source: PERFORMANCE_HISTORY_SOURCE, status: 'available' as const, requestedExerciseIds: ['barbell_bench_press'] };
    const next = withTrainingPerformanceSeed(f.snapshot, { ...seedInfo, performanceHistory: seedInfo, recentSessionPerformance: history, lastSessionPerformance: { barbell_bench_press: history.barbell_bench_press[0] } });
    const future = programmeWeekProposal(saved, 2, next).get(1)!;
    const projection = frozenSessionProjection(future, rows);
    expect(projection.exercises.map(e => e.plannedSets)).toEqual(rows.map(r => r.planned!.sets));
    expect(weeklyProgrammeSummary([{ proposal: future, frozen: rows }, { proposal: programmeWeekProposal(saved, 2, next).get(2)! }])).toContain('Provisional future:');
    expect(rows).toEqual(original);
  });

});

describe('R10 programme evolution and effective work', () => {
  for (const goals of [
    { build_muscle: 100, build_strength: 0, lose_fat: 0, get_fitter: 0 },
    { build_muscle: 0, build_strength: 100, lose_fat: 0, get_fitter: 0 },
    { build_muscle: 0, build_strength: 0, lose_fat: 70, get_fitter: 30 },
  ]) for (const baselineReps of [1, 12]) it(`goal mix ${JSON.stringify(goals)} at entered ${baselineReps} reps preserves valid quantities without approving legacy targets`, () => {
    const f = programme({ goals, baselineReps: Object.fromEntries(Object.keys(draft.baselines).map(k => [k, baselineReps])) });
    for (const week of [1, 2, 3, 4]) for (const session of programmeWeekProposal(f.plan, week, f.snapshot).values()) {
      if (session.programmeValidation?.status === 'infeasible') expect(() => assertStartableProgramme(session)).toThrow();
      else {
        expect(session.exercises.length).toBeGreaterThan(0);
        for (const item of session.exercises) for (const set of item.plannedSets) {
          expect(Number.isInteger(set.targetReps) && set.targetReps > 0).toBe(true);
          expect(Number.isFinite(set.suggestedWeight) && set.suggestedWeight >= 0).toBe(true);
        }
      }
    }
    captures.push({ scenario: `goal-${JSON.stringify(goals)}-baseline-reps-${baselineReps}`, policyStatus: f.plan.weeks[0].compilation?.policyStatus });
  });
  it('qualified 80 kg achievement recommends 82.5 but retained ceiling applies 80 with explicit reason (D-P2-01 remains pending)', () => {
    const bench = getExerciseById('barbell_bench_press')!;
    const history = completedPerformanceHistory([historyItem(bench.id, '2026-10-13', 9, 80)], 3);
    const user = { experienceLevel: 'advanced' as const, estimated1RM: { [bench.id]: 104 }, recentSessionPerformance: history, lastSessionPerformance: { [bench.id]: history[bench.id][0] } };
    const recommendation = deriveProgressionDecision(bench, user, [5, 9]);
    expect(recommendation?.nextWeight).toBe(82.5);
    const weight = suggestLoading({ exercise: bench, userState: user, goalWeights: { build_muscle: 0.5, build_strength: 0.5, lose_fat: 0, get_fitter: 0 }, plannedReps: 9 });
    expect(weight).toBe(80);
    expect(explainAppliedProgression(bench, user, [5, 9], weight, 9)).toContain('your saved exercise baseline limits it');
    expect(explainAppliedProgression(bench, user, [5, 9], weight, 9)).toContain('82.5kg');
  });

  for (const status of ['missing', 'unavailable', 'partial', 'improving'] as const) it(`future weekly programme keeps ${status} history evidence truthful`, () => {
    const f = programme(); const before = clone(f.plan);
    const old = historyItem('barbell_bench_press', '2026-10-12', 6, 60);
    const latest = historyItem('barbell_bench_press', '2026-10-13', 7, 60);
    if (status === 'partial') latest.performed!.sets!.pop();
    const recent = completedPerformanceHistory([old, latest], 3);
    const info = { source: PERFORMANCE_HISTORY_SOURCE, status: status === 'missing' || status === 'unavailable' ? status : 'available' as const, requestedExerciseIds: ['barbell_bench_press'] };
    const snapshot = withTrainingPerformanceSeed(f.snapshot, { ...info, performanceHistory: info, recentSessionPerformance: recent, lastSessionPerformance: { barbell_bench_press: recent.barbell_bench_press[0] } });
    for (const week of [1, 2, 3, 4]) {
      const proposals = programmeWeekProposal(f.plan, week, snapshot);
      for (const session of proposals.values()) expect(session.userState.performanceHistory?.status).toBe(info.status);
      const decision = deriveProgressionDecision(getExerciseById('barbell_bench_press')!, [...proposals.values()][0].userState, [5, 9]);
      if (status === 'improving') expect(decision?.action).toBe('hold');
      else expect(decision).toBeNull();
    }
    expect(f.plan).toEqual(before);
  });

  it('100 → 95 adjustment agrees after reload on phone and guidance while original work stays frozen', () => {
    const f = programme(); const first = programmeWeekProposal(f.plan, 1, f.snapshot).get(1)!;
    const raw = materializePlannedSessionItems('synthetic', first)[0];
    const sets = [1, 2, 3].map(setIndex => ({ setIndex, targetReps: 8, suggestedWeight: 100, restSeconds: 90 }));
    const row: TrainingSessionItemRow = { id: raw.id, session_id: 'synthetic', order_index: 0, created_at: '2026-10-13T10:00:00Z', exercise_id: 'barbell_bench_press', planned: { ...raw.planned, sets }, skipped: false, performed: { sets: [{ setIndex: 1, weight: 100, reps: 8, rpe: 9, completedAt: '2026-10-13T10:00:00Z' }] }, autoregulation_adjustments: null };
    const original = clone(row); const next = sets[1];
    const outcome = recommendSessionAdjustment({ exerciseId: row.exercise_id, currentSetIndex: 1, currentSetRpe: 9, currentSetReps: 8, currentSetWeight: 100, suggestedWeight: 100, targetReps: 8, previousSets: [], plannedSets: sets }, next, getExerciseById(row.exercise_id));
    expect(outcome.status).toBe('applied');
    if (outcome.status !== 'applied') throw new Error(outcome.message);
    const reload = clone({ ...row, autoregulation_adjustments: { 2: { ...outcome.overlay, appliedAt: '2026-10-13T10:01:00Z' } } });
    expect(getAdjustedSetParams(reload, 2, {}).weight).toBe(95);
    expect(buildNotificationWorkChain([reload]).next?.suggestedWeight).toBe(95);
    expect(getAdjustedSetParams(reload, 3, {}).weight).toBe(100);
    expect(reload.planned).toEqual(original.planned); expect(reload.performed).toEqual(original.performed);
  });

  it('session-only substitution uses own units and leaves saved future weeks unchanged', () => {
    const f = programme(); const saved = clone(f.plan); const proposal = programmeWeekProposal(f.plan, 1, f.snapshot).get(1)!;
    const raw = materializePlannedSessionItems('synthetic', proposal)[0];
    const row: TrainingSessionItemRow = { id: raw.id, session_id: 'synthetic', order_index: 0, created_at: '2026-10-13T10:00:00Z', autoregulation_adjustments: null, exercise_id: raw.exerciseId, planned: raw.planned, performed: null, skipped: false };
    const replacement = getExerciseById('dumbbell_bench_press')!;
    expect(replacementCandidates(row, f.snapshot).some(e => e.id === replacement.id)).toBe(true);
    const planned = prescribeReplacement(row, replacement, f.snapshot);
    expect(planned.sets.every(s => s.suggestedWeight === 0)).toBe(true);
    expect(planned.decisionTrace.loadDisplayMode).toBe('per_dumbbell');
    expect(planned.decisionTrace.replacementScope).toBe('session');
    expect(f.plan).toEqual(saved);
    expect(programmeWeekProposal(f.plan, 2, f.snapshot).get(1)!.exercises[0].exerciseId).toBe(raw.exerciseId);
  });
});
