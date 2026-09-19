import { describe, expect, it } from 'vitest';
import { resolveOnboardStatusFromRemote } from '@/lib/resolveOnboardStatus';

describe('resolveOnboardStatusFromRemote', () => {
  it('does not force onboarding when the remote query times out', () => {
    expect(
      resolveOnboardStatusFromRemote({
        data: null,
        error: { message: 'timeout' },
      }),
    ).toBe('retry');
  });

  it('retries on a transport error', () => {
    expect(
      resolveOnboardStatusFromRemote({
        data: null,
        error: { message: 'Failed to fetch' },
      }),
    ).toBe('retry');
  });

  it('returns yes when remote has_onboarded is true', () => {
    expect(
      resolveOnboardStatusFromRemote({
        data: { has_onboarded: true },
        error: null,
      }),
    ).toBe('yes');
  });

  it('returns no for a new-user row (false)', () => {
    expect(
      resolveOnboardStatusFromRemote({
        data: { has_onboarded: false },
        error: null,
      }),
    ).toBe('no');
  });

  it('returns no when there is no profile row', () => {
    expect(resolveOnboardStatusFromRemote({ data: null, error: null })).toBe('no');
  });
});
