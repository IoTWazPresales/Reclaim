import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  snapshotSupportsSetDonePayload,
  describeSnapshotMismatch,
  shouldPreserveTrainingIntentsDueToGuidedSnapshot,
  GUIDED_SNAPSHOT_INTENT_GUARD_MAX_MS,
  evaluateGuidedSetDoneAcceptance,
} from '../guidedNotificationActionEvidence';
import type { GuidedActiveSessionSnapshot } from '@/lib/training/guidedActiveSessionSnapshot';
import { hasIntent } from '../NotificationIntentStore';
import { loadGuidedActiveSessionSnapshot } from '@/lib/localData/guidedActiveSessionSnapshotRepository';
import { supabase } from '@/lib/supabase';

vi.mock('../NotificationIntentStore', () => ({
  hasIntent: vi.fn(),
}));

vi.mock('@/lib/localData/guidedActiveSessionSnapshotRepository', () => ({
  loadGuidedActiveSessionSnapshot: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
  },
}));

const basePayload = {
  sessionId: 'sess1',
  sessionItemId: 'sess1_item_0',
  exerciseId: 'squat',
  setIndex: 2,
};

function makeSnap(over: Partial<GuidedActiveSessionSnapshot> = {}): GuidedActiveSessionSnapshot {
  return {
    schemaVersion: 1,
    sessionId: 'sess1',
    sessionItemId: 'sess1_item_0',
    exerciseId: 'squat',
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
  };
}

describe('snapshotSupportsSetDonePayload', () => {
  it('returns true when snapshot matches session item, exercise, and set index', () => {
    expect(snapshotSupportsSetDonePayload(makeSnap(), basePayload)).toBe(true);
  });

  it('returns false when set index differs (stale notification)', () => {
    expect(
      snapshotSupportsSetDonePayload(
        makeSnap({ currentSetIndex: 3 }),
        basePayload,
      ),
    ).toBe(false);
  });

  it('returns false when sessionId differs', () => {
    expect(
      snapshotSupportsSetDonePayload(
        makeSnap({ sessionId: 'other' }),
        basePayload,
      ),
    ).toBe(false);
  });
});

describe('shouldPreserveTrainingIntentsDueToGuidedSnapshot', () => {
  it('returns true for fresh guided snapshot', () => {
    const now = Date.parse('2026-05-01T12:00:00.000Z');
    const snap = makeSnap({ updatedAt: new Date(now - 60_000).toISOString() });
    expect(
      shouldPreserveTrainingIntentsDueToGuidedSnapshot(
        snap,
        now,
        GUIDED_SNAPSHOT_INTENT_GUARD_MAX_MS,
      ),
    ).toBe(true);
  });

  it('returns false when snapshot is older than max age', () => {
    const now = Date.parse('2026-05-01T12:00:00.000Z');
    const snap = makeSnap({
      updatedAt: new Date(now - GUIDED_SNAPSHOT_INTENT_GUARD_MAX_MS - 1).toISOString(),
    });
    expect(
      shouldPreserveTrainingIntentsDueToGuidedSnapshot(
        snap,
        now,
        GUIDED_SNAPSHOT_INTENT_GUARD_MAX_MS,
      ),
    ).toBe(false);
  });

  it('returns false for null snapshot', () => {
    expect(
      shouldPreserveTrainingIntentsDueToGuidedSnapshot(null, Date.now(), GUIDED_SNAPSHOT_INTENT_GUARD_MAX_MS),
    ).toBe(false);
  });
});

describe('evaluateGuidedSetDoneAcceptance', () => {
  beforeEach(() => {
    vi.mocked(hasIntent).mockReset();
    vi.mocked(loadGuidedActiveSessionSnapshot).mockReset();
    vi.mocked(supabase.auth.getUser).mockReset();
  });

  it('accepts when intent exists for training_set key', async () => {
    vi.mocked(hasIntent).mockImplementation(async (k: string) => k.includes('training_set:sess1:squat:2'));
    vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: { id: 'u1' } } } as any);
    vi.mocked(loadGuidedActiveSessionSnapshot).mockResolvedValue(null);

    const r = await evaluateGuidedSetDoneAcceptance(basePayload);
    expect(r.accept).toBe(true);
    expect(r.evidence).toBe('intent_store');
  });

  it('accepts without intent when guided snapshot matches', async () => {
    vi.mocked(hasIntent).mockResolvedValue(false);
    vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: { id: 'u1' } } } as any);
    vi.mocked(loadGuidedActiveSessionSnapshot).mockResolvedValue(makeSnap());

    const r = await evaluateGuidedSetDoneAcceptance(basePayload);
    expect(r.accept).toBe(true);
    expect(r.evidence).toBe('guided_snapshot');
  });

  it('rejects when no intent and snapshot mismatches', async () => {
    vi.mocked(hasIntent).mockResolvedValue(false);
    vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: { id: 'u1' } } } as any);
    vi.mocked(loadGuidedActiveSessionSnapshot).mockResolvedValue(makeSnap({ currentSetIndex: 99 }));

    const r = await evaluateGuidedSetDoneAcceptance(basePayload);
    expect(r.accept).toBe(false);
    expect(r.evidence).toBe('rejected');
    expect(r.reason).toContain('snapshot_set_index_mismatch');
  });

  it('accepts first-set intent alternative when setIndex is 1', async () => {
    vi.mocked(hasIntent).mockImplementation(async (k: string) => k === 'training_first:sess1:squat:1');
    vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: { id: 'u1' } } } as any);
    vi.mocked(loadGuidedActiveSessionSnapshot).mockResolvedValue(null);

    const r = await evaluateGuidedSetDoneAcceptance({
      ...basePayload,
      setIndex: 1,
    });
    expect(r.accept).toBe(true);
    expect(r.evidence).toBe('intent_store');
  });
});

describe('describeSnapshotMismatch', () => {
  it('returns snapshot_set_index_mismatch when indexes differ', () => {
    expect(describeSnapshotMismatch(makeSnap({ currentSetIndex: 1 }), basePayload)).toBe(
      'snapshot_set_index_mismatch',
    );
  });
});
