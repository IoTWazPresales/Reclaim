import { describe, it, expect } from 'vitest';
import {
  mergedPlanSatisfiesNativeScheduledPresence,
  plannedNotificationExpectsNativeScheduledEntry,
} from '../notificationPlanTrigger';

describe('plannedNotificationExpectsNativeScheduledEntry (P0-2 reconcile)', () => {
  it('returns false for immediate (null trigger) so reconcile does not require a native scheduled row', () => {
    expect(plannedNotificationExpectsNativeScheduledEntry({ trigger: null as any })).toBe(false);
  });

  it('returns true for interval triggers', () => {
    expect(
      plannedNotificationExpectsNativeScheduledEntry({
        logicalKey: 'training_set:s1:ex:2',
        title: 'Rest complete',
        body: 'x',
        data: { type: 'TRAINING_SET' },
        trigger: { seconds: 90, repeats: false } as any,
      }),
    ).toBe(true);
  });

  it('returns true for calendar date triggers', () => {
    expect(
      plannedNotificationExpectsNativeScheduledEntry({
        trigger: { date: new Date('2026-01-01T12:00:00.000Z') } as any,
      }),
    ).toBe(true);
  });
});

describe('mergedPlanSatisfiesNativeScheduledPresence (P0-2 first-set / immediate replay)', () => {
  it('allows fast-path when only immediate training_first remains and native queue is empty', () => {
    const merged = [
      { logicalKey: 'training_first:sess1:ex1:1', trigger: null as any },
    ];
    expect(mergedPlanSatisfiesNativeScheduledPresence(merged, new Set())).toBe(true);
  });

  it('requires native row for delayed training_set even if plan also has immediate', () => {
    const merged = [
      { logicalKey: 'training_first:sess1:ex1:1', trigger: null as any },
      { logicalKey: 'training_set:sess1:ex1:2', trigger: { seconds: 90, repeats: false } as any },
    ];
    expect(mergedPlanSatisfiesNativeScheduledPresence(merged, new Set())).toBe(false);
    expect(
      mergedPlanSatisfiesNativeScheduledPresence(merged, new Set(['training_set:sess1:ex1:2'])),
    ).toBe(true);
  });
});
