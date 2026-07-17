import { describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async () => null),
    setItem: vi.fn(async () => undefined),
    removeItem: vi.fn(async () => undefined),
  },
}));

import type { InsightContext } from '../InsightEngine';
import { conditionsMatchContext } from '../InsightEngine';
import {
  acknowledgmentForPending,
  evaluateInsightVerifyLite,
  type InsightVerifyPending,
} from '../insightVerifyLite';

const basePending: InsightVerifyPending = {
  insightId: 'steps-sedentary-streak',
  intent: 'open_training',
  message: 'Set a 10-minute walk timer',
  executedAt: 1_000_000,
  matchedConditions: [{ field: 'steps.lastDay', op: 'lt', value: 2000 }],
};

describe('conditionsMatchContext', () => {
  it('returns true when all conditions still pass', () => {
    const ctx: InsightContext = { steps: { lastDay: 500 }, tags: [] };
    expect(conditionsMatchContext(ctx, basePending.matchedConditions)).toBe(true);
  });

  it('returns false when a driving condition cleared', () => {
    const ctx: InsightContext = { steps: { lastDay: 8000 }, tags: [] };
    expect(conditionsMatchContext(ctx, basePending.matchedConditions)).toBe(false);
  });
});

describe('evaluateInsightVerifyLite', () => {
  it('none when no pending', () => {
    expect(evaluateInsightVerifyLite({ pending: null, context: { tags: [] } }).status).toBe('none');
  });

  it('pending_too_soon when just executed', () => {
    const r = evaluateInsightVerifyLite({
      pending: basePending,
      context: { steps: { lastDay: 8000 }, tags: [] },
      nowTs: basePending.executedAt + 10_000,
      minAgeMs: 90_000,
    });
    expect(r.status).toBe('pending_too_soon');
  });

  it('still_active when conditions still match after min age', () => {
    const r = evaluateInsightVerifyLite({
      pending: basePending,
      context: { steps: { lastDay: 500 }, tags: [] },
      nowTs: basePending.executedAt + 120_000,
      minAgeMs: 90_000,
    });
    expect(r.status).toBe('still_active');
  });

  it('cleared with acknowledgment when conditions no longer match', () => {
    const r = evaluateInsightVerifyLite({
      pending: basePending,
      context: { steps: { lastDay: 9000 }, tags: [] },
      nowTs: basePending.executedAt + 120_000,
      minAgeMs: 90_000,
    });
    expect(r.status).toBe('cleared');
    if (r.status === 'cleared') {
      expect(r.acknowledgment.toLowerCase()).toContain('training');
      expect(acknowledgmentForPending(r.pending).length).toBeGreaterThan(10);
    }
  });

  it('expired after TTL', () => {
    const r = evaluateInsightVerifyLite({
      pending: basePending,
      context: { steps: { lastDay: 9000 }, tags: [] },
      nowTs: basePending.executedAt + 80 * 60 * 60 * 1000,
      ttlMs: 72 * 60 * 60 * 1000,
    });
    expect(r.status).toBe('expired');
  });
});
