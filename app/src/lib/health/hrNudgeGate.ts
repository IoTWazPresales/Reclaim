/**
 * Heart-rate nudge gate — phone-only Health Connect polling, evaluated
 * honestly: checks run on a ~15 minute interval, so this never pretends to be
 * real-time monitoring.
 *
 * Fire condition: heart rate sustained above (resting baseline + delta) across
 * the recent samples in the check window, while step data (when readable) says
 * the user is inactive. Debounced to at most one nudge per 2 hours; silent
 * during quiet hours.
 */

export const HR_NUDGE_DELTA_BPM = 35;
/** Minimum samples in the window to call the elevation "sustained". */
export const HR_NUDGE_MIN_SAMPLES = 2;
/** Steps within the check window at or below this count as "inactive". */
export const HR_NUDGE_INACTIVE_STEP_LIMIT = 60;
/** Max one nudge per 2 hours. */
export const HR_NUDGE_DEBOUNCE_MS = 2 * 60 * 60 * 1000;
/** How often the check runs (surfaced verbatim in settings copy — keep honest). */
export const HR_NUDGE_CHECK_INTERVAL_MS = 15 * 60 * 1000;

export type HrNudgeSample = { bpm: number; atMs: number };

export type HrNudgeEvaluation =
  | { fire: true; avgBpm: number; thresholdBpm: number }
  | { fire: false; reason:
      | 'quiet_hours'
      | 'debounced'
      | 'no_resting_baseline'
      | 'not_enough_samples'
      | 'not_sustained'
      | 'user_active' };

export function evaluateHrNudge(args: {
  /** Samples inside the current check window. */
  samples: HrNudgeSample[];
  /** Resting-HR baseline (median bpm); null when no baseline data yet. */
  restingBpm: number | null;
  /** Steps counted inside the check window; null when step data is unreadable. */
  stepsInWindow: number | null;
  nowMs: number;
  lastNudgeAtMs: number | null;
  inQuietHours: boolean;
  deltaBpm?: number;
  minSamples?: number;
  inactiveStepLimit?: number;
  debounceMs?: number;
}): HrNudgeEvaluation {
  const delta = args.deltaBpm ?? HR_NUDGE_DELTA_BPM;
  const minSamples = args.minSamples ?? HR_NUDGE_MIN_SAMPLES;
  const stepLimit = args.inactiveStepLimit ?? HR_NUDGE_INACTIVE_STEP_LIMIT;
  const debounceMs = args.debounceMs ?? HR_NUDGE_DEBOUNCE_MS;

  if (args.inQuietHours) return { fire: false, reason: 'quiet_hours' };
  if (args.lastNudgeAtMs != null && args.nowMs - args.lastNudgeAtMs < debounceMs) {
    return { fire: false, reason: 'debounced' };
  }
  if (args.restingBpm == null || !Number.isFinite(args.restingBpm)) {
    return { fire: false, reason: 'no_resting_baseline' };
  }

  const valid = args.samples.filter((s) => Number.isFinite(s.bpm) && s.bpm > 0);
  if (valid.length < minSamples) return { fire: false, reason: 'not_enough_samples' };

  const thresholdBpm = args.restingBpm + delta;
  const sustained = valid.every((s) => s.bpm > thresholdBpm);
  if (!sustained) return { fire: false, reason: 'not_sustained' };

  if (args.stepsInWindow != null && args.stepsInWindow > stepLimit) {
    return { fire: false, reason: 'user_active' };
  }

  const avgBpm = Math.round(valid.reduce((sum, s) => sum + s.bpm, 0) / valid.length);
  return { fire: true, avgBpm, thresholdBpm: Math.round(thresholdBpm) };
}
