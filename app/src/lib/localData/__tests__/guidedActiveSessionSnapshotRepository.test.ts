import { beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => {
  const rows = new Map<string, string>();
  const keyOf = (domain: string, userId: string) => `${domain}::${userId}`;
  const mockDb = {
    getFirstAsync: vi.fn(async (sql: string, params?: unknown[]) => {
      if (!String(sql).includes('reclaim_async_blob_mirror')) return null;
      const domain = params?.[0] as string;
      const userId = params?.[1] as string;
      const json = rows.get(keyOf(domain, userId));
      if (!json) return null;
      return { payload_json: json };
    }),
    runAsync: vi.fn(async (sql: string, params?: unknown[]) => {
      const s = String(sql);
      if (s.includes('reclaim_async_blob_mirror') && s.toUpperCase().includes('INSERT')) {
        const domain = params?.[0] as string;
        const userId = params?.[1] as string;
        const payload = params?.[2] as string;
        rows.set(keyOf(domain, userId), payload);
      }
      if (s.includes('DELETE FROM reclaim_async_blob_mirror')) {
        const domain = params?.[0] as string;
        const userId = params?.[1] as string;
        rows.delete(keyOf(domain, userId));
      }
    }),
  };
  return { rows, keyOf, mockDb };
});

vi.mock('@/lib/localData/database', () => ({
  initializeLocalDatabase: vi.fn(async () => ({ ok: true, status: 'ready' as const })),
  requireLocalDatabase: () => hoisted.mockDb,
}));

describe('guidedActiveSessionSnapshotRepository', () => {
  beforeEach(() => {
    hoisted.rows.clear();
    vi.resetModules();
  });

  it('save/load updates fields', async () => {
    const {
      saveGuidedActiveSessionSnapshot,
      loadGuidedActiveSessionSnapshot,
    } = await import('../guidedActiveSessionSnapshotRepository');
    const { buildGuidedActiveSessionSnapshot } = await import('@/lib/training/guidedActiveSessionSnapshot');

    const snap = buildGuidedActiveSessionSnapshot({
      sessionId: 'sid',
      currentItem: { id: 'item', exercise_id: 'ex' },
      exerciseName: 'Press',
      uiExerciseIndex: 1,
      currentSetIndex: 2,
      phase: 'rest',
      restTotalSeconds: 60,
      restRemainingSeconds: 45,
      restPaused: false,
    });

    await saveGuidedActiveSessionSnapshot('user-a', snap);
    const loaded = await loadGuidedActiveSessionSnapshot('user-a');
    expect(loaded?.sessionId).toBe('sid');
    expect(loaded?.currentSetIndex).toBe(2);
    expect(loaded?.phase).toBe('rest');
  });

  it('clear removes snapshot', async () => {
    const {
      saveGuidedActiveSessionSnapshot,
      loadGuidedActiveSessionSnapshot,
      clearGuidedActiveSessionSnapshot,
    } = await import('../guidedActiveSessionSnapshotRepository');
    const { buildGuidedActiveSessionSnapshot } = await import('@/lib/training/guidedActiveSessionSnapshot');

    await saveGuidedActiveSessionSnapshot(
      'u',
      buildGuidedActiveSessionSnapshot({
        sessionId: 's',
        currentItem: { id: 'i', exercise_id: 'e' },
        exerciseName: null,
        uiExerciseIndex: 0,
        currentSetIndex: 1,
        phase: 'work',
        restTotalSeconds: null,
        restRemainingSeconds: null,
        restPaused: false,
      }),
    );
    await clearGuidedActiveSessionSnapshot('u');
    expect(await loadGuidedActiveSessionSnapshot('u')).toBeNull();
  });

  it('invalid stored JSON object rejected by parse', async () => {
    hoisted.rows.set('guided_active_session::u2', JSON.stringify({ foo: 1 }));
    const { loadGuidedActiveSessionSnapshot } = await import('../guidedActiveSessionSnapshotRepository');
    expect(await loadGuidedActiveSessionSnapshot('u2')).toBeNull();
  });
});
