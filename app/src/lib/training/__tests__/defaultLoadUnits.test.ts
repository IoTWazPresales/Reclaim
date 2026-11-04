import { describe, expect, it, vi } from 'vitest';
import { buildSession, getExerciseById, suggestLoading } from '../engine';
import { anchoredWorkingKg } from '../anchorLoad';
import { getMinimumWeight } from '../progression';
import { getExerciseLoadingProfile } from '../exerciseLoadingProfile';
import * as loadingProfiles from '../exerciseLoadingProfile';
import { requiresLoadConfirmation } from '../loadConfirmation';
import { formatExercisePreviewLine, formatPlannedSetSummary } from '../loadDisplayFormat';
import { prepareTrainingSetup } from '../setupDraft';
import { dryRunTrainingGeneration } from '../preview';
import { buildFourWeekPlan, generateProgramDays } from '../programPlanner';
import { programmeWeekProposal } from '../programmeWeekProposal';
import { frozenSessionProjection, programDayInput } from '../programmeProjection';
import { buildProgramDaySession, materializePlannedSessionItems, plannedItemsForSession } from '../buildProgramDaySession';
import { prescribeReplacement } from '../exerciseSubstitution';
import { buildNotificationWorkChain } from '../trainingSessionProgression';
import { canonicalPerformance } from './fixtures/performanceHistory';
import type { TrainingSessionItemRow } from '../../api';
import type { Exercise, TrainingProfileSnapshot, UserState } from '../types';

const goals = { build_muscle: .4, build_strength: .4, lose_fat: .1, get_fitter: .1 };
const state: UserState = { experienceLevel: 'intermediate', estimated1RM: {}, prescriptionPolicy: 'v2' };
const ex = (id: string) => { const value = getExerciseById(id); if (!value) throw new Error(id); return value; };
const weight = (id: string, extra: Partial<UserState> = {}) => suggestLoading({ exercise: ex(id), plannedReps: 7, priority: 'primary', goalWeights: goals, userState: { ...state, ...extra } });
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

