// C:\Reclaim\app\src\state\onboarding.test.ts

import { describe, it, expect } from 'vitest';

/**
 * Compute effective onboarding status: monotonic (local || remote === true)
 * This ensures we never downgrade once true, and treat remote unknown as unknown.
 */
export function computeEffectiveOnboarding(
  localHasOnboarded: boolean,
  remoteOnboarded: true | false | null
): boolean {
  return localHasOnboarded || remoteOnboarded === true;
}

describe('computeEffectiveOnboarding', () => {
  it('should return true when local is true', () => {
    expect(computeEffectiveOnboarding(true, null)).toBe(true);
    expect(computeEffectiveOnboarding(true, false)).toBe(true);
    expect(computeEffectiveOnboarding(true, true)).toBe(true);
  });

  it('should return true when remote is true (even if local false)', () => {
    expect(computeEffectiveOnboarding(false, true)).toBe(true);
  });

  it('should return false when local false and remote false', () => {
    expect(computeEffectiveOnboarding(false, false)).toBe(false);
  });

  it('should return false when local false and remote unknown (null)', () => {
    expect(computeEffectiveOnboarding(false, null)).toBe(false);
  });

  it('should be monotonic: once true, always true', () => {
    // If local becomes true, effective is always true regardless of remote
    expect(computeEffectiveOnboarding(true, false)).toBe(true);
    expect(computeEffectiveOnboarding(true, null)).toBe(true);
  });
});
