import { describe, expect, it } from 'vitest';
import { prepareTrainingSetup } from '../setupDraft';
import { capNewSession } from '../sessionCapPolicy';
import { buildSession, getExerciseById } from '../engine';
import { setsForSmallMuscle, weeklySmallMuscleSetTarget } from '../smallMuscleVolume';
import type { BuildSessionInput, PlannedExercise } from '../types';

const base: BuildSessionInput = { template: 'upper', goals: { build_muscle: 1 },
  constraints: { availableEquipment: ['dumbbells', 'bench', 'floor', 'pull_up_bar'], injuries: [], forbiddenMovements: [], timeBudgetMinutes: 60 },
  userState: { experienceLevel: 'intermediate' } };
const total = (p: ReturnType<typeof buildSession>) => p.exercises.reduce((n, ex) => n + ex.plannedSets.length, 0);
const item = (id: string, sets: number): PlannedExercise => ({ exerciseId: id, exercise: getExerciseById(id)!, orderIndex: 0,
  priority: 'isolation', intents: ['elbow_flexion'], plannedSets: Array.from({ length: sets }, (_, i) => ({ setIndex: i + 1, suggestedWeight: 10, targetReps: 12, restSeconds: 60 })),
  decisionTrace: { intent: ['elbow_flexion'], goalBias: base.goals, constraintsApplied: [], selectionReason: '', rankedAlternatives: [], confidence: 1 } });

describe('resolved v2 prescription contract', () => {
  it('limits one exercise and the combined owner dose and reports every withheld set', () => {
    const result = capNewSession([item('dumbbell_curl', 7), item('barbell_curl', 5), item('preacher_curl', 5)]);
    expect(result.exercises.map(ex => ex.plannedSets.length)).toEqual([5, 5]);
    expect(result.issues).toHaveLength(2);
    expect(result.issues.every(i => i.code === 'volume_cap_shortfall')).toBe(true);
  });
  it('combines heavy and follow-up chest work under one owner ceiling', () => {
    const heavy = { ...item('barbell_bench_press', 5), priority: 'primary' as const };
    const result = capNewSession([heavy, item('dumbbell_flyes', 5), item('cable_chest_flyes', 3)]);
    expect(result.exercises.map(ex => ex.plannedSets.length)).toEqual([5, 5]);
    expect(result.issues).toHaveLength(1);
  });
  it.each([[2, 1], [5, 3], [0, 1]])('retains eedb704 session cap %i with hard priority caps', (limit, primary) => {
    const plan = buildSession({ ...base, volumeCaps: { perPriority: { primary, accessory: 1, isolation: 1 }, perSessionTotal: limit } });
    expect(total(plan)).toBeLessThanOrEqual(limit);
    for (const role of ['primary', 'accessory', 'isolation'] as const) expect(plan.exercises.filter(ex => ex.priority === role).reduce((n, ex) => n + ex.plannedSets.length, 0)).toBeLessThanOrEqual(role === 'primary' ? primary : 1);
    expect(plan.programmeValidation!.issues.some(i => i.code === 'volume_cap_shortfall')).toBe(true);
  });
  it('ignores the old isolation default but keeps tighter explicit caps and session/time limits', () => {
    const legacy = buildSession({ ...base, prescriptionPolicy: 'v1' });
    expect(total(legacy)).toBe(29);
    const current = buildSession(base);
    expect(total(current)).toBeLessThanOrEqual(24);
    expect(current.estimatedDurationMinutes).toBeLessThanOrEqual(60);
    const tight = buildSession({ ...base, constraints: { ...base.constraints, timeBudgetMinutes: 25 } });
    expect(tight.estimatedDurationMinutes).toBeLessThanOrEqual(25);
    expect(tight.programmeValidation!.issues.some(i => i.code === 'volume_cap_shortfall')).toBe(true);
  });
  it('persists baseline edit time in existing JSON and leaves the entered value untouched', () => {
    const draft = { goals: { build_muscle: 1, build_strength: 0, lose_fat: 0, get_fitter: 0 }, selectedWeekdays: [1, 3, 5], equipment: ['barbell', 'bench'], constraints: [],
      baselines: { bench_press: 60 }, baselineReps: { bench_press: 8 }, baselineUpdatedAt: { barbell_bench_press: '2026-10-30T12:00:00Z' } };
    const original = structuredClone(draft);
    const result = prepareTrainingSetup(draft);
    expect(result.profileWrite.constraints.baselineUpdatedAt).toEqual(draft.baselineUpdatedAt);
    expect(result.programSnapshot.baselineUpdatedAt).toEqual(draft.baselineUpdatedAt);
    expect(result.snapshot.baselineInputs!.bench_press).toEqual({ weightKg: 60, reps: 8 });
    expect(draft).toEqual(original);
  });
  it('compound secondary biceps involvement does not reduce the direct curl requirement', () => {
    const plan = buildSession({ ...base, template: 'pull', goals: { build_muscle: 0.51, build_strength: 0.47, lose_fat: 0.02 },
      constraints: { ...base.constraints, availableEquipment: ['barbell', 'dumbbells', 'bench', 'rack', 'cable_machine', 'pull_up_bar'] } });
    const compound = plan.exercises.filter(ex => ex.exercise.musclesSecondary.includes('biceps'));
    expect(compound.length).toBeGreaterThan(0);
    const direct = plan.exercises.filter(ex => ex.exercise.musclesPrimary[0] === 'biceps' && ex.priority === 'isolation');
    expect(direct.reduce((n, ex) => n + ex.plannedSets.length, 0)).toBe(10);
  });
  it('frequency distributes the same direct weekly target and secondary involvement never earns prescription credit', () => {
    const curl = getExerciseById('dumbbell_curl')!;
    const weekly = weeklySmallMuscleSetTarget(base.goals, 'beginner')!;
    const dose = (frequency: number, secondary: string[]) => {
      let sum = 0;
      for (let day = 0; day < frequency; day++) {
        let direct = 0;
        for (let exercise = 0; exercise < 4; exercise++) direct += setsForSmallMuscle({ exercise: { ...curl, musclesSecondary: secondary }, priority: 'isolation', goalWeights: base.goals, experience: 'beginner', sessionsThisWeek: frequency, setsAlreadyThisSession: direct, isCompound: false }) ?? 0;
        sum += direct;
      }
      return sum;
    };
    expect(dose(1, [])).toBe(weekly);
    expect(dose(2, ['biceps', 'triceps'])).toBe(weekly);
    expect(dose(2, [])).toBe(weekly);
  });
});