describe('default loads stay in their declared source unit (RA-016)', () => {
  it.each([
    ['barbell_bench_press', 'total_bar', 60],
    ['dumbbell_bench_press', 'per_dumbbell', 0],
    ['cable_row', 'cable_stack', 45],
    ['seated_calf_raise', 'machine_total', 0],
    ['farmer_walk', 'per_hand', 15],
    ['pull_ups', 'bodyweight', 0],
    ['lateral_raises', 'per_dumbbell', 0],
    ['dumbbell_curl', 'per_dumbbell', 0],
  ] as const)('%s keeps only an own-unit default', (id, unit, expected) => {
    expect(getExerciseLoadingProfile(ex(id)).loadDisplayMode).toBe(unit);
    expect(weight(id)).toBe(expected);
  });

  it.each(['beginner', 'intermediate', 'advanced'] as const)('never copies a bar default to DB or hand at %s', experienceLevel => {
    expect(weight('barbell_bench_press', { experienceLevel })).toBeGreaterThan(0);
    expect(weight('dumbbell_bench_press', { experienceLevel })).toBe(0);
    expect(weight('farmer_walk', { experienceLevel })).toBe(15);
    expect(weight('dumbbell_bench_press', { experienceLevel, estimated1RM: { barbell_bench_press: 200 } })).toBe(0);
    expect(anchoredWorkingKg(ex('dumbbell_bench_press'), { ...state, estimated1RM: { barbell_bench_press: 200 } }, 7, 60)).toBeNull();
  });

  it('retains the replacement exercise own baseline and correctly qualified own-unit history', () => {
    expect(weight('dumbbell_bench_press', { estimated1RM: { dumbbell_bench_press: 30, barbell_bench_press: 200 } })).toBe(23);
    const history = canonicalPerformance('dumbbell_bench_press', [1, 2, 3].map(setIndex => ({ setIndex, weight: 20, reps: 7, completedAt: '2026-10-31T10:00:00Z' })), '2026-10-31');
    expect(weight('dumbbell_bench_press', { lastSessionPerformance: { dumbbell_bench_press: history } })).toBe(18);
    expect(weight('dumbbell_bench_press', { lastSessionPerformance: { dumbbell_bench_press: { ...history, evidence: { ...history.evidence!, loadDisplayMode: 'total_bar' } } } })).toBe(0);
  });

  it('does not invent a generic minimum or blend in another unit', () => {
    const unknown = { ...ex('dumbbell_bench_press'), intents: ['unknown_intent'] } as unknown as Exercise;
    expect(suggestLoading({ exercise: unknown, userState: state, goalWeights: goals, plannedReps: 7 })).toBe(0);
    expect(getMinimumWeight(ex('shrugs'))).toBe(2.5); // DB display wins over its alternative bar equipment.
    expect(getMinimumWeight(ex('farmer_walk'))).toBe(0); // No generic hand floor.
    const thruster = ex('thruster');
    expect(weight('thruster')).toBeGreaterThan(0);
    expect(suggestLoading({ exercise: { ...thruster, equipment: ['machine'], equipmentAny: ['machine'], equipmentAll: [] }, userState: state, goalWeights: goals, plannedReps: 7 })).toBe(0);
  });

  it.each(['added_bodyweight', 'assisted_bodyweight'] as const)('does not treat an unspecified %s default as confirmed zero', mode => {
    const exercise = ex('pull_ups');
    const original = getExerciseLoadingProfile(exercise);
    const spy = vi.spyOn(loadingProfiles, 'getExerciseLoadingProfile').mockReturnValue({ ...original, loadDisplayMode: mode });
    try {
      expect(suggestLoading({ exercise, plannedReps: 7, userState: state, goalWeights: goals })).toBe(0);
      expect(requiresLoadConfirmation(exercise, 0, state)).toBe(true);
    } finally { spy.mockRestore(); }
  });

  it('generic required and small-muscle builds emit confirmation instead of a default number', () => {
    const plan = buildSession({ template: 'upper', goals, constraints: { availableEquipment: ['dumbbells', 'bench', 'floor'], injuries: [], forbiddenMovements: [], timeBudgetMinutes: 60 },
      userState: state, intentOverrides: ['horizontal_press', 'elbow_flexion'], prescriptionPolicy: 'v2' });
    const affected = plan.exercises.filter(item => getExerciseLoadingProfile(item.exercise).loadDisplayMode === 'per_dumbbell');
    expect(affected.length).toBeGreaterThan(0);
    for (const item of affected) {
      expect(item.plannedSets.every(set => set.suggestedWeight === 0 && set.loadRequiresConfirmation)).toBe(true);
      expect(plan.programmeValidation?.issues.some(issue => issue.code === 'load_requires_confirmation' && issue.exerciseId === item.exerciseId)).toBe(true);
      expect(formatExercisePreviewLine(item, item.exercise)).toContain('weight confirmation required');
      expect(formatExercisePreviewLine(item, item.exercise)).not.toMatch(/\d+\s*kg/);
    }
  });

  it('an unknown load never claims baseline/default loading when history is unavailable', () => {
    const plan = buildSession({ template: 'upper', goals, constraints: { availableEquipment: ['dumbbells', 'bench', 'floor'], injuries: [], forbiddenMovements: [], timeBudgetMinutes: 60 },
      userState: { ...state, performanceHistory: { source: 'training_session_items.performed.sets', status: 'unavailable', requestedExerciseIds: ['dumbbell_bench_press'] } },
      intentOverrides: ['horizontal_press'], prescriptionPolicy: 'v2' });
    const item = plan.exercises.find(value => value.exerciseId === 'dumbbell_bench_press')!;
    expect(item.decisionTrace.progressionReason).toContain('Performance history unavailable');
    expect(item.decisionTrace.progressionReason).toContain('no load has been prescribed');
    expect(item.decisionTrace.progressionReason).not.toContain('uses baseline/default');
  });

  it('substitution across bar, DB, stack and hand does not copy the source load', () => {
    const profile: TrainingProfileSnapshot = { goals, equipment_access: ['barbell', 'bench', 'dumbbells', 'cable', 'cable_machine', 'floor', 'rack'], baselines: {} };
    for (const [from, to, intent] of [['barbell_bench_press', 'dumbbell_bench_press', 'horizontal_press'], ['barbell_row', 'cable_row', 'horizontal_pull'], ['suitcase_carry', 'farmer_walk', 'carry']] as const) {
      const item: TrainingSessionItemRow = { id: 'synthetic', session_id: 'synthetic', order_index: 0, autoregulation_adjustments: null, created_at: '2026-11-01T00:00:00Z', exercise_id: from, skipped: false, performed: null, planned: { priority: 'primary', intents: [intent], decisionTrace: { intent: [intent] }, sets: [{ setIndex: 1, targetReps: 7, suggestedWeight: 60, restSeconds: 90 }] } };
      const before = clone(item);
      const replacement = prescribeReplacement(item, ex(to), profile);
      expect(replacement.sets[0]).toMatchObject({ suggestedWeight: 0, loadRequiresConfirmation: true });
      expect(item).toEqual(before);
    }
  });

  it('preview == saved == started allocation; old frozen DB kilograms are never recomputed', () => {
    const draft = { goals, selectedWeekdays: [1, 2, 3, 4, 5], equipment: ['barbell', 'rack', 'bench', 'dumbbells', 'cable_machine', 'floor', 'pull_up_bar'], constraints: [], baselines: {}, experienceLevel: 'intermediate' as const, trainingMode: 'strength' as const };
    const setup = prepareTrainingSetup(draft);
    const programme = buildFourWeekPlan(setup.profile, setup.selectedWeekdaysJs, new Date(2026, 10, 2));
    const saved = clone({ programme, profile: setup.programSnapshot });
    const days = generateProgramDays('synthetic', 'synthetic', saved.programme, new Date(2026, 10, 2));
    const row = days.find(day => day.week_index === 1 && day.day_index === 3)!;
    const preview = dryRunTrainingGeneration(draft, { targetWeekday: 3, weekIndex: 1 })!;
    const proposal = programmeWeekProposal(saved.programme, 1, saved.profile).get(3)!;
    const direct = buildProgramDaySession(programDayInput(row, saved.programme), saved.profile);
    expect(preview.exercises).toEqual(proposal.exercises);
    expect(direct.exercises).toEqual(proposal.exercises);
    // Policy v4 keeps barbell bench for both bench exposures; Wednesday's
    // per-dumbbell exercise with no own evidence is the lateral raise.
    const db = proposal.exercises.find(item => item.exerciseId === 'lateral_raises')!;
    expect(db.plannedSets[0]).toMatchObject({ suggestedWeight: 0, loadRequiresConfirmation: true });
    const started = clone(materializePlannedSessionItems('synthetic-start', proposal));
    expect(started.find(item => item.exerciseId === db.exerciseId)?.planned.sets).toEqual(db.plannedSets);
    const frozen = clone(started);
    const old = frozen.find(item => item.exerciseId === db.exerciseId)!;
    old.planned.sets = old.planned.sets.map(({ loadRequiresConfirmation: _flag, ...set }) => ({ ...set, suggestedWeight: 60 }));
    for (const input of [{ startedAt: '2026-10-30T10:00:00Z', notificationMode: 'normal' as const }, { startedAt: null, notificationMode: 'guided' as const }]) {
      expect(plannedItemsForSession({ ...input, frozenItems: frozen, rebuiltPlan: proposal, sessionId: 'synthetic-start' })).toBe(frozen);
      expect(old.planned.sets[0].suggestedWeight).toBe(60);
      expect(old.planned.sets[0].loadRequiresConfirmation).toBeUndefined();
    }
    const dbRows: TrainingSessionItemRow[] = frozen.map(item => ({ ...item, exercise_id: item.exerciseId, session_id: 'synthetic-start', order_index: item.orderIndex, autoregulation_adjustments: null, skipped: false, created_at: '2026-11-01T00:00:00Z', planned: item.planned, performed: null }));
    const projection = frozenSessionProjection(proposal, dbRows);
    expect(projection.exercises.find(item => item.exerciseId === db.exerciseId)?.plannedSets[0].suggestedWeight).toBe(60);
  });

  it('marked carries display no zero kilogram while unmarked frozen rows keep their old display', () => {
    const carry = ex('farmer_walk');
    expect(formatPlannedSetSummary(carry, { targetReps: 20, suggestedWeight: 0, loadRequiresConfirmation: true })).toBe('~20 m / set · weight confirmation required');
    expect(formatPlannedSetSummary(carry, { targetReps: 20, suggestedWeight: 0 })).toContain('0 kg/hand');
  });

  it('guidance carries the new unknown marker until an actual load is supplied, without rewriting planned sets', () => {
    const item = { id: 'synthetic', session_id: 'synthetic', order_index: 0, autoregulation_adjustments: null,
      created_at: '2026-11-01T00:00:00Z', exercise_id: 'dumbbell_bench_press', skipped: false, performed: null,
      planned: { sets: [{ setIndex: 1, targetReps: 7, suggestedWeight: 0, restSeconds: 90, loadRequiresConfirmation: true }],
        priority: 'primary', intents: ['horizontal_press'] } } as TrainingSessionItemRow;
    expect(buildNotificationWorkChain([item]).next).toMatchObject({ suggestedWeight: 0, loadRequiresConfirmation: true });
    const supplied = { ...item, autoregulation_adjustments: { 1: { weightDelta: 20, repsDelta: 0, reason: 'Manual load', appliedAt: '2026-11-01T10:00:00Z' } } };
    expect(buildNotificationWorkChain([supplied]).next).toMatchObject({ suggestedWeight: 20 });
    expect(buildNotificationWorkChain([supplied]).next?.loadRequiresConfirmation).toBeUndefined();
    expect(item.planned.sets[0]).toMatchObject({ suggestedWeight: 0, loadRequiresConfirmation: true });
  });
});
