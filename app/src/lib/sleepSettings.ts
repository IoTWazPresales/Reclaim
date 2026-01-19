import AsyncStorage from '@react-native-async-storage/async-storage';
import { upsertSleepPrefs } from '@/lib/api';

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
  
  // Save to local AsyncStorage
  await AsyncStorage.setItem(KEY, JSON.stringify(merged));
  
  // Also sync to Supabase sleep_prefs table
  try {
    const { supabase } = await import('@/lib/supabase');
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Map SleepSettings format to SleepPrefs format
      const prefs: any = {
        user_id: user.id,
        updated_at: new Date().toISOString(),
      };
      
      // Map typical wake time (HH:MM) to typical_wake_time (HH:MM:SS)
      if (merged.typicalWakeHHMM) {
        prefs.typical_wake_time = merged.typicalWakeHHMM.includes(':') && merged.typicalWakeHHMM.split(':').length === 2
          ? `${merged.typicalWakeHHMM}:00`
          : merged.typicalWakeHHMM;
      }
      
      // Map desired wake time
      if (merged.desiredWakeHHMM) {
        prefs.desired_wake_time = merged.desiredWakeHHMM.includes(':') && merged.desiredWakeHHMM.split(':').length === 2
          ? `${merged.desiredWakeHHMM}:00`
          : merged.desiredWakeHHMM;
      }
      
      // Map target sleep minutes
      if (merged.targetSleepMinutes !== undefined) {
        prefs.target_sleep_minutes = merged.targetSleepMinutes;
      }
      
      // Map work days if available (would need to convert from local format)
      // For now, skip work_days as it's not in SleepSettings type
      
      await upsertSleepPrefs(prefs);
    }
  } catch (error) {
    // Log but don't fail if Supabase sync fails
    console.warn('Failed to sync sleep settings to Supabase:', error);
  }
  
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
