import AsyncStorage from '@react-native-async-storage/async-storage';

export type RecoveryStageId = 'foundation' | 'stabilize' | 'optimize' | 'thrive';

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
};

const STORAGE_KEY = 'recovery:progress:v1';

const DEFAULT_PROGRESS: StoredRecoveryProgress = {
  currentStageId: 'foundation',
  startedAt: new Date().toISOString(),
  completedStageIds: [],
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

export async function setRecoveryStage(stageId: RecoveryStageId): Promise<StoredRecoveryProgress> {
  const next = {
    currentStageId: stageId,
    startedAt: new Date().toISOString(),
    completedStageIds: [],
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

export async function resetRecoveryProgress(): Promise<StoredRecoveryProgress> {
  await AsyncStorage.removeItem(STORAGE_KEY);
  return { ...DEFAULT_PROGRESS, startedAt: new Date().toISOString() };
}

export function getStageById(id: RecoveryStageId): RecoveryStage {
  return RECOVERY_STAGES.find((stage) => stage.id === id) ?? RECOVERY_STAGES[0];
}

