import type { ExercisePriority } from './types';

/**
 * Weekly volume accounting for a new plan.
 *
 * `rules.v1.json` `volumeCaps.perIntent` is 25 / 15 / 10 for primary /
 * accessory / isolation. Those keys match `setsPerIntent` (exercise priority),
 * not a movement intent and not a muscle. `volumeCaps.perSession.total` is 120
 * planned sets in one session. ROUTINE_AUDIT.md RA-006 records both as unused.
 * The audit's "10–20 sets/muscle/week" sentence is an example, not a band.
 * This module does not add a muscle band or a session cap of 10.
 */

export type SessionSetCounts = {
  primary: number;
  accessory: number;
  isolation: number;
  total: number;
};

export type VolumeCaps = {
  perPriority: Record<ExercisePriority, number>;
  perSessionTotal: number;
};

export type MuscleSetCredit = {
  musclesPrimary?: readonly string[] | null;
  musclesSecondary?: readonly string[] | null;
};

type VolumeCapRules = {
  volumeCaps?: {
    perIntent?: { primary?: unknown; accessory?: unknown; isolation?: unknown };
    perSession?: { total?: unknown };
  };
};

function finiteCap(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`volumeCaps.${label} is not a non-negative finite number`);
  }
  return value;
}

/** Read the written caps. Missing or non-numeric values throw. */
export function volumeCapsFromRules(rules: VolumeCapRules): VolumeCaps {
  const perIntent = rules.volumeCaps?.perIntent;
  const perSession = rules.volumeCaps?.perSession;
  return {
    perPriority: {
      primary: finiteCap(perIntent?.primary, 'perIntent.primary'),
      accessory: finiteCap(perIntent?.accessory, 'perIntent.accessory'),
      isolation: finiteCap(perIntent?.isolation, 'perIntent.isolation'),
    },
    perSessionTotal: finiteCap(perSession?.total, 'perSession.total'),
  };
}

/**
 * How many of `proposedSets` still fit in this session.
 * Role room and the session total are both ceilings. Zero means do not add the exercise.
 */
export function setsAllowedByVolumeCaps(
  priority: ExercisePriority,
  proposedSets: number,
  already: SessionSetCounts,
  caps: VolumeCaps,
): number {
  if (!Number.isFinite(proposedSets) || proposedSets <= 0) return 0;
  const roleRoom = caps.perPriority[priority] - already[priority];
  const totalRoom = caps.perSessionTotal - already.total;
  return Math.max(0, Math.min(Math.floor(proposedSets), Math.floor(roleRoom), Math.floor(totalRoom)));
}

/**
 * Sets credited to each muscle tag: 1.0 for every primary tag, 0.5 for every
 * secondary tag, multiplied by the planned set count. A tag listed in both
 * places receives both credits. This is a count, not a target band.
 */
export function fractionalSetsByMuscle(
  items: Array<{ setCount: number; muscles: MuscleSetCredit }>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) {
    const n = item.setCount;
    if (!Number.isFinite(n) || n <= 0) continue;
    for (const muscle of item.muscles.musclesPrimary ?? []) {
      out[muscle] = (out[muscle] ?? 0) + n * 1;
    }
    for (const muscle of item.muscles.musclesSecondary ?? []) {
      out[muscle] = (out[muscle] ?? 0) + n * 0.5;
    }
  }
  return out;
}

export function fractionalSetsFromPlans(
  plans: Array<{
    exercises: Array<{
      plannedSets: readonly unknown[];
      exercise?: MuscleSetCredit | null;
    }>;
  }>,
): Record<string, number> {
  const items: Array<{ setCount: number; muscles: MuscleSetCredit }> = [];
  for (const plan of plans) {
    for (const exercise of plan.exercises) {
      items.push({
        setCount: exercise.plannedSets.length,
        muscles: exercise.exercise ?? {},
      });
    }
  }
  return fractionalSetsByMuscle(items);
}
