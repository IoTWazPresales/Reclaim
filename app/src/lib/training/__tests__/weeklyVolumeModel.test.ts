import { describe, expect, it } from 'vitest';
import rules from '../rules/rules.v1.json';
import { buildSession } from '../engine';
import {
  materializePlannedSessionItems,
  plannedItemsForSession,
} from '../buildProgramDaySession';
import {
  fractionalSetsByMuscle,
  fractionalSetsFromPlans,
  setsAllowedByVolumeCaps,
  volumeCapsFromRules,
  type SessionSetCounts,
} from '../weeklyVolumeModel';
import type { GoalWeights, TrainingConstraints, UserState } from '../types';

const emptyCounts = (): SessionSetCounts => ({
  primary: 0,
  accessory: 0,
  isolation: 0,
  total: 0,
});

const constraints: TrainingConstraints = {
  availableEquipment: ['dumbbells', 'bench', 'floor', 'pull_up_bar'],
  injuries: [],
  forbiddenMovements: [],
  timeBudgetMinutes: 60,
};

const userState: UserState = {
  experienceLevel: 'intermediate',
  estimated1RM: {},
};

const goals: GoalWeights = { build_muscle: 1 };

function setTotal(plan: { exercises: Array<{ plannedSets: readonly unknown[]; priority: string }> }) {
  const counts = emptyCounts();
  for (const exercise of plan.exercises) {
    const n = exercise.plannedSets.length;
    counts[exercise.priority as 'primary' | 'accessory' | 'isolation'] += n;
    counts.total += n;
  }
  return counts;
}

describe('weekly volume model', () => {
  it('reads the written caps and no muscle band', () => {
    expect(volumeCapsFromRules(rules)).toEqual({
      perPriority: { primary: 25, accessory: 15, isolation: 10 },
      perSessionTotal: 120,
    });
    expect(rules).not.toHaveProperty('setsPerMuscleWeek');
  });

  it('credits 1.0 per primary tag and 0.5 per secondary tag', () => {
    expect(
      fractionalSetsByMuscle([
        {
          setCount: 2,
          muscles: { musclesPrimary: ['lats', 'biceps'], musclesSecondary: ['biceps', 'upper_traps'] },
        },
      ]),
    ).toEqual({ lats: 2, biceps: 3, upper_traps: 1 });
  });

  it('sums a week of plans with the same credit', () => {
    expect(
      fractionalSetsFromPlans([
        {
          exercises: [
            {
              plannedSets: [{}, {}],
              exercise: { musclesPrimary: ['glutes'], musclesSecondary: ['hamstrings'] },
            },
          ],
        },
      ]),
    ).toEqual({ glutes: 2, hamstrings: 1 });
  });

  it('keeps a new set inside the role cap and the session total', () => {
    const caps = volumeCapsFromRules(rules);
    const nearRole = { ...emptyCounts(), primary: 23, total: 23 };
    expect(setsAllowedByVolumeCaps('primary', 4, nearRole, caps)).toBe(2);

    const fullSession = { ...emptyCounts(), primary: 20, accessory: 10, isolation: 10, total: 120 };
    expect(setsAllowedByVolumeCaps('accessory', 2, fullSession, caps)).toBe(0);

    const fullIsolation = { ...emptyCounts(), isolation: 10, total: 10 };
    expect(setsAllowedByVolumeCaps('isolation', 2, fullIsolation, caps)).toBe(0);
  });

  it('clamps a new session when a tighter cap is supplied', () => {
    const open = buildSession({ template: 'upper', goals, constraints, userState });
    const openCounts = setTotal(open);
    expect(openCounts.total).toBeGreaterThan(5);
    expect(openCounts.primary).toBeLessThanOrEqual(25);
    expect(openCounts.accessory).toBeLessThanOrEqual(15);
    expect(openCounts.isolation).toBeLessThanOrEqual(10);
    expect(openCounts.total).toBeLessThanOrEqual(120);

    const capped = buildSession({
      template: 'upper',
      goals,
      constraints,
      userState,
      volumeCaps: {
        perPriority: { primary: 3, accessory: 15, isolation: 10 },
        perSessionTotal: 5,
      },
    });
    const cappedCounts = setTotal(capped);
    expect(cappedCounts.primary).toBeLessThanOrEqual(3);
    expect(cappedCounts.total).toBeLessThanOrEqual(5);
    expect(cappedCounts.total).toBeGreaterThan(0);
    expect(capped.exercises.length).toBeLessThan(open.exercises.length);
  });

  it('leaves a started session snapshot frozen when a later build is capped', () => {
    const original = buildSession({ template: 'upper', goals, constraints, userState });
    const frozen = materializePlannedSessionItems('training_started', original);
    const rebuilt = buildSession({
      template: 'upper',
      goals,
      constraints,
      userState,
      volumeCaps: {
        perPriority: { primary: 1, accessory: 1, isolation: 1 },
        perSessionTotal: 2,
      },
    });
    expect(setTotal(rebuilt).total).toBeLessThanOrEqual(2);
    const kept = plannedItemsForSession({
      startedAt: '2026-09-29T22:00:00.000Z',
      notificationMode: 'guided',
      frozenItems: frozen,
      rebuiltPlan: rebuilt,
      sessionId: 'training_started',
    });
    expect(kept).toBe(frozen);
    expect(kept.reduce((n, item) => n + item.planned.sets.length, 0)).toBe(setTotal(original).total);
  });
});
