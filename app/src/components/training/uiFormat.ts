/**
 * UI Display Formatting Helpers for Training Components
 * Pure formatting functions - no business logic, only string display
 */

/**
 * Format weight for display: "60kg" (removes unnecessary .0)
 * Still allows decimals if truly needed (e.g., 2.5kg increments)
 */
export function formatWeight(weight: number): string {
  // Round to nearest integer if it's a whole number, otherwise keep 1 decimal
  if (Math.round(weight) === weight) {
    return `${Math.round(weight)}kg`;
  }
  return `${weight.toFixed(1)}kg`;
}

/**
 * Format reps for display: "× 8" consistently
 */
export function formatReps(reps: number): string {
  return `× ${reps}`;
}

/**
 * Format rest time for display: "90s" consistently
 */
export function formatRest(seconds: number): string {
  return `${seconds}s`;
}

/**
 * Format duration for display: "56 min" consistently
 */
export function formatDuration(minutes: number): string {
  return `${Math.round(minutes)} min`;
}

/**
 * Format weight × reps for display: "60kg × 8"
 */
export function formatWeightReps(weight: number, reps: number): string {
  return `${formatWeight(weight)} ${formatReps(reps)}`;
}
