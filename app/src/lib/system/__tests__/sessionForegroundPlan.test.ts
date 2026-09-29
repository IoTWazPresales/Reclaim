import { describe, expect, it } from 'vitest';
import { planSessionForegroundStart } from '@/lib/system/sessionForegroundPlan';

describe('planSessionForegroundStart', () => {
  it('starts when nothing is running', () => {
    expect(
      planSessionForegroundStart('guided', 's1', { running: false, domain: null, sessionId: null }),
    ).toBe('start');
  });

  it('does not restart the same domain and session', () => {
    expect(
      planSessionForegroundStart('guided', 's1', { running: true, domain: 'guided', sessionId: 's1' }),
    ).toBe('already-running');
  });

  it('refuses a different domain', () => {
    expect(
      planSessionForegroundStart('mindfulness', 's2', {
        running: true,
        domain: 'guided',
        sessionId: 's1',
      }),
    ).toBe('refuse-other-domain');
  });

  it('replaces another session of the same domain', () => {
    expect(
      planSessionForegroundStart('meditation', 's2', {
        running: true,
        domain: 'meditation',
        sessionId: 's1',
      }),
    ).toBe('replace-own-session');
  });
});
