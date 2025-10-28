import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@reclaim/sleep/settings';
const DETECT_KEY = '@reclaim/sleep/wakeDetections';

export type SleepSettings = {
  typicalWakeHHMM: string;      // current app “base” wake used for morning confirm
  targetSleepMinutes: number;   // bedtime planning (e.g., 480 = 8h)
  autoDetectEnabled: boolean;   // (future) auto-run weekly
  desiredWakeHHMM?: string;     // user’s desired circadian wake
  lastAutoDetectedHHMM?: string;
  lastAutoDetectAt?: string;    // ISO timestamp
};

export type WakeDetection = {
  date: string;       // YYYY-MM-DD (local day of wake)
  hhmm: string;       // detected natural wake (e.g., "06:52")
  confidence?: number; // 0..1 optional
};

const DEFAULTS: SleepSettings = {
  typicalWakeHHMM: '07:00',
  targetSleepMinutes: 480,
  autoDetectEnabled: false,
};

export async function loadSleepSettings(): Promise<SleepSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

export async function saveSleepSettings(next: Partial<SleepSettings>) {
  const prev = await loadSleepSettings();
  const merged = { ...prev, ...next };
  await AsyncStorage.setItem(KEY, JSON.stringify(merged));
  return merged;
}

/* ---------- Daily wake detections ---------- */

export async function listWakeDetections(): Promise<WakeDetection[]> {
  try {
    const raw = await AsyncStorage.getItem(DETECT_KEY);
    if (!raw) return [];
    const arr: WakeDetection[] = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function addWakeDetection(det: WakeDetection) {
  const all = await listWakeDetections();
  const key = det.date;
  const withoutDup = all.filter(d => d.date !== key);
  const next = [...withoutDup, det].sort((a, b) => a.date.localeCompare(b.date));
  await AsyncStorage.setItem(DETECT_KEY, JSON.stringify(next));
  return next;
}
