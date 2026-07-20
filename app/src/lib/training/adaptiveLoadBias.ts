/**
 * Opt-in adaptive load bias — applied AFTER suggestLoading, never inside its formula.
 * Default OFF callers pass enabled=false → identity.
 */
import type { Exercise, UserState } from '@/lib/training/types';
import { getWeightStep } from '@/lib/training/progression';

/**
 * When adaptive training is enabled and fatigueProxy is elevated, gently reduce load.
 * With enabled=false, returns weight unchanged (byte-stable vs today).
 */
export function applyOptionalAdaptiveLoadBias(
  weight: number,
  exercise: Exercise,
  userState: UserState,
  enabled: boolean,
): { weight: number; reason?: string } {
  if (!enabled) return { weight };
  if (!Number.isFinite(weight) || weight <= 0) return { weight };

  const fatigue = userState.fatigueProxy;
  if (fatigue == null || fatigue < 0.45) {
    return { weight, reason: 'Adaptive on — no load change (fatigue not elevated).' };
  }

  const factor = 1 - Math.min(0.12, (fatigue - 0.45) * 0.25 + 0.05);
  const step = getWeightStep(exercise);
  const next = Math.max(0, Math.round((weight * factor) / step) * step);
  if (next === weight) {
    return { weight, reason: 'Adaptive on — suggestion already at step boundary.' };
  }
  return {
    weight: next,
    reason: `Adaptive suggestion: eased load (~${Math.round((1 - factor) * 100)}%) because fatigue looks elevated. Optional — turn off in Settings anytime.`,
  };
}
