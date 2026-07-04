import { describe, it, expect } from 'vitest';
import {
  evaluateHrNudge,
  HR_NUDGE_DEBOUNCE_MS,
  HR_NUDGE_DELTA_BPM,
  HR_NUDGE_INACTIVE_STEP_LIMIT,
} from './hrNudgeGate';

const NOW = Date.parse('2026-07-03T14:00:00.000Z');
const resting = 62;
const elevated = resting + HR_NUDGE_DELTA_BPM + 5; // 102

const samplesAt = (...bpms: number[]) =>
  bpms.map((bpm, i) => ({ bpm, atMs: NOW - (bpms.length - i) * 60_000 }));

const base = {
  samples: samplesAt(elevated, elevated + 2, elevated + 1),
  restingBpm: resting,
  stepsInWindow: 10,
  nowMs: NOW,
  lastNudgeAtMs: null,
  inQuietHours: false,
};

describe('evaluateHrNudge', () => {
  it('fires when HR is sustained above resting + 35 while inactive', () => {
    const r = evaluateHrNudge(base);
    expect(r.fire).toBe(true);
    if (r.fire) {
      expect(r.thresholdBpm).toBe(resting + HR_NUDGE_DELTA_BPM);
      expect(r.avgBpm).toBeGreaterThan(resting + HR_NUDGE_DELTA_BPM);
    }
  });

  it('does not fire when any recent sample sits below the threshold (not sustained)', () => {
    const r = evaluateHrNudge({ ...base, samples: samplesAt(elevated, resting + 10, elevated) });
    expect(r).toEqual({ fire: false, reason: 'not_sustained' });
  });

  it('does not fire while the user is active (steps above the limit)', () => {
    const r = evaluateHrNudge({ ...base, stepsInWindow: HR_NUDGE_INACTIVE_STEP_LIMIT + 200 });
    expect(r).toEqual({ fire: false, reason: 'user_active' });
  });

  it('unknown step data (no permission) does not block a sustained elevation', () => {
    const r = evaluateHrNudge({ ...base, stepsInWindow: null });
    expect(r.fire).toBe(true);
  });

  it('debounces to at most one nudge per 2 hours', () => {
    const oneHourAgo = NOW - 60 * 60 * 1000;
    expect(evaluateHrNudge({ ...base, lastNudgeAtMs: oneHourAgo })).toEqual({
      fire: false,
      reason: 'debounced',
    });
    const justOverTwoHoursAgo = NOW - HR_NUDGE_DEBOUNCE_MS - 1;
    expect(evaluateHrNudge({ ...base, lastNudgeAtMs: justOverTwoHoursAgo }).fire).toBe(true);
  });

  it('respects quiet hours', () => {
    expect(evaluateHrNudge({ ...base, inQuietHours: true })).toEqual({
      fire: false,
      reason: 'quiet_hours',
    });
  });

  it('never fires without a resting baseline (no fake thresholds)', () => {
    expect(evaluateHrNudge({ ...base, restingBpm: null })).toEqual({
      fire: false,
      reason: 'no_resting_baseline',
    });
  });

  it('requires at least two samples to call it sustained', () => {
    expect(evaluateHrNudge({ ...base, samples: samplesAt(elevated) })).toEqual({
      fire: false,
      reason: 'not_enough_samples',
    });
  });
});
