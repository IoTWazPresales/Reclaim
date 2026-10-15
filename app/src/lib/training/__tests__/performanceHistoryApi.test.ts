import { beforeEach, describe, expect, it, vi } from 'vitest';
import { historyItem } from './fixtures/performanceHistory';
import catalog from '../catalog/exercises.v1.json';
import { deriveProgressionDecision, getExerciseById } from '../engine';
import { TRAINING_PERF_SEED_EXERCISE_IDS, loadLastSessionPerformanceSeed, loadTrainingPerformanceSeed, withTrainingPerformanceSeed } from '../trainingProgramPerformanceSeed';

const mocks = vi.hoisted(() => ({ from: vi.fn(), getUser: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: { from: mocks.from, auth: { getUser: mocks.getUser } } }));
// The API module imports unrelated device repositories; no device I/O in this test.
vi.mock('@/lib/localData/database', () => ({ initializeLocalDatabase: vi.fn(), requireLocalDatabase: vi.fn() }));
import { getLastExercisePerformance, getLastExercisePerformances, getRecentExercisePerformances } from '../../api';

function query(pages: Array<{ data: unknown; error: unknown }>) {
  const q: any = {};
  for (const key of ['select', 'in', 'eq', 'not', 'order']) q[key] = vi.fn(() => q);
  q.range = vi.fn().mockImplementation(async () => pages.shift() ?? { data: [], error: null });
  mocks.from.mockReturnValue(q);
  return q;
}
const profile = { goals: { build_muscle: 1, build_strength: 0, lose_fat: 0, get_fitter: 0 }, equipment_access: ['barbell'] };
beforeEach(() => { vi.clearAllMocks(); mocks.getUser.mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null }); });

describe('production API and seed boundary', () => {
  it('reads owned canonical items, never requires a replica, and covers exercises outside the old fixed seed', async () => {
    const outside = catalog.find(ex => !TRAINING_PERF_SEED_EXERCISE_IDS.includes(ex.id))!;
    expect(outside).toBeTruthy();
    const item = historyItem(outside.id);
    const q = query([{ data: [item], error: null }]);
    const seed = await loadTrainingPerformanceSeed();
    expect(seed.status).toBe('available');
    expect(seed.requestedExerciseIds).toContain(outside.id);
    expect(seed.lastSessionPerformance[outside.id].exerciseId).toBe(outside.id);
    expect(mocks.from).toHaveBeenCalledWith('training_session_items');
    expect(mocks.from).toHaveBeenCalledTimes(1);
    expect(q.select).toHaveBeenCalledWith(expect.stringContaining('planned, performed, skipped'));
    expect(q.eq).toHaveBeenCalledWith('training_sessions.user_id', 'test-user');
    expect(q.not).not.toHaveBeenCalledWith('training_sessions.ended_at', 'is', null);
    expect(q.not).not.toHaveBeenCalledWith('performed', 'is', null);
  });

  it('keeps unfinished latest work instead of an older completed success in both batch APIs', async () => {
    const unfinished = historyItem('barbell_bench_press', '2026-10-02');
    unfinished.training_sessions!.ended_at = null;
    const rows = [historyItem(), unfinished];
    query([{ data: rows, error: null }]);
    const recent = await getRecentExercisePerformances(['barbell_bench_press']);
    expect(recent.barbell_bench_press.map(p => p.evidence!.status)).toEqual(['incomplete', 'qualified']);
    query([{ data: rows, error: null }]);
    const last = await getLastExercisePerformances(['barbell_bench_press']);
    expect(last.barbell_bench_press.evidence!.status).toBe('incomplete');
    query([{ data: rows, error: null }]);
    expect((await getLastExercisePerformance('barbell_bench_press'))?.evidence?.status).toBe('incomplete');
  });

  it('paginates canonical history and fails the entire seed on a later page error', async () => {
    const page = Array.from({ length: 500 }, (_, i) => ({ ...historyItem(), id: `item-${i}`, session_id: `session-${i}` }));
    const q = query([{ data: page, error: null }, { data: [historyItem('barbell_bench_press', '2026-10-03')], error: null }]);
    expect((await getRecentExercisePerformances(['barbell_bench_press'])).barbell_bench_press[0].date).toContain('2026-10-03');
    expect(q.range.mock.calls).toEqual([[0, 499], [500, 999]]);
    query([{ data: page, error: null }, { data: null, error: { message: 'offline' } }]);
    const seed = await loadTrainingPerformanceSeed(['barbell_bench_press']);
    expect(seed).toMatchObject({ status: 'unavailable', lastSessionPerformance: {}, recentSessionPerformance: {} });
  });

  it('distinguishes absent from failed reads and clears stale snapshot evidence in both cases', async () => {
    query([{ data: [historyItem()], error: null }]);
    const old = withTrainingPerformanceSeed(profile, await loadTrainingPerformanceSeed(['barbell_bench_press']));
    const bench = getExerciseById('barbell_bench_press')!;
    expect(deriveProgressionDecision(bench, { ...old, experienceLevel: 'intermediate' }, [6, 8])).not.toBeNull();
    for (const [response, status] of [
      [{ data: [], error: null }, 'missing'],
      [{ data: null, error: { message: 'network unavailable' } }, 'unavailable'],
      [{ data: null, error: null }, 'unavailable'],
    ] as const) {
      query([response]);
      const seed = await loadTrainingPerformanceSeed(['barbell_bench_press']);
      expect(seed.status).toBe(status);
      const merged = withTrainingPerformanceSeed(old, seed);
      expect(merged.lastSessionPerformance).toEqual({});
      expect(merged.performanceHistory!.status).toBe(status);
      expect(deriveProgressionDecision(bench, { ...merged, experienceLevel: 'intermediate' }, [6, 8])).toBeNull();
    }
    expect(withTrainingPerformanceSeed(old, undefined).performanceHistory?.status).toBe('unavailable');
  });

  it('keeps failure explicit in the map-only compatibility export too', async () => {
    query([{ data: null, error: { message: 'offline' } }]);
    await expect(loadLastSessionPerformanceSeed()).rejects.toThrow('history unavailable');
    query([{ data: [], error: null }]);
    expect(await loadLastSessionPerformanceSeed()).toEqual({});
    query([{ data: [historyItem()], error: null }]);
    expect((await loadLastSessionPerformanceSeed()).barbell_bench_press.evidence?.status).toBe('qualified');
  });

  it('propagates authentication failure and treats an empty requested set as absent without querying', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await loadTrainingPerformanceSeed(['barbell_bench_press'])).status).toBe('unavailable');
    expect((await loadTrainingPerformanceSeed([])).status).toBe('missing');
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
