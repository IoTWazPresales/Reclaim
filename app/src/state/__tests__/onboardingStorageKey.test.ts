import { describe, expect, it } from 'vitest';
import { onboardingStorageKey } from '@/state/onboarding';

describe('onboarding storage key', () => {
  it('stays inside the SecureStore alphabet so the local flag can be saved', () => {
    const key = onboardingStorageKey('11111111-2222-3333-4444-555555555555');
    expect(key).toBe('reclaim_has_onboarded_v1_11111111-2222-3333-4444-555555555555');
    expect(key).toMatch(/^[A-Za-z0-9._-]+$/);
  });
});
