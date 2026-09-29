import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  samePromptIdentity,
  shouldDismissNowSlotAfterTimedDelivery,
} from '@/lib/notifications/promptIdentity';

describe('prompt identity', () => {
  it('matches a revision and rejects a replacement', () => {
    const before = { revision: 'a:1', issuedAt: 't1', scheduledAt: 's1' };
    expect(samePromptIdentity(before, { ...before })).toBe(true);
    expect(samePromptIdentity(before, { revision: 'a:2', issuedAt: 't1', scheduledAt: 's1' })).toBe(false);
  });

  it('matches a legacy row by issued and scheduled time', () => {
    const before = { issuedAt: 't1', scheduledAt: 's1' };
    expect(samePromptIdentity(before, { ...before })).toBe(true);
    expect(samePromptIdentity(before, { issuedAt: 't2', scheduledAt: 's1' })).toBe(false);
    expect(samePromptIdentity(null, before)).toBe(false);
  });

  it('dismisses only the captured now prompt', () => {
    const rest = { revision: 'a:1', issuedAt: 't1' };
    const newer = { revision: 'a:2', issuedAt: 't2' };
    expect(shouldDismissNowSlotAfterTimedDelivery(rest, rest)).toBe(true);
    expect(shouldDismissNowSlotAfterTimedDelivery(rest, null)).toBe(true);
    expect(shouldDismissNowSlotAfterTimedDelivery(rest, newer)).toBe(false);
    expect(shouldDismissNowSlotAfterTimedDelivery(null, newer)).toBe(false);
    expect(shouldDismissNowSlotAfterTimedDelivery(null, null)).toBe(false);
  });
});

describe('rest-end dismiss wiring', () => {
  it('checks now-slot identity before either dismiss path', () => {
    const timer = readFileSync(join(process.cwd(), 'src/lib/training/guidedRestEndTimer.ts'), 'utf8');
    const hook = readFileSync(join(process.cwd(), 'src/hooks/useNotifications.ts'), 'utf8');
    expect(timer).toContain('setIntentIfCurrent');
    expect(timer).not.toContain('scheduleNotificationAsync(');
    expect(timer).not.toContain('cancelScheduledNotificationAsync(');
    const receive = hook.slice(hook.indexOf('addNotificationReceivedListener'));
    const mark = receive.indexOf('await markTrainingTimedPromptFired');
    const gate = receive.indexOf('if (!shouldDismissNowSlotAfterTimedDelivery');
    const dismiss = receive.indexOf('await dismissTrainingNowPresented');
    expect(mark).toBeGreaterThan(0);
    expect(gate).toBeGreaterThan(mark);
    expect(dismiss).toBeGreaterThan(gate);
  });
});
