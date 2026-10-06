/**
 * Health Connect active energy → kilocalories.
 *
 * Android's Energy.inKilocalories is the kilocalorie value.
 * Energy.inCalories is that value times 1,000 (small calories).
 * Reading inCalories and labelling it kcal stores a 1,000× number.
 */

export function kcalFromActiveEnergyRecord(record: unknown): number {
  const rec = record as {
    calories?: unknown;
    value?: unknown;
    energy?: {
      inKilocalories?: unknown;
      inCalories?: unknown;
      calories?: unknown;
    };
  } | null;
  const energy = rec?.energy;

  if (typeof energy?.inKilocalories === 'number' && Number.isFinite(energy.inKilocalories)) {
    return energy.inKilocalories;
  }
  if (typeof energy?.inCalories === 'number' && Number.isFinite(energy.inCalories)) {
    return energy.inCalories / 1000;
  }
  if (typeof rec?.calories === 'number' && Number.isFinite(rec.calories)) {
    return rec.calories;
  }
  if (typeof energy?.calories === 'number' && Number.isFinite(energy.calories)) {
    return energy.calories;
  }
  if (typeof rec?.value === 'number' && Number.isFinite(rec.value)) {
    return rec.value;
  }
  return 0;
}
