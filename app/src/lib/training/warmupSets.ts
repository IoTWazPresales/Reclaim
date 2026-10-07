/**
 * Warm-up weights already shown on the exercise card: 40%, 60%, and 80% of the
 * working weight, rounded to the exercise step, 5 reps. They are not working sets.
 */
export type WarmupSet = {
  weight: number;
  reps: number;
};

export function warmupSetsForWorkingWeight(workingKg: number, stepKg: number): WarmupSet[] {
  if (!(workingKg > 0) || !(stepKg > 0)) return [];
  const seen = new Set<number>();
  const sets: WarmupSet[] = [];
  for (const fraction of [0.4, 0.6, 0.8]) {
    const weight = Math.round((workingKg * fraction) / stepKg) * stepKg;
    if (weight <= 0 || seen.has(weight)) continue;
    seen.add(weight);
    sets.push({ weight, reps: 5 });
  }
  return sets;
}
