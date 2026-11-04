import { describe, expect, it } from 'vitest';
import catalogData from '../catalog/exercises.v1.json';
import { availableSplitPreferences, resolveSplitPreference, splitWeeklyStrategyId, UPPER_LOWER_TWO_DAY_NOTE } from '../splitPreference';
import { prepareTrainingSetup, type TrainingSetupDraft } from '../setupDraft';
import { buildFourWeekPlan } from '../programPlanner';
import { programmeWeekProposal } from '../programmeWeekProposal';
import { compileProgrammeWeek, defineWeeklyRequirements, isApprovedWeeklyStrategy, isBalancedDayStrategyId } from '../weeklyProgramme';
import { UPPER_LOWER_STRATEGY_ID } from '../weeklyProgrammePolicy';
import { validateTrainingProgramme, type ProgrammeWeekDeclaration } from '../weeklyProgrammeValidator';
import type { Exercise } from '../types';

const catalog = catalogData as Exercise[];
const equipment = [...new Set(catalog.flatMap((exercise) => [...exercise.equipment, ...(exercise.equipmentAll ?? []), ...(exercise.equipmentAny ?? [])]))];
const draft = (extra: Partial<TrainingSetupDraft> = {}): TrainingSetupDraft => ({
  goals: { build_muscle: 50, build_strength: 50, lose_fat: 0, get_fitter: 0 }, selectedWeekdays: [1, 4], equipment, constraints: [],
  baselines: { bench_press: 100, squat: 120, deadlift: 140, overhead_press: 60, row: 80 }, baselineReps: { bench_press: 5, squat: 5, deadlift: 5, overhead_press: 5, row: 5 },
  muscleFrequency: 'twice', experienceLevel: 'advanced', trainingMode: 'strength', includeSkillWork: false, ...extra,
});
function programme(extra: Partial<TrainingSetupDraft> = {}) {
  const setup = prepareTrainingSetup(draft(extra));
  return { setup, plan: buildFourWeekPlan(setup.profile, setup.selectedWeekdaysJs, new Date(2026, 10, 9)) };
}

describe('split preference options', () => {
  it('offers only shapes with an approved weekly policy, in strength mode', () => {
    expect(availableSplitPreferences(2, 'strength')).toEqual(['auto', 'full_body', 'upper_lower']);
    expect(availableSplitPreferences(3, 'strength')).toEqual(['auto', 'full_body']);
    expect(availableSplitPreferences(4, 'strength')).toEqual(['auto', 'upper_lower']);
    for (const days of [1, 5, 6, 7]) expect(availableSplitPreferences(days, 'strength')).toEqual(['auto']);
    for (const mode of ['hybrid', 'running']) expect(availableSplitPreferences(2, mode)).toEqual(['auto']);
    expect(resolveSplitPreference('upper_lower', 5, 'strength')).toBe('auto');
    expect(resolveSplitPreference('push_pull', 2, 'strength')).toBe('auto');
    expect(resolveSplitPreference('upper_lower', 2, 'hybrid')).toBe('auto');
    expect(splitWeeklyStrategyId('upper_lower', 2)).toBe(UPPER_LOWER_STRATEGY_ID);
    expect(splitWeeklyStrategyId('upper_lower', 4)).toBe('balanced-v1:4');
    expect(splitWeeklyStrategyId('full_body', 3)).toBe('balanced-v1:3');
    expect(splitWeeklyStrategyId('auto', 2)).toBeUndefined();
  });

  it('stores a non-Auto choice in the existing preferences JSON and nothing for Auto', () => {
    expect(prepareTrainingSetup(draft({ splitPreference: 'upper_lower' })).profileWrite.constraints?.preferences).toMatchObject({ splitPreference: 'upper_lower' });
    const auto = prepareTrainingSetup(draft({ splitPreference: 'auto' }));
    expect(auto.profileWrite.constraints?.preferences).not.toHaveProperty('splitPreference');
    expect(auto).toEqual(prepareTrainingSetup(draft()));
    // An unavailable choice is not stored.
    expect(prepareTrainingSetup(draft({ splitPreference: 'upper_lower', selectedWeekdays: [1, 2, 3, 4, 5] })).profileWrite.constraints?.preferences).not.toHaveProperty('splitPreference');
  });

  it('plain-language note says once a week with about the same weekly sets', () => {
    expect(UPPER_LOWER_TWO_DAY_NOTE).toMatch(/once a week/);
    expect(UPPER_LOWER_TWO_DAY_NOTE).toMatch(/about the same weekly sets/);
  });
});

