import type { RecoveryStage, RecoveryStageId } from '@/lib/recovery';
import type { SleepSettings } from '@/lib/sleepSettings';

const STAGE_ORDER: RecoveryStageId[] = ['foundation', 'stabilize', 'optimize', 'thrive'];

export function computeWeekInRecoveryStage(
  currentWeek: number | undefined,
  stageId: RecoveryStageId,
): { current: number; total: number } | null {
  if (!currentWeek || stageId === 'thrive') return null;
  const idx = STAGE_ORDER.indexOf(stageId);
  const startWeek = idx * 3 + 1;
  const n = currentWeek - startWeek + 1;
  const clamped = Math.max(1, Math.min(3, n));
  return { current: clamped, total: 3 };
}

export type RecoveryMedLogRow = {
  status: string;
  taken_at?: string | null;
  scheduled_for?: string | null;
};

export function longestTrailingMedDayStreak(logs: RecoveryMedLogRow[]): number {
  const takenDays = new Set<string>();
  for (const log of logs) {
    if (log.status !== 'taken') continue;
    const raw = log.taken_at ?? log.scheduled_for;
    if (!raw) continue;
    const d = new Date(raw);
    if (!Number.isFinite(d.getTime())) continue;
    takenDays.add(formatLocalDayKey(d));
  }

  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  for (;;) {
    if (!takenDays.has(formatLocalDayKey(cursor))) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function formatLocalDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export type SleepRowWithSource = { source?: string };

export type RoutineSignal = { key: 'mood' | 'sleep' | 'meds'; progress: number };

export function computeRecoveryBlockerLine(
  signals: RoutineSignal[],
  detail: { medAdherencePct: number | null; sleepMidpointStd: number | null },
): string | null {
  if (signals.length === 0) return null;
  const weakest = signals.reduce((a, b) => (a.progress <= b.progress ? a : b));
  if (weakest.key === 'meds' && detail.medAdherencePct != null) {
    return `Medication rhythm is the main drag this week (${Math.round(detail.medAdherencePct)}% on track).`;
  }
  if (weakest.key === 'sleep' && detail.sleepMidpointStd != null) {
    return `Sleep timing drift (~${Math.round(detail.sleepMidpointStd)}m) is holding this stage back.`;
  }
  if (weakest.key === 'mood') {
    return 'Mood check-ins are the lightest link — one quick log keeps the picture honest.';
  }
  return null;
}

export type RecoveryStepState = 'done' | 'in_progress' | 'not_started';

export type RecoveryActionStep = {
  id: string;
  title: string;
  state: RecoveryStepState;
  /** One line: progress or requirement */
  statusLine: string;
  /** Short affordance label */
  actionCue: string;
};

function foundationSteps(args: {
  sleepSettings?: SleepSettings;
  medLogs: RecoveryMedLogRow[];
  sleepSessions: SleepRowWithSource[];
}): RecoveryActionStep[] {
  const wakeOk = !!(args.sleepSettings?.typicalWakeHHMM?.trim() ?? args.sleepSettings?.desiredWakeHHMM?.trim());
  const streak = longestTrailingMedDayStreak(args.medLogs);
  const integrated = args.sleepSessions.filter((s) => String(s.source ?? '') !== 'manual');
  const hasManualOnly = integrated.length === 0 && args.sleepSessions.length > 0;

  const medState: RecoveryStepState =
    streak >= 3 ? 'done' : streak > 0 ? 'in_progress' : 'not_started';
  const medStatus =
    streak >= 3
      ? '3-day streak logged'
      : streak > 0
        ? `Day ${streak} of 3 with doses logged`
        : 'Not started';

  let sleepState: RecoveryStepState;
  let sleepStatus: string;
  if (integrated.length >= 1) {
    sleepState = 'done';
    sleepStatus = 'Connected — nights flowing in';
  } else if (hasManualOnly) {
    sleepState = 'in_progress';
    sleepStatus = 'Manual logs only — add a health source';
  } else {
    sleepState = 'not_started';
    sleepStatus = 'Required — connect a sleep source';
  }

  return [
    {
      id: 'foundation_wake',
      title: 'Set wake window',
      state: wakeOk ? 'done' : 'not_started',
      statusLine: wakeOk ? 'Saved in Sleep settings' : 'Not set — anchors your day',
      actionCue: wakeOk ? 'View in Sleep' : 'Set in Sleep',
    },
    {
      id: 'foundation_meds',
      title: 'Log meds 3 days straight',
      state: medState,
      statusLine: medStatus,
      actionCue: streak >= 3 ? 'Review in Meds' : 'Open Meds',
    },
    {
      id: 'foundation_sleep',
      title: 'Connect sleep data',
      state: sleepState,
      statusLine: sleepStatus,
      actionCue: integrated.length >= 1 ? 'Open Sleep' : 'Connect in Sleep',
    },
  ];
}

function stabilizeSteps(args: {
  sleepSessions: SleepRowWithSource[];
  moodStreakCount: number;
  sleepMidpointStd: number | null;
}): RecoveryActionStep[] {
  const nights = args.sleepSessions.length;
  const mood = args.moodStreakCount;

  let moodState: RecoveryStepState;
  let moodStatus: string;
  if (mood >= 3) {
    moodState = 'done';
    moodStatus = `${mood} day streak — solid`;
  } else if (mood >= 1) {
    moodState = 'in_progress';
    moodStatus = `Day ${mood} of 3 toward a rhythm`;
  } else {
    moodState = 'not_started';
    moodStatus = 'Not started this week';
  }

  let sessionState: RecoveryStepState;
  let sessionStatus: string;
  if (nights >= 3) {
    sessionState = 'done';
    sessionStatus = `${nights} recent nights logged`;
  } else if (nights >= 1) {
    sessionState = 'in_progress';
    sessionStatus = `Night ${nights} of 3 toward coverage`;
  } else {
    sessionState = 'not_started';
    sessionStatus = 'Log sleep nights in Sleep';
  }

  let rhythmState: RecoveryStepState;
  let rhythmStatus: string;
  if (args.sleepMidpointStd == null) {
    rhythmState = 'not_started';
    rhythmStatus = 'Need a few nights to read rhythm';
  } else {
    const std = Math.round(args.sleepMidpointStd);
    if (std <= 55) {
      rhythmState = 'done';
      rhythmStatus = `Drift ~${std}m — on track`;
    } else {
      rhythmState = 'in_progress';
      rhythmStatus = `Drift ~${std}m — tighten wake/sleep regularity`;
    }
  }

  return [
    {
      id: 'stabilize_mood',
      title: 'Daily mood check-ins',
      state: moodState,
      statusLine: moodStatus,
      actionCue: mood >= 3 ? 'Open Mood' : 'Log mood',
    },
    {
      id: 'stabilize_sessions',
      title: 'Confirm sleep nights',
      state: sessionState,
      statusLine: sessionStatus,
      actionCue: nights >= 3 ? 'Open Sleep' : 'Add sleep',
    },
    {
      id: 'stabilize_rhythm',
      title: 'Stabilize sleep rhythm',
      state: rhythmState,
      statusLine: rhythmStatus,
      actionCue: rhythmState === 'done' ? 'Open Sleep' : 'Review Sleep',
    },
  ];
}

function planSteps(stage: RecoveryStage): RecoveryActionStep[] {
  return stage.focus.slice(0, 3).map((line, i) => ({
    id: `${stage.id}_focus_${i}`,
    title: line,
    state: 'not_started' as const,
    statusLine: 'Configure in your recovery plan',
    actionCue: 'Open plan',
  }));
}

/**
 * Action rows for the current stage. Foundation/Stabilize use live checks; Optimize/Thrive use plan-linked rows.
 */
export function computeRecoveryActionSteps(
  stageId: RecoveryStageId,
  stage: RecoveryStage,
  args: {
    sleepSettings?: SleepSettings;
    medLogs: RecoveryMedLogRow[];
    sleepSessions: SleepRowWithSource[];
    moodStreakCount: number;
    sleepMidpointStd: number | null;
  },
): RecoveryActionStep[] {
  if (stageId === 'foundation') return foundationSteps(args);
  if (stageId === 'stabilize') return stabilizeSteps(args);
  return planSteps(stage);
}

const STEP_PRIMARY_LABEL: Partial<Record<string, string>> = {
  foundation_wake: 'Set wake window',
  foundation_meds: 'Track medications',
  foundation_sleep: 'Connect sleep',
  stabilize_mood: 'Check in on mood',
  stabilize_sessions: 'Log sleep',
  stabilize_rhythm: 'Open Sleep',
};

/**
 * Primary button: jump to the most urgent screen when possible; otherwise open the recovery plan.
 */
export function getRecoveryPrimaryCta(
  steps: RecoveryActionStep[],
  stageId: RecoveryStageId,
): { label: string; stepId: 'plan' | string } {
  const incomplete = steps.find((s) => s.state !== 'done');
  if (!incomplete) {
    return { label: stageId === 'thrive' ? 'Review recovery plan' : 'See next unlock', stepId: 'plan' };
  }
  const label = STEP_PRIMARY_LABEL[incomplete.id] ?? 'Open recovery plan';
  if (STEP_PRIMARY_LABEL[incomplete.id]) {
    return { label, stepId: incomplete.id };
  }
  return { label: 'Open recovery plan', stepId: 'plan' };
}
