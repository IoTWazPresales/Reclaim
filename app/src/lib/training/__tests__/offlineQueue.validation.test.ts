import { describe, expect, it } from 'vitest';
import { isValidOfflineQueuePayload } from '../offlineQueueSchema';

describe('offlineQueue payload validation', () => {
  it('accepts well-formed createSession op', () => {
    const q = [
      {
        type: 'createSession' as const,
        id: 's1',
        timestamp: '2026-01-01T00:00:00.000Z',
        payload: {
          mode: 'manual' as const,
          goals: {},
          startedAt: '2026-01-01T00:00:00.000Z',
        },
      },
    ];
    expect(isValidOfflineQueuePayload(q)).toBe(true);
  });

  it('rejects unknown type', () => {
    expect(isValidOfflineQueuePayload([{ type: 'bogus', timestamp: 't' }])).toBe(false);
  });

  it('rejects insertSetLog with bad payload shape', () => {
    expect(
      isValidOfflineQueuePayload([
        {
          type: 'insertSetLog',
          sessionItemId: 'i1',
          id: 'log1',
          timestamp: '2026-01-01T00:00:00.000Z',
          payload: { setIndex: 'x', weight: 1, reps: 1 },
        },
      ]),
    ).toBe(false);
  });
});
