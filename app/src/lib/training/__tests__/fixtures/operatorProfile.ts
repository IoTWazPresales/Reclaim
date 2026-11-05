/**
 * Test-only fixture: the operator's saved training profile, read-only from
 * training_profiles on 2026-11-05. Production code never references these
 * values; they exist so policy tests and the probe exercise a real profile.
 */
import { buildFourWeekPlan } from '../../programPlanner';
import type { TrainingProfileRow } from '../../../api';
import type { TrainingProfileSnapshot } from '../../types';

export const OPERATOR_EQUIPMENT = ['barbell', 'dumbbells', 'bench', 'cable_machine', 'pull_up_bar', 'leg_press_machine', 'hack_squat_machine', 't_bar_row_machine', 'chest_press_machine', 'dip_station', 'trap_bar', 'ez_bar', 'smith_machine', 'cardio', 'rack'];
export const OPERATOR_GOALS = { lose_fat: 0, get_fitter: 0, build_muscle: 0.5037005651933169, build_strength: 0.4962994348066832 };
export const OPERATOR_BASELINES = { squat: 116.66666666666667, deadlift: 128.33333333333334, barbell_row: 87.5, overhead_press: 105, barbell_bench_press: 122.50000000000001 };

export type OperatorVariant = { equipment?: string[]; splitPreference?: 'auto' | 'full_body' | 'upper_lower'; baselines?: Record<string, number> };

export function operatorSnapshot(variant: OperatorVariant = {}): TrainingProfileSnapshot {
  return {
    goals: OPERATOR_GOALS as TrainingProfileSnapshot['goals'],
    equipment_access: variant.equipment ?? OPERATOR_EQUIPMENT,
    baselines: variant.baselines ?? OPERATOR_BASELINES,
    experienceLevel: 'advanced',
    trainingMode: 'strength',
    constraints: {
      injuries: [], forbiddenMovements: [],
      preferences: { includeSkillWork: false, muscle_frequency_preference: 'twice', ...(variant.splitPreference && variant.splitPreference !== 'auto' ? { splitPreference: variant.splitPreference } : {}) },
    },
  };
}

/** Weekdays as the planner takes them (JS 0=Sun..6=Sat). Monday-Friday by default. */
export function operatorWeekdays(days: number): number[] {
  if (days === 2) return [1, 4];
  return Array.from({ length: days }, (_, index) => index + 1);
}

export function operatorPlan(days: number, variant: OperatorVariant = {}, options?: Parameters<typeof buildFourWeekPlan>[3]) {
  const profile = operatorSnapshot(variant);
  const row = { ...profile, constraints: { ...profile.constraints, trainingMode: 'strength', experienceLevel: 'advanced' } } as unknown as TrainingProfileRow;
  return buildFourWeekPlan(row, operatorWeekdays(days), new Date('2026-11-09T00:00:00Z'), options);
}
