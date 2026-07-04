/**
 * Regression tests for notificationPreferences — D15, quiet hours logic.
 *
 * D15: setNotificationPreferences updates in-memory cache BEFORE AsyncStorage.setItem —
 * if persist throws, memory cache disagrees with disk.
 *
 * Also covers quiet hours edge cases and normalization.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';

vi.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {};
  return {
    default: {
      getItem: vi.fn(async (key: string) => store[key] ?? null),
      setItem: vi.fn(async (key: string, val: string) => { store[key] = val; }),
      removeItem: vi.fn(async (key: string) => { delete store[key]; }),
      clear: vi.fn(async () => { store = {}; }),
    },
  };
});

beforeEach(async () => {
  await AsyncStorage.clear();
  vi.restoreAllMocks();
  // Reset module cache so cachedPrefs is cleared
  vi.resetModules();
});

describe('notificationPreferences — round-trip', () => {
  it('returns defaults when storage is empty', async () => {
    const mod = await import('../notificationPreferences');
    const prefs = await mod.getNotificationPreferences();
    expect(prefs.enabled).toBe(true);
    expect(prefs.moodRemindersEnabled).toBe(true);
    expect(prefs.quietStartHHMM).toBeNull();
    expect(prefs.quietEndHHMM).toBeNull();
    expect(prefs.snoozeMinutes).toBe(10);
  });

  it('persists and loads preferences', async () => {
    const mod = await import('../notificationPreferences');
    const saved = await mod.setNotificationPreferences({
      enabled: false,
      moodRemindersEnabled: false,
      moodReminderHHMM: '20:00',
      quietStartHHMM: '22:00',
      quietEndHHMM: '07:00',
      snoozeMinutes: 15,
    });
    expect(saved.quietStartHHMM).toBe('22:00');

    // Reset module cache to force re-read from storage
    vi.resetModules();
    const mod2 = await import('../notificationPreferences');
    const loaded = await mod2.getNotificationPreferences();
    expect(loaded.enabled).toBe(false);
    expect(loaded.quietStartHHMM).toBe('22:00');
    expect(loaded.quietEndHHMM).toBe('07:00');
  });

  it('normalizes invalid HHMM to null', async () => {
    const mod = await import('../notificationPreferences');
    const saved = await mod.setNotificationPreferences({
      enabled: true,
      moodRemindersEnabled: true,
      moodReminderHHMM: '20:00',
      quietStartHHMM: 'bad',
      quietEndHHMM: '25:00',
      snoozeMinutes: 10,
    });
    expect(saved.quietStartHHMM).toBeNull();
    expect(saved.quietEndHHMM).toBeNull();
  });

  it('mood reminder time defaults to 20:00 and normalizes invalid values back to default', async () => {
    const mod = await import('../notificationPreferences');
    const defaults = await mod.getNotificationPreferences();
    expect(defaults.moodReminderHHMM).toBe('20:00');

    const custom = await mod.updateNotificationPreferences({ moodReminderHHMM: '21:30' });
    expect(custom.moodReminderHHMM).toBe('21:30');

    const invalid = await mod.updateNotificationPreferences({ moodReminderHHMM: '99:99' });
    expect(invalid.moodReminderHHMM).toBe('21:30');
  });

  it('clamps snoozeMinutes to [1, 240]', async () => {
    const mod = await import('../notificationPreferences');
    const low = await mod.setNotificationPreferences({
      enabled: true,
      moodRemindersEnabled: true,
      moodReminderHHMM: '20:00',
      quietStartHHMM: null,
      quietEndHHMM: null,
      snoozeMinutes: -5,
    });
    expect(low.snoozeMinutes).toBe(1);

    vi.resetModules();
    const mod2 = await import('../notificationPreferences');
    const high = await mod2.setNotificationPreferences({
      enabled: true,
      moodRemindersEnabled: true,
      moodReminderHHMM: '20:00',
      quietStartHHMM: null,
      quietEndHHMM: null,
      snoozeMinutes: 999,
    });
    expect(high.snoozeMinutes).toBe(240);
  });
});

describe('quiet hours', () => {
  it('same-day window: 09:00–17:00 blocks 12:00', async () => {
    const mod = await import('../notificationPreferences');
    const prefs = await mod.setNotificationPreferences({
      enabled: true,
      moodRemindersEnabled: true,
      moodReminderHHMM: '20:00',
      quietStartHHMM: '09:00',
      quietEndHHMM: '17:00',
      snoozeMinutes: 10,
    });
    const noon = new Date(2026, 3, 12, 12, 0, 0);
    expect(mod.isWithinQuietHours(noon, prefs)).toBe(true);
  });

  it('same-day window: 09:00–17:00 allows 08:00', async () => {
    const mod = await import('../notificationPreferences');
    const prefs = await mod.setNotificationPreferences({
      enabled: true,
      moodRemindersEnabled: true,
      moodReminderHHMM: '20:00',
      quietStartHHMM: '09:00',
      quietEndHHMM: '17:00',
      snoozeMinutes: 10,
    });
    const morning = new Date(2026, 3, 12, 8, 0, 0);
    expect(mod.isWithinQuietHours(morning, prefs)).toBe(false);
  });

  it('overnight window: 22:00–06:00 blocks 23:30', async () => {
    const mod = await import('../notificationPreferences');
    const prefs = await mod.setNotificationPreferences({
      enabled: true,
      moodRemindersEnabled: true,
      moodReminderHHMM: '20:00',
      quietStartHHMM: '22:00',
      quietEndHHMM: '06:00',
      snoozeMinutes: 10,
    });
    const late = new Date(2026, 3, 12, 23, 30, 0);
    expect(mod.isWithinQuietHours(late, prefs)).toBe(true);
  });

  it('overnight window: 22:00–06:00 blocks 04:00', async () => {
    const mod = await import('../notificationPreferences');
    const prefs = await mod.setNotificationPreferences({
      enabled: true,
      moodRemindersEnabled: true,
      moodReminderHHMM: '20:00',
      quietStartHHMM: '22:00',
      quietEndHHMM: '06:00',
      snoozeMinutes: 10,
    });
    const earlyMorn = new Date(2026, 3, 13, 4, 0, 0);
    expect(mod.isWithinQuietHours(earlyMorn, prefs)).toBe(true);
  });

  it('start === end is treated as disabled', async () => {
    const mod = await import('../notificationPreferences');
    const prefs = await mod.setNotificationPreferences({
      enabled: true,
      moodRemindersEnabled: true,
      moodReminderHHMM: '20:00',
      quietStartHHMM: '10:00',
      quietEndHHMM: '10:00',
      snoozeMinutes: 10,
    });
    const at10 = new Date(2026, 3, 12, 10, 0, 0);
    expect(mod.isWithinQuietHours(at10, prefs)).toBe(false);
  });

  it('applyQuietHours pushes time to end of quiet window', async () => {
    const mod = await import('../notificationPreferences');
    const prefs = await mod.setNotificationPreferences({
      enabled: true,
      moodRemindersEnabled: true,
      moodReminderHHMM: '20:00',
      quietStartHHMM: '22:00',
      quietEndHHMM: '06:00',
      snoozeMinutes: 10,
    });
    const late = new Date(2026, 3, 12, 23, 0, 0);
    const adjusted = mod.applyQuietHours(late, prefs);
    expect(adjusted.getHours()).toBe(6);
    expect(adjusted.getMinutes()).toBe(0);
    expect(adjusted.getDate()).toBe(13);
  });
});

describe('D15 — cache/disk divergence on persist failure (fixed)', () => {
  it('cache retains old value when setItem throws', async () => {
    const mod = await import('../notificationPreferences');
    await mod.getNotificationPreferences();

    (AsyncStorage.setItem as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('disk full'),
    );

    await expect(
      mod.setNotificationPreferences({
        enabled: false,
        moodRemindersEnabled: true,
        moodReminderHHMM: '20:00',
        quietStartHHMM: null,
        quietEndHHMM: null,
        snoozeMinutes: 10,
      }),
    ).rejects.toThrow('disk full');

    // After fix: sync getter still returns OLD value because cache wasn't updated
    const syncPrefs = mod.getNotificationPreferencesSync();
    expect(syncPrefs.enabled).toBe(true);
  });
});
