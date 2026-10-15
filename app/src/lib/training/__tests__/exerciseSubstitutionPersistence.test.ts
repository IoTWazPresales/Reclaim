import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prescribeReplacement } from '../exerciseSubstitution';
import { getExerciseById } from '../engine';
import { withSessionItemMutationLock } from '../sessionItemMutationLock';
import { buildSetLogQueuePayload } from '../runtime/payloadBuilder';
import type { TrainingSessionItemRow } from '@/lib/api';

const mocks = vi.hoisted(() => ({ from: vi.fn(), getUser: vi.fn(), queue: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: { from: mocks.from, auth: { getUser: mocks.getUser } } }));
vi.mock('@/lib/localData/database', () => ({ initializeLocalDatabase: vi.fn(), requireLocalDatabase: vi.fn() }));
vi.mock('../offlineQueue', () => ({ loadOfflineQueue: mocks.queue }));
import { updateTrainingSessionItem, getTrainingSession, logTrainingSet } from '../../api';

const profile = { goals: { build_muscle: 1, build_strength: 0, lose_fat: 0, get_fitter: 0 }, equipment_access: ['dumbbells', 'bench'], baselines: {} };
let row: TrainingSessionItemRow;
let session: any;
let logs: any[];
let failWrite: boolean;
let race: (() => void) | undefined;
let writes: any[];
function setup() {
  mocks.from.mockImplementation((table: string) => {
    let payload: any; const conditions: Array<[string, unknown]> = [];
    const q: any = {};
    q.select = vi.fn(() => q);
    q.eq = vi.fn((key, value) => { conditions.push([key, value]); return q; });
    q.is = q.eq;
    q.order = vi.fn(() => q);
    q.update = vi.fn(value => { payload = value; return q; });
    q.insert = vi.fn(value => { payload = value; return q; });
    const read = () => {
      if (payload) {
        race?.(); race = undefined;
        const mismatch = conditions.some(([key, expected]) => {
          if (!['exercise_id', 'planned', 'performed', 'skipped'].includes(key)) return false;
          const actual = (row as any)[key];
          return key === 'planned' || (key === 'performed' && expected !== null) ? JSON.stringify(actual) !== expected : actual !== expected;
        });
        if (failWrite || mismatch) return { data: null, error: { message: 'write rejected' } };
        writes.push(payload); row = { ...row, ...payload }; return { data: structuredClone(row), error: null };
      }
      if (table === 'training_set_logs') return { data: logs, error: null };
      if (table === 'training_sessions') return { data: session, error: null };
      if (conditions.some(([key]) => key === 'session_id')) return { data: [structuredClone(row)], error: null };
      return { data: { ...structuredClone(row), training_sessions: session }, error: null };
    };
    q.single = vi.fn(async () => read());
    q.then = (resolve: any) => Promise.resolve(read()).then(resolve);
    return q;
  });
}
beforeEach(() => {
  vi.clearAllMocks(); mocks.getUser.mockResolvedValue({ data: { user: { id: 'user' } }, error: null }); mocks.queue.mockResolvedValue([]);
  session = { id: 'session', user_id: 'user', ended_at: null };
  row = { id: 'item', session_id: 'session', exercise_id: 'barbell_bench_press', order_index: 0, performed: null, skipped: false, created_at: '2026-10-15T10:00:00Z',
    autoregulation_adjustments: { 1: { weightDelta: -10, repsDelta: -2, reason: 'old exercise', appliedAt: '' } },
    planned: { priority: 'primary', intents: ['horizontal_press'], decisionTrace: { intent: ['horizontal_press'] }, sets: [1, 2, 3].map(setIndex => ({ setIndex, targetReps: 5, suggestedWeight: 100, restSeconds: 90 })) },
  } as TrainingSessionItemRow;
  logs = []; writes = []; failWrite = false; race = undefined; setup();
});
function replace() {
  return updateTrainingSessionItem('item', { exercise_id: 'dumbbell_bench_press', expectedExerciseId: 'barbell_bench_press', planned: prescribeReplacement(row, getExerciseById('dumbbell_bench_press')!, profile) });
}
describe('replacement persistence and reload', () => {
  it('persists a session-only prescription, removes incompatible overlay and reloads exact original snapshot', async () => {
    const before = structuredClone(row.planned); const saved = await replace();
    expect(saved.exercise_id).toBe('dumbbell_bench_press');
    expect(saved.autoregulation_adjustments).toBeNull();
    expect(saved.performed).toBeNull();
    expect(saved.planned.decisionTrace.originalPlanned).toEqual(before);
    const reloaded = await getTrainingSession('session');
    expect(reloaded.items[0]).toEqual(saved);
    expect(writes).toHaveLength(1);
    expect(writes[0]).not.toHaveProperty('performed');
    expect(mocks.from.mock.calls.every(([table]) => ['training_session_items', 'training_sessions', 'training_set_logs'].includes(table))).toBe(true);
  });
  it.each(['performed', 'log', 'skipped', 'ended', 'queued', 'queue-error', 'stale'])('refuses %s work and preserves identity/history', async kind => {
    const planned = prescribeReplacement(row, getExerciseById('dumbbell_bench_press')!, profile);
    if (kind === 'performed') row.performed = { sets: [{ setIndex: 1, weight: 100, reps: 5, completedAt: '2026-10-15T10:00:00Z' }] };
    if (kind === 'log') logs = [{ id: 'done' }];
    if (kind === 'skipped') row.skipped = true;
    if (kind === 'ended') session.ended_at = '2026-10-15T11:00:00Z';
    if (kind === 'queued') mocks.queue.mockResolvedValue([{ type: 'insertSetLog', sessionItemId: 'item' }]);
    if (kind === 'queue-error') mocks.queue.mockRejectedValue(new Error('queue unavailable'));
    if (kind === 'stale') row.exercise_id = 'push_up';
    const before = structuredClone(row);
    await expect(updateTrainingSessionItem('item', { exercise_id: 'dumbbell_bench_press', expectedExerciseId: 'barbell_bench_press', planned })).rejects.toThrow();
    expect(row).toEqual(before); expect(writes).toHaveLength(0);
  });
  it('compare-and-swap rejects Done arriving after the read', async () => {
    race = () => { row.performed = { sets: [{ setIndex: 1, weight: 100, reps: 5, completedAt: 'now' }] }; };
    await expect(replace()).rejects.toThrow('write rejected');
    expect(row.exercise_id).toBe('barbell_bench_press'); expect(row.performed!.sets).toHaveLength(1);
  });
  it('failed persistence does not publish or mutate a replacement', async () => {
    const before = structuredClone(row); failWrite = true;
    await expect(replace()).rejects.toThrow(); expect(row).toEqual(before);
  });
  it('serializes replacement behind canonical completion, then refuses performed work', async () => {
    let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
    const done = withSessionItemMutationLock('item', async () => { await gate; row.performed = { sets: [{ setIndex: 1, weight: 100, reps: 5, completedAt: 'now' }] }; });
    const replacement = replace(); release(); await done;
    await expect(replacement).rejects.toThrow(); expect(row.exercise_id).toBe('barbell_bench_press');
  });
  it('preserves exercise identity in new offline Done payloads', () => {
    expect(buildSetLogQueuePayload('item', 'barbell_bench_press', 1, 100, 5, 7)).toMatchObject({ exerciseId: 'barbell_bench_press', sessionItemId: 'item' });
  });
  it('stale notification Done cannot log against a replaced exercise', async () => {
    await replace();
    await expect(logTrainingSet({ id: 'log', sessionItemId: 'item', exerciseId: 'barbell_bench_press', setIndex: 1, weight: 100, reps: 5 })).rejects.toThrow('identity changed');
  });
});
