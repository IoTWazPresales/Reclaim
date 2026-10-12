import { describe, expect, it } from 'vitest';
import { buildProgramDaySession } from '../buildProgramDaySession';
import { setsForDose } from '../balancedHypertrophy';
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

describe('balanced hypertrophy week', () => {
  it('uses the goal blend for heavy and follow-up sets', () => {
    expect(setsForDose(goals, 'heavy')).toBe(3);
    expect(setsForDose(goals, 'follow')).toBe(2);
    expect(setsForDose(goals, 'support')).toBe(3);
    expect(setsForDose({ build_muscle: 0.5, build_strength: 0.5, lose_fat: 0, get_fitter: 0 }, 'heavy')).toBe(4);
  });

  it('keeps the entered squat and overhead press, and does not copy their kilograms', () => {
    const used: string[] = [];
    const days = week.map((day) => {
      const plan = buildProgramDaySession({ ...day, intents: [...day.intents], weekIndex: 1 }, snapshot, {
        avoidExerciseIds: [...used],
      });
      for (const item of plan.exercises) used.push(item.exerciseId);
      return plan;
    });
    const ids = days.map((day) => day.exercises.map((item) => item.exerciseId));
    expect(ids[1]).toContain('squat');
    expect(ids[2]).toContain('overhead_press');
    expect(ids.flat()).not.toContain('dumbbell_shoulder_press');

    const ohp = days[2].exercises.find((item) => item.exerciseId === 'overhead_press');
    expect(ohp?.plannedSets).toHaveLength(3);
    expect(ohp?.plannedSets[0]?.suggestedWeight).toBe(75);
    expect(ohp?.decisionTrace.constraintsApplied.join(' ')).toContain('rack was not selected');

    const squat = days[1].exercises.find((item) => item.exerciseId === 'squat');
    expect(squat?.plannedSets[0]?.suggestedWeight).toBe(95);

    const copied = days.flatMap((day) => day.exercises).filter((item) =>
      ['romanian_deadlift', 'hack_squat', 'leg_press', 'dumbbell_flyes'].includes(item.exerciseId),
    );
    expect(copied.length).toBeGreaterThan(0);
    for (const item of copied) {
      expect(item.plannedSets[0]?.suggestedWeight).toBe(0);
    }

    for (const day of days) {
      const sets = day.exercises.reduce((total, item) => total + item.plannedSets.length, 0);
      expect(sets).toBeLessThanOrEqual(24);
      expect(day.exercises.some((item) => item.exerciseId === 'farmer_walk')).toBe(false);
      expect(day.exercises.some((item) => item.exerciseId === 'dragon_flag')).toBe(false);
    }
  });
});
