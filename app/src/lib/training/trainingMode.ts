import type { SessionTemplate } from './types';

export type TrainingMode = 'strength' | 'running' | 'hybrid';

export type RunningGoal = '5k' | '10k' | 'custom';

const MODES: readonly TrainingMode[] = ['strength', 'running', 'hybrid'];

/** Missing or unknown mode is strength, so existing profiles keep the lifting plan. */
export function resolveTrainingMode(value: unknown): TrainingMode {
  if (typeof value === 'string' && (MODES as readonly string[]).includes(value)) {
    return value as TrainingMode;
  }
  return 'strength';
}

export function resolveRunningGoal(value: unknown): RunningGoal | undefined {
  if (value === '5k' || value === '10k' || value === 'custom') return value;
  return undefined;
}

/** A typed distance in kilometres. Not a pace, and not a session duration. */
export function resolveRunningDistanceKm(value: unknown): number | undefined {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n;
}

/** Push, pull, and upper are the non-leg templates. A run is not placed on legs, lower, or full body. */
export function isNonLegTrainingTemplate(template: SessionTemplate): boolean {
  return template === 'push' || template === 'pull' || template === 'upper';
}

export type SetupStep = 'goals' | 'schedule' | 'equipment' | 'constraints' | 'baselines' | 'complete';

/** Running does not walk through lifting equipment, constraints, or strength baselines. */
export function nextSetupStep(step: SetupStep, mode: TrainingMode): SetupStep | 'save' {
  if (step === 'goals') return 'schedule';
  if (step === 'schedule') return mode === 'running' ? 'save' : 'equipment';
  if (step === 'equipment') return 'constraints';
  if (step === 'constraints') return 'baselines';
  if (step === 'baselines') return 'save';
  return 'save';
}

export function prevSetupStep(step: SetupStep, mode: TrainingMode): SetupStep {
  if (step === 'schedule') return 'goals';
  if (step === 'equipment') return 'schedule';
  if (step === 'constraints') return mode === 'running' ? 'schedule' : 'equipment';
  if (step === 'baselines') return 'constraints';
  return 'goals';
}
