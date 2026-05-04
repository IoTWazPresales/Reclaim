import { describe, it, expect } from 'vitest';
import { buildSessionFromProgramDay, chooseExercise } from '../engine';
import { buildFourWeekPlan } from '../programPlanner';
import { TRAINING_PERF_SEED_EXERCISE_IDS } from '../trainingProgramPerformanceSeedIds';

const goals5050 = { build_muscle: 0.5, build_strength: 0.5, lose_fat: 0, get_fitter: 0 };

type PlannerProfile = Parameters<typeof buildFourWeekPlan>[0];

function mockProfile(equipment: string[], daysPerWeek: number): PlannerProfile {
  return {
    id: 'p',
    user_id: 'u',
    goals: goals5050,
    days_per_week: daysPerWeek,
    preferred_time_window: {},
    equipment_access: equipment,
    constraints: {},
    created_at: '',
    updated_at: '',
  };
}

const richEquipment = [
  'barbell',
  'rack',
  'bench',
  'dumbbells',
  'leg_press',
  'cable_machine',
  'pull_up_bar',
  'floor',
  'smith_machine',
];

describe('program quality (golden)', () => {
  it('seeds a reasonable set of exercise ids for performance batching', () => {
    expect(TRAINING_PERF_SEED_EXERCISE_IDS.length).toBeGreaterThanOrEqual(12);
    expect(TRAINING_PERF_SEED_EXERCISE_IDS).toContain('squat');
  });

  it('2-day plan uses full-body A/B with lower + upper patterns across the week', () => {
    const plan = buildFourWeekPlan(mockProfile(richEquipment, 2), [1, 3]);
    const d1 = plan.weeks[0].days[1];
    const d2 = plan.weeks[0].days[3];
    expect(d1.template).toBe('full_body');
    expect(d2.template).toBe('full_body');
    expect(d1.intents).toContain('knee_dominant');
    expect(d1.intents).toContain('horizontal_press');
    expect(d2.intents).toContain('carry');
    expect(d2.intents).toContain('vertical_press');
  });

  it('rich equipment: primary knee slot is bilateral / machine, not bulgarian split squat', () => {
    const plan = buildSessionFromProgramDay(
      {
        label: 'FB',
        intents: ['knee_dominant', 'hip_hinge', 'horizontal_press', 'vertical_pull', 'horizontal_pull', 'trunk_stability'],
        template_key: 'full_body',
      },
      {
        goals: goals5050,
        equipment_access: richEquipment,
        constraints: {},
        baselines: {},
      },
    );
    const knee = plan.exercises.find((e) => e.intents.includes('knee_dominant'));
    expect(knee).toBeTruthy();
    expect(knee!.exerciseId).not.toBe('bulgarian_split_squat');
    expect(knee!.exercise.unilateral).toBe(false);
    expect((knee!.decisionTrace.rankedAlternativeIds?.length ?? 0)).toBeGreaterThanOrEqual(3);
    expect(knee!.decisionTrace.selectionTags?.length).toBeGreaterThan(0);
  });

  it('dumbbell-only: still resolves knee and horizontal press without crashing', () => {
    const plan = buildSessionFromProgramDay(
      {
        label: 'FB',
        intents: ['knee_dominant', 'horizontal_press', 'vertical_pull'],
        template_key: 'full_body',
      },
      {
        goals: goals5050,
        equipment_access: ['dumbbells', 'bench', 'floor'],
        constraints: {},
        baselines: {},
      },
    );
    expect(plan.exercises.length).toBeGreaterThanOrEqual(3);
    expect(plan.exercises.some((e) => e.intents.includes('horizontal_press'))).toBe(true);
  });

  it('no rack: does not default bulgarian for main knee when goblet / press are feasible', () => {
    const plan = buildSessionFromProgramDay(
      {
        label: 'Legs',
        intents: ['knee_dominant', 'hip_hinge'],
        template_key: 'legs',
      },
      {
        goals: goals5050,
        equipment_access: ['dumbbells', 'kettlebells', 'bench', 'leg_press', 'floor'],
        constraints: {},
        baselines: {},
      },
    );
    const knee = plan.exercises.find((e) => e.intents.includes('knee_dominant'));
    expect(knee?.exerciseId).not.toBe('bulgarian_split_squat');
  });

  it('21s is not the default elbow flexion pick', () => {
    const plan = buildSessionFromProgramDay(
      {
        label: 'Arms',
        intents: ['elbow_flexion'],
        template_key: 'push',
      },
      {
        goals: goals5050,
        equipment_access: ['dumbbells', 'bench'],
        constraints: {},
        baselines: {},
      },
    );
    expect(plan.exercises[0]?.exerciseId).not.toBe('21s');
  });

  it('passes lastSessionPerformance into generation for loading context', () => {
    const plan = buildSessionFromProgramDay(
      {
        label: 'FB',
        intents: ['knee_dominant'],
        template_key: 'full_body',
      },
      {
        goals: goals5050,
        equipment_access: richEquipment,
        constraints: {},
        baselines: {},
        lastSessionPerformance: {
          squat: {
            exerciseId: 'squat',
            date: '2024-05-01T10:00:00.000Z',
            sets: [{ setIndex: 1, weight: 110, reps: 5, completedAt: '2024-05-01T10:00:00.000Z' }],
          },
        },
      },
    );
    const squat = plan.exercises.find((e) => e.exerciseId === 'squat');
    expect(squat).toBeTruthy();
    expect(squat!.plannedSets[0].suggestedWeight).toBeGreaterThan(60);
    expect(squat!.decisionTrace.progressionReason).toBeTruthy();
  });

  it('chooseExercise ranks overhead press above skill vertical_press hybrids when hints require vertical_press', () => {
    const ranked = chooseExercise({
      intent: 'vertical_press',
      constraints: {
        availableEquipment: richEquipment,
        injuries: [],
        forbiddenMovements: [],
        timeBudgetMinutes: 60,
      },
      userState: { experienceLevel: 'intermediate' },
      goalWeights: goals5050,
      alreadySelected: [],
      selectionHints: {
        template: 'upper',
        phase: 'required',
        requiredOrdinal: 0,
        usedCoreSubtypes: [],
      },
    });
    expect(ranked[0]?.id).not.toBe('handstand');
    expect(ranked[0]?.id).not.toBe('planche');
  });
});
