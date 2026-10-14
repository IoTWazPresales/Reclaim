import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { buildFourWeekPlan } from '../programPlanner';
import { buildProgramDaySession, materializePlannedSessionItems, plannedItemsForSession } from '../buildProgramDaySession';
import { compileProgrammeWeek, defineWeeklyRequirements } from '../weeklyProgramme';
import { BALANCED_WEEKLY_OBJECTIVES } from '../weeklyProgrammePolicy';
import { evaluateExerciseEligibility } from '../exerciseEligibility';
import type { TrainingProfileRow } from '../../api';
import type { TrainingProfileSnapshot } from '../types';

const goals = { build_muscle: 0.46, build_strength: 0.46, lose_fat: 0.08, get_fitter: 0 };
const richEquipment = ['barbell', 'dumbbells', 'bench', 'rack', 'floor', 'cable_machine', 'pull_up_bar', 'leg_press_machine', 'hack_squat_machine', 'chest_press_machine', 't_bar_row_machine', 'dip_station', 'ez_bar'];
const base: TrainingProfileSnapshot = { goals, equipment_access: richEquipment, baselines: { squat: 116.67, overhead_press: 93.33 }, experienceLevel: 'advanced', constraints: { injuries: [], forbiddenMovements: [], preferences: { muscle_frequency_preference: 'twice' } } };
const selected = (n: number) => Array.from({ length: n }, (_, index) => (index + 1) % 7);
const build = (snapshot: TrainingProfileSnapshot, n: number) => buildFourWeekPlan({ ...snapshot, constraints: { ...snapshot.constraints, trainingMode: snapshot.trainingMode } } as unknown as TrainingProfileRow, selected(n));
const sessions = (snapshot: TrainingProfileSnapshot, n: number) => {
  const plan = build(snapshot, n);
  return { plan, weeks: plan.weeks.map((week) => Object.values(week.days).map((day) => buildProgramDaySession({ label: day.label, template_key: day.template, intents: day.intents, allocation: day.allocation, weekIndex: week.weekIndex }, snapshot))) };
};
const projection = (session: ReturnType<typeof buildProgramDaySession>) => session.exercises.map((exercise) => ({ id: exercise.exerciseId, sets: exercise.plannedSets, trace: exercise.decisionTrace.constraintsApplied }));

