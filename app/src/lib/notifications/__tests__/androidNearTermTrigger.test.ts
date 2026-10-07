import { describe, expect, it } from 'vitest';
import { androidDateTrigger, ANDROID_NEAR_TERM_MAX_SECONDS } from '@/lib/notifications/androidNearTermTrigger';

describe('androidDateTrigger', () => {
  const now = Date.parse('2026-10-07T12:00:00.000Z');

  it('uses a time interval for a rest due within 30 minutes', () => {
    const fireAt = new Date(now + 90_000);
    expect(androidDateTrigger(fireAt, now, 'training', 'timeInterval', 'calendar')).toEqual({
      type: 'timeInterval',
      seconds: 90,
      repeats: false,
      channelId: 'training',
    });
  });

  it('keeps a calendar trigger past 30 minutes', () => {
    const fireAt = new Date(now + (ANDROID_NEAR_TERM_MAX_SECONDS + 60) * 1000);
    const trigger = androidDateTrigger(fireAt, now, 'training', 'timeInterval', 'calendar');
    expect(trigger.type).toBe('calendar');
  });
});
