import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildSessionFromProgramDay } from '../engine';
import { buildFourWeekPlan } from '../programPlanner';
import {
  nextSetupStep,
  resolveRunningDistanceKm,
  resolveTrainingMode,
} from '../trainingMode';

const goals = { build_muscle: 0.5, build_strength: 0.5, lose_fat: 0, get_fitter: 0 };

type PlannerProfile = Parameters<typeof buildFourWeekPlan>[0];

function profile(mode?: 'strength' | 'running' | 'hybrid'): PlannerProfile {
  return {
    id: 'p',
    user_id: 'u',
    goals,
    days_per_week: 3,
    preferred_time_window: {},
    equipment_access: ['barbell'],
    constraints: mode ? { trainingMode: mode } : {},
    created_at: '',
    updated_at: '',
  };
}

function daysOf(plan: ReturnType<typeof buildFourWeekPlan>) {
  return Object.values(plan.weeks[0].days);
}

describe('training mode', () => {
  it('treats a missing or unknown mode as strength', () => {
    expect(resolveTrainingMode(undefined)).toBe('strength');
    expect(resolveTrainingMode('sprint')).toBe('strength');
    const unset = buildFourWeekPlan(profile(), [1, 3, 5]);
    const explicit = buildFourWeekPlan(profile('strength'), [1, 3, 5]);
    expect(explicit).toEqual(unset);
    expect(daysOf(unset).every((day) => day.scheduledRun !== true)).toBe(true);
    expect(daysOf(unset).map((day) => day.template)).toEqual(['full_body', 'full_body', 'full_body']);
  });

  it('schedules running days without lifting intents or a prescribed duration', () => {
    const before = buildFourWeekPlan(profile(), [1, 3, 5]);
    const frozen = JSON.stringify(before);
    const plan = buildFourWeekPlan(profile('running'), [1, 3, 5]);
    expect(JSON.stringify(before)).toBe(frozen);
    for (const day of daysOf(plan)) {
      expect(day.template).toBe('run');
      expect(day.label).toBe('Run');
      expect(day.intents).toEqual([]);
      expect(day.scheduledRun).toBeUndefined();
    }
    const session = buildSessionFromProgramDay(
      { label: 'Run', intents: [], template_key: 'run', weekIndex: 1 },
      {
        goals,
        equipment_access: [],
        constraints: {},
        baselines: {},
        trainingMode: 'running',
        runningGoal: 'custom',
        runningDistanceKm: 21,
      },
    );
    expect(session.template).toBe('run');
    expect(session.exercises).toEqual([]);
    expect(session.estimatedDurationMinutes).toBe(20);
    expect(session.weekIndex).toBe(1);
  });

  it('puts a hybrid run only on push, pull, or upper days', () => {
    const strength = buildFourWeekPlan(profile('strength'), [1, 2, 3, 4, 5]);
    const hybrid = buildFourWeekPlan(profile('hybrid'), [1, 2, 3, 4, 5]);
    const strengthDays = daysOf(strength);
    const hybridDays = daysOf(hybrid);
    expect(hybridDays.map((day) => day.template)).toEqual(strengthDays.map((day) => day.template));
    expect(hybridDays.map((day) => day.intents)).toEqual(strengthDays.map((day) => day.intents));
    expect(hybridDays.find((day) => day.template === 'push')?.scheduledRun).toBe(true);
    expect(hybridDays.find((day) => day.template === 'pull')?.scheduledRun).toBe(true);
    expect(hybridDays.find((day) => day.template === 'upper')?.scheduledRun).toBe(true);
    expect(hybridDays.find((day) => day.template === 'lower')?.scheduledRun).toBeUndefined();

    const fullBody = buildFourWeekPlan(
      { ...profile('hybrid'), days_per_week: 2 },
      [1, 3],
    );
    expect(daysOf(fullBody).every((day) => day.template === 'full_body' && day.scheduledRun !== true)).toBe(true);
  });

  it('skips lifting setup for running and never asks the setup screen for location', () => {
    expect(nextSetupStep('schedule', 'running')).toBe('save');
    expect(nextSetupStep('schedule', 'strength')).toBe('equipment');
    expect(nextSetupStep('schedule', 'hybrid')).toBe('equipment');
    expect(resolveRunningDistanceKm('8')).toBe(8);
    expect(resolveRunningDistanceKm(0)).toBeUndefined();
    expect(resolveRunningDistanceKm('fast')).toBeUndefined();

    const setup = readFileSync(
      resolve(__dirname, '../../../screens/training/TrainingSetupScreen.tsx'),
      'utf8',
    );
    expect(setup).not.toMatch(/expo-location|ACCESS_FINE_LOCATION|requestForegroundPermissions|Geolocation/);
    expect(setup).toContain('trainingMode: mode');
    expect(setup).toContain("status: 'abandoned'");
  });
});
