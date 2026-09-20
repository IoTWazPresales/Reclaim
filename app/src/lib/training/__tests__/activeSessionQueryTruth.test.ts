import { describe, expect, it } from 'vitest';
import {
  isPostSetupReconcileActive,
  POST_SETUP_RECONCILE_MS,
  resolveActiveSessionViewState,
} from '@/lib/training/activeSessionQueryTruth';

describe('active session query truth (N-0007)', () => {
  it('does not spinner after a settled empty query', () => {
    expect(
      resolveActiveSessionViewState('sess-1', {
        status: 'success',
        isError: false,
        data: null,
      }),
    ).toBe('missing');
    expect(
      resolveActiveSessionViewState('sess-1', {
        status: 'success',
        isError: false,
        data: { session: undefined },
      }),
    ).toBe('missing');
  });

  it('shows the session when payload exists, even if status is still fetching-shaped', () => {
    expect(
      resolveActiveSessionViewState('sess-1', {
        status: 'success',
        isError: false,
        data: { session: { id: 'sess-1' } },
      }),
    ).toBe('ready');
  });

  it('shows error instead of spinner when the query failed', () => {
    expect(
      resolveActiveSessionViewState('sess-1', {
        status: 'error',
        isError: true,
        data: undefined,
      }),
    ).toBe('error');
  });

  it('loads only while pending without a payload', () => {
    expect(
      resolveActiveSessionViewState('sess-1', {
        status: 'pending',
        isError: false,
        data: undefined,
      }),
    ).toBe('loading');
    expect(
      resolveActiveSessionViewState(null, {
        status: 'pending',
        isError: false,
        data: undefined,
      }),
    ).toBe('none');
  });

  it('caps post-setup reconcile with a timer', () => {
    expect(isPostSetupReconcileActive(1000, 1000 + POST_SETUP_RECONCILE_MS - 1)).toBe(true);
    expect(isPostSetupReconcileActive(1000, 1000 + POST_SETUP_RECONCILE_MS)).toBe(false);
    expect(isPostSetupReconcileActive(null, 5000)).toBe(false);
  });
});
