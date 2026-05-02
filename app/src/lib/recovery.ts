import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/lib/supabase';

export type RecoveryStageId = 'foundation' | 'stabilize' | 'optimize' | 'thrive';

export type RecoveryType = 'substance' | 'exhaustion' | 'mental_breakdown' | 'other' | null;

export type RecoveryStage = {
  id: RecoveryStageId;
  title: string;
  summary: string;
  focus: string[];
};

export const RECOVERY_STAGES: RecoveryStage[] = [
  {
    id: 'foundation',
    title: 'Foundation',
    summary: 'Anchor your routine with a steady wake window, reliable sleep rhythm, and consistent daily logging.',
    focus: [
      'Set desired wake window',
      'Keep your daily logging rhythm steady',
      'Capture nightly sleep from at least one provider',
    ],
  },
  {
    id: 'stabilize',
    title: 'Stabilize',
    summary: 'Layer in mood tracking and sleep confirmations to understand your baseline.',
    focus: [
      'Complete daily mood check-ins',
      'Confirm sleep sessions within 12 hours of wake',
      'Review weekly sleep summary',
    ],
  },
  {
    id: 'optimize',
    title: 'Optimize',
    summary: 'Fine-tune routines by layering recovery habits and calmer nudges.',
    focus: [
      'Enable quiet hours and snooze preferences',
      'Schedule bedtime suggestions and morning confirms',
      'Fine-tune when reminders and check-ins fire',
    ],
  },
  {
    id: 'thrive',
    title: 'Thrive',
    summary: 'Maintain resilience with proactive resets and periodic check-ins.',
    focus: [
      'Reset recovery plan every 90 days',
      'Share insights with your care team',
      'Celebrate streaks and keep progress notes',
    ],
  },
];

export type StoredRecoveryProgress = {
  currentStageId: RecoveryStageId;
  startedAt: string;
  completedStageIds: RecoveryStageId[];
  currentWeek?: number; // Week number (1-based)
  recoveryType?: RecoveryType; // What they're recovering from
  recoveryTypeCustom?: string; // Custom description if recoveryType is 'other'
};

const STORAGE_KEY = 'recovery:progress:v1';
const STAGE_ORDER: RecoveryStageId[] = ['foundation', 'stabilize', 'optimize', 'thrive'];

const DEFAULT_PROGRESS: StoredRecoveryProgress = {
  currentStageId: 'foundation',
  startedAt: new Date().toISOString(),
  completedStageIds: [],
  currentWeek: 1,
  recoveryType: null,
};

/** localData (SQLite) is canonical when a user id is available; AsyncStorage remains legacy read-through for compatibility. */
async function persistRecoveryProgress(next: StoredRecoveryProgress): Promise<void> {
  try {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (uid) {
      const { saveRecoveryProgressForUser } = await import('@/lib/localData/recoveryProgressRepository');
      await saveRecoveryProgressForUser(uid, next);
    }
  } catch {
    // local DB optional on failure
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function mergeRecoveryProgressFromRecord(parsed: Record<string, unknown>): StoredRecoveryProgress {
  return {
    ...DEFAULT_PROGRESS,
    ...parsed,
    currentStageId: parsed.currentStageId as RecoveryStageId,
    completedStageIds: Array.isArray(parsed.completedStageIds)
      ? (parsed.completedStageIds as RecoveryStageId[])
      : [],
  };
}

export function tryParseRecoveryProgressFromAsyncStorage(raw: string | null): StoredRecoveryProgress | null {
  if (raw === null || raw === '') return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed?.currentStageId) return null;
    return mergeRecoveryProgressFromRecord(parsed);
  } catch {
    return null;
  }
}

async function alignLegacyAsyncStorageWithCanonical(canonical: StoredRecoveryProgress): Promise<void> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw === JSON.stringify(canonical)) return;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(canonical));
}

export async function getRecoveryProgress(): Promise<StoredRecoveryProgress> {
  try {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (uid) {
      const { loadRecoveryProgressForUser, tryMigrateRecoveryFromAsyncStorage } = await import(
        '@/lib/localData/recoveryProgressRepository'
      );
      const canonical = await loadRecoveryProgressForUser(uid);
      if (canonical !== null) {
        await alignLegacyAsyncStorageWithCanonical(canonical);
        return canonical;
      }
      const migrated = await tryMigrateRecoveryFromAsyncStorage(uid);
      if (migrated !== null) {
        await alignLegacyAsyncStorageWithCanonical(migrated);
        return migrated;
      }
      return { ...DEFAULT_PROGRESS };
    }
  } catch {
    // fall through to AsyncStorage-only
  }

  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const fromAs = tryParseRecoveryProgressFromAsyncStorage(raw);
  return fromAs ?? { ...DEFAULT_PROGRESS };
}

