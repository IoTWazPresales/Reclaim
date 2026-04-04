import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@reclaim/mindfulness/reactive_triggers:v1';

export async function loadReactiveTriggersEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw === 'true';
  } catch {
    return false;
  }
}

export async function saveReactiveTriggersEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
}
