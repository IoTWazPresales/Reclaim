/**
 * Pure + light tests for FGS-alive rest-end timer guards and arm/cancel.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  armGuidedRestEndTimer,
  cancelAllGuidedRestEndTimers,
  cancelGuidedRestEndTimer,
  delayMsUntilRestEnd,
  getArmedGuidedRestEndSessionIds,
  shouldPresentGuidedRestEnd,
} from '@/lib/training/guidedRestEndTimer';
import { decideTrainingPromptPlan } from '@/lib/notifications/trainingTimedPlan';

describe('delayMsUntilRestEnd', () => {
  it('returns 0 when due or overdue', () => {
    expect(delayMsUntilRestEnd(1000, 1000)).toBe(0);
    expect(delayMsUntilRestEnd(1000, 1500)).toBe(0);
  });

  it('returns remaining ms when in the future', () => {
    expect(delayMsUntilRestEnd(5000, 2000)).toBe(3000);
  });
});

describe('shouldPresentGuidedRestEnd', () => {
  it('allows present when intent is live and unfired', () => {
    expect(
      shouldPresentGuidedRestEnd({
        intentExists: true,
        expectedFireAtMs: 1000,
        intentScheduledAtMs: 1000,
      }),
    ).toBe(true);
  });

  it('blocks when missing intent, fired, ended, or stale fireAt', () => {
    expect(
      shouldPresentGuidedRestEnd({
        intentExists: false,
        expectedFireAtMs: 1000,
      }),
    ).toBe(false);
    expect(
      shouldPresentGuidedRestEnd({
        intentExists: true,
        firedAt: '2026-07-24T10:00:00.000Z',
        expectedFireAtMs: 1000,
      }),
    ).toBe(false);
    expect(
      shouldPresentGuidedRestEnd({
        intentExists: true,
        sessionEnded: true,
        expectedFireAtMs: 1000,
      }),
    ).toBe(false);
    expect(
      shouldPresentGuidedRestEnd({
        intentExists: true,
        expectedFireAtMs: 1000,
        intentScheduledAtMs: 20_000,
      }),
    ).toBe(false);
  });
});

describe('decideTrainingPromptPlan deliverNow (U3)', () => {
  it('emits immediate on timed OS id when deliverNow is set', () => {
    const decision = decideTrainingPromptPlan({
      type: 'TRAINING_SET',
      sessionId: 'sess-1',
      scheduledAt: '2026-07-24T10:00:00.000Z',
      deliverNow: true,
      title: 'Rest complete',
      body: 'Next',
    });
    expect(decision.action).toBe('immediate');
    if (decision.action !== 'immediate') return;
    expect(decision.identifier).toBe('reclaim-training-at-sess-1');
    expect(decision.trigger).toBeNull();
    expect(decision.data.scheduledAt).toBe('2026-07-24T10:00:00.000Z');
    expect(decision.data.deliverNow).toBe(true);
  });

  it('still skips deliverNow when firedAt is set', () => {
    const decision = decideTrainingPromptPlan({
      type: 'TRAINING_SET',
      sessionId: 'sess-1',
      scheduledAt: '2026-07-24T10:00:00.000Z',
      deliverNow: true,
      firedAt: '2026-07-24T10:00:01.000Z',
      title: 'Rest complete',
      body: 'Next',
    });
    expect(decision).toEqual({ action: 'skip', reason: 'timed_firedAt' });
  });
});

describe('arm / cancel guided rest-end timer', () => {
  afterEach(() => {
    cancelAllGuidedRestEndTimers('test_cleanup');
    vi.useRealTimers();
  });

  it('arms and cancels by session id without firing', () => {
    vi.useFakeTimers();
    // Keep fireAt in the future so setTimeout does not invoke the Expo-backed fire path.
    armGuidedRestEndTimer('sess-a', Date.now() + 60_000);
    expect(getArmedGuidedRestEndSessionIds()).toEqual(['sess-a']);
    cancelGuidedRestEndTimer('sess-a', 'test');
    expect(getArmedGuidedRestEndSessionIds()).toEqual([]);
  });

  it('replaces an existing arm for the same session', () => {
    vi.useFakeTimers();
    armGuidedRestEndTimer('sess-b', Date.now() + 30_000);
    armGuidedRestEndTimer('sess-b', Date.now() + 90_000);
    expect(getArmedGuidedRestEndSessionIds()).toEqual(['sess-b']);
    cancelGuidedRestEndTimer('sess-b', 'test');
    expect(getArmedGuidedRestEndSessionIds()).toEqual([]);
  });
});
