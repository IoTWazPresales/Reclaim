import { describe, expect, it } from 'vitest';
import { getStaleSessionThresholdMs, STALE_SESSION_HOURS } from '@/lib/training/sessionUiConstants';
import {
  freezeElapsedSecondsFromStartedAt,
  isSessionStaleForResume,
} from '@/lib/training/staleSessionGuard';
import type { TrainingSessionItemRow } from '@/lib/api';

function itemWithSets(completedAts: string[]): TrainingSessionItemRow {
  return {
    id: 'item-1',
    exercise_id: 'ex-1',
    performed: {
      sets: completedAts.map((completedAt, i) => ({
        setIndex: i,
        weight: 60,
        reps: 8,
        completedAt,
      })),
    },
  } as TrainingSessionItemRow;
}

describe('sessionUiConstants / staleSessionGuard', () => {
  const hour = 60 * 60 * 1000;
  const now = Date.parse('2026-07-15T12:00:00.000Z');

  it('production threshold is STALE_SESSION_HOURS', () => {
    expect(STALE_SESSION_HOURS).toBe(5);
    expect(getStaleSessionThresholdMs({})).toBe(5 * hour);
  });

  it('__DEV__ minute override shortens threshold', () => {
    if (!__DEV__) return;
    expect(getStaleSessionThresholdMs({ EXPO_PUBLIC_STALE_SESSION_MINUTES: '5' })).toBe(5 * 60 * 1000);
  });

  it('is not stale when started within threshold', () => {
    const startedAt = new Date(now - 2 * hour).toISOString();
    expect(isSessionStaleForResume(startedAt, [], now, 5 * hour)).toBe(false);
  });

  it('is stale when started beyond threshold with no sets', () => {
    const startedAt = new Date(now - 6 * hour).toISOString();
    expect(isSessionStaleForResume(startedAt, [], now, 5 * hour)).toBe(true);
  });

  it('is not stale when a set was logged inside the window', () => {
    const startedAt = new Date(now - 10 * hour).toISOString();
    const recent = new Date(now - 1 * hour).toISOString();
    expect(isSessionStaleForResume(startedAt, [itemWithSets([recent])], now, 5 * hour)).toBe(false);
  });

  it('is stale when last set is also beyond threshold', () => {
    const startedAt = new Date(now - 10 * hour).toISOString();
    const oldSet = new Date(now - 8 * hour).toISOString();
    expect(isSessionStaleForResume(startedAt, [itemWithSets([oldSet])], now, 5 * hour)).toBe(true);
  });

  it('freezes elapsed from startedAt', () => {
    const startedAt = new Date(now - 90 * 60 * 1000).toISOString();
    expect(freezeElapsedSecondsFromStartedAt(startedAt, now)).toBe(90 * 60);
  });
});
