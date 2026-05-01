import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@reclaim/providerPreference:v1';

export async function setProviderOnboardingComplete(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, '1');
  } catch (e) {
    if (__DEV__) console.warn('[providerPreferences] setProviderOnboardingComplete failed:', e);
  }
}

export async function getProviderOnboardingComplete(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(STORAGE_KEY)) === '1';
  } catch (e) {
    if (__DEV__) console.warn('[providerPreferences] getProviderOnboardingComplete failed:', e);
    return false;
  }
}

export async function resetProviderOnboardingComplete(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    if (__DEV__) console.warn('[providerPreferences] resetProviderOnboardingComplete failed:', e);
  }
}

