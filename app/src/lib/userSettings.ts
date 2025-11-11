import AsyncStorage from '@react-native-async-storage/async-storage';

export type UserSettings = {
  badgesEnabled: boolean;
  backgroundSyncEnabled: boolean;
  refillRemindersEnabled: boolean;
};

const STORAGE_KEY = 'settings:user:v1';

const DEFAULT_SETTINGS: UserSettings = {
  badgesEnabled: true,
  backgroundSyncEnabled: false,
  refillRemindersEnabled: false,
};

export async function getUserSettings(): Promise<UserSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function updateUserSettings(patch: Partial<UserSettings>): Promise<UserSettings> {
  const current = await getUserSettings();
  const next = { ...current, ...patch };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