describe('two-day Upper/Lower policy', () => {
  it('declares the literal Upper and Lower objectives', () => {
    const { setup } = programme({ splitPreference: 'upper_lower' });
    const rows = defineWeeklyRequirements(2, setup.snapshot, undefined, UPPER_LOWER_STRATEGY_ID).map((row) => [row.id, row.owner, row.positions]);
    expect(rows).toEqual([
      ['bench', 'pectorals', [[0, 0]]], ['row-heavy', 'lats', [[0, 1]]], ['ohp', 'anterior_deltoids', [[0, 2]]], ['pulldown', 'lats', [[0, 3]]],
      ['lateral', 'lateral_deltoids', [[0, 4]]], ['curl', 'biceps', [[0, 5]]], ['pushdown', 'triceps', [[0, 6]]],
      ['squat', 'quadriceps', [[1, 0]]], ['hingeHeavy', 'hamstrings', [[1, 1]]], ['quadFollow', 'quadriceps', [[1, 2]]], ['hingeFollow', 'hamstrings', [[1, 3]]], ['calf', 'calves', [[1, 4]]],
    ]);
    expect(isApprovedWeeklyStrategy(UPPER_LOWER_STRATEGY_ID, 2)).toBe(true);
    expect(isApprovedWeeklyStrategy(UPPER_LOWER_STRATEGY_ID, 3)).toBe(false);
    expect(isBalancedDayStrategyId('balanced-v1:twoUpper')).toBe(true);
    expect(isBalancedDayStrategyId('balanced-v1:twoLower')).toBe(true);
  });

  const mixes = [{ build_muscle: 100, build_strength: 0, lose_fat: 0, get_fitter: 0 }, { build_muscle: 0, build_strength: 100, lose_fat: 0, get_fitter: 0 },
    { build_muscle: 50, build_strength: 50, lose_fat: 0, get_fitter: 0 }, { build_muscle: 40, build_strength: 40, lose_fat: 10, get_fitter: 10 }];
  for (const goals of mixes) it(`compiles, passes R05 weeks 1-4 and honours caps (${JSON.stringify(goals)})`, () => {
    const { setup, plan } = programme({ splitPreference: 'upper_lower', goals });
    const compilation = plan.weeks[0].compilation!;
    expect(compilation.strategyId).toBe(UPPER_LOWER_STRATEGY_ID);
    expect(compilation.status).toBe('feasible');
    expect(Object.values(plan.weeks[0].days).map((day) => [day.label, day.template])).toEqual([['Upper Body', 'upper'], ['Lower Body', 'lower']]);
    for (const weekIndex of [1, 2, 3, 4]) {
      const proposals = programmeWeekProposal(plan, weekIndex, setup.snapshot);
      const ownerDays: Record<string, Set<number>> = {};
      for (const [day, session] of proposals) {
        expect(session.weeklyValidation!.issues.filter((issue) => issue.severity === 'error')).toEqual([]);
        expect(session.weeklyValidation!.strategyId).toBe(UPPER_LOWER_STRATEGY_ID);
        const slots = plan.weeks[weekIndex - 1].days[day].allocation!.slots;
        const owners: Record<string, number> = {};
        for (const item of session.exercises) {
          const owner = slots.find((slot) => slot.exerciseId === item.exerciseId)!.owner;
          owners[owner] = (owners[owner] ?? 0) + item.plannedSets.length;
          (ownerDays[owner] ??= new Set()).add(day);
          expect(item.plannedSets.length).toBeLessThanOrEqual(5);
        }
        for (const total of Object.values(owners)) expect(total).toBeLessThanOrEqual(10);
        expect(session.exercises.reduce((total, item) => total + item.plannedSets.length, 0)).toBeLessThanOrEqual(24);
        expect(session.estimatedDurationMinutes).toBeLessThanOrEqual(60);
      }
      // Each owner muscle is trained on exactly one day of the week.
      for (const days of Object.values(ownerDays)) expect(days.size).toBe(1);
    }
  });

  it('R05 accepts the strategy and still rejects an unapproved one', () => {
    const { setup, plan } = programme({ splitPreference: 'upper_lower' });
    const proposals = programmeWeekProposal(plan, 1, setup.snapshot);
    expect([...proposals.values()][0].weeklyValidation!.issues.some((issue) => issue.code === 'unsupported_strategy')).toBe(false);
    const calendar = Object.values(plan.weeks[0].days);
    const bogus = compileProgrammeWeek(calendar, setup.snapshot, { daysPerWeek: 2, strategyId: 'balanced-v1:2-push-pull' });
    expect(bogus.status).toBe('infeasible');
    expect(bogus.issues.some((issue) => issue.code === 'unsupported_weekly_strategy')).toBe(true);
    const declaration = { weekIndex: 1, policyVersion: plan.programme!.policyVersion, strategyId: 'balanced-v1:2-push-pull', policyStatus: 'accepted', requirements: [], exposurePolicies: {}, calendar, provenance: 'synthetic' } as ProgrammeWeekDeclaration;
    const result = validateTrainingProgramme({ declarations: [declaration], weeks: [{ weekIndex: 1, allocation: bogus, sessions: [] }], profile: setup.snapshot });
    expect(result.issues.some((issue) => issue.code === 'unsupported_strategy')).toBe(true);
  });
});

