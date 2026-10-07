import { describe, expect, it } from 'vitest';
import { warmupSetsForWorkingWeight } from '@/lib/training/warmupSets';
import { buildSession } from '@/lib/training/engine';
import { materializePlannedSessionItems } from '@/lib/training/buildProgramDaySession';
import type { TrainingConstraints } from '@/lib/training/types';

describe('warmupSetsForWorkingWeight', () => {
  it('uses 40, 60, and 80 percent rounded to the step', () => {
    expect(warmupSetsForWorkingWeight(100, 5)).toEqual([
      { weight: 40, reps: 5 },
      { weight: 60, reps: 5 },
      { weight: 80, reps: 5 },
    ]);
  });

  it('returns nothing when there is no working weight', () => {
    expect(warmupSetsForWorkingWeight(0, 5)).toEqual([]);
  });
});

describe('hated exercises and first-compound warm-up', () => {
  const constraints: TrainingConstraints = {
    availableEquipment: ['barbell', 'dumbbells', 'cable_machine', 'pull_up_bar', 'bench'],
    injuries: [],
    forbiddenMovements: [],
    timeBudgetMinutes: 60,
    preferences: { hatesExercises: ['squat'] },
  };

  it('does not select a hated exercise', () => {
    const session = buildSession({
      template: 'legs',
      goals: { build_muscle: 1 },
      constraints,
      userState: { experienceLevel: 'intermediate' },
    });
    expect(session.exercises.some((ex) => ex.exerciseId === 'squat')).toBe(false);
  });

  it('stores warm-up rows only on the first compound, outside the working sets', () => {
    const session = buildSession({
      template: 'push',
      goals: { build_strength: 1 },
      constraints: { ...constraints, preferences: {} },
      userState: { experienceLevel: 'intermediate' },
    });
    const withWarmup = session.exercises.filter((ex) => (ex.warmupSets?.length ?? 0) > 0);
    expect(withWarmup).toHaveLength(1);
    expect(withWarmup[0].warmupSets?.every((row) => row.reps === 5)).toBe(true);
    const items = materializePlannedSessionItems('sess', session);
    const stored = items.filter((item) => (item.planned as { warmupSets?: unknown[] }).warmupSets?.length);
    expect(stored).toHaveLength(1);
    expect(stored[0].planned.sets.length).toBeGreaterThan(0);
  });
});
