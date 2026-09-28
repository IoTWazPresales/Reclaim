import { beforeEach, describe, expect, it, vi } from 'vitest';

const storage = vi.hoisted(() => ({
  getItemScoped: vi.fn(),
  setItemScoped: vi.fn(),
}));
const sentry = vi.hoisted(() => ({
  captureU5SentryEvent: vi.fn(),
  names: {
    assignmentCreated: 'reclaim.u5.experiment.assignment_created.v1',
    completionRecorded: 'reclaim.u5.experiment.completion_recorded.v1',
  },
}));

vi.mock('@/persistence/ScopedStorage', () => storage);
vi.mock('../u5SentryEvents', () => ({
  captureU5SentryEvent: sentry.captureU5SentryEvent,
  U5_SENTRY_EVENT_NAMES: sentry.names,
}));

import {
  ensureEveningWindDownAssignment,
  logEveningWindDownCompletion,
} from '../behavioralExperiment';

describe('behavioral experiment telemetry boundaries', () => {
  beforeEach(() => {
    storage.getItemScoped.mockReset();
    storage.setItemScoped.mockReset();
    sentry.captureU5SentryEvent.mockReset();
    storage.setItemScoped.mockResolvedValue(undefined);
  });

  it('captures assignment creation only after its local write succeeds', async () => {
    storage.getItemScoped.mockResolvedValue(null);

    await ensureEveningWindDownAssignment('user-1');

    expect(storage.setItemScoped).toHaveBeenCalledOnce();
    expect(sentry.captureU5SentryEvent).toHaveBeenCalledWith(
      sentry.names.assignmentCreated,
      { durationDays: 14 },
    );
    expect(storage.setItemScoped.mock.invocationCallOrder[0]).toBeLessThan(
      sentry.captureU5SentryEvent.mock.invocationCallOrder[0],
    );
  });

  it('does not capture an assignment when the local write fails', async () => {
    storage.getItemScoped.mockResolvedValue(null);
    storage.setItemScoped.mockRejectedValue(new Error('write failed'));

    await expect(ensureEveningWindDownAssignment('user-1')).rejects.toThrow('write failed');
    expect(sentry.captureU5SentryEvent).not.toHaveBeenCalled();
  });

  it('captures a new completion after persistence and ignores a duplicate day', async () => {
    const current = {
      experimentId: 'evening_wind_down',
      startedAt: '2026-09-01T00:00:00.000Z',
      completions: [],
    };
    storage.getItemScoped
      .mockResolvedValueOnce(JSON.stringify({ evening_wind_down: current }))
      .mockResolvedValueOnce(
        JSON.stringify({
          evening_wind_down: { ...current, completions: ['2026-09-22'] },
        }),
      );

    await logEveningWindDownCompletion('user-1', '2026-09-22');
    await logEveningWindDownCompletion('user-1', '2026-09-22');

    expect(storage.setItemScoped).toHaveBeenCalledOnce();
    expect(sentry.captureU5SentryEvent).toHaveBeenCalledOnce();
    expect(sentry.captureU5SentryEvent).toHaveBeenCalledWith(
      sentry.names.completionRecorded,
      { completionCount: 1 },
    );
    expect(storage.setItemScoped.mock.invocationCallOrder[0]).toBeLessThan(
      sentry.captureU5SentryEvent.mock.invocationCallOrder[0],
    );
  });
});
