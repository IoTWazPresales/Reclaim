import AsyncStorage from '@react-native-async-storage/async-storage';

export type StreakType = 'mood' | 'medication';

export type StreakBadge = {
  id: string;
  title: string;
  description: string;
  threshold: number;
};

type StreakState = {
  lastDate: string | null;
  count: number;
  longest: number;
  badges: string[];
};

type StreakStore = Record<StreakType, StreakState>;

const STORAGE_KEY = 'streaks:v1';

const DEFAULT_STREAK_STATE: StreakState = {
  lastDate: null,
  count: 0,
  longest: 0,
  badges: [],
};

const BADGE_DEFINITIONS: Record<StreakType, StreakBadge[]> = {
  mood: [
    { id: 'mood_spark', title: 'Mood Spark', description: 'Logged mood 3 days in a row', threshold: 3 },
    { id: 'mood_wave', title: 'Mood Wave', description: 'Logged mood 7 days in a row', threshold: 7 },
    { id: 'mood_compass', title: 'Mood Compass', description: 'Logged mood 14 days in a row', threshold: 14 },
    { id: 'mood_pioneer', title: 'Mood Pioneer', description: 'Logged mood 30 days in a row', threshold: 30 },
  ],
  medication: [
    { id: 'med_anchor', title: 'Anchor', description: 'Confirmed meds 3 days in a row', threshold: 3 },
    { id: 'med_pulse', title: 'Pulse', description: 'Confirmed meds 7 days in a row', threshold: 7 },
    { id: 'med_guardian', title: 'Guardian', description: 'Confirmed meds 14 days in a row', threshold: 14 },
    { id: 'med_resolver', title: 'Resolver', description: 'Confirmed meds 30 days in a row', threshold: 30 },
  ],
};

function emptyStore(): StreakStore {
  return {
    mood: { ...DEFAULT_STREAK_STATE },
    medication: { ...DEFAULT_STREAK_STATE },
  };
}

function isoDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function daysBetween(prev: string | null, current: string): number | null {
  if (!prev) return null;
  const prevDate = new Date(prev);
  const currentDate = new Date(current);
  const diffMs = currentDate.getTime() - prevDate.getTime();
  return Math.round(diffMs / 86400000);
}

async function loadStore(): Promise<StreakStore> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw);
    return {
      mood: { ...DEFAULT_STREAK_STATE, ...(parsed?.mood ?? {}) },
      medication: { ...DEFAULT_STREAK_STATE, ...(parsed?.medication ?? {}) },
    };
  } catch {
    return emptyStore();
  }
}

async function saveStore(store: StreakStore): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function withUpdatedStreak(state: StreakState, eventDate: string, type: StreakType): StreakState {
  const diff = daysBetween(state.lastDate, eventDate);
  let count = 1;
  if (diff === 0) {
    count = state.count;
  } else if (diff === 1) {
    count = state.count + 1;
  }

  const nextBadges = new Set(state.badges);
  BADGE_DEFINITIONS[type].forEach((badge) => {
    if (count >= badge.threshold) {
      nextBadges.add(badge.id);
    }
  });

  return {
    lastDate: eventDate,
    count,
    longest: Math.max(state.longest, count),
    badges: Array.from(nextBadges),
  };
}

export async function recordStreakEvent(type: StreakType, eventDate: Date): Promise<StreakStore> {
  const store = await loadStore();
  const dateKey = isoDate(eventDate);
  store[type] = withUpdatedStreak(store[type], dateKey, type);
  await saveStore(store);
  return store;
}

export async function getStreakStore(): Promise<StreakStore> {
  return loadStore();
}

export function getBadgesFor(type: StreakType): StreakBadge[] {
  return BADGE_DEFINITIONS[type];
}

