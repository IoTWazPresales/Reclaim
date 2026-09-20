import { describe, expect, it } from 'vitest';
import {
  resolveDisplayClockOriginMs,
  staleHeaderClockLabel,
} from '@/lib/training/staleSessionTimerDisplay';

describe('stale session timer display (N-0016)', () => {
  const formatTime = (s: number) => `${s}s`;

  it('does not show wall-clock elapsed while the stale prompt is pending', () => {
    expect(staleHeaderClockLabel('pending', 945 * 60, formatTime)).toBe('Paused');
    expect(staleHeaderClockLabel('unevaluated', 100, formatTime)).toBe('Paused');
    expect(staleHeaderClockLabel('cleared', 12, formatTime)).toBe('12s');
  });

  it('has no clock origin while pending, so the live tick cannot run', () => {
    expect(
      resolveDisplayClockOriginMs({
        staleResumePrompt: 'pending',
        displayBoutOriginMs: null,
        startedAtMs: 1,
        nowMs: 99,
        isEnded: false,
      }),
    ).toBeNull();
  });

  it('after Resume uses a display bout origin, not started_at', () => {
    expect(
      resolveDisplayClockOriginMs({
        staleResumePrompt: 'cleared',
        displayBoutOriginMs: 50,
        startedAtMs: 1,
        nowMs: 99,
        isEnded: false,
      }),
    ).toBe(50);
  });

  it('non-stale sessions still clock from started_at', () => {
    expect(
      resolveDisplayClockOriginMs({
        staleResumePrompt: 'cleared',
        displayBoutOriginMs: null,
        startedAtMs: 10,
        nowMs: 99,
        isEnded: false,
      }),
    ).toBe(10);
  });
});
