/**
 * Pure merge helpers for training set completion (no Supabase / Expo imports).
 * Tests import from here so Vitest does not pull `api` → `expo-sqlite` → Expo winter runtime.
 */

export type PerformedSetSnapshot = {
  setIndex: number;
  weight: number;
  reps: number;
  rpe?: number;
  completedAt: string;
};

/** Merge by setIndex; later entries in `incoming` win over `existing`. */
export function mergePerformedSetSlices(
  existing: PerformedSetSnapshot[] | null | undefined,
  incoming: PerformedSetSnapshot[],
): PerformedSetSnapshot[] {
  const byIndex = new Map<number, PerformedSetSnapshot>();
  for (const s of existing ?? []) {
    byIndex.set(s.setIndex, { ...s });
  }
  for (const s of incoming) {
    byIndex.set(s.setIndex, { ...s });
  }
  return [...byIndex.values()].sort((a, b) => a.setIndex - b.setIndex);
}
