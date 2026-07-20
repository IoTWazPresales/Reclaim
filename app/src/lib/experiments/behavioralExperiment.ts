/**
 * One opt-in behavioral experiment (U5). Never medical / never meds.
 * Default OFF via UserSettings.experimentsEnabled.
 */
import { getItemScoped, setItemScoped } from '@/persistence/ScopedStorage';

const STORE_KEY = 'experiments:v1';

export type BehavioralExperimentId = 'evening_wind_down';

export type ExperimentAssignment = {
  experimentId: BehavioralExperimentId;
  /** Assigned when experimentsEnabled flips on */
  startedAt: string;
  /** Days the user tapped "I did it" */
  completions: string[]; // YYYY-MM-DD
};

type ExperimentStore = {
  evening_wind_down?: ExperimentAssignment;
};

export const EVENING_WIND_DOWN = {
  id: 'evening_wind_down' as const,
  title: 'Evening wind-down',
  durationDays: 14,
  prompt:
    'Optional experiment: take ~10 minutes before bed for a quiet wind-down (dim lights, no scrolling). Track whether sleep feels steadier — not a medical treatment.',
};

async function readStore(userId: string): Promise<ExperimentStore> {
  try {
    const raw = await getItemScoped(userId, STORE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ExperimentStore;
  } catch {
    return {};
  }
}

async function writeStore(userId: string, store: ExperimentStore): Promise<void> {
  await setItemScoped(userId, STORE_KEY, JSON.stringify(store));
}

/** Ensure assignment exists when experiments are enabled. */
export async function ensureEveningWindDownAssignment(userId: string): Promise<ExperimentAssignment> {
  const store = await readStore(userId);
  if (store.evening_wind_down) return store.evening_wind_down;
  const assignment: ExperimentAssignment = {
    experimentId: 'evening_wind_down',
    startedAt: new Date().toISOString(),
    completions: [],
  };
  store.evening_wind_down = assignment;
  await writeStore(userId, store);
  return assignment;
}

export async function clearExperimentAssignments(userId: string): Promise<void> {
  await writeStore(userId, {});
}

export async function logEveningWindDownCompletion(
  userId: string,
  dayDate: string,
): Promise<ExperimentAssignment | null> {
  const store = await readStore(userId);
  const current = store.evening_wind_down;
  if (!current) return null;
  if (current.completions.includes(dayDate)) return current;
  const next = { ...current, completions: [...current.completions, dayDate] };
  store.evening_wind_down = next;
  await writeStore(userId, store);
  return next;
}

export function experimentDayProgress(assignment: ExperimentAssignment, now = new Date()): {
  dayNumber: number;
  remaining: number;
  completionCount: number;
} {
  const start = new Date(assignment.startedAt);
  const ms = now.getTime() - start.getTime();
  const dayNumber = Math.min(EVENING_WIND_DOWN.durationDays, Math.max(1, Math.floor(ms / 86_400_000) + 1));
  return {
    dayNumber,
    remaining: Math.max(0, EVENING_WIND_DOWN.durationDays - dayNumber),
    completionCount: assignment.completions.length,
  };
}
