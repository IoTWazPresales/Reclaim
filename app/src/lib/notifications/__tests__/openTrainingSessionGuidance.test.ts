import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findOpenTrainingSession: vi.fn(),
  stopGuidedSessionFgs: vi.fn(),
  clearIntentsByPrefix: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  findOpenTrainingSession: (...args: unknown[]) => mocks.findOpenTrainingSession(...args),
}));

vi.mock('@/lib/training/guidedSessionFgs', () => ({
  stopGuidedSessionFgs: (...args: unknown[]) => mocks.stopGuidedSessionFgs(...args),
}));

vi.mock('../NotificationIntentStore', () => ({
  setIntent: vi.fn(),
  clearIntent: vi.fn(),
  clearIntentsByPrefix: (...args: unknown[]) => mocks.clearIntentsByPrefix(...args),
  getIntent: vi.fn(),
  acknowledgeIntentDelivery: vi.fn(),
}));

vi.mock('../NotificationScheduler', () => ({
  reconcileNotifications: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  clearStaleTrainingIntentsIfNoActiveSession,
  isOpenTrainingSession,
} from '../trainingNotificationScheduler';

describe('isOpenTrainingSession', () => {
  it('keeps an unended session open after 12 hours', () => {
    const started = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(isOpenTrainingSession({ started_at: started, ended_at: null })).toBe(true);
  });

  it('rejects a finished session and a row that never started', () => {
    expect(
      isOpenTrainingSession({
        started_at: '2026-10-01T16:25:26.000Z',
        ended_at: '2026-10-01T17:00:00.000Z',
      }),
    ).toBe(false);
    expect(isOpenTrainingSession({ started_at: null, ended_at: null })).toBe(false);
    expect(isOpenTrainingSession(null)).toBe(false);
  });
});

describe('clearStaleTrainingIntentsIfNoActiveSession', () => {
  beforeEach(() => {
    mocks.findOpenTrainingSession.mockReset();
    mocks.stopGuidedSessionFgs.mockReset();
    mocks.clearIntentsByPrefix.mockReset();
    mocks.stopGuidedSessionFgs.mockResolvedValue(undefined);
    mocks.clearIntentsByPrefix.mockResolvedValue(undefined);
  });

  it('does not stop guidance for an unended session older than 12 hours', async () => {
    mocks.findOpenTrainingSession.mockResolvedValue({
      id: 'session-old',
      started_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      ended_at: null,
    });

    await clearStaleTrainingIntentsIfNoActiveSession();

    expect(mocks.clearIntentsByPrefix).not.toHaveBeenCalled();
    expect(mocks.stopGuidedSessionFgs).not.toHaveBeenCalled();
  });

  it('clears guidance only when no unended session exists', async () => {
    mocks.findOpenTrainingSession.mockResolvedValue(null);

    await clearStaleTrainingIntentsIfNoActiveSession();

    expect(mocks.clearIntentsByPrefix).toHaveBeenCalled();
    expect(mocks.stopGuidedSessionFgs).toHaveBeenCalledWith('no_active_session_stale_clear');
  });

  it('keeps guidance when the lookup fails', async () => {
    mocks.findOpenTrainingSession.mockRejectedValue(new Error('offline'));

    await clearStaleTrainingIntentsIfNoActiveSession();

    expect(mocks.clearIntentsByPrefix).not.toHaveBeenCalled();
    expect(mocks.stopGuidedSessionFgs).not.toHaveBeenCalled();
  });
});