export async function setRecoveryStage(stageId: RecoveryStageId, week?: number): Promise<StoredRecoveryProgress> {
  const current = await getRecoveryProgress();
  const next = {
    ...current,
    currentStageId: stageId,
    startedAt: new Date().toISOString(),
    completedStageIds: [],
    currentWeek: week !== undefined ? week : (current.currentWeek ?? 1),
  } satisfies StoredRecoveryProgress;
  await persistRecoveryProgress(next);
  return next;
}

export async function markStageCompleted(stageId: RecoveryStageId): Promise<StoredRecoveryProgress> {
  const current = await getRecoveryProgress();
  const completed = new Set(current.completedStageIds);
  completed.add(stageId);
  const next: StoredRecoveryProgress = {
    ...current,
    completedStageIds: Array.from(completed),
  };
  await persistRecoveryProgress(next);
  return next;
}

export async function resetRecoveryProgress(week?: number, recoveryType?: RecoveryType, recoveryTypeCustom?: string): Promise<StoredRecoveryProgress> {
  const next = {
    ...DEFAULT_PROGRESS,
    startedAt: new Date().toISOString(),
    currentWeek: week !== undefined ? week : (DEFAULT_PROGRESS.currentWeek ?? 1),
    recoveryType: recoveryType ?? null,
    recoveryTypeCustom: recoveryTypeCustom ?? undefined,
  };
  await persistRecoveryProgress(next);
  return next;
}

export async function setRecoveryType(recoveryType: RecoveryType, custom?: string): Promise<StoredRecoveryProgress> {
  const current = await getRecoveryProgress();
  const next = {
    ...current,
    recoveryType: recoveryType ?? null,
    recoveryTypeCustom: custom ?? undefined,
  };
  await persistRecoveryProgress(next);
  return next;
}

export async function setRecoveryWeek(week: number): Promise<StoredRecoveryProgress> {
  const current = await getRecoveryProgress();
  const next = {
    ...current,
    currentWeek: week,
  };
  await persistRecoveryProgress(next);
  return next;
}

export function getStageById(id: RecoveryStageId): RecoveryStage {
  return RECOVERY_STAGES.find((stage) => stage.id === id) ?? RECOVERY_STAGES[0];
}

function getNextStageId(stageId: RecoveryStageId): RecoveryStageId | null {
  const idx = STAGE_ORDER.indexOf(stageId);
  if (idx < 0 || idx >= STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}

function getStageStartWeek(stageId: RecoveryStageId): number {
  const idx = STAGE_ORDER.indexOf(stageId);
  if (idx < 0) return 1;
  return idx * 3 + 1;
}

export function deriveRecoveryProgressFromStageCompletion(
  current: StoredRecoveryProgress,
  currentStageCompleted: boolean,
): StoredRecoveryProgress {
  if (!currentStageCompleted) return current;

  const stageId = current.currentStageId;
  const completed = new Set(current.completedStageIds);
  if (completed.has(stageId)) return current;
  completed.add(stageId);

  const nextStage = getNextStageId(stageId);
  if (!nextStage) {
    return {
      ...current,
      completedStageIds: Array.from(completed),
    };
  }

  return {
    ...current,
    currentStageId: nextStage,
    currentWeek: Math.max(current.currentWeek ?? 1, getStageStartWeek(nextStage)),
    startedAt: new Date().toISOString(),
    completedStageIds: Array.from(completed),
  };
}

export async function advanceRecoveryProgressFromStageCompletion(
  currentStageCompleted: boolean,
): Promise<StoredRecoveryProgress> {
  const current = await getRecoveryProgress();
  const next = deriveRecoveryProgressFromStageCompletion(current, currentStageCompleted);
  if (next === current) return current;
  await persistRecoveryProgress(next);
  return next;
}

export function getStageForWeek(week: number, recoveryType?: RecoveryType): RecoveryStageId {
  // Map weeks to stages based on recovery type
  // Default: 1-3 = foundation, 4-6 = stabilize, 7-9 = optimize, 10+ = thrive
  if (week <= 3) return 'foundation';
  if (week <= 6) return 'stabilize';
  if (week <= 9) return 'optimize';
  return 'thrive';
}

export function getWeeksPerStage(recoveryType?: RecoveryType): { [key in RecoveryStageId]: number } {
  // Default: 3 weeks per stage
  // Can be customized based on recovery type
  return {
    foundation: 3,
    stabilize: 3,
    optimize: 3,
    thrive: Infinity, // Ongoing
  };
}

