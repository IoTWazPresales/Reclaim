import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export type RoutineTemplateKind = 'meal' | 'break' | 'focus' | 'rest' | 'gym' | 'custom';
export type RoutineExclusivity = 'exclusive' | 'overlay';

export type RoutineTemplate = {
  id: string;
  title: string;
  kind: RoutineTemplateKind;
  durationMin: number;
  windowStartMin: number; // minutes from 00:00 local
  windowEndMin: number; // minutes from 00:00 local
  exclusivity: RoutineExclusivity;
  enabled: boolean;
  reason?: string; // optional default why
};

export type RoutineSuggestionState = 'suggested' | 'accepted' | 'skipped';

export type RoutineSuggestionRecord = {
  templateId: string;
  state: RoutineSuggestionState;
  startISO?: string;
  endISO?: string;
};

export type RoutineSuggestionRemote = {
  id: string;
  user_id: string;
  date: string;
  routine_template_id: string;
  suggested_start_ts: string | null;
  suggested_end_ts: string | null;
  reason: string | null;
  state: RoutineSuggestionState;
  created_at: string;
};

export type RoutineTemplateRemote = {
  id: string;
  user_id: string;
  title: string;
  kind: RoutineTemplateKind;
  duration_min: number;
  window_start_min: number;
  window_end_min: number;
  exclusivity: RoutineExclusivity;
  enabled: boolean;
  created_at: string;
};

type RoutineStateByTemplate = Record<string, RoutineSuggestionRecord>;

const STORAGE_KEY_PREFIX = '@reclaim/routines/';
export const ROUTINE_INTENT_KEY = '@reclaim/routine_intent';

export const defaultRoutineTemplates: RoutineTemplate[] = [
  {
    id: 'breakfast',
    title: 'Breakfast',
    kind: 'meal',
    durationMin: 30,
    windowStartMin: 6 * 60 + 30, // 6:30 AM
    windowEndMin: 10 * 60, // 10:00 AM
    exclusivity: 'exclusive',
    enabled: true,
    reason: 'Early morning fuel to start your day.',
  },
  {
    id: 'lunch',
    title: 'Lunch',
    kind: 'meal',
    durationMin: 45,
    windowStartMin: 11 * 60,
    windowEndMin: 14 * 60 + 30,
    exclusivity: 'exclusive',
    enabled: true,
    reason: 'Fits between your midday commitments.',
  },
  {
    id: 'dinner',
    title: 'Dinner',
    kind: 'meal',
    durationMin: 60,
    windowStartMin: 18 * 60, // 6:00 PM
    windowEndMin: 20 * 60 + 30, // 8:30 PM
    exclusivity: 'exclusive',
    enabled: true,
    reason: 'Evening meal before wind-down time.',
  },
  {
    id: 'walk_break',
    title: 'Walk / reset',
    kind: 'break',
    durationMin: 20,
    windowStartMin: 15 * 60,
    windowEndMin: 18 * 60,
    exclusivity: 'exclusive',
    enabled: true,
    reason: 'A quick reset in your afternoon free time.',
  },
  {
    id: 'plan_tomorrow',
    title: 'Plan tomorrow',
    kind: 'focus',
    durationMin: 20,
    windowStartMin: 19 * 60,
    windowEndMin: 22 * 60,
    exclusivity: 'exclusive',
    enabled: true,
    reason: 'Short prep block before evening wind-down.',
  },
];

function storageKeyForDate(dateStr: string) {
  return `${STORAGE_KEY_PREFIX}${dateStr}`;
}

export function getLocalDateKey(date: Date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function loadRoutineState(dateStr: string): Promise<RoutineStateByTemplate> {
  try {
    const raw = await AsyncStorage.getItem(storageKeyForDate(dateStr));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed as RoutineStateByTemplate;
    return {};
  } catch {
    return {};
  }
}

export async function saveRoutineState(dateStr: string, state: RoutineStateByTemplate): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKeyForDate(dateStr), JSON.stringify(state));
  } catch {
    // ignore
  }
}

