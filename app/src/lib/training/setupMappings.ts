// Training Setup Mappings - Map UI keys to engine/catalog IDs
// This ensures baselines and equipment from TrainingSetupScreen match what the engine expects

/**
 * Map baseline exercise keys from TrainingSetupScreen to real catalog exercise IDs
 * Uses explicit mapping table (no fuzzy matching)
 */
export function mapBaselineKeyToExerciseId(setupKey: string): string | null {
  const mapping: Record<string, string> = {
    bench_press: 'barbell_bench_press',
    squat: 'squat',
    deadlift: 'deadlift',
    overhead_press: 'overhead_press',
    row: 'barbell_row',
  };

  return mapping[setupKey] || null;
}

/**
 * Normalize equipment IDs from setup UI into engine equipment IDs
 * - cables -> cable_machine
 * - machines -> removed (too generic, engine needs specific machine types)
 * - Keep existing ids that already match
 */
export function normalizeEquipmentId(setupEquipmentId: string): string | null {
  // Direct mappings
  if (setupEquipmentId === 'cables') {
    return 'cable_machine';
  }

  // Remove "machines" - too generic, engine needs specific machine types
  if (setupEquipmentId === 'machines') {
    return null; // Filter out
  }

  // Keep existing valid IDs
  const validIds = [
    'barbell',
    'dumbbells',
    'bench',
    'rack',
    'pull_up_bar',
    'kettlebells',
    'cable_machine',
    'leg_press_machine',
    'cardio',
  ];

  if (validIds.includes(setupEquipmentId)) {
    return setupEquipmentId;
  }

  // Unknown ID - return as-is but log warning in dev
  const IS_DEV =
    typeof globalThis !== 'undefined' && (globalThis as any).__DEV__ === true;
  if (IS_DEV) {
    console.warn(`[setupMappings] Unknown equipment ID: ${setupEquipmentId}`);
  }
  return setupEquipmentId;
}

/**
 * Normalize all equipment IDs from setup array
 */
export function normalizeEquipmentIds(setupEquipmentIds: string[]): string[] {
  return setupEquipmentIds
    .map(normalizeEquipmentId)
    .filter((id): id is string => id !== null);
}

/**
 * Map all baseline keys to exercise IDs
 */
export function mapBaselineKeysToExerciseIds(
  baselines: Record<string, number>,
): Record<string, number> {
  const mapped: Record<string, number> = {};

  for (const [setupKey, value] of Object.entries(baselines)) {
    const exerciseId = mapBaselineKeyToExerciseId(setupKey);
    if (exerciseId && value > 0) {
      mapped[exerciseId] = value;
    }
  }

  return mapped;
}

/**
 * Reverse map: convert exercise ID back to setup key (for prefill)
 */
export function mapExerciseIdToBaselineKey(exerciseId: string): string | null {
  const reverseMapping: Record<string, string> = {
    barbell_bench_press: 'bench_press',
    squat: 'squat',
    deadlift: 'deadlift',
    overhead_press: 'overhead_press',
    barbell_row: 'row',
  };

  return reverseMapping[exerciseId] || null;
}

/**
 * Reverse normalize: convert engine equipment ID back to setup UI ID (for prefill)
 * Note: cable_machine -> cables (if needed), but most IDs are the same
 */
export function denormalizeEquipmentId(engineId: string): string {
  if (engineId === 'cable_machine') {
    return 'cable_machine'; // Keep as-is since UI now uses cable_machine
  }
  return engineId;
}
