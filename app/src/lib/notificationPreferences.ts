import AsyncStorage from '@react-native-async-storage/async-storage';

export type NotificationPreferences = {
  quietStartHHMM: string | null;
  quietEndHHMM: string | null;
  snoozeMinutes: number;
};

const STORAGE_KEY = 'settings:notificationPrefs';
const DEFAULT_PREFS: NotificationPreferences = {
  quietStartHHMM: null,
  quietEndHHMM: null,
  snoozeMinutes: 10,
};

let cachedPrefs: NotificationPreferences | null = null;

function clampNumber(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function normalizeHHMM(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  let minutes = parseInt(match[2], 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23) return null;
  if (minutes < 0 || minutes > 59) return null;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function normalizePrefs(raw: any): NotificationPreferences {
  const quietStart = normalizeHHMM(raw?.quietStartHHMM ?? raw?.quietStart);
  const quietEnd = normalizeHHMM(raw?.quietEndHHMM ?? raw?.quietEnd);
  const snooze = clampNumber(
    typeof raw?.snoozeMinutes === 'number'
      ? raw.snoozeMinutes
      : parseInt(String(raw?.snoozeMinutes ?? DEFAULT_PREFS.snoozeMinutes), 10),
    1,
    240
  );
  return {
    quietStartHHMM: quietStart,
    quietEndHHMM: quietEnd,
    snoozeMinutes: snooze,
  };
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  if (cachedPrefs) return cachedPrefs;
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (!stored) {
      cachedPrefs = { ...DEFAULT_PREFS };
      return cachedPrefs;
    }
    const parsed = JSON.parse(stored);
    cachedPrefs = normalizePrefs(parsed);
    return cachedPrefs;
  } catch {
    cachedPrefs = { ...DEFAULT_PREFS };
    return cachedPrefs;
  }
}

export function getNotificationPreferencesSync(): NotificationPreferences {
  return cachedPrefs ?? { ...DEFAULT_PREFS };
}

export async function setNotificationPreferences(
  next: NotificationPreferences
): Promise<NotificationPreferences> {
  const normalized = normalizePrefs(next);
  cachedPrefs = normalized;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export async function updateNotificationPreferences(
  patch: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const current = await getNotificationPreferences();
  const merged: NotificationPreferences = {
    quietStartHHMM: patch.quietStartHHMM !== undefined ? normalizeHHMM(patch.quietStartHHMM) : current.quietStartHHMM,
    quietEndHHMM: patch.quietEndHHMM !== undefined ? normalizeHHMM(patch.quietEndHHMM) : current.quietEndHHMM,
    snoozeMinutes:
      patch.snoozeMinutes !== undefined
        ? clampNumber(patch.snoozeMinutes, 1, 240)
        : current.snoozeMinutes,
  };
  return await setNotificationPreferences(merged);
}

function hhmmToMinutes(hhmm: string | null): number | null {
  if (!hhmm) return null;
  const [hours, minutes] = hhmm.split(':').map((part) => parseInt(part, 10));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function isMinutesWithinRange(minutes: number, start: number, end: number): boolean {
  if (start === end) return false;
  if (start < end) {
    return minutes >= start && minutes < end;
  }
  // Overnight (e.g., 22:00 → 06:00)
  return minutes >= start || minutes < end;
}

export function isWithinQuietHours(date: Date, prefs: NotificationPreferences): boolean {
  const startMinutes = hhmmToMinutes(prefs.quietStartHHMM);
  const endMinutes = hhmmToMinutes(prefs.quietEndHHMM);
  if (startMinutes === null || endMinutes === null || startMinutes === endMinutes) {
    return false;
  }
  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  return isMinutesWithinRange(currentMinutes, startMinutes, endMinutes);
}

export function applyQuietHours(date: Date, prefs: NotificationPreferences): Date {
  const startMinutes = hhmmToMinutes(prefs.quietStartHHMM);
  const endMinutes = hhmmToMinutes(prefs.quietEndHHMM);
  if (startMinutes === null || endMinutes === null || startMinutes === endMinutes) {
    return new Date(date);
  }
  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  if (!isMinutesWithinRange(currentMinutes, startMinutes, endMinutes)) {
    return new Date(date);
  }
  const adjusted = new Date(date);
  if (startMinutes < endMinutes) {
    // Same-day quiet window (e.g., 12:00 → 14:00)
    adjusted.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);
    if (adjusted <= date) adjusted.setDate(adjusted.getDate() + 1);
    return adjusted;
  }
  // Overnight window (e.g., 22:00 → 06:00)
  if (currentMinutes >= startMinutes) {
    // After quiet start (late evening) → move to next day's quiet end
    adjusted.setDate(adjusted.getDate() + 1);
    adjusted.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);
    return adjusted;
  }
  // Before quiet end (early morning) → move to same day's quiet end
  adjusted.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);
  if (adjusted <= date) adjusted.setDate(adjusted.getDate() + 1);
  return adjusted;
}

export { DEFAULT_PREFS as DEFAULT_NOTIFICATION_PREFS };

