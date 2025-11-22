import AsyncStorage from '@react-native-async-storage/async-storage';

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
    summary: 'Anchor your routine with consistent wake times and medication adherence.',
    focus: [
      'Set desired wake window',
      'Log medications for 3 consecutive days',
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
    summary: 'Fine-tune routines by introducing recovery habits and adjusting reminders.',
    focus: [
      'Enable quiet hours and snooze preferences',
      'Schedule bedtime suggestions and morning confirms',
      'Refine medication reminder windows',
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

type StoredRecoveryProgress = {
  currentStageId: RecoveryStageId;
  startedAt: string;
  completedStageIds: RecoveryStageId[];
  currentWeek?: number; // Week number (1-based)
  recoveryType?: RecoveryType; // What they're recovering from
  recoveryTypeCustom?: string; // Custom description if recoveryType is 'other'
};

const STORAGE_KEY = 'recovery:progress:v1';

const DEFAULT_PROGRESS: StoredRecoveryProgress = {
  currentStageId: 'foundation',
  startedAt: new Date().toISOString(),
  completedStageIds: [],
  currentWeek: 1,
  recoveryType: null,
};

export async function getRecoveryProgress(): Promise<StoredRecoveryProgress> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };
    const parsed = JSON.parse(raw);
    if (!parsed?.currentStageId) return { ...DEFAULT_PROGRESS };
    return {
      ...DEFAULT_PROGRESS,
      ...parsed,
      completedStageIds: Array.isArray(parsed?.completedStageIds) ? parsed.completedStageIds : [],
    };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
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
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
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
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
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
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export async function setRecoveryType(recoveryType: RecoveryType, custom?: string): Promise<StoredRecoveryProgress> {
  const current = await getRecoveryProgress();
  const next = {
    ...current,
    recoveryType: recoveryType ?? null,
    recoveryTypeCustom: custom ?? undefined,
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export async function setRecoveryWeek(week: number): Promise<StoredRecoveryProgress> {
  const current = await getRecoveryProgress();
  const next = {
    ...current,
    currentWeek: week,
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function getStageById(id: RecoveryStageId): RecoveryStage {
  return RECOVERY_STAGES.find((stage) => stage.id === id) ?? RECOVERY_STAGES[0];
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

