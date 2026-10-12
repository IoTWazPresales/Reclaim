import { describe, expect, it } from 'vitest';
import { buildProgramDaySession } from '../buildProgramDaySession';
import { buildSession } from '../engine';
import { computeWeeklyMuscleSessionCounts } from '../weeklyVolumeSummary';
import type { TrainingProfileSnapshot } from '../types';

const goals = {
  build_muscle: 0.46356603288982556,
  build_strength: 0.4613024870200167,
  lose_fat: 0.07513148009015778,
  get_fitter: 0,
};

const snapshot = {
  goals,
  equipment_access: [
    'barbell',
    'dumbbells',
    'bench',
    'cable_machine',
    'pull_up_bar',
    'leg_press_machine',
    'hack_squat_machine',
    'chest_press_machine',
    't_bar_row_machine',
    'dip_station',
    'trap_bar',
    'ez_bar',
    'smith_machine',
  ],
  experienceLevel: 'advanced',
  baselines: {
    barbell_bench_press: 122.5,
    barbell_row: 87.5,
    deadlift: 116.66666666666667,
    overhead_press: 93.33333333333334,
    squat: 116.66666666666667,
  },
  constraints: { injuries: [], forbiddenMovements: [] },
} as TrainingProfileSnapshot;

const week = [
  { label: 'Upper (Chest/Back)', template_key: 'upper' as const, intents: ['horizontal_press', 'horizontal_pull', 'shoulder_isolation', 'elbow_extension', 'elbow_flexion'] as const },
  { label: 'Lower (Squat)', template_key: 'lower' as const, intents: ['knee_dominant', 'hip_hinge'] as const },
  { label: 'Push (Chest/Shoulders)', template_key: 'push' as const, intents: ['horizontal_press', 'vertical_press', 'shoulder_isolation', 'elbow_extension'] as const },
  { label: 'Pull (Back/Arms)', template_key: 'pull' as const, intents: ['vertical_pull', 'horizontal_pull', 'elbow_flexion'] as const },
  { label: 'Lower (Deadlift)', template_key: 'lower' as const, intents: ['hip_hinge', 'knee_dominant'] as const },
];

describe('push day does not repeat a raise', () => {
  it('prints the saved week the phone builds', () => {
    const firstPass = week.map((day) =>
      buildProgramDaySession({ ...day, intents: [...day.intents], weekIndex: 1 }, snapshot),
    );
    const counts = computeWeeklyMuscleSessionCounts(firstPass);
    const used: string[] = [];
    const secondPass = week.map((day) => {
      const plan = buildProgramDaySession({ ...day, intents: [...day.intents], weekIndex: 1 }, snapshot, {
        weeklyMuscleSessionCounts: counts,
        avoidExerciseIds: [...used],
      });
      for (const item of plan.exercises) used.push(item.exerciseId);
      return plan;
    });
    const push = secondPass[2];
    const pushIds = push.exercises.map((item) => item.exercise.id);
    expect(new Set(pushIds).size).toBe(pushIds.length);
    expect(pushIds).toContain('overhead_press');
    expect(pushIds).not.toContain('dumbbell_shoulder_press');
    expect(pushIds).not.toContain('farmer_walk');
    expect(pushIds).not.toContain('barbell_curl');
    expect(pushIds).not.toContain('dumbbell_curl');
    expect(pushIds).not.toContain('dragon_flag');
    expect(push.exercises.length).toBeLessThanOrEqual(6);
    const press = push.exercises.find((item) => item.exerciseId === 'overhead_press');
    expect(press?.plannedSets[0]?.suggestedWeight).toBe(75);
    const fly = push.exercises.find((item) => item.exerciseId.includes('fly'));
    expect(fly?.plannedSets[0]?.suggestedWeight).toBe(0);
    for (const item of push.exercises) {
      expect(item.plannedSets.length).toBeLessThanOrEqual(5);
      if (item.exercise.id.startsWith('weighted_')) {
        expect(item.plannedSets[0]?.suggestedWeight).toBeGreaterThan(0);
      }
    }
  });

  it('writes lateral raises once and a different shoulder exercise second', () => {
    const session = buildSession({
      template: 'push',
      goals,
      constraints: {
        availableEquipment: [
          'barbell',
          'dumbbells',
          'bench',
          'cable_machine',
          'pull_up_bar',
          'leg_press_machine',
          'hack_squat_machine',
          'chest_press_machine',
          't_bar_row_machine',
          'dip_station',
          'trap_bar',
          'ez_bar',
          'smith_machine',
        ],
        injuries: [],
        forbiddenMovements: [],
        timeBudgetMinutes: 60,
      },
      userState: {
        experienceLevel: 'advanced',
        estimated1RM: {
          barbell_bench_press: 122.5,
          overhead_press: 93.3,
        },
      },
      intentOverrides: ['horizontal_press', 'vertical_press', 'shoulder_isolation', 'elbow_extension'],
      weeklyMuscleSessionCounts: { lateral_deltoids: 2, triceps: 2, pectorals: 2 },
    });

    const ids = session.exercises.map((item) => item.exercise.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter((id) => id === 'lateral_raises')).toHaveLength(1);
    expect(ids).not.toContain('barbell_curl');
    expect(ids).not.toContain('farmer_walk');
    expect(ids).not.toContain('dragon_flag');
    for (const item of session.exercises) {
      expect(item.plannedSets.length).toBeLessThanOrEqual(5);
    }
  });
});
