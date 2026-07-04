import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@reclaim/meditation/after_wake_sent_date';

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function wasAfterWakeMeditationSentToday(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    return v === todayKey();
  } catch {
    return false;
  }
}

export async function markAfterWakeMeditationSentToday(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, todayKey());
  } catch {
    // non-fatal
  }
}
