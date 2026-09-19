import { describe, expect, it } from 'vitest';
import { startupRouteTarget } from '@/startup/startupRouteTarget';

describe('startupRouteTarget', () => {
  it('does not send a retry probe to onboarding', () => {
    expect(startupRouteTarget(true, 'retry')).toBe('retry');
    expect(startupRouteTarget(true, 'retry')).not.toBe('onboarding');
  });

  it('keeps Welcome for a confirmed new profile', () => {
    expect(startupRouteTarget(true, 'no')).toBe('onboarding');
  });

  it('does not treat a signed-out session as retry', () => {
    expect(startupRouteTarget(false, 'retry')).toBe('auth');
  });
});
