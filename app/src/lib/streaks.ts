import AsyncStorage from '@react-native-async-storage/async-storage';

export type StreakType = 'mood' | 'medication' | 'mindfulness' | 'sleep';

export type StreakBadge = {
  id: string;
  title: string;
  description: string;
  threshold: number;
};

export type StreakState = {
  lastDate: string | null;
  count: number;
  longest: number;
  badges: string[];
  /** Reclaim Shield: earned at each 7-day milestone, absorbs one missed day. Max 1 at a time. */
  shieldsAvailable: number;
  /** Whether a shield was used in the last event (for UI feedback) */
  shieldUsedLastEvent?: boolean;
};

type StreakStore = Record<StreakType, StreakState>;

const STORAGE_KEY = 'streaks:v1';

const DEFAULT_STREAK_STATE: StreakState = {
  lastDate: null,
  count: 0,
  longest: 0,
  badges: [],
  shieldsAvailable: 0,
  shieldUsedLastEvent: false,
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
  mindfulness: [
    { id: 'mindful_breeze', title: 'Mindful Breeze', description: 'Completed mindfulness 3 days in a row', threshold: 3 },
    { id: 'mindful_flow', title: 'Mindful Flow', description: 'Completed mindfulness 7 days in a row', threshold: 7 },
    { id: 'mindful_harmony', title: 'Mindful Harmony', description: 'Completed mindfulness 14 days in a row', threshold: 14 },
    { id: 'mindful_master', title: 'Mindful Master', description: 'Completed mindfulness 30 days in a row', threshold: 30 },
  ],
  sleep: [
    { id: 'sleep_rest', title: 'Rest Rhythm', description: 'Consistent sleep 3 days in a row', threshold: 3 },
    { id: 'sleep_tide', title: 'Sleep Tide', description: 'Consistent sleep 7 days in a row', threshold: 7 },
    { id: 'sleep_anchor', title: 'Sleep Anchor', description: 'Consistent sleep 14 days in a row', threshold: 14 },
    { id: 'sleep_harmony', title: 'Sleep Harmony', description: 'Consistent sleep 30 days in a row', threshold: 30 },
  ],
};

function emptyStore(): StreakStore {
  return {
    mood: { ...DEFAULT_STREAK_STATE },
    medication: { ...DEFAULT_STREAK_STATE },
    mindfulness: { ...DEFAULT_STREAK_STATE },
    sleep: { ...DEFAULT_STREAK_STATE },
  };
}

function isoDate(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function daysBetween(prev: string | null, current: string): number | null {
  if (!prev) return null;
  const [py, pm, pd] = prev.split('-').map(Number);
  const [cy, cm, cd] = current.split('-').map(Number);
  const prevDate = new Date(py, pm - 1, pd);
  const currentDate = new Date(cy, cm - 1, cd);
  const diffMs = currentDate.getTime() - prevDate.getTime();
  return Math.round(diffMs / 86400000);
}

function mergeState(defaults: StreakState, stored: Record<string, any> | null): StreakState {
  if (!stored) return { ...defaults };
  return {
    ...defaults,
    ...stored,
    // Explicit guards for new fields that may be absent in stored v1 data
    shieldsAvailable:
      typeof stored.shieldsAvailable === 'number' ? stored.shieldsAvailable : defaults.shieldsAvailable,
    shieldUsedLastEvent:
      typeof stored.shieldUsedLastEvent === 'boolean'
        ? stored.shieldUsedLastEvent
        : defaults.shieldUsedLastEvent,
  };
}

async function loadStore(): Promise<StreakStore> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw);
    return {
      mood: mergeState(DEFAULT_STREAK_STATE, parsed?.mood ?? null),
      medication: mergeState(DEFAULT_STREAK_STATE, parsed?.medication ?? null),
      mindfulness: mergeState(DEFAULT_STREAK_STATE, parsed?.mindfulness ?? null),
      sleep: mergeState(DEFAULT_STREAK_STATE, parsed?.sleep ?? null),
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
  let shieldsAvailable = state.shieldsAvailable ?? 0;
  let shieldUsedLastEvent = false;

  if (diff === 0) {
    // Same day — no change
    count = state.count;
  } else if (diff === 1) {
    // Consecutive day — continue streak
    count = state.count + 1;
  } else if (diff === 2 && shieldsAvailable > 0) {
    // Missed exactly one day AND shield is available — absorb the gap
    count = state.count + 1;
    shieldsAvailable -= 1;
    shieldUsedLastEvent = true;
  }
  // else: gap > 2, or gap === 2 with no shield → streak resets to 1

  // Award a shield at every 7-day milestone crossing (max 1 at a time)
  const crossedMilestone =
    count >= 7 && Math.floor(count / 7) > Math.floor(state.count / 7);
  if (crossedMilestone) {
    shieldsAvailable = Math.min(shieldsAvailable + 1, 1);
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
    shieldsAvailable,
    shieldUsedLastEvent,
  };
}

export type StreakEventResult = {
  store: StreakStore;
  /** Newly earned badges from this single event (empty array if none). */
  newBadges: StreakBadge[];
  /** True if a Reclaim Shield was consumed to protect the streak this event. */
  shieldUsed: boolean;
};

export async function recordStreakEvent(type: StreakType, eventDate: Date): Promise<StreakEventResult> {
  const store = await loadStore();
  const dateKey = isoDate(eventDate);
  const prevBadges = new Set(store[type].badges);
  store[type] = withUpdatedStreak(store[type], dateKey, type);
  await saveStore(store);

  const newBadges = BADGE_DEFINITIONS[type].filter(
    (b) => store[type].badges.includes(b.id) && !prevBadges.has(b.id),
  );

  return { store, newBadges, shieldUsed: store[type].shieldUsedLastEvent ?? false };
}

export async function getStreakStore(): Promise<StreakStore> {
  return loadStore();
}

export function getBadgesFor(type: StreakType): StreakBadge[] {
  return BADGE_DEFINITIONS[type];
}

