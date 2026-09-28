import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  disk: new Map<string, string>(), get: vi.fn(), set: vi.fn(), remove: vi.fn(),
  schedule: vi.fn(), permissions: vi.fn(), cancel: vi.fn(),
}));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: {
  getItem: mocks.get, setItem: mocks.set, removeItem: mocks.remove,
} }));
vi.mock('react-native', () => ({ Platform: { OS: 'android' }, AppState: { currentState: 'active' } }));
vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
  createObservabilityLogger: () => ({ debug: vi.fn(), warn: vi.fn() }),
}));
vi.mock('@/lib/notificationPreferences', () => ({ getNotificationPreferences: async () => ({ enabled: false }) }));
vi.mock('@/lib/userSettings', () => ({ getUserSettings: async () => ({}) }));
vi.mock('@/lib/sleepSettings', () => ({ loadSleepSettings: async () => ({}) }));
vi.mock('@/lib/supabase', () => ({ supabase: { auth: { getUser: async () => ({ data: { user: null } }) } } }));
vi.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { DAILY: 'daily', CALENDAR: 'calendar', TIME_INTERVAL: 'timeInterval' },
  scheduleNotificationAsync: mocks.schedule,
  getPermissionsAsync: mocks.permissions,
  setNotificationChannelAsync: vi.fn(),
  getAllScheduledNotificationsAsync: async () => [],
  cancelScheduledNotificationAsync: mocks.cancel,
  AndroidImportance: { HIGH: 4, LOW: 2, DEFAULT: 3, MAX: 5 },
  AndroidNotificationVisibility: { PUBLIC: 1 },
}));
import { setIntent, getIntent, getIntents, clearIntent, clearAllIntents,
  clearIntentsByPrefix, acknowledgeIntentDelivery } from '../NotificationIntentStore';
import { forceRescheduleNotifications } from '../NotificationScheduler';
import { markTrainingTimedPromptFired } from '../trainingNotificationScheduler';

const KEY = '@reclaim/notifications/intents';
function deferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
const prompt = (title = 'First') => ({ type: 'TRAINING_SET', sessionId: 's1',
  issuedAt: new Date().toISOString(), title, body: 'Synthetic test' });
beforeEach(() => {
  mocks.disk.clear();
  vi.resetAllMocks();
  mocks.get.mockImplementation(async (key: string) => mocks.disk.get(key) ?? null);
  mocks.set.mockImplementation(async (key: string, value: string) => { mocks.disk.set(key, value); });
  mocks.remove.mockImplementation(async (key: string) => { mocks.disk.delete(key); });
  mocks.permissions.mockResolvedValue({ granted: true });
  mocks.schedule.mockResolvedValue('synthetic-native-id');
});

it('serializes deferred concurrent writes to different keys without losing either', async () => {
  const entered = deferred();
  const release = deferred();
  mocks.set.mockImplementationOnce(async (key: string, value: string) => {
    entered.resolve(); await release.promise; mocks.disk.set(key, value);
  });
  const first = setIntent('training_now:s1', prompt());
  await entered.promise;
  const second = setIntent('med:synthetic', { type: 'MED_REMINDER' });
  await Promise.resolve();
  expect(mocks.get).toHaveBeenCalledTimes(1);
  release.resolve();
  await Promise.all([first, second]);
  expect((await getIntents()).map(row => row.logicalKey)).toEqual(['training_now:s1', 'med:synthetic']);
});

it('expiry pruning cannot overwrite a newer write queued during its save', async () => {
  mocks.disk.set(KEY, JSON.stringify([{ logicalKey: 'expired', data: {}, createdAt: '2000-01-01T00:00:00Z' }]));
  const entered = deferred(); const release = deferred();
  mocks.set.mockImplementationOnce(async (key: string, value: string) => {
    entered.resolve(); await release.promise; mocks.disk.set(key, value);
  });
  const prune = getIntents(); await entered.promise;
  const write = setIntent('new', { value: 1 });
  release.resolve(); await Promise.all([prune, write]);
  expect((await getIntents()).map(row => row.logicalKey)).toEqual(['new']);
});

it('serializes prefix and full clears in invocation order and preserves later writes', async () => {
  await Promise.all([setIntent('training_now:s1', prompt()), setIntent('med:synthetic', {})]);
  await Promise.all([clearIntentsByPrefix('training_'), setIntent('training_now:s2', {})]);
  expect((await getIntents()).map(row => row.logicalKey)).toEqual(['med:synthetic', 'training_now:s2']);
  await Promise.all([clearAllIntents(), setIntent('new', {})]);
  expect((await getIntents()).map(row => row.logicalKey)).toEqual(['new']);
});

it('rejects late acknowledgement after replacement, even when the payload and timestamp match', async () => {
  const data = prompt();
  await setIntent('training_now:s1', data);
  const old = (await getIntent('training_now:s1'))!;
  await setIntent('training_now:s1', data);
  const replacement = (await getIntent('training_now:s1'))!;
  expect(replacement.revision).not.toBe(old.revision);
  expect(await acknowledgeIntentDelivery(old)).toBe(false);
  expect(await getIntent('training_now:s1')).toEqual(replacement);
});

