import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { resolveExperienceLevel, snapshotWithExperienceLevel } from '../experienceLevel';
import { epleyWorkingWeightCeiling } from '../progression';
import { suggestLoading, buildSessionFromProgramDay } from '../engine';
import { listExercises } from '../engine';
import type { TrainingProfileSnapshot } from '../types';

const bench = listExercises().find((exercise) => exercise.id === 'barbell_bench_press');
const row = listExercises().find((exercise) => exercise.id === 'barbell_row');

const goals = { build_muscle: 1, build_strength: 0, lose_fat: 0, get_fitter: 0 };

describe('experience level and Epley ceilings', () => {
  it('treats a missing or unknown level as beginner and keeps a stored level', () => {
    expect(resolveExperienceLevel(undefined)).toBe('beginner');
    expect(resolveExperienceLevel(null)).toBe('beginner');
    expect(resolveExperienceLevel('expert')).toBe('beginner');
    expect(resolveExperienceLevel('advanced')).toBe('advanced');

    const stored = snapshotWithExperienceLevel(
      {
        goals,
        equipment_access: ['dumbbells'],
      },
      'intermediate',
    );
    expect(stored.experienceLevel).toBe('intermediate');
  });

  it('uses beginner loads when the program snapshot omits experience', () => {
    expect(bench).toBeTruthy();
    const snapshot: TrainingProfileSnapshot = {
      goals,
      equipment_access: ['barbell', 'bench'],
      baselines: {},
    };
    const unset = buildSessionFromProgramDay(
      { label: 'Upper', intents: ['horizontal_press'], template_key: 'upper' },
      snapshot,
    );
    const beginner = buildSessionFromProgramDay(
      { label: 'Upper', intents: ['horizontal_press'], template_key: 'upper' },
      { ...snapshot, experienceLevel: 'beginner' },
    );
    const intermediate = buildSessionFromProgramDay(
      { label: 'Upper', intents: ['horizontal_press'], template_key: 'upper' },
      { ...snapshot, experienceLevel: 'intermediate' },
    );
    expect(unset.userState.experienceLevel).toBe('beginner');
    expect(unset.exercises.map((ex) => ex.exerciseId)).toEqual(
      beginner.exercises.map((ex) => ex.exerciseId),
    );
    expect(intermediate.userState.experienceLevel).toBe('intermediate');
  });

  it('caps a progressed load at that exercise Epley ceiling and leaves another exercise alone', () => {
    expect(bench && row).toBeTruthy();
    const plannedReps = 8;
    const oneRM = 80;
    const ceiling = epleyWorkingWeightCeiling(oneRM, plannedReps, 2.5);
    expect(ceiling).toBe(62.5);

    const heavySets = [
      { setIndex: 1, weight: 100, reps: 8, completedAt: '2026-09-01T00:00:00.000Z' },
      { setIndex: 2, weight: 100, reps: 8, completedAt: '2026-09-01T00:00:00.000Z' },
      { setIndex: 3, weight: 100, reps: 8, completedAt: '2026-09-01T00:00:00.000Z' },
    ];
    const sharedHistory = {
      lastSessionPerformance: {
        barbell_bench_press: { exerciseId: 'barbell_bench_press', sets: heavySets, date: '2026-09-01' },
        barbell_row: { exerciseId: 'barbell_row', sets: heavySets, date: '2026-09-01' },
      },
    };

    const capped = suggestLoading({
      exercise: bench!,
      userState: {
        experienceLevel: 'intermediate',
        estimated1RM: { barbell_bench_press: oneRM },
        ...sharedHistory,
      },
      goalWeights: goals,
      plannedReps,
      priority: 'primary',
    });
    const uncapped = suggestLoading({
      exercise: row!,
      userState: {
        experienceLevel: 'intermediate',
        estimated1RM: { barbell_bench_press: oneRM },
        ...sharedHistory,
      },
      goalWeights: goals,
      plannedReps,
      priority: 'primary',
    });

    expect(capped).toBeLessThanOrEqual(ceiling);
    expect(capped).toBe(ceiling);
    expect(uncapped).toBeGreaterThan(ceiling);
  });

  it('writes experienceLevel onto the profile constraints and the program snapshot', () => {
    const setup = readFileSync(join(__dirname, '../../../screens/training/TrainingSetupScreen.tsx'), 'utf8');
    const profile = setup.indexOf('experienceLevel: resolveExperienceLevel(experienceLevel)');
    const snapshot = setup.lastIndexOf('experienceLevel: resolveExperienceLevel(experienceLevel)');
    expect(profile).toBeGreaterThan(-1);
    expect(snapshot).toBeGreaterThan(profile);
    expect(setup).toContain('profile_snapshot:');
  });
});
