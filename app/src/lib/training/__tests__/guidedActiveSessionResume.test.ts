import { describe, expect, it, vi } from 'vitest';
import type { TrainingSessionRow } from '@/lib/api';
import {
  evaluateGuidedActiveSessionResume,
  GUIDED_SNAPSHOT_MAX_AGE_MS,
  isGuidedNotificationSession,
} from '../guidedActiveSessionResume';
import type { GuidedActiveSessionSnapshot } from '../guidedActiveSessionSnapshot';

const mkSnap = (over: Partial<GuidedActiveSessionSnapshot> = {}): GuidedActiveSessionSnapshot => ({
  schemaVersion: 1,
  sessionId: 'sess-a',
  sessionItemId: 'item-1',
  exerciseId: 'ex-1',
  exerciseName: 'Squat',
  currentExerciseIndex: 0,
  currentSetIndex: 2,
  phase: 'work',
  restStartedAtIso: null,
  restEndsAtIso: null,
  restSecondsRemaining: null,
  notificationMode: 'guided',
  updatedAt: new Date().toISOString(),
  ...over,
});

const mkRow = (over: Partial<TrainingSessionRow>): TrainingSessionRow =>
  ({
    id: 'sess-a',
    user_id: 'u1',
    started_at: new Date().toISOString(),
    ended_at: null,
    decision_trace: { notificationMode: 'guided' },
    ...over,
  }) as TrainingSessionRow;

