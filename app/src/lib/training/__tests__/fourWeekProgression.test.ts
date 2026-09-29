import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  buildProgramDaySession,
  materializePlannedSessionItems,
  plannedItemsForSession,
} from '../buildProgramDaySession';
import { acceptedProgramWeekIndex, suggestLoading } from '../engine';
import { getExerciseIncrementKg } from '../exerciseLoadingProfile';
import { decideDoubleProgression } from '../progression';
import type { Exercise, MovementIntent, PlannedSet, TrainingProfileSnapshot } from '../types';

const rules = JSON.parse(
  readFileSync(join(__dirname, '../rules/rules.v1.json'), 'utf8'),
) as Record<string, unknown>;

const snapshot: TrainingProfileSnapshot = {
  goals: { build_muscle: 1, build_strength: 0, lose_fat: 0, get_fitter: 0 },
  equipment_access: ['dumbbells', 'bench', 'floor'],
  constraints: {},
  baselines: {},
};

function day(weekIndex?: number) {
  return {
    label: 'Upper',
    intents: ['horizontal_press'] as MovementIntent[],
    template_key: 'upper' as const,
    weekIndex,
  };
}

function prescription(sets: PlannedSet[]) {
  return sets.map((set) => ({
    targetReps: set.targetReps,
    suggestedWeight: set.suggestedWeight,
    restSeconds: set.restSeconds,
  }));
}

const squat = {
  id: 'back_squat',
  name: 'Back Squat',
  aliases: [],
  intents: ['knee_dominant'],
  equipment: ['barbell'],
  musclesPrimary: ['quadriceps'],
  musclesSecondary: [],
  difficulty: 'intermediate',
  contraindications: [],
  substitutionTags: [],
  unilateral: false,
} as Exercise;

const stuckSets = [
  { setIndex: 1, weight: 100, reps: 6, rpe: 9, completedAt: '2026-09-01T00:00:00Z' },
  { setIndex: 2, weight: 100, reps: 6, rpe: 9, completedAt: '2026-09-01T00:00:00Z' },
  { setIndex: 3, weight: 100, reps: 5, rpe: 9, completedAt: '2026-09-01T00:00:00Z' },
];

describe('four-week progression', () => {
  it('records week 1–4 and does not invent a sets, load, or RIR wave', () => {
    expect(rules.weekMultipliers).toBeUndefined();
    expect(rules.rirTargets).toBeUndefined();
    expect(JSON.stringify(rules).toLowerCase().includes('rir')).toBe(false);

    const week1 = buildProgramDaySession(day(1), snapshot);
    const week4 = buildProgramDaySession(day(4), snapshot);

    expect(week1.weekIndex).toBe(1);
    expect(week4.weekIndex).toBe(4);
    expect(week1.exercises.map((ex) => ex.exerciseId)).toEqual(
      week4.exercises.map((ex) => ex.exerciseId),
    );
    expect(week1.exercises.map((ex) => ex.plannedSets.length)).toEqual(
      week4.exercises.map((ex) => ex.plannedSets.length),
    );
    expect(week1.exercises.map((ex) => prescription(ex.plannedSets))).toEqual(
      week4.exercises.map((ex) => prescription(ex.plannedSets)),
    );
    for (const plan of [week1, week4]) {
      for (const exercise of plan.exercises) {
        for (const set of exercise.plannedSets) {
          expect(set).not.toHaveProperty('targetRir');
          expect(set).not.toHaveProperty('rir');
        }
      }
    }

    expect(acceptedProgramWeekIndex(0)).toBeUndefined();
    expect(acceptedProgramWeekIndex(5)).toBeUndefined();
    expect(buildProgramDaySession(day(undefined), snapshot).weekIndex).toBeUndefined();
    expect(buildProgramDaySession(day(5), snapshot).weekIndex).toBeUndefined();
  });

  it('keeps a started session on its planned snapshot when a later week is rebuilt', () => {
    const week1 = buildProgramDaySession(day(1), snapshot);
    const week4 = buildProgramDaySession(day(4), snapshot);
    const frozen = materializePlannedSessionItems('session-1', week1);
    const kept = plannedItemsForSession({
      startedAt: '2026-09-01T00:00:00Z',
      notificationMode: 'guided',
      frozenItems: frozen,
      rebuiltPlan: week4,
      sessionId: 'session-1',
    });
    expect(kept).toEqual(frozen);
  });

  it('does not add the double-progression increment on top of a deload', () => {
    const step = getExerciseIncrementKg(squat);
    expect(step).toBe(5);
    const decision = decideDoubleProgression({
      exercise: squat,
      lastSets: stuckSets,
      repRange: [3, 6],
      holdStreak: 2,
    });
    expect(decision?.action).toBe('deload');
    expect(decision?.incrementKg).toBe(0);
    expect(decision?.nextWeight).toBe(90);

    const history = {
      exerciseId: squat.id,
      sets: stuckSets,
      date: '2026-09-01',
    };
    const suggested = suggestLoading({
      exercise: squat,
      userState: {
        experienceLevel: 'intermediate',
        lastSessionPerformance: { [squat.id]: history },
        recentSessionPerformance: {
          [squat.id]: [history, { ...history, date: '2026-08-25' }],
        },
      },
      goalWeights: { build_strength: 1 },
      plannedReps: 6,
      priority: 'primary',
    });
    expect(suggested).toBe(decision?.nextWeight);
    expect(suggested).not.toBe((decision?.nextWeight ?? 0) + step);
  });
});
