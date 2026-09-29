import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const mocks = vi.hoisted(() => ({
  disk: new Map<string, string>(),
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn(),
  schedule: vi.fn(),
  cancel: vi.fn(),
  cancelAll: vi.fn(),
  permissions: vi.fn(),
  getAll: vi.fn(),
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: mocks.get,
    setItem: mocks.set,
    removeItem: mocks.remove,
  },
}));
vi.mock('react-native', () => ({ Platform: { OS: 'android' }, AppState: { currentState: 'active' } }));
vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
  createObservabilityLogger: () => ({ debug: vi.fn(), warn: vi.fn() }),
}));
vi.mock('@/lib/notificationPreferences', () => ({
  getNotificationPreferences: async () => ({ enabled: false }),
}));
vi.mock('@/lib/userSettings', () => ({ getUserSettings: async () => ({}) }));
vi.mock('@/lib/sleepSettings', () => ({ loadSleepSettings: async () => ({}) }));
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getUser: async () => ({ data: { user: null } }) } },
}));
vi.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { DAILY: 'daily', CALENDAR: 'calendar', TIME_INTERVAL: 'timeInterval' },
  scheduleNotificationAsync: mocks.schedule,
  cancelScheduledNotificationAsync: mocks.cancel,
  cancelAllScheduledNotificationsAsync: mocks.cancelAll,
  getAllScheduledNotificationsAsync: mocks.getAll,
  getPermissionsAsync: mocks.permissions,
  setNotificationChannelAsync: vi.fn(),
  AndroidImportance: { HIGH: 4, LOW: 2, DEFAULT: 3, MAX: 5 },
  AndroidNotificationVisibility: { PUBLIC: 1 },
}));

import { clearIntent, getIntent, getIntents, setIntent } from '../NotificationIntentStore';
import { forceRescheduleNotifications } from '../NotificationScheduler';
import {
  clearMedReminderIntents,
  clearReminderIntentsPreservingGuidance,
  isLiveGuidanceIntentKey,
} from '../notificationCancellation';

const SRC_ROOT = join(__dirname, '../../..');
const SCHEDULER = join(SRC_ROOT, 'lib', 'notifications', 'NotificationScheduler.ts');

type Scheduled = {
  identifier: string;
  content: { data?: Record<string, unknown> };
  trigger: unknown;
};

function walkSource(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '__tests__') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      walkSource(full, acc);
      continue;
    }
    if (/\.(ts|tsx)$/.test(name) && !name.endsWith('.d.ts')) acc.push(full);
  }
  return acc;
}

