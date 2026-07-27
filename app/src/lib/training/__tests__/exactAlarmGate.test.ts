import { describe, expect, it } from 'vitest';
import { shouldPromptExactAlarm } from '@/lib/training/exactAlarmGate';

describe('shouldPromptExactAlarm', () => {
  it('never prompts off android', () => {
    expect(shouldPromptExactAlarm({ platform: 'ios', allowed: false, snoozed: false })).toBe(false);
  });

  it('does not prompt when exact alarms are allowed', () => {
    expect(shouldPromptExactAlarm({ platform: 'android', allowed: true, snoozed: false })).toBe(false);
  });

  it('does not prompt when native check is unavailable', () => {
    expect(shouldPromptExactAlarm({ platform: 'android', allowed: null, snoozed: false })).toBe(false);
  });

  it('does not prompt when user snoozed', () => {
    expect(shouldPromptExactAlarm({ platform: 'android', allowed: false, snoozed: true })).toBe(false);
  });

  it('prompts when denied and not snoozed', () => {
    expect(shouldPromptExactAlarm({ platform: 'android', allowed: false, snoozed: false })).toBe(true);
  });
});
