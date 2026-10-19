import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildSession, isCompoundExercise } from '../engine';
import * as smallMuscleVolume from '../smallMuscleVolume';
import { materializePlannedSessionItems, plannedItemsForSession } from '../buildProgramDaySession';
import { fractionalSetsFromPlans } from '../weeklyVolumeModel';
import type { BuildSessionInput, SessionPlan } from '../types';

const base: BuildSessionInput = {
  template: 'upper',
  goals: { build_muscle: 1 },
  constraints: {
    availableEquipment: ['dumbbell', 'dumbbells', 'bench', 'floor', 'pull_up_bar'],
    injuries: [], forbiddenMovements: [], timeBudgetMinutes: 60,
  },
  userState: { experienceLevel: 'intermediate', estimated1RM: {} },
};
const total = (plan: SessionPlan) => plan.exercises.reduce((n, ex) => n + ex.plannedSets.length, 0);
const capped = (limit: number, primary = 1) => buildSession({
  ...base,
  volumeCaps: { perPriority: { primary, accessory: 1, isolation: 1 }, perSessionTotal: limit },
});

afterEach(() => vi.restoreAllMocks());

describe('post-allocation session-total cap', () => {
  it.each([[2, 1], [5, 3], [0, 1]])('respects exhausted custom cap %i (primary %i)', (limit, primary) => {
    const plan = capped(limit, primary);
    expect(total(plan)).toBe(limit);
    expect(plan.exercises.every(ex => ex.plannedSets.length <= smallMuscleVolume.MAX_SETS_ON_ONE_EXERCISE)).toBe(true);
  });

  it.each([
    { build_muscle: 1 },
    { build_strength: 1 },
    { build_muscle: 0.5, build_strength: 0.5 },
  ])('preserves ordinary prescriptions for %j', goals => {
    const plan = buildSession({ ...base, goals });
    expect(plan.exercises.map(({ exerciseId, priority, plannedSets, warmupSets }) =>
      ({ exerciseId, priority, sets: plannedSets.map(set => JSON.stringify(set)), warmupSets }))).toMatchSnapshot();
  });

  // Deliberately under-allocate the first pass to exercise partial and competing
  // top-ups without depending on a particular catalogue exercise being underfilled.
  function underAllocate() {
    const original = smallMuscleVolume.setsForSmallMuscle;
    vi.spyOn(smallMuscleVolume, 'setsForSmallMuscle').mockImplementation(input => {
      const sets = original(input);
      return sets == null ? sets : Math.min(1, sets);
    });
  }
  const withRoom = (limit: number) => buildSession({ ...base, volumeCaps: {
    perPriority: { primary: 25, accessory: 15, isolation: 10 }, perSessionTotal: limit,
  } });
  const directCounts = (plan: SessionPlan) => plan.exercises
    .filter(ex => !isCompoundExercise(ex.exercise) && smallMuscleVolume.smallMuscleOf(ex.exercise))
    .map(ex => ex.plannedSets.length);

  it.each<[number, number[]]>([
    [17, [1, 1, 1]], // zero room after initial allocation
    [19, [3, 1, 1]], // a partial first top-up consumes all remaining room
    [21, [5, 1, 1]], // exact first-exercise boundary
    [23, [5, 1, 3]], // second top-up sees the first one's accounting
    [29, [5, 5, 5]], // all three top-ups fit exactly
    [120, [5, 5, 5]], // per-exercise maximum still applies with spare room
  ])('shares remaining capacity at cap %i', (limit, expected) => {
    underAllocate();
    const plan = withRoom(limit);
    expect(directCounts(plan)).toEqual(expected);
    expect(total(plan)).toBe(Math.min(limit, 29));
    for (const ex of plan.exercises) {
      expect(ex.plannedSets.map(set => set.setIndex)).toEqual(
        Array.from({ length: ex.plannedSets.length }, (_, i) => i + 1));
      for (const set of ex.plannedSets.slice(1)) {
        expect(set).toEqual({ ...ex.plannedSets[0], setIndex: set.setIndex });
      }
    }
    if (limit < 29) {
      expect(plan.exercises.some(ex => ex.decisionTrace.selectionReason.includes('sets unallocated'))).toBe(true);
      expect(fractionalSetsFromPlans([plan]).biceps).toBeLessThan(16);
    }
  });

  it.each([
    ['2026-10-19T10:00:00.000Z', 'normal'],
    ['2026-10-19T10:00:00.000Z', 'guided'],
    [null, 'guided'],
  ] as const)('preserves frozen snapshots (started=%s, mode=%s)', (startedAt, notificationMode) => {
    const original = buildSession(base);
    const frozen = materializePlannedSessionItems('synthetic_started', original);
    const before = structuredClone(frozen);
    const rebuilt = capped(2);
    expect(total(rebuilt)).toBe(2);
    const kept = plannedItemsForSession({ startedAt, notificationMode, frozenItems: frozen,
      rebuiltPlan: rebuilt, sessionId: 'synthetic_started' });
    expect(kept).toBe(frozen);
    expect(kept).toEqual(before);
    original.exercises[0].plannedSets[0].targetReps = 999;
    expect(kept).toEqual(before);
  });
});
