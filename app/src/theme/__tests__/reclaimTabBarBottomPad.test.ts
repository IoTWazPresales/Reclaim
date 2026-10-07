import { describe, expect, it } from 'vitest';
import { reclaimTabBarBottomPad } from '@/theme/reclaimScreenLayout';

describe('reclaimTabBarBottomPad', () => {
  it('lifts a gesture inset and leaves a 3-button inset alone', () => {
    expect(reclaimTabBarBottomPad(63)).toBe(87);
    expect(reclaimTabBarBottomPad(126)).toBe(126);
    expect(reclaimTabBarBottomPad(0)).toBe(0);
  });
});