describe('Auto output is unchanged', () => {
  const strip = (plan: ReturnType<typeof programme>['plan']) => JSON.parse(JSON.stringify(plan.weeks));
  for (const days of [[1, 4], [1, 3, 5], [1, 2, 4, 5], [1, 2, 3, 4, 5], [1, 2, 3, 4, 5, 6]]) it(`${days.length} days: Auto equals no preference; unavailable choices fall back to Auto`, () => {
    const none = programme({ selectedWeekdays: days });
    expect(strip(programme({ selectedWeekdays: days, splitPreference: 'auto' }).plan)).toEqual(strip(none.plan));
    for (const preference of ['full_body', 'upper_lower'] as const) {
      if (availableSplitPreferences(days.length, 'strength').includes(preference)) continue;
      expect(strip(programme({ selectedWeekdays: days, splitPreference: preference }).plan)).toEqual(strip(none.plan));
    }
  });

  it('Full body on two or three days and Upper/Lower on four days select the existing balanced policy', () => {
    for (const [days, preference] of [[[1, 4], 'full_body'], [[1, 3, 5], 'full_body'], [[1, 2, 4, 5], 'upper_lower']] as const) {
      const auto = programme({ selectedWeekdays: [...days] });
      const chosen = programme({ selectedWeekdays: [...days], splitPreference: preference });
      expect(chosen.plan.weeks[0].compilation!.strategyId).toBe(`balanced-v1:${days.length}`);
      expect(strip(chosen.plan)).toEqual(strip(auto.plan));
    }
  });

  it('hybrid two-day keeps the existing D-P2-03 outcome', () => {
    const auto = programme({ trainingMode: 'hybrid' });
    const chosen = programme({ trainingMode: 'hybrid', splitPreference: 'upper_lower' });
    expect(strip(chosen.plan)).toEqual(strip(auto.plan));
    expect(chosen.plan.weeks[0].compilation!.issues.some((issue) => issue.code === 'hybrid_has_no_run')).toBe(true);
  });
});