// ------------ Optional Supabase helpers (phase 3) ------------
export async function fetchRoutineSuggestionsRemote(dateStr: string) {
  try {
    const { data, error } = await supabase
      .from('routine_suggestions')
      .select('*')
      .eq('date', dateStr);
    if (error) throw error;
    return (data ?? []) as RoutineSuggestionRemote[];
  } catch {
    return [];
  }
}

export async function upsertRoutineSuggestionRemote(payload: Partial<RoutineSuggestionRemote> & { routine_template_id: string; date: string; state: RoutineSuggestionState; }) {
  try {
    const { error } = await supabase.from('routine_suggestions').upsert(payload);
    if (error) throw error;
  } catch {
    // ignore remote failures (local-first)
  }
}

export async function fetchRoutineTemplatesRemote() {
  try {
    const { data, error } = await supabase.from('routine_templates').select('*').eq('enabled', true);
    if (error) throw error;
    return (data ?? []) as RoutineTemplateRemote[];
  } catch {
    return [];
  }
}

/**
 * Adjust meal time windows based on user's sleep schedule
 * @param wakeTimeMin - Minutes from midnight when user typically wakes
 * @param bedtimeMin - Minutes from midnight when user typically goes to bed
 * @returns Adjusted routine templates with smart meal times
 */
export function adjustMealTimesForSchedule(
  wakeTimeMin: number,
  bedtimeMin: number,
): Partial<Record<string, { windowStartMin: number; windowEndMin: number; reason: string }>> {
  const adjustments: Partial<Record<string, { windowStartMin: number; windowEndMin: number; reason: string }>> = {};

  // Breakfast: 30-120 min after wake
  const breakfastStart = Math.min(wakeTimeMin + 30, 10 * 60); // No later than 10 AM
  const breakfastEnd = Math.min(wakeTimeMin + 180, 11 * 60); // No later than 11 AM
  
  if (wakeTimeMin < 9 * 60) { // Only suggest if user wakes before 9 AM
    adjustments.breakfast = {
      windowStartMin: breakfastStart,
      windowEndMin: breakfastEnd,
      reason: `Best timing after your typical wake time.`,
    };
  }

  // Lunch: midday window, 12:00-14:30 default
  adjustments.lunch = {
    windowStartMin: 11 * 60 + 30,
    windowEndMin: 14 * 60 + 30,
    reason: 'Optimal midday energy window.',
  };

  // Dinner: 2-3 hours before bedtime, but not earlier than 18:00
  const dinnerEnd = Math.max(bedtimeMin - 120, 18 * 60 + 30); // At least 2h before bed
  const dinnerStart = Math.max(dinnerEnd - 150, 18 * 60); // 2.5h window
  
  adjustments.dinner = {
    windowStartMin: dinnerStart,
    windowEndMin: dinnerEnd,
    reason: `Allows digestion before your typical bedtime.`,
  };

  return adjustments;
}

/**
 * Get routine templates adjusted for user's schedule
 */
export async function getAdjustedRoutineTemplates(): Promise<RoutineTemplate[]> {
  const templates = [...defaultRoutineTemplates];

  // Try to load user's sleep settings for smart adjustments
  try {
    const { getUserSettings } = await import('./userSettings');
    const settings = await getUserSettings();

    if (settings?.sleep?.typicalWakeTime && settings?.sleep?.targetBedtime) {
      const [wh, wm] = settings.sleep.typicalWakeTime.split(':').map(Number);
      const [bh, bm] = settings.sleep.targetBedtime.split(':').map(Number);

      const wakeMin = (wh * 60) + wm;
      const bedMin = (bh * 60) + bm;

      const adjustments = adjustMealTimesForSchedule(wakeMin, bedMin);

      // Apply adjustments to templates
      for (const template of templates) {
        if (adjustments[template.id]) {
          const adj = adjustments[template.id];
          template.windowStartMin = adj!.windowStartMin;
          template.windowEndMin = adj!.windowEndMin;
          template.reason = adj!.reason;
        }
      }
    }
  } catch (error) {
    // Ignore errors, use defaults
  }

  return templates;
}
