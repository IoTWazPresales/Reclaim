/**
 * Deferred session-read races for rest-end promotion. Only the still-current
 * timed intent may gain deliverNow, and a newer now-slot is not dismissed.
 */
import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  disk: new Map<string, string>(),
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn(),
  session: vi.fn(),
  reconcile: vi.fn(),
  dismiss: vi.fn(),
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: mocks.get, setItem: mocks.set, removeItem: mocks.remove },
}));
vi.mock('@/lib/api', () => ({ getTrainingSession: mocks.session }));
vi.mock('@/lib/notifications/NotificationScheduler', () => ({
  reconcileNotifications: mocks.reconcile,
}));
vi.mock('@/lib/notifications/trainingNotificationScheduler', () => ({
  dismissTrainingNowPresented: mocks.dismiss,
}));

import { clearIntent, getIntent, setIntent } from '@/lib/notifications/NotificationIntentStore';
import { deliverGuidedRestEnd } from '@/lib/training/guidedRestEndTimer';

const FIRE = Date.parse('2026-09-29T12:00:00.000Z');
const TIMED = 'training_at:s1';
const NOW = 'training_now:s1';

function deferred<T = void>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function timed(title: string) {
  return {
    type: 'TRAINING_SET',
    sessionId: 's1',
    title,
    body: 'Next set',
    issuedAt: '2026-09-29T11:59:00.000Z',
    scheduledAt: new Date(FIRE).toISOString(),
  };
}

function holdSession(endedAt: string | null = null) {
  const entered = deferred<void>();
  let release!: () => void;
  mocks.session.mockImplementationOnce(() => {
    entered.resolve();
    return new Promise((resolve) => {
      release = () => resolve({ session: { ended_at: endedAt } });
    });
  });
  return { entered: entered.promise, release: () => release() };
}

beforeEach(() => {
  mocks.disk.clear();
  vi.resetAllMocks();
  mocks.get.mockImplementation(async (key: string) => mocks.disk.get(key) ?? null);
  mocks.set.mockImplementation(async (key: string, value: string) => { mocks.disk.set(key, value); });
  mocks.remove.mockImplementation(async (key: string) => { mocks.disk.delete(key); });
  mocks.reconcile.mockResolvedValue(undefined);
  mocks.dismiss.mockResolvedValue(undefined);
});

it('does not promote a timed intent replaced during the session read', async () => {
  await setIntent(TIMED, timed('Rest complete'));
  const gate = holdSession();
  const run = deliverGuidedRestEnd('s1', FIRE);
  await gate.entered;
  await setIntent(TIMED, { ...timed('Newer set'), issuedAt: '2026-09-29T12:00:01.000Z' });
  gate.release();
  await expect(run).resolves.toBe(false);
  const after = await getIntent(TIMED);
  expect(after?.data.title).toBe('Newer set');
  expect(after?.data.deliverNow).toBeUndefined();
  expect(mocks.reconcile).not.toHaveBeenCalled();
  expect(mocks.dismiss).not.toHaveBeenCalled();
});

it('does not recreate a timed intent cleared during the session read', async () => {
  await setIntent(TIMED, timed('Rest complete'));
  const gate = holdSession();
  const run = deliverGuidedRestEnd('s1', FIRE);
  await gate.entered;
  await clearIntent(TIMED);
  gate.release();
  await expect(run).resolves.toBe(false);
  expect(await getIntent(TIMED)).toBeNull();
  expect(mocks.reconcile).not.toHaveBeenCalled();
});

it('does not promote when the session closed during the read', async () => {
  await setIntent(TIMED, timed('Rest complete'));
  mocks.session.mockResolvedValue({ session: { ended_at: '2026-09-29T12:00:01.000Z' } });
  await expect(deliverGuidedRestEnd('s1', FIRE)).resolves.toBe(false);
  expect((await getIntent(TIMED))?.data.deliverNow).toBeUndefined();
  expect(mocks.reconcile).not.toHaveBeenCalled();
});

it('promotes the current timer and dismisses only the same now prompt', async () => {
  await setIntent(TIMED, timed('Rest complete'));
  await setIntent(NOW, {
    type: 'TRAINING_REST', sessionId: 's1', title: 'Rest', body: 'Recover',
    issuedAt: '2026-09-29T11:58:00.000Z',
  });
  mocks.session.mockResolvedValue({ session: { ended_at: null } });
  await expect(deliverGuidedRestEnd('s1', FIRE)).resolves.toBe(true);
  expect((await getIntent(TIMED))?.data.deliverNow).toBe(true);
  expect(mocks.reconcile).toHaveBeenCalledTimes(1);
  expect(mocks.dismiss).toHaveBeenCalledWith('s1');
});

it('keeps a newer now prompt when the rest timer completes', async () => {
  await setIntent(TIMED, timed('Rest complete'));
  await setIntent(NOW, {
    type: 'TRAINING_REST', sessionId: 's1', title: 'Rest', body: 'Recover',
    issuedAt: '2026-09-29T11:58:00.000Z',
  });
  const gate = holdSession();
  const run = deliverGuidedRestEnd('s1', FIRE);
  await gate.entered;
  await setIntent(NOW, {
    type: 'TRAINING_REST', sessionId: 's1', title: 'Next rest', body: 'Recover',
    issuedAt: '2026-09-29T12:00:02.000Z',
  });
  gate.release();
  await expect(run).resolves.toBe(true);
  expect((await getIntent(TIMED))?.data.deliverNow).toBe(true);
  expect((await getIntent(NOW))?.data.title).toBe('Next rest');
  expect(mocks.dismiss).not.toHaveBeenCalled();
});
