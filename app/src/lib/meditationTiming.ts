// C:\Reclaim\app\src\lib\meditationTiming.ts

import type { MeditationScriptStep } from './meditations';

/**
 * Step boundary information for timing-based progression.
 * Boundaries are cumulative: boundary[i] is the end-ms of the i-th timed segment.
 * scriptIndices[i] maps boundary i back to the original script step index.
 */
export type StepBoundaries = {
  boundaries: number[];
  scriptIndices: number[];
  totalDurationMs: number;
  stepCount: number;
};

/**
 * Build cumulative step boundaries from steps with seconds.
 * Steps without seconds are skipped in boundary calculation (handled by legacy TTS-driven progression).
 */
export function buildStepBoundaries(steps: MeditationScriptStep[]): StepBoundaries {
  const boundaries: number[] = [];
  const scriptIndices: number[] = [];
  let cumulative = 0;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (typeof step.seconds === 'number' && step.seconds > 0) {
      cumulative += step.seconds * 1000;
      boundaries.push(cumulative);
      scriptIndices.push(i);
    }
  }

  return {
    boundaries,
    scriptIndices,
    totalDurationMs: cumulative,
    stepCount: steps.length,
  };
}

/**
 * Get the current step index based on elapsed time and step boundaries.
 * Returns the index of the step that should be active at the given elapsed time.
 * 
 * For steps without seconds, returns the last step index with seconds, or 0 if none.
 */
export function getStepIndexForElapsed(
  boundaries: StepBoundaries,
  elapsedMs: number,
  steps: MeditationScriptStep[]
): number {
  if (boundaries.boundaries.length === 0) {
    return 0;
  }

  for (let i = 0; i < boundaries.boundaries.length; i++) {
    if (elapsedMs < boundaries.boundaries[i]) {
      return boundaries.scriptIndices[i];
    }
  }

  const lastTimedIdx = boundaries.scriptIndices[boundaries.scriptIndices.length - 1];
  return Math.min(lastTimedIdx, steps.length - 1);
}

/**
 * Get the elapsed time (ms) when a specific step should start.
 * Returns 0 for step 0, or the boundary for step N-1 for step N.
 */
export function getStepStartElapsedMs(boundaries: StepBoundaries, stepIndex: number): number {
  if (stepIndex === 0) return 0;
  if (stepIndex - 1 < boundaries.boundaries.length) {
    return boundaries.boundaries[stepIndex - 1];
  }
  // Step beyond boundaries, return last boundary
  return boundaries.boundaries[boundaries.boundaries.length - 1] ?? 0;
}

/**
 * Check if a step has seconds defined (is timing-based).
 */
export function hasStepSeconds(step: MeditationScriptStep): boolean {
  return typeof step.seconds === 'number' && step.seconds > 0;
}

/**
 * Check if all steps in a script have seconds (fully timing-based).
 */
export function isFullyTimingBased(steps: MeditationScriptStep[]): boolean {
  return steps.length > 0 && steps.every(hasStepSeconds);
}