describe('guidedActiveSessionResume', () => {
  it('isGuidedNotificationSession detects camelCase and snake_case', () => {
    expect(isGuidedNotificationSession({ decision_trace: { notificationMode: 'guided' } })).toBe(true);
    expect(isGuidedNotificationSession({ decision_trace: { notification_mode: 'guided' } })).toBe(true);
    expect(isGuidedNotificationSession({ decision_trace: { notificationMode: 'normal' } })).toBe(false);
    expect(isGuidedNotificationSession({ decision_trace: null })).toBe(false);
  });

  it('skips when no snapshot', async () => {
    const r = await evaluateGuidedActiveSessionResume({
      loadSnapshot: async () => null,
      clearSnapshot: vi.fn(),
      maxAgeMs: GUIDED_SNAPSHOT_MAX_AGE_MS,
      nowMs: Date.now(),
      hasActiveSession: false,
      dismissedSessionId: null,
      notificationSessionPending: false,
      inProgressSession: undefined,
      fetchFullSession: vi.fn(),
    });
    expect(r).toEqual({ outcome: 'skipped', reason: 'no_snapshot' });
  });

  it('clears stale snapshot', async () => {
    const clearSnapshot = vi.fn();
    const old = new Date(Date.now() - GUIDED_SNAPSHOT_MAX_AGE_MS - 60_000).toISOString();
    const r = await evaluateGuidedActiveSessionResume({
      loadSnapshot: async () => mkSnap({ updatedAt: old }),
      clearSnapshot,
      maxAgeMs: GUIDED_SNAPSHOT_MAX_AGE_MS,
      nowMs: Date.now(),
      hasActiveSession: false,
      dismissedSessionId: null,
      notificationSessionPending: false,
      inProgressSession: null,
      fetchFullSession: vi.fn(),
    });
    expect(r.outcome).toBe('cleared_snapshot');
    expect(clearSnapshot).toHaveBeenCalledTimes(1);
  });

  it('skips when live session active', async () => {
    const r = await evaluateGuidedActiveSessionResume({
      loadSnapshot: async () => mkSnap(),
      clearSnapshot: vi.fn(),
      maxAgeMs: GUIDED_SNAPSHOT_MAX_AGE_MS,
      nowMs: Date.now(),
      hasActiveSession: true,
      dismissedSessionId: null,
      notificationSessionPending: false,
      inProgressSession: mkRow({}),
      fetchFullSession: vi.fn(),
    });
    expect(r).toEqual({ outcome: 'skipped', reason: 'active_session_live' });
  });

  it('skips when user dismissed resume for same session', async () => {
    const r = await evaluateGuidedActiveSessionResume({
      loadSnapshot: async () => mkSnap({ sessionId: 'sess-a' }),
      clearSnapshot: vi.fn(),
      maxAgeMs: GUIDED_SNAPSHOT_MAX_AGE_MS,
      nowMs: Date.now(),
      hasActiveSession: false,
      dismissedSessionId: 'sess-a',
      notificationSessionPending: false,
      inProgressSession: mkRow({ id: 'sess-a' }),
      fetchFullSession: vi.fn(),
    });
    expect(r).toEqual({ outcome: 'skipped', reason: 'user_dismissed_resume' });
  });

  it('skips when notification route pending', async () => {
    const r = await evaluateGuidedActiveSessionResume({
      loadSnapshot: async () => mkSnap(),
      clearSnapshot: vi.fn(),
      maxAgeMs: GUIDED_SNAPSHOT_MAX_AGE_MS,
      nowMs: Date.now(),
      hasActiveSession: false,
      dismissedSessionId: null,
      notificationSessionPending: true,
      inProgressSession: mkRow({}),
      fetchFullSession: vi.fn(),
    });
    expect(r).toEqual({ outcome: 'skipped', reason: 'notification_route_pending' });
  });

  it('resumes from list when ids match and guided', async () => {
    const fetchFullSession = vi.fn();
    const r = await evaluateGuidedActiveSessionResume({
      loadSnapshot: async () => mkSnap({ sessionId: 'sess-a' }),
      clearSnapshot: vi.fn(),
      maxAgeMs: GUIDED_SNAPSHOT_MAX_AGE_MS,
      nowMs: Date.now(),
      hasActiveSession: false,
      dismissedSessionId: null,
      notificationSessionPending: false,
      inProgressSession: mkRow({ id: 'sess-a', decision_trace: { notificationMode: 'guided' } }),
      fetchFullSession,
    });
    expect(r).toEqual({ outcome: 'resumed', sessionId: 'sess-a' });
    expect(fetchFullSession).not.toHaveBeenCalled();
  });

  it('clears snapshot when list in-progress id differs', async () => {
    const clearSnapshot = vi.fn();
    const r = await evaluateGuidedActiveSessionResume({
      loadSnapshot: async () => mkSnap({ sessionId: 'old' }),
      clearSnapshot,
      maxAgeMs: GUIDED_SNAPSHOT_MAX_AGE_MS,
      nowMs: Date.now(),
      hasActiveSession: false,
      dismissedSessionId: null,
      notificationSessionPending: false,
      inProgressSession: mkRow({ id: 'new-sess' }),
      fetchFullSession: vi.fn(),
    });
    expect(r.outcome).toBe('cleared_snapshot');
    expect(clearSnapshot).toHaveBeenCalled();
  });

  it('clears when list row is not guided', async () => {
    const clearSnapshot = vi.fn();
    const r = await evaluateGuidedActiveSessionResume({
      loadSnapshot: async () => mkSnap({ sessionId: 'sess-a' }),
      clearSnapshot,
      maxAgeMs: GUIDED_SNAPSHOT_MAX_AGE_MS,
      nowMs: Date.now(),
      hasActiveSession: false,
      dismissedSessionId: null,
      notificationSessionPending: false,
      inProgressSession: mkRow({
        id: 'sess-a',
        decision_trace: { notificationMode: 'normal' },
      }),
      fetchFullSession: vi.fn(),
    });
    expect(r.outcome).toBe('cleared_snapshot');
    expect(clearSnapshot).toHaveBeenCalled();
  });

  it('fetches when list has no in-progress but snapshot valid', async () => {
    const full = {
      session: mkRow({ id: 'sess-a', ended_at: null }),
      items: [],
    };
    const r = await evaluateGuidedActiveSessionResume({
      loadSnapshot: async () => mkSnap({ sessionId: 'sess-a' }),
      clearSnapshot: vi.fn(),
      maxAgeMs: GUIDED_SNAPSHOT_MAX_AGE_MS,
      nowMs: Date.now(),
      hasActiveSession: false,
      dismissedSessionId: null,
      notificationSessionPending: false,
      inProgressSession: null,
      fetchFullSession: vi.fn().mockResolvedValue(full),
    });
    expect(r.outcome).toBe('resumed');
    if (r.outcome === 'resumed') {
      expect(r.sessionId).toBe('sess-a');
      expect(r.prefetched).toEqual(full);
    }
  });

  it('skips fetch when shouldStillResume turns false', async () => {
    const full = {
      session: mkRow({ id: 'sess-a', ended_at: null }),
      items: [],
    };
    let alive = true;
    const r = await evaluateGuidedActiveSessionResume({
      loadSnapshot: async () => mkSnap({ sessionId: 'sess-a' }),
      clearSnapshot: vi.fn(),
      maxAgeMs: GUIDED_SNAPSHOT_MAX_AGE_MS,
      nowMs: Date.now(),
      hasActiveSession: false,
      dismissedSessionId: null,
      notificationSessionPending: false,
      inProgressSession: null,
      fetchFullSession: vi.fn().mockImplementation(async () => {
        alive = false;
        return full;
      }),
      shouldStillResume: () => alive,
    });
    expect(r).toEqual({ outcome: 'skipped', reason: 'session_became_active' });
  });

  it('does not duplicate session — list path never calls fetch', async () => {
    const fetchFullSession = vi.fn();
    await evaluateGuidedActiveSessionResume({
      loadSnapshot: async () => mkSnap({ sessionId: 'sess-a' }),
      clearSnapshot: vi.fn(),
      maxAgeMs: GUIDED_SNAPSHOT_MAX_AGE_MS,
      nowMs: Date.now(),
      hasActiveSession: false,
      dismissedSessionId: null,
      notificationSessionPending: false,
      inProgressSession: mkRow({ id: 'sess-a' }),
      fetchFullSession,
    });
    expect(fetchFullSession).not.toHaveBeenCalled();
  });
});
