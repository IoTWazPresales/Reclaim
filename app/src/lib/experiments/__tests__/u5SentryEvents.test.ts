import { beforeEach, describe, expect, it, vi } from 'vitest';

const sentry = vi.hoisted(() => ({ captureEvent: vi.fn() }));

vi.mock('@/lib/sentry', () => ({
  Sentry: { captureEvent: sentry.captureEvent },
}));

import { captureU5SentryEvent, U5_SENTRY_EVENT_NAMES } from '../u5SentryEvents';

describe('U5 Sentry event schema', () => {
  beforeEach(() => {
    sentry.captureEvent.mockReset();
  });

  it('keeps every event name in the closed versioned namespace', () => {
    expect(Object.values(U5_SENTRY_EVENT_NAMES)).toHaveLength(3);
    for (const name of Object.values(U5_SENTRY_EVENT_NAMES)) {
      expect(name).toMatch(/^reclaim\.u5\.experiment\.[a-z_]+\.v1$/);
    }
  });

  it('captures the closed name and stable schema tags without identity data', () => {
    captureU5SentryEvent(U5_SENTRY_EVENT_NAMES.completionRecorded, {
      completionCount: 2,
    });

    expect(sentry.captureEvent).toHaveBeenCalledWith({
      message: U5_SENTRY_EVENT_NAMES.completionRecorded,
      level: 'info',
      tags: {
        event_name: U5_SENTRY_EVENT_NAMES.completionRecorded,
        event_schema_version: '1',
        feature: 'behavioral_experiment',
        experiment_id: 'evening_wind_down',
      },
      contexts: {
        experiment: { completionCount: 2 },
      },
    });
  });
});
