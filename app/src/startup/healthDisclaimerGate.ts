import AsyncStorage from '@react-native-async-storage/async-storage';

export const HEALTH_DISCLAIMER_STORAGE_KEY = '@reclaim/health_disclaimer_seen';

/** Returns true when the one-time health disclaimer must be shown on splash. */
export async function needsHealthDisclaimer(): Promise<boolean> {
  try {
    const seen = await AsyncStorage.getItem(HEALTH_DISCLAIMER_STORAGE_KEY);
    return seen !== '1';
  } catch {
    return true;
  }
}

export async function markHealthDisclaimerSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(HEALTH_DISCLAIMER_STORAGE_KEY, '1');
  } catch {
    // non-fatal
  }
}
