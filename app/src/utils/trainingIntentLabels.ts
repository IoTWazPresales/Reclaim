// Training Intent Labels - Human-readable labels for movement intents
import type { MovementIntent } from '@/lib/training/types';

/**
 * Map MovementIntent to human-readable label
 */
export function getIntentLabel(intent: MovementIntent): string {
  const mapping: Record<MovementIntent, string> = {
    horizontal_press: 'Push',
    vertical_press: 'Overhead',
    horizontal_pull: 'Row',
    vertical_pull: 'Pull',
    knee_dominant: 'Squat',
    hip_hinge: 'Hinge',
    elbow_extension: 'Triceps',
    elbow_flexion: 'Biceps',
    trunk_stability: 'Core',
    conditioning: 'Conditioning',
    carry: 'Carry',
  };
  return mapping[intent] || intent;
}

/**
 * Get priority order for intents (for sorting)
 * Lower index = higher priority
 */
const INTENT_PRIORITY_ORDER: MovementIntent[] = [
  'knee_dominant',
  'hip_hinge',
  'horizontal_press',
  'vertical_press',
  'horizontal_pull',
  'vertical_pull',
  'elbow_extension',
  'elbow_flexion',
  'trunk_stability',
  'conditioning',
  'carry',
];

/**
 * Get primary intent labels from an array of intents
 * - De-duplicates
 * - Sorts by importance (priority order)
 * - Returns up to max labels
 */
export function getPrimaryIntentLabels(intents: MovementIntent[], max: number = 2): string[] {
  if (!intents || intents.length === 0) return [];

  // De-duplicate
  const unique = Array.from(new Set(intents));

  // Sort by priority order
  const sorted = unique.sort((a, b) => {
    const idxA = INTENT_PRIORITY_ORDER.indexOf(a);
    const idxB = INTENT_PRIORITY_ORDER.indexOf(b);
    // If not in priority list, push to end
    if (idxA === -1 && idxB === -1) return 0;
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });

  // Take up to max and convert to labels
  return sorted.slice(0, max).map(getIntentLabel);
}