describe('R04 declared weekly objectives constrain real planner sessions', () => {
  for (const n of [2, 3, 4, 5, 6]) {
    it(`${n} days preserve declared doses and trace sessions across weeks 1–4`, () => {
      const { plan, weeks } = sessions(base, n);
      const expected = defineWeeklyRequirements(n, base);
      for (const [index, week] of plan.weeks.entries()) {
        expect(week.compilation?.requirements).toEqual(expected);
        for (const requirement of expected) {
          const allocated = Object.values(week.days).flatMap((day) => day.allocation?.slots ?? []).filter((slot) => slot.requirementId === requirement.id);
          expect(allocated).toHaveLength(requirement.targetExposures);
          expect(allocated.reduce((total, slot) => total + slot.setCount, 0)).toBe(requirement.targetSets);
        }
        for (const [dayIndex, day] of Object.values(week.days).entries()) {
          const session = weeks[index][dayIndex];
          expect(session.weekIndex).toBe(index + 1);
          for (const slot of day.allocation!.slots.filter((slot) => slot.exerciseId)) {
            const item = session.exercises.find((exercise) => exercise.exerciseId === slot.exerciseId)!;
            expect(item.plannedSets).toHaveLength(slot.setCount);
            expect(item.decisionTrace.constraintsApplied).toContain(`weekly_requirement:${slot.requirementId}`);
            expect(evaluateExerciseEligibility(item.exercise, base, { selectionIntent: slot.intent, allowEnteredRackException: true }).eligible).toBe(true);
          }
          expect(projection(session)).toEqual(projection(weeks[0][dayIndex]));
        }
      }
    });
  }

  it('retains objectives when an entire calendar exposure day is absent', () => {
    const full = build(base, 5).weeks[0];
    const incomplete = Object.values(full.days).slice(0, 4);
    const result = compileProgrammeWeek(incomplete, base, { daysPerWeek: 5, strategyId: 'balanced-v1:5' });
    expect(result.requirements).toEqual(full.compilation!.requirements);
    expect(result.status).toBe('infeasible');
    expect(result.issues.some((issue) => issue.code === 'missing_exposure_day')).toBe(true);
    expect(result.issues.some((issue) => issue.code === 'weekly_requirement_unmet')).toBe(true);
  });

  it('keeps prescription unchanged for translations, duplicated labels and whitespace', () => {
    const week = build(base, 5).weeks[0];
    for (const day of Object.values(week.days)) {
      const args = { label: day.label, template_key: day.template, intents: day.intents, allocation: day.allocation };
      const expected = projection(buildProgramDaySession(args, base));
      for (const label of ['Entraînement', 'Same label', `${day.label}   `]) expect(projection(buildProgramDaySession({ ...args, label }, base))).toEqual(expected);
    }
  });

  it('applies all approved goal blends and injury constraints across 2–6 days', () => {
    for (const n of [2, 3, 4, 5, 6]) for (const goal of ['build_muscle', 'build_strength', 'lose_fat', 'get_fitter'] as const) {
      const input = { ...base, goals: { build_muscle: 0, build_strength: 0, lose_fat: 0, get_fitter: 0, [goal]: 1 }, constraints: { ...base.constraints, injuries: ['shoulder_impingement'], preferences: { ...base.constraints?.preferences, muscle_frequency_preference: 'twice' } } } as TrainingProfileSnapshot;
      const { plan, weeks } = sessions(input, n);
      expect(plan.weeks[0].compilation!.requirements).toEqual(defineWeeklyRequirements(n, input));
      for (const session of weeks.flat()) for (const exercise of session.exercises) expect(evaluateExerciseEligibility(exercise.exercise, input, { allowEnteredRackException: true, selectionIntent: exercise.decisionTrace.intent[0] }).eligible).toBe(true);
      for (const day of Object.values(plan.weeks[0].days)) {
        expect(day.allocation!.slots.reduce((total, slot) => total + slot.setCount, 0)).toBeLessThanOrEqual(24);
        expect(10 + day.allocation!.slots.reduce((total, slot) => total + (slot.compound ? 8 : 3), 0)).toBeLessThanOrEqual(60);
      }
    }
  });

  it('reports the phase-one five-day floor-only fixture without dropping objectives', () => {
    const floor = { ...base, equipment_access: ['floor'], baselines: {} };
    const { plan, weeks } = sessions(floor, 5);
    expect(plan.weeks[0].compilation!.requirements).toEqual(defineWeeklyRequirements(5, floor));
    expect(plan.weeks[0].compilation!.status).toBe('infeasible');
    expect(plan.weeks[0].compilation!.issues.some((issue) => issue.code === 'weekly_requirement_unmet')).toBe(true);
    expect(weeks.flat().every((session) => session.programmeValidation?.status === 'infeasible')).toBe(true);
  });

  it('uses available dumbbell alternatives and applies dislikes and forbidden movements', () => {
    const input = { ...base, baselines: {}, equipment_access: ['dumbbells', 'bench', 'floor'], constraints: { ...base.constraints, forbiddenMovements: ['vertical_press'], preferences: { ...base.constraints?.preferences, hatesExercises: ['dumbbell_bench_press'] } } } as TrainingProfileSnapshot;
    const { plan, weeks } = sessions(input, 5);
    const ids = weeks[0].flatMap((session) => session.exercises.map((exercise) => exercise.exerciseId));
    expect(ids).toContain('one_arm_row');
    expect(ids).not.toContain('dumbbell_bench_press');
    expect(weeks[0].flatMap((session) => session.exercises).every((exercise) => !exercise.exercise.intents.includes('vertical_press'))).toBe(true);
    expect(plan.weeks[0].compilation!.status).toBe('infeasible');
  });

  it('retains entered rack exception and exercise-specific load policy', () => {
    const input = { ...base, equipment_access: richEquipment.filter((token) => token !== 'rack') };
    const { weeks } = sessions(input, 5);
    const squat = weeks[0][1].exercises.find((item) => item.exerciseId === 'squat')!;
    const ohp = weeks[0][2].exercises.find((item) => item.exerciseId === 'overhead_press')!;
    expect(squat.decisionTrace.constraintsApplied.join(' ')).toContain('entered_rack_exception');
    expect(ohp.decisionTrace.constraintsApplied.join(' ')).toContain('entered_rack_exception');
    expect(squat.plannedSets[0].suggestedWeight).toBe(95);
    const unknown = weeks[0].flatMap((session) => session.exercises).find((item) => item.exerciseId === 'dumbbell_flyes')!;
    expect(unknown.plannedSets[0].suggestedWeight).toBe(0);
  });

  it('reports saved cap conflicts rather than trimming required exposures', () => {
    const day = build(base, 5).weeks[0].days[1];
    const allocation = structuredClone(day.allocation!);
    allocation.slots.forEach((slot) => { slot.setCount = 10; });
    const session = buildProgramDaySession({ label: day.label, template_key: day.template, intents: day.intents, allocation }, base);
    expect(session.programmeValidation!.issues.some((issue) => issue.code === 'allocation_budget_exceeded')).toBe(true);
    expect(session.exercises.reduce((total, item) => total + item.plannedSets.length, 0)).toBe(allocation.slots.length * 10);
  });

  for (const n of [2, 3, 4, 5, 6]) {
    it(`preserves accepted running/hybrid placement for ${n} days`, () => {
      const runResult = sessions({ ...base, trainingMode: 'running' }, n);
      const running = runResult.plan.weeks[0];
      for (const [weekIndex, weekSessions] of runResult.weeks.entries()) for (const session of weekSessions) {
        expect(session.exercises).toEqual([]);
        expect(session.programmeValidation?.status).toBe('feasible');
        expect(session.estimatedDurationMinutes).toBe(weekIndex < 2 ? 20 : 30);
      }
      expect(running.compilation!.runRequirement?.targetExposures).toBe(n);
      expect(Object.values(running.days).every((day) => day.template === 'run')).toBe(true);
      expect(running.compilation!.requirements).toEqual([]);
      const hybridResult = sessions({ ...base, trainingMode: 'hybrid' }, n);
      const hybrid = hybridResult.plan.weeks[0];
      expect(hybrid.compilation!.runRequirement?.targetExposures).toBeGreaterThan(0);
      if (n <= 3) expect(hybridResult.weeks.flat().every((session) => session.programmeValidation?.status === 'infeasible')).toBe(true);
      if (n <= 3) expect(hybrid.compilation!.issues.some((issue) => issue.code === 'hybrid_has_no_run')).toBe(true);
      else expect(Object.values(hybrid.days).some((day) => day.scheduledRun)).toBe(true);
    });
  }

  it('flags pending legacy policies without disabling accepted session generation', () => {
    for (const goal of ['lose_fat', 'get_fitter', 'build_muscle'] as const) {
      const input = { ...base, goals: { build_muscle: 0, build_strength: 0, lose_fat: 0, get_fitter: 0, [goal]: 1 }, constraints: { ...base.constraints, preferences: { muscle_frequency_preference: goal === 'build_muscle' ? 'once' : 'auto' } } } as TrainingProfileSnapshot;
      const { plan, weeks } = sessions(input, 5);
      expect(plan.weeks[0].compilation!.policyStatus).toBe('legacy_pending_review');
      expect(weeks[0].every((session) => session.exercises.length > 0)).toBe(true);
      expect(weeks[0].every((session) => session.programmeValidation?.status === 'legacy')).toBe(true);
    }
  });

  it('does not alias future weeks or alter persisted started/guided snapshots', () => {
    const { plan, weeks } = sessions(base, 5);
    const frozen = materializePlannedSessionItems('saved', weeks[0][0]);
    const before = JSON.stringify(frozen);
    plan.weeks[0].days[1].allocation!.slots[0].setCount = 99;
    expect(plan.weeks[1].days[1].allocation!.slots[0].setCount).not.toBe(99);
    for (const state of [{ startedAt: '2026-10-01', notificationMode: 'normal' as const }, { startedAt: null, notificationMode: 'guided' as const }]) expect(plannedItemsForSession({ ...state, frozenItems: frozen, rebuiltPlan: weeks[1][0], sessionId: 'saved' })).toBe(frozen);
    expect(JSON.stringify(frozen)).toBe(before);
  });

  it('fails closed for unsupported policy and unavailable materialized exercise', () => {
    const week = build(base, 5).weeks[0];
    const unknown = compileProgrammeWeek(Object.values(week.days), base, { daysPerWeek: 5, strategyId: 'balanced-v1:unknown' });
    expect(unknown.status).toBe('infeasible');
    const day = week.days[1];
    const allocation = structuredClone(day.allocation!);
    allocation.slots[0].exerciseId = 'missing';
    const session = buildProgramDaySession({ label: day.label, template_key: day.template, intents: day.intents, allocation }, base);
    expect(session.programmeValidation?.status).toBe('infeasible');
    expect(session.programmeValidation?.issues.some((issue) => issue.code === 'unavailable_slot')).toBe(true);
  });

  it('captures complete plans, diagnostic outcomes and objective policy hash when requested', () => {
    if (!process.env.R04_CAPTURE) return;
    const fixtures = [];
    for (const n of [2, 3, 4, 5, 6]) for (const mode of ['strength', 'running', 'hybrid'] as const) for (const equipment of [richEquipment, ['floor'], ['dumbbells', 'bench', 'floor']]) fixtures.push({ n, mode, equipment, ...sessions({ ...base, trainingMode: mode, equipment_access: equipment }, n) });
    writeFileSync(process.env.R04_CAPTURE, JSON.stringify({ policyHash: createHash('sha256').update(JSON.stringify(BALANCED_WEEKLY_OBJECTIVES)).digest('hex'), fixtures }, null, 2));
  });
});
