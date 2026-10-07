// C:\Reclaim\app\src\lib\meditationSettings.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MeditationType } from './meditations';

const KEY = '@reclaim/meditation/settings/v1';

export type MeditationAutoRule =
  | { mode: 'fixed_time'; type: MeditationType; hour: number; minute: number }
  | { mode: 'after_wake'; type: MeditationType; offsetMinutes: number };

export type MeditationSettings = { rules: MeditationAutoRule[] };

const DEFAULT_SETTINGS: MeditationSettings = {
  rules: [{ mode: 'after_wake', type: 'four_7_8_breathing', offsetMinutes: 0 }],
};

export async function loadMeditationSettings(): Promise<MeditationSettings> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) {
    await saveMeditationSettings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }

  try {
    const parsed = JSON.parse(raw) as MeditationSettings;
    if (!parsed || !Array.isArray(parsed.rules)) return { rules: [] };
    return parsed;
  } catch {
    return { rules: [] };
  }
}

export async function saveMeditationSettings(s: MeditationSettings) {
  await AsyncStorage.setItem(KEY, JSON.stringify(s));
}