describe('notification cancellation authority', () => {
  const scheduled: Scheduled[] = [];

  beforeEach(() => {
    mocks.disk.clear();
    scheduled.length = 0;
    vi.resetAllMocks();
    mocks.get.mockImplementation(async (key: string) => mocks.disk.get(key) ?? null);
    mocks.set.mockImplementation(async (key: string, value: string) => {
      mocks.disk.set(key, value);
    });
    mocks.remove.mockImplementation(async (key: string) => {
      mocks.disk.delete(key);
    });
    mocks.permissions.mockResolvedValue({ granted: true });
    mocks.getAll.mockImplementation(async () => scheduled.map((row) => ({ ...row })));
    mocks.schedule.mockImplementation(async (request: {
      identifier?: string;
      content: { data?: Record<string, unknown> };
      trigger: unknown;
    }) => {
      const identifier = request.identifier ?? `os-${scheduled.length + 1}`;
      scheduled.push({ identifier, content: request.content, trigger: request.trigger });
      return identifier;
    });
    mocks.cancel.mockImplementation(async (identifier: string) => {
      const index = scheduled.findIndex((row) => row.identifier === identifier);
      if (index >= 0) scheduled.splice(index, 1);
    });
    mocks.cancelAll.mockImplementation(() => {
      throw new Error('cancel-all escape');
    });
  });

  it('allows native schedule and cancel only inside NotificationScheduler', () => {
    const scheduler = readFileSync(SCHEDULER, 'utf8');
    expect(scheduler).toContain('cancelScheduledNotificationAsync(');
    expect(scheduler).toContain('scheduleNotificationAsync(');
    expect(scheduler).not.toContain('cancelAllScheduledNotificationsAsync(');

    const files = walkSource(SRC_ROOT);
    expect(files).toContain(SCHEDULER);
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      expect(text, `${file} calls cancel-all`).not.toContain('cancelAllScheduledNotificationsAsync(');
      if (file === SCHEDULER) continue;
      expect(text, `${file} calls cancelScheduledNotificationAsync(`).not.toContain(
        'cancelScheduledNotificationAsync(',
      );
      expect(text, `${file} calls scheduleNotificationAsync(`).not.toContain('scheduleNotificationAsync(');
    }
  });

  it('treats open session keys as guidance and reminder keys as not', () => {
    expect(isLiveGuidanceIntentKey('training_now:s1')).toBe(true);
    expect(isLiveGuidanceIntentKey('training_at:s1')).toBe(true);
    expect(isLiveGuidanceIntentKey('training_stale:s1')).toBe(true);
    expect(isLiveGuidanceIntentKey('mindfulness_session_active')).toBe(true);
    expect(isLiveGuidanceIntentKey('meditation_session_active')).toBe(true);
    expect(isLiveGuidanceIntentKey('med:med-a:2026-09-29T18:00:00.000Z')).toBe(false);
    expect(isLiveGuidanceIntentKey('sleep_bedtime')).toBe(false);
    expect(isLiveGuidanceIntentKey('med_refill:med-a')).toBe(false);
  });

  it('clears saved reminders and leaves open session guidance', async () => {
    const dose = new Date(Date.now() + 3_600_000).toISOString();
    await setIntent(`med:med-a:${dose}`, { type: 'MED_REMINDER', medId: 'med-a', scheduledFor: dose });
    await setIntent('sleep_bedtime', { type: 'SLEEP_BEDTIME' });
    await setIntent('med_refill:med-a', { type: 'MED_REFILL' });
    await setIntent('training_now:s1', { type: 'TRAINING_SET', sessionId: 's1' });
    await setIntent('training_at:s1', { type: 'TRAINING_SET', sessionId: 's1' });
    await setIntent('mindfulness_session_active', { type: 'MINDFULNESS_SESSION' });
    await setIntent('meditation_session_active', { type: 'MEDITATION_SESSION' });

    await clearReminderIntentsPreservingGuidance();

    expect((await getIntents()).map((row) => row.logicalKey).sort()).toEqual([
      'meditation_session_active',
      'mindfulness_session_active',
      'training_at:s1',
      'training_now:s1',
    ]);
    expect(mocks.cancelAll).not.toHaveBeenCalled();
    expect(mocks.cancel).not.toHaveBeenCalled();
    expect(mocks.schedule).not.toHaveBeenCalled();
  });

  it('removing one medication keeps the other medication and the pending guided prompt', async () => {
    const doseA = new Date(Date.now() + 7_200_000).toISOString();
    const doseB = new Date(Date.now() + 3_600_000).toISOString();
    const fireAt = new Date(Date.now() + 600_000).toISOString();
    const keyA = `med:med-a:${doseA}`;
    const keyB = `med:med-b:${doseB}`;
    await setIntent(keyA, {
      type: 'MED_REMINDER', medId: 'med-a', scheduledFor: doseA, title: 'A', body: 'A',
    });
    await setIntent(keyB, {
      type: 'MED_REMINDER', medId: 'med-b', scheduledFor: doseB, title: 'B', body: 'B',
    });
    await setIntent('training_at:s1', {
      type: 'TRAINING_SET',
      sessionId: 's1',
      title: 'Rest complete',
      body: 'Next',
      issuedAt: new Date().toISOString(),
      scheduledAt: fireAt,
    });
    await setIntent('sleep_bedtime', { type: 'SLEEP_BEDTIME', typicalWakeHHMM: '07:00' });

    await forceRescheduleNotifications();
    const trainingId = scheduled.find((row) => row.content.data?.logicalKey === 'training_at:s1')?.identifier;
    const medAId = scheduled.find((row) => row.content.data?.logicalKey === keyA)?.identifier;
    const sleepId = scheduled.find((row) => row.content.data?.logicalKey === 'sleep_bedtime')?.identifier;
    expect(trainingId).toBeTruthy();
    expect(medAId).toBeTruthy();
    expect(sleepId).toBeTruthy();

    mocks.cancel.mockClear();
    await clearMedReminderIntents('med-a');
    await forceRescheduleNotifications();

    const cancelled = mocks.cancel.mock.calls.map((call) => call[0]);
    expect(cancelled).toContain(medAId);
    expect(cancelled).not.toContain(trainingId);
    expect(cancelled).not.toContain(sleepId);
    expect(scheduled.some((row) => row.identifier === trainingId)).toBe(true);
    expect(scheduled.some((row) => row.content.data?.logicalKey === keyA)).toBe(false);
    expect(await getIntent(keyA)).toBeNull();
    expect(await getIntent(keyB)).not.toBeNull();
    expect((await getIntent('training_at:s1'))?.data.scheduledAt).toBe(fireAt);
    expect(await getIntent('sleep_bedtime')).not.toBeNull();
    expect(mocks.cancelAll).not.toHaveBeenCalled();
  });

  it('a cleared medication intent is not recreated by reconciliation', async () => {
    const dose = new Date(Date.now() + 3_600_000).toISOString();
    const key = `med:med-a:${dose}`;
    await setIntent(key, {
      type: 'MED_REMINDER', medId: 'med-a', scheduledFor: dose, title: 'A', body: 'A',
    });
    await clearIntent(key);
    await forceRescheduleNotifications();
    expect(await getIntent(key)).toBeNull();
    expect(mocks.schedule.mock.calls.some((call) => call[0]?.content?.data?.logicalKey === key)).toBe(false);
  });
});
