/**
 * N-0074 (A1) benchmark / follower exposures.
 *
 * A lift with both a strength and a hypertrophy exposure in the same saved
 * week has a benchmark (the strength exposure) and a follower (the
 * hypertrophy exposure). This module only reads the saved weekly allocation;
 * it never decides an exposure role (weeklyProgramme.exposureRole does).
 */
import type { ExposureContext } from './progression';
import type { AllocatedSlot, ExposureRole } from './weeklyProgrammeTypes';

/** Saved programme weekdays use 1 = Monday ... 7 = Sunday (programPlanner). */
const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export function weekdayName(weekday: number): string | undefined {
  return Number.isInteger(weekday) && weekday >= 1 && weekday <= WEEKDAY_NAMES.length ? WEEKDAY_NAMES[weekday - 1] : undefined;
}

export type ExposureBenchmarks = Record<string, NonNullable<ExposureContext['benchmark']>>;

type BenchmarkSlot = Pick<AllocatedSlot, 'exerciseId' | 'repRange'> & { exposure?: ExposureRole };

const validRange = (range: unknown): range is [number, number] => Array.isArray(range) && range.length === 2 &&
  range.every((value) => Number.isInteger(value) && value > 0) && range[0] <= range[1];

/**
 * Strength exposures of one saved week keyed by exercise id, with the
 * programme day name. The earliest weekday wins if a lift has two.
 */
export function weekExposureBenchmarks(days: Array<{ dayKey: string; slots: BenchmarkSlot[] }>): ExposureBenchmarks {
  const benchmarks: ExposureBenchmarks = {};
  for (const day of [...days].sort((a, b) => Number(a.dayKey) - Number(b.dayKey))) {
    const dayName = weekdayName(Number(day.dayKey));
    if (!dayName) continue;
    for (const slot of day.slots) {
      if (slot.exposure !== 'strength' || !slot.exerciseId || !validRange(slot.repRange) || benchmarks[slot.exerciseId]) continue;
      benchmarks[slot.exerciseId] = { dayName, repRange: [slot.repRange[0], slot.repRange[1]] };
    }
  }
  return benchmarks;
}

/** Exposure context for one allocated slot; a hypertrophy slot follows a same-week benchmark of its lift. */
export function slotExposureContext(slot: BenchmarkSlot & { reps: number }, benchmarks?: ExposureBenchmarks): ExposureContext | undefined {
  if (slot.exposure !== 'strength' && slot.exposure !== 'hypertrophy') return undefined;
  const benchmark = slot.exposure === 'hypertrophy' && slot.exerciseId ? benchmarks?.[slot.exerciseId] : undefined;
  return { role: slot.exposure, targetReps: slot.reps, ...(benchmark ? { benchmark } : {}) };
}
