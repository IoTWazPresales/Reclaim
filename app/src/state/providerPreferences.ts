import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@reclaim/providerPreference:v1';

export async function setProviderOnboardingComplete(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // ignore
  }
}

export async function getProviderOnboardingComplete(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(STORAGE_KEY)) === '1';
  } catch {
    return false;
  }
}

