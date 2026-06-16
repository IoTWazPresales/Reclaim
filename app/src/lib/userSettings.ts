import AsyncStorage from '@react-native-async-storage/async-storage';
import { getItemScoped, setItemScoped } from '@/persistence/ScopedStorage';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import type { AppearanceMode } from '@/theme';

export type GuidedPrepSeconds = 0 | 15 | 30 | 60;

export type UserSettings = {
  /** System follows OS; light/dark override. Default: system. */
  appearanceMode: AppearanceMode;
  badgesEnabled: boolean;
  backgroundSyncEnabled: boolean;
  refillRemindersEnabled: boolean;
  scientificInsightsEnabled: boolean;
  hapticsEnabled: boolean;
  notificationChimeEnabled: boolean;
  nerdModeEnabled: boolean;
  hideShortStreaks: boolean;
  /** Seconds of preparation time before guided training starts. Gives time to lock phone and use watch. */
  guidedPrepSeconds: GuidedPrepSeconds;
};

const STORAGE_KEY = 'settings:user:v1';

const DEFAULT_SETTINGS: UserSettings = {
  appearanceMode: 'system',
  badgesEnabled: true,
  backgroundSyncEnabled: false,
  refillRemindersEnabled: false,
  scientificInsightsEnabled: true,
  hapticsEnabled: true,
  notificationChimeEnabled: true,
  nerdModeEnabled: false,
  hideShortStreaks: false,
  guidedPrepSeconds: 30,
};

export async function getUserSettings(): Promise<UserSettings> {
  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id ?? null;

    let raw: string | null = null;
    let source: 'scoped' | 'legacy' = 'legacy';

    if (userId) {
      raw = await getItemScoped(userId, STORAGE_KEY);
      if (raw) {
        source = 'scoped';
      }
    }
    if (!raw) {
      raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) source = 'legacy';
    }

    logger.debug('[STORAGE_SCOPE] read', source, userId ? 'userId=' + userId.substring(0, 8) : 'no-user');

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
  const json = JSON.stringify(next);

  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user?.id ?? null;

  await AsyncStorage.setItem(STORAGE_KEY, json);
  if (userId) {
    await setItemScoped(userId, STORAGE_KEY, json);
    logger.debug('[STORAGE_SCOPE] write dual (scoped + legacy) userId=' + userId.substring(0, 8));
  } else {
    logger.debug('[STORAGE_SCOPE] write legacy only (no user)');
  }

  return next;
}