it('does not resurrect a cleared intent, including after clearing and recreating the key', async () => {
  await setIntent('training_now:s1', prompt());
  const old = (await getIntent('training_now:s1'))!;
  await clearIntent(old.logicalKey);
  expect(await acknowledgeIntentDelivery(old)).toBe(false);
  expect(await getIntent(old.logicalKey)).toBeNull();
  await setIntent(old.logicalKey, old.data);
  expect(await acknowledgeIntentDelivery(old)).toBe(false);
  expect((await getIntent(old.logicalKey))!.data.firedAt).toBeUndefined();
});

it('acknowledges only once, retaining the original payload, creation time and TTL', async () => {
  await setIntent('training_now:s1', { ...prompt(), originalField: 'retained' }, { ttlMinutes: 17 });
  const old = (await getIntent('training_now:s1'))!;
  expect(await acknowledgeIntentDelivery(old)).toBe(true);
  expect(await getIntent(old.logicalKey)).toEqual({ ...old, data: { ...old.data, firedAt: expect.any(String) } });
  expect(await acknowledgeIntentDelivery(old)).toBe(false);
});

it('rejects storage failures without destroying other intents or poisoning the queue', async () => {
  await setIntent('med:synthetic', {});
  mocks.get.mockRejectedValueOnce(new Error('read failed'));
  await expect(setIntent('bad-read', {})).rejects.toThrow('read failed');
  mocks.set.mockRejectedValueOnce(new Error('write failed'));
  await expect(setIntent('bad-write', {})).rejects.toThrow('write failed');
  await setIntent('next', {});
  expect((await getIntents()).map(row => row.logicalKey)).toEqual(['med:synthetic', 'next']);
});

it('real reconciler waits for acknowledgement persistence before allowing another pass', async () => {
  await setIntent('training_now:s1', prompt());
  const entered = deferred(); const release = deferred();
  mocks.set.mockImplementationOnce(async (key: string, value: string) => {
    expect(JSON.parse(value)[0].data.firedAt).toEqual(expect.any(String));
    entered.resolve(); await release.promise; mocks.disk.set(key, value);
  });
  let settled = false;
  const first = forceRescheduleNotifications().then(() => { settled = true; });
  await entered.promise;
  await forceRescheduleNotifications();
  expect(settled).toBe(false);
  expect(mocks.permissions).toHaveBeenCalledOnce();
  release.resolve(); await first;
  expect(mocks.permissions).toHaveBeenCalledTimes(2);
  expect(mocks.schedule).toHaveBeenCalledOnce();
  expect((await getIntent('training_now:s1'))!.data.firedAt).toEqual(expect.any(String));
});

it('real OS scheduling replacement race acknowledges the new prompt only after its own delivery', async () => {
  await setIntent('training_now:s1', prompt('Old'));
  const entered = deferred(); const release = deferred<string>();
  mocks.schedule.mockImplementationOnce(() => { entered.resolve(); return release.promise; });
  const reconcile = forceRescheduleNotifications(); await entered.promise;
  await setIntent('training_now:s1', prompt('New'));
  const replacement = (await getIntent('training_now:s1'))!;
  expect(replacement.data.firedAt).toBeUndefined();
  release.resolve('old-native'); await reconcile;
  expect(mocks.schedule).toHaveBeenCalledTimes(2);
  expect(mocks.schedule.mock.calls[1][0].content.title).toBe('New');
  expect(await getIntent('training_now:s1')).toEqual({ ...replacement,
    data: { ...replacement.data, firedAt: expect.any(String) } });
});

it('real OS scheduling clear race never recreates the cleared prompt', async () => {
  await setIntent('training_now:s1', prompt());
  const entered = deferred(); const release = deferred<string>();
  mocks.schedule.mockImplementationOnce(() => { entered.resolve(); return release.promise; });
  const reconcile = forceRescheduleNotifications(); await entered.promise;
  await clearIntent('training_now:s1');
  release.resolve('old-native'); await reconcile;
  expect(await getIntent('training_now:s1')).toBeNull();
  expect(mocks.schedule).toHaveBeenCalledOnce();
});

it('timed receive requires the exact delivered revision, not just session id', async () => {
  await setIntent('training_at:s1', { ...prompt(), scheduledAt: new Date().toISOString() });
  const intent = (await getIntent('training_at:s1'))!;
  expect(await markTrainingTimedPromptFired('s1', { intentRevision: 'old' })).toBe(false);
  expect((await getIntent(intent.logicalKey))!.data.firedAt).toBeUndefined();
  expect(await markTrainingTimedPromptFired('s1', { intentRevision: intent.revision })).toBe(true);
});

it('legacy timed receive requires both issuedAt and scheduledAt before acknowledging', async () => {
  const data = { ...prompt(), scheduledAt: new Date().toISOString() };
  mocks.disk.set(KEY, JSON.stringify([{ logicalKey: 'training_at:s1', data, createdAt: new Date().toISOString() }]));
  expect(await markTrainingTimedPromptFired('s1', { scheduledAt: data.scheduledAt })).toBe(false);
  expect(await markTrainingTimedPromptFired('s1', data)).toBe(true);
});
