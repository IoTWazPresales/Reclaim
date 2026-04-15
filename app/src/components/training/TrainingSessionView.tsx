// Training Session View - Active workout interface
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, ScrollView, Alert, AppState, useWindowDimensions, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { Button, Card, Text, useTheme, ActivityIndicator, IconButton } from 'react-native-paper';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getTrainingSetLogs,
  getExerciseBestPerformance,
  getLastExercisePerformance,
  type TrainingSessionRow,
  type TrainingSessionItemRow,
  type TrainingSetLogRow,
} from '@/lib/api';
import {
  updateTrainingSession,
  updateTrainingSessionItem,
  logTrainingSet,
  updateTrainingSetLog,
  logTrainingEvent,
  deleteTrainingSession,
} from '@/data/TrainingRepository';
import { getLastPerformanceForExercise } from '@/lib/training/lastPerformance';
import { getExerciseById } from '@/lib/training/engine';
import {
  resumeRuntime,
  initializeRuntime,
  logSet,
  replaceExerciseInRuntime,
  endSession,
  getAdjustedSetParams,
  tickRuntime,
  getAdjustedRestTime,
} from '@/lib/training/runtime';
import { buildSetLogPayload, buildSetLogQueuePayload } from '@/lib/training/runtime/payloadBuilder';
import type {
  SessionRuntimeState,
  SessionPlan,
  PlannedExercise,
  SetLogEntry,
} from '@/lib/training/types';
import { useAppTheme } from '@/theme';
import { reclaimPrimaryCapsuleButton, reclaimTertiaryOutlineCapsuleButton } from '@/theme/reclaimVisualLanguage';
import RestTimer from './RestTimer';
import { useRestCountdown } from './useRestCountdown';
import FullSessionPanel, { type ExerciseCompletionStatus } from './FullSessionPanel';
import PostSessionMoodPrompt from './PostSessionMoodPrompt';
import SetFocusOverlay from './SetFocusOverlay';
import SetFocusCard from './SetFocusCard';
import RestCountdownCard from './RestCountdownCard';
import { logger } from '@/lib/logger';
import { clearIntent, clearIntentsByPrefix, hasIntent } from '@/lib/notifications/NotificationIntentStore';
import { ensureReclaimChannels, reconcileNotifications } from '@/lib/notifications/NotificationScheduler';
import {
  scheduleTrainingRest,
  scheduleTrainingSet,
  scheduleTrainingFirstSet,
  type TrainingNotificationNext,
} from '@/lib/notifications/trainingNotificationScheduler';
import { enqueueOperation, getQueueSize } from '@/lib/training/offlineQueue';
import { isNetworkAvailable } from '@/lib/training/offlineSync';
import {
  TRAINING_SESSION_BUFFER_WRITES_ENABLED,
  clearBufferedSessionWrites,
  flushBufferedSessionWrites,
  upsertBufferedSessionSetLog,
} from '@/lib/training/sessionWriteBuffer';
import { triggerLightHaptic } from '@/lib/haptics';
import { getUserSettings } from '@/lib/userSettings';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { mergeHealthConnectActiveEnergyIntoTrainingSummary } from '@/lib/health/healthConnectService';
import { formatWeight, formatReps } from './uiFormat';

function EditSetDialog({
  visible,
  setIndex,
  totalSets,
  initialWeight,
  initialReps,
  initialRpe,
  isUpdate,
  onSave,
  onCancel,
}: {
  visible: boolean;
  setIndex: number;
  totalSets: number;
  initialWeight: number;
  initialReps: number;
  initialRpe: number | null;
  isUpdate: boolean;
  onSave: (weight: number, reps: number, rpe: number | null) => void;
  onCancel: () => void;
}) {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const [weight, setWeight] = React.useState(initialWeight);
  const [reps, setReps] = React.useState(initialReps);
  const [rpe, setRpe] = React.useState<number | null>(initialRpe);

  React.useEffect(() => {
    setWeight(initialWeight);
    setReps(initialReps);
    setRpe(initialRpe);
  }, [initialWeight, initialReps, initialRpe]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: appTheme.spacing.lg,
        }}
      >
        <Card
          mode="elevated"
          style={{
            width: '100%',
            maxWidth: 380,
            backgroundColor: theme.colors.surface,
            borderRadius: appTheme.borderRadius.xl,
          }}
        >
          <Card.Content style={{ padding: appTheme.spacing.lg }}>
            <Text
              variant="titleMedium"
              style={{ fontWeight: '700', color: theme.colors.onSurface, marginBottom: appTheme.spacing.md }}
            >
              {isUpdate ? 'Edit' : 'Log'} Set {setIndex} of {totalSets}
            </Text>

            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 6 }}>
              Weight
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: appTheme.spacing.md,
                gap: 6,
              }}
            >
              <IconButton icon="minus" mode="outlined" size={18} onPress={() => setWeight((w) => Math.max(0, w - 2.5))} accessibilityLabel="Decrease weight" />
              <View style={{ minWidth: 80, alignItems: 'center' }}>
                <Text variant="headlineSmall" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                  {formatWeight(weight)}
                </Text>
              </View>
              <IconButton icon="plus" mode="outlined" size={18} onPress={() => setWeight((w) => w + 2.5)} accessibilityLabel="Increase weight" />
            </View>

            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 6 }}>
              Reps
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: appTheme.spacing.md,
                gap: 6,
              }}
            >
              <IconButton icon="minus" mode="outlined" size={18} onPress={() => setReps((r) => Math.max(1, r - 1))} accessibilityLabel="Decrease reps" />
              <View style={{ minWidth: 50, alignItems: 'center' }}>
                <Text variant="headlineSmall" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                  {formatReps(reps)}
                </Text>
              </View>
              <IconButton icon="plus" mode="outlined" size={18} onPress={() => setReps((r) => r + 1)} accessibilityLabel="Increase reps" />
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                marginBottom: appTheme.spacing.lg,
              }}
            >
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginRight: 4 }}>
                RPE
              </Text>
              {[6, 7, 8, 9, 10].map((v) => (
                <Button
                  key={v}
                  mode={rpe === v ? 'contained' : 'outlined'}
                  compact
                  onPress={() => setRpe(rpe === v ? null : v)}
                  style={{ minWidth: 0, paddingHorizontal: 0 }}
                  labelStyle={{ fontSize: 13, marginHorizontal: 10 }}
                  buttonColor={rpe === v ? theme.colors.primary : undefined}
                  textColor={rpe === v ? theme.colors.onPrimary : undefined}
                >
                  {v}
                </Button>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: appTheme.spacing.sm }}>
              <Button mode="contained" onPress={() => onSave(weight, reps, rpe)} style={{ flex: 1 }}>
                {isUpdate ? 'Update' : 'Log Set'}
              </Button>
              <Button mode="outlined" onPress={onCancel} style={{ flex: 1 }}>
                Cancel
              </Button>
            </View>
          </Card.Content>
        </Card>
      </View>
    </Modal>
  );
}

interface TrainingSessionViewProps {
  sessionId: string;
  sessionData: {
    session: TrainingSessionRow;
    items: TrainingSessionItemRow[];
  };
  notificationMode?: 'normal' | 'guided';
  notificationAction?: {
    action: 'set_done' | 'edit_set';
    sessionId?: string;
    exerciseId?: string;
    setIndex?: number;
  };
  onNotificationActionHandled?: () => void;
  onComplete: () => void;
  onCancel: () => void;
}

type OptimisticPerformedByItem = Record<
  string,
  Array<{ setIndex: number; weight: number; reps: number; rpe?: number; completedAt: string }>
>;

/** Union of logged set indices from server, runtime, and optimistic UI (fixes stale progress while refetch lags). */
function getEffectiveLoggedSetIndices(
  item: TrainingSessionItemRow,
  runtimeState: SessionRuntimeState | null,
  optimisticPerformedSets: OptimisticPerformedByItem,
): Set<number> {
  const indices = new Set<number>();
  for (const s of item.performed?.sets ?? []) {
    indices.add(s.setIndex);
  }
  for (const s of optimisticPerformedSets[item.id] ?? []) {
    indices.add(s.setIndex);
  }
  const completed = runtimeState?.exerciseStates[item.exercise_id]?.completedSets;
  if (completed) {
    for (const s of completed) {
      indices.add(s.setIndex);
    }
  }
  return indices;
}

function isExerciseFullyLoggedForItem(
  item: TrainingSessionItemRow,
  runtimeState: SessionRuntimeState | null,
  optimisticPerformedSets: OptimisticPerformedByItem,
): boolean {
  if (item.skipped) return false;
  const planned = item.planned?.sets ?? [];
  if (planned.length === 0) return false;
  const done = getEffectiveLoggedSetIndices(item, runtimeState, optimisticPerformedSets);
  return planned.every((p) => done.has(p.setIndex));
}

function TrainingSessionView({
  sessionId,
  sessionData,
  notificationMode,
  notificationAction,
  onNotificationActionHandled,
  onComplete,
  onCancel,
}: TrainingSessionViewProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const compactSessionLayout = windowWidth < 420;
  const primaryCapsule = useMemo(() => reclaimPrimaryCapsuleButton(appTheme), [appTheme]);
  const tertiaryCapsule = useMemo(() => reclaimTertiaryOutlineCapsuleButton(appTheme), [appTheme]);
  const qc = useQueryClient();
  const reduceMotion = useReducedMotion();

  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showFullSession, setShowFullSession] = useState(false);
  const [showMoodPrompt, setShowMoodPrompt] = useState(false);
  const [restTimer, setRestTimer] = useState<{ seconds: number; exerciseId: string } | null>(null);
  const [restTimerPaused, setRestTimerPaused] = useState(false);
  const restCompleteHandlerRef = useRef<(() => void) | null>(null);
  const restCountdown = useRestCountdown({
    targetSeconds: restTimer?.seconds ?? 0,
    isPaused: !restTimer || restTimerPaused,
    onComplete: () => restCompleteHandlerRef.current?.(),
  });
  const [showSetFocusOverlay, setShowSetFocusOverlay] = useState(false);
  const [focusOverlaySetIndex, setFocusOverlaySetIndex] = useState<number | null>(null);
  const [pendingEditSetIndex, setPendingEditSetIndex] = useState<number | null>(null);
  const [selectedRpe, setSelectedRpe] = useState<number | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [offlineQueueSize, setOfflineQueueSize] = useState(0);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const restFinishNotificationIdRef = useRef<string | null>(null);
  const restFinishLogicalKeyRef = useRef<string | null>(null);
  const restStartNotifiedRef = useRef<string | null>(null);
  const restNotificationContextRef = useRef<{
    sessionId: string;
    sessionItemId: string;
    exerciseId: string;
    exerciseName: string;
    nextSetIndex?: number;
    nextSetReps?: number;
    nextSetWeight?: number;
    totalSets?: number;
    /** Next set we're resting before (for TRAINING_SET "do set N") */
    next: TrainingNotificationNext;
    /** After completing that set, what's next (for SET_DONE handler) */
    nextAfter: TrainingNotificationNext;
    /** One more level of lookahead — threaded into the TRAINING_SET payload */
    nextNextAfter: TrainingNotificationNext;
    restSeconds: number;
  } | null>(null);
  const appStateRef = useRef(AppState.currentState);
  
  // Runtime state machine
  const [runtimeState, setRuntimeState] = useState<SessionRuntimeState | null>(null);
  const [lastAutoregulationMessage, setLastAutoregulationMessage] = useState<string | null>(null);
  
  // Idempotency guard for set logging (prevent double-submit)
  const loggingInFlight = useRef<Set<string>>(new Set());

  // Fire first-set notification + haptic once when guided session loads (no companion watch app yet)
  // Keyed by sessionId so the guard survives component re-mounts within the same session
  // but clears automatically when a new session starts.
  const firstSetNotifiedSessionRef = useRef<string | null>(null);

  // Local state for optimistic exercise replacements (overrides prop until refetch)
  const [exerciseIdOverrides, setExerciseIdOverrides] = useState<Record<string, string>>({});
  
  // FIX: Optimistic local state for session ended (prevents timer hang on finish)
  // When user presses "Finish session", we immediately set this to stop the timer
  // and update UI, BEFORE the DB write completes and prop refetches.
  // This ensures the timer stops instantly and "Finishing..." clears on success OR failure.
  const [optimisticEndedAt, setOptimisticEndedAt] = useState<string | null>(null);
  
  // FIX: Optimistic local state for performed sets (prevents UI lag on set completion)
  // When user presses "Done" to complete a set, we immediately update this map
  // so the checkmark/next set highlight appears instantly, BEFORE the DB write
  // completes and prop refetches. This ensures the set completion is visible immediately.
  const [optimisticPerformedSets, setOptimisticPerformedSets] = useState<Record<string, Array<{
    setIndex: number;
    weight: number;
    reps: number;
    rpe?: number;
    completedAt: string;
  }>>>({});

  const { session, items } = sessionData;
  const effectiveNotificationMode: 'normal' | 'guided' =
    notificationMode ??
    ((session as any)?.decision_trace?.notificationMode === 'guided' ? 'guided' : 'normal');
  const shouldForceGuidedNotifications = effectiveNotificationMode === 'guided';

  useEffect(() => {
    if (!shouldForceGuidedNotifications) return;
    // Channel setup only — categories are registered once in useNotifications at startup
    // to avoid duplicate/conflicting registrations that produce wrong button labels on watch.
    ensureReclaimChannels().catch((error) => {
      logger.warn('[TRAINING_NOTIF] ensureReclaimChannels failed in session view', error);
    });
  }, [shouldForceGuidedNotifications]);

  const isEnded = !!(optimisticEndedAt || (session as any).ended_at);
  const startedAtMs = (session as any).started_at ? new Date((session as any).started_at).getTime() : null;
  const endedAtMs = optimisticEndedAt ? new Date(optimisticEndedAt).getTime() : (session as any).ended_at ? new Date((session as any).ended_at).getTime() : null;

  // Apply optimistic exercise ID overrides
  const itemsWithOverrides = useMemo(() => {
    return items.map((item) => ({
      ...item,
      exercise_id: exerciseIdOverrides[item.id] || item.exercise_id,
    }));
  }, [items, exerciseIdOverrides]);

  const currentItem = itemsWithOverrides[currentExerciseIndex];

  const completedCount = useMemo(
    () =>
      itemsWithOverrides.filter((item) =>
        isExerciseFullyLoggedForItem(item, runtimeState, optimisticPerformedSets),
      ).length,
    [itemsWithOverrides, runtimeState, optimisticPerformedSets],
  );
  const skippedCount = useMemo(() => itemsWithOverrides.filter((item) => item.skipped).length, [itemsWithOverrides]);
  
  // Count total sets logged across all exercises (runtime + optimistic + server, not server-only)
  const totalSetsLogged = useMemo(() => {
    let n = 0;
    for (const item of itemsWithOverrides) {
      if (item.skipped) continue;
      n += getEffectiveLoggedSetIndices(item, runtimeState, optimisticPerformedSets).size;
    }
    return n;
  }, [itemsWithOverrides, runtimeState, optimisticPerformedSets]);

  // Load last performance for current exercise (null -> undefined)
  const lastPerformanceQ = useQuery({
    queryKey: ['training:lastPerformance', currentItem?.exercise_id, (session as any).session_type_label],
    queryFn: async () => {
      if (!currentItem || !(session as any).user_id) return null;

      const sessionTypeLabel: string | undefined = ((session as any).session_type_label ?? undefined) as
        | string
        | undefined;

      return getLastPerformanceForExercise(
        (session as any).user_id as string,
        currentItem.exercise_id as string,
        ((session as any).started_at ?? undefined) as string | undefined,
        sessionTypeLabel,
      );
    },
    enabled: !!currentItem && !!(session as any).user_id,
    staleTime: Infinity,
  });

  // Load last session's sets for current exercise (for "Prev" display)
  const lastSessionSetsQ = useQuery({
    queryKey: ['training:lastSessionSets', currentItem?.exercise_id, (session as any).started_at],
    queryFn: async () => {
      if (!currentItem?.exercise_id) return null;
      return getLastExercisePerformance(currentItem.exercise_id);
    },
    enabled: !!currentItem?.exercise_id,
    staleTime: Infinity,
  });

  // Timer: counts from started_at -> NOW if active, or started_at -> ended_at if ended.
  // Timer should start when session is active, even if started_at is not yet set in DB
  useEffect(() => {
    // If session is not ended and started_at exists, start timer
    // If session is not ended and started_at doesn't exist, use current time as start
    const effectiveStartMs = startedAtMs || (!isEnded ? Date.now() : null);
    if (!effectiveStartMs) return;

    const tick = () => {
      const end = endedAtMs ?? Date.now();
      const diffSec = Math.max(0, Math.floor((end - effectiveStartMs) / 1000));
      setElapsedSeconds(diffSec);
    };

    tick();

    if (endedAtMs) return;

    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAtMs, endedAtMs, isEnded]);

  // Check network status and queue size
  useEffect(() => {
    let cancelled = false;
    const checkNetwork = async () => {
      const available = await isNetworkAvailable();
      if (cancelled) return;
      setIsOffline(!available);
      if (!available) {
        const size = await getQueueSize();
        if (cancelled) return;
        setOfflineQueueSize(size);
      }
    };
    checkNetwork();
    const interval = setInterval(checkNetwork, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);


  const cancelRestFinishNotification = useCallback(async () => {
    const logicalKey = restFinishLogicalKeyRef.current;
    restFinishNotificationIdRef.current = null;
    restFinishLogicalKeyRef.current = null;
    if (logicalKey) {
      try {
        await clearIntent(logicalKey);
        logger.debug('[NOTIF_CUTOVER] rest finish cancelled via intent clear');
        await reconcileNotifications();
      } catch {
        // ignore
      }
    }
  }, []);

  const notifyRestStartIfNeeded = useCallback(async (secondsTotal: number) => {
    const ctx = restNotificationContextRef.current;
    if (!ctx || !ctx.next) return;
    if (!shouldForceGuidedNotifications && AppState.currentState === 'active') return;
    const key = `${ctx.sessionId}:${ctx.exerciseId}:${ctx.nextSetIndex ?? 'n/a'}`;
    if (restStartNotifiedRef.current === key) return;
    // Guard: if a REST intent already exists the notification handler already scheduled it
    // (SET_DONE tap from notification). Scheduling again would cause a duplicate rest.
    const intentKey = `training_rest:${ctx.sessionId}:${ctx.exerciseId}:${ctx.nextSetIndex ?? 'n/a'}`;
    try {
      if (await hasIntent(intentKey)) {
        restStartNotifiedRef.current = key;
        return;
      }
    } catch { /* non-blocking */ }
    restStartNotifiedRef.current = key;
    try {
      await scheduleTrainingRest({
        sessionId: ctx.sessionId,
        sessionItemId: ctx.sessionItemId,
        exerciseId: ctx.exerciseId,
        exerciseName: ctx.exerciseName,
        nextSetIndex: ctx.nextSetIndex,
        nextSetReps: ctx.nextSetReps,
        nextSetWeight: ctx.nextSetWeight,
        totalSets: ctx.totalSets,
        next: ctx.next,
        nextAfter: ctx.nextAfter,
        nextNextAfter: ctx.nextNextAfter,
        restSecondsTotal: secondsTotal,
      });
    } catch {
      // ignore
    }
  }, [shouldForceGuidedNotifications]);

  const scheduleRestFinishNotification = useCallback(async (secondsRemaining: number) => {
    const ctx = restNotificationContextRef.current;
    if (!ctx || !ctx.next) return;
    if (!shouldForceGuidedNotifications && AppState.currentState === 'active') return;
    const seconds = Math.max(1, Math.floor(secondsRemaining));
    await cancelRestFinishNotification();
    try {
      const logicalKey = await scheduleTrainingSet({
        sessionId: ctx.sessionId,
        sessionItemId: ctx.next.sessionItemId,
        exerciseId: ctx.next.exerciseId,
        exerciseName: ctx.next.exerciseName,
        setIndex: ctx.next.setIndex,
        suggestedWeight: ctx.next.suggestedWeight,
        targetReps: ctx.next.targetReps,
        seconds,
        next: ctx.nextAfter,
        nextAfter: ctx.nextNextAfter ?? undefined,
        sessionComplete: !ctx.nextAfter,
      });
      restFinishLogicalKeyRef.current = logicalKey;
    } catch {
      restFinishLogicalKeyRef.current = null;
    }
  }, [cancelRestFinishNotification, shouldForceGuidedNotifications]);

  // App background/foreground: schedule/cancel rest notifications
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;
      if (nextState === 'active') {
        // In guided mode, keep watch-driven rest/set intents alive even when app foregrounds.
        if (!shouldForceGuidedNotifications) {
          cancelRestFinishNotification().catch((e) => { if (__DEV__) logger.debug('[TrainingSessionView]', e); });
        }
        return;
      }
      if (prev === 'active' && nextState.match(/inactive|background/)) {
        if (restTimer && restNotificationContextRef.current && !restTimerPaused) {
          const remaining = restCountdown.remaining;
          notifyRestStartIfNeeded(remaining).catch((e) => { if (__DEV__) logger.debug('[TrainingSessionView]', e); });
          scheduleRestFinishNotification(remaining).catch((e) => { if (__DEV__) logger.debug('[TrainingSessionView]', e); });
        }
      }
    });
    return () => sub.remove();
  }, [
    restTimer,
    restCountdown.remaining,
    restTimerPaused,
    notifyRestStartIfNeeded,
    scheduleRestFinishNotification,
    cancelRestFinishNotification,
    shouldForceGuidedNotifications,
  ]);

  // Load set logs for current exercise
  const setLogsQ = useQuery({
    queryKey: ['training:set_logs', currentItem?.id],
    queryFn: () => (currentItem?.id ? getTrainingSetLogs(currentItem.id) : []),
    enabled: !!currentItem?.id,
  });

  const userSettingsQ = useQuery({
    queryKey: ['user:settings'],
    queryFn: getUserSettings,
  });
  
  // Build PlannedExercise[] from sessionData for runtime (preserving actual item IDs)
  const plannedExercisesForRuntime = useMemo<PlannedExercise[]>(() => {
    if (!itemsWithOverrides || itemsWithOverrides.length === 0) return [];
    
    return itemsWithOverrides
      .sort((a, b) => a.order_index - b.order_index)
      .map((item) => {
        const exercise = getExerciseById(item.exercise_id);
        if (!exercise) return null;
        
        return {
          exerciseId: item.exercise_id,
          exercise,
          orderIndex: item.order_index,
          priority: (item.planned?.priority || 'accessory') as any,
          intents: (item.planned?.intents || []) as any[],
          plannedSets: (item.planned?.sets || []).map((s) => ({
            setIndex: s.setIndex,
            targetReps: s.targetReps,
            suggestedWeight: s.suggestedWeight,
            restSeconds: s.restSeconds,
          })),
          decisionTrace: (item.planned?.decisionTrace || {
            intent: [],
            goalBias: {},
            constraintsApplied: [],
            selectionReason: '',
            rankedAlternatives: [],
            confidence: 0.5,
          }) as any,
        };
      })
      .filter((ex): ex is PlannedExercise => ex !== null);
  }, [itemsWithOverrides]);
  
  // Build SessionPlan from sessionData for runtime initialization
  const sessionPlan = useMemo<SessionPlan | null>(() => {
    if (!session || plannedExercisesForRuntime.length === 0) return null;
    
    return {
      id: session.id,
      template: 'push' as any, // Not critical for runtime
      goals: session.goals || {},
      constraints: {
        availableEquipment: [],
        injuries: [],
        forbiddenMovements: [],
        timeBudgetMinutes: 60,
      },
      userState: {
        experienceLevel: 'intermediate',
      },
      exercises: plannedExercisesForRuntime,
      estimatedDurationMinutes: 45,
      createdAt: session.created_at,
      sessionLabel: (session as any).session_type_label || undefined,
    };
  }, [session, plannedExercisesForRuntime]);
  
  // Convert existing set logs to SetLogEntry format
  const existingSetLogs = useMemo<SetLogEntry[]>(() => {
    const allLogs: SetLogEntry[] = [];
    
    // Collect from performed sets in itemsWithOverrides
    for (const item of itemsWithOverrides) {
      if (!item.performed?.sets) continue;
      
      for (const set of item.performed.sets) {
        allLogs.push({
          id: `${item.id}_set_${set.setIndex}`,
          exerciseId: item.exercise_id,
          sessionItemId: item.id,
          setIndex: set.setIndex,
          weight: set.weight || 0,
          reps: set.reps,
          rpe: set.rpe,
          completedAt: set.completedAt,
        });
      }
    }
    
    return allLogs;
  }, [itemsWithOverrides]);
  
  // Clear optimistic performed sets when actual data is refetched and matches/exceeds optimistic state
  useEffect(() => {
    for (const item of items) {
      const optimistic = optimisticPerformedSets[item.id];
      const actual = item.performed?.sets || [];
      if (optimistic && actual.length >= optimistic.length) {
        // Actual data has caught up - clear optimistic state for this item
        setOptimisticPerformedSets((prev) => {
          const next = { ...prev };
          delete next[item.id];
          return next;
        });
      }
    }
  }, [items, optimisticPerformedSets]);
  
  // Clear optimistic ended state when actual ended_at is set in prop
  useEffect(() => {
    if (optimisticEndedAt && (session as any).ended_at) {
      logger.debug('[SESSION_END_FLOW] Actual ended_at received, clearing optimistic state');
      setOptimisticEndedAt(null);
    }
  }, [(session as any).ended_at, optimisticEndedAt]);
  
  // Initialize or resume runtime state when sessionData is ready (ONCE per session load)
  useEffect(() => {
    if (!sessionPlan || !session) return;
    if (runtimeState !== null) return; // Already initialized - guard prevents re-initialization
    
    const startedAt = (session as any).started_at || new Date().toISOString();
    const mode = (session.mode || 'manual') as any;
    const skippedExerciseIds = items.filter((item) => item.skipped).map((item) => item.exercise_id);
    
    try {
      // Build PlannedExercise[] from sessionPlan
      const exercises = sessionPlan.exercises;
      
      // Resume if we have existing sets or skipped exercises
      if (existingSetLogs.length > 0 || skippedExerciseIds.length > 0) {
        const resumed = resumeRuntime(
          session.id,
          startedAt,
          mode,
          exercises,
          existingSetLogs,
          skippedExerciseIds,
        );
        setRuntimeState(resumed);
      } else {
        // New session - initialize fresh
        const initialized = initializeRuntime(session.id, sessionPlan, mode);
        // Override startedAt with actual session started_at if available
        if ((session as any).started_at) {
          initialized.startedAt = (session as any).started_at;
        }
        setRuntimeState(initialized);
      }
      
      // Sync currentExerciseIndex with runtime state (only on initial load)
      const firstPendingIndex = itemsWithOverrides.findIndex(
        (item, idx) => !item.skipped && (!item.performed?.sets || item.performed.sets.length === 0),
      );
      if (firstPendingIndex >= 0 && firstPendingIndex !== currentExerciseIndex) {
        setCurrentExerciseIndex(firstPendingIndex);
      }
    } catch (error: any) {
      logger.warn('Failed to initialize runtime state', error);
    }
    // NOTE: runtimeState and currentExerciseIndex are NOT in deps - we only want to initialize once when sessionData is ready
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionPlan, session?.id, items.length, existingSetLogs.length]);

  // Fire first-set notification + haptic once when guided session loads (gives watch/phone cue after prep period)
  useEffect(() => {
    if (
      !shouldForceGuidedNotifications ||
      !runtimeState ||
      existingSetLogs.length > 0 ||
      firstSetNotifiedSessionRef.current === sessionId ||
      !currentItem
    ) return;

    const plannedSets = currentItem.planned?.sets ?? [];
    const firstSet = plannedSets.find((s: any) => s.setIndex === 1);
    if (!firstSet) return;

    const firstIntentKey = `training_first:${sessionId}:${currentItem.exercise_id}:1`;
    const setIntentKey = `training_set:${sessionId}:${currentItem.exercise_id}:1`;

    firstSetNotifiedSessionRef.current = sessionId;
    const exerciseMeta = getExerciseById(currentItem.exercise_id);
    const currentIdx = itemsWithOverrides.findIndex((item) => item.id === currentItem.id);

    let next: TrainingNotificationNext = null;
    let nextAfter: TrainingNotificationNext = null;
    let nextNextAfter: TrainingNotificationNext = null;
    const secondSet = plannedSets.find((s: any) => s.setIndex === 2);
    if (secondSet) {
      next = {
        sessionItemId: currentItem.id,
        exerciseId: currentItem.exercise_id,
        exerciseName: exerciseMeta?.name ?? 'Exercise',
        setIndex: 2,
        suggestedWeight: secondSet.suggestedWeight,
        targetReps: secondSet.targetReps,
        restSeconds: secondSet.restSeconds ?? 90,
      };
      const thirdSet = plannedSets.find((s: any) => s.setIndex === 3);
      if (thirdSet) {
        nextAfter = {
          sessionItemId: currentItem.id,
          exerciseId: currentItem.exercise_id,
          exerciseName: exerciseMeta?.name ?? 'Exercise',
          setIndex: 3,
          suggestedWeight: thirdSet.suggestedWeight,
          targetReps: thirdSet.targetReps,
          restSeconds: thirdSet.restSeconds ?? 90,
        };
        const fourthSet = plannedSets.find((s: any) => s.setIndex === 4);
        if (fourthSet) {
          nextNextAfter = {
            sessionItemId: currentItem.id,
            exerciseId: currentItem.exercise_id,
            exerciseName: exerciseMeta?.name ?? 'Exercise',
            setIndex: 4,
            suggestedWeight: fourthSet.suggestedWeight,
            targetReps: fourthSet.targetReps,
            restSeconds: fourthSet.restSeconds ?? 90,
          };
        } else {
          const nextItem = itemsWithOverrides[currentIdx + 1];
          if (nextItem && !nextItem.skipped) {
            const nextExMeta = getExerciseById(nextItem.exercise_id);
            const firstSetNext = nextItem.planned?.sets?.[0];
            if (firstSetNext) {
              nextNextAfter = {
                sessionItemId: nextItem.id,
                exerciseId: nextItem.exercise_id,
                exerciseName: nextExMeta?.name ?? 'Exercise',
                setIndex: firstSetNext.setIndex ?? 1,
                suggestedWeight: firstSetNext.suggestedWeight,
                targetReps: firstSetNext.targetReps,
                restSeconds: firstSetNext.restSeconds ?? 90,
              };
            }
          }
        }
      } else {
        const nextItem = itemsWithOverrides[currentIdx + 1];
        if (nextItem && !nextItem.skipped) {
          const nextExMeta = getExerciseById(nextItem.exercise_id);
          const firstSetNext = nextItem.planned?.sets?.[0];
          nextAfter = {
            sessionItemId: nextItem.id,
            exerciseId: nextItem.exercise_id,
            exerciseName: nextExMeta?.name ?? 'Exercise',
            setIndex: firstSetNext?.setIndex ?? 1,
            suggestedWeight: firstSetNext?.suggestedWeight,
            targetReps: firstSetNext?.targetReps,
            restSeconds: firstSetNext?.restSeconds ?? 90,
          };
          const secondSetNext = nextItem.planned?.sets?.[1];
          if (secondSetNext) {
            nextNextAfter = {
              sessionItemId: nextItem.id,
              exerciseId: nextItem.exercise_id,
              exerciseName: nextExMeta?.name ?? 'Exercise',
              setIndex: secondSetNext.setIndex,
              suggestedWeight: secondSetNext.suggestedWeight,
              targetReps: secondSetNext.targetReps,
              restSeconds: secondSetNext.restSeconds ?? 90,
            };
          }
        }
      }
    } else {
      const nextItem = itemsWithOverrides[currentIdx + 1];
      if (nextItem && !nextItem.skipped) {
        const nextExMeta = getExerciseById(nextItem.exercise_id);
        const firstSetNext = nextItem.planned?.sets?.[0];
        next = {
          sessionItemId: nextItem.id,
          exerciseId: nextItem.exercise_id,
          exerciseName: nextExMeta?.name ?? 'Exercise',
          setIndex: firstSetNext?.setIndex ?? 1,
          suggestedWeight: firstSetNext?.suggestedWeight,
          targetReps: firstSetNext?.targetReps,
          restSeconds: firstSetNext?.restSeconds ?? 90,
        };
        const secondSetNext = nextItem.planned?.sets?.[1];
        if (secondSetNext) {
          nextAfter = {
            sessionItemId: nextItem.id,
            exerciseId: nextItem.exercise_id,
            exerciseName: nextExMeta?.name ?? 'Exercise',
            setIndex: secondSetNext.setIndex,
            suggestedWeight: secondSetNext.suggestedWeight,
            targetReps: secondSetNext.targetReps,
            restSeconds: secondSetNext.restSeconds ?? 90,
          };
          const thirdSetNext = nextItem.planned?.sets?.[2];
          if (thirdSetNext) {
            nextNextAfter = {
              sessionItemId: nextItem.id,
              exerciseId: nextItem.exercise_id,
              exerciseName: nextExMeta?.name ?? 'Exercise',
              setIndex: thirdSetNext.setIndex,
              suggestedWeight: thirdSetNext.suggestedWeight,
              targetReps: thirdSetNext.targetReps,
              restSeconds: thirdSetNext.restSeconds ?? 90,
            };
          }
        }
      }
    }

    (async () => {
      const preScheduledExists = (await hasIntent(firstIntentKey)) || (await hasIntent(setIntentKey));
      if (preScheduledExists) {
        logger.debug('[TRAINING_NOTIF] First set already pre-scheduled; skipping duplicate schedule', {
          sessionId,
          exerciseId: currentItem.exercise_id,
        });
        return;
      }

      await scheduleTrainingFirstSet({
        sessionId,
        sessionItemId: currentItem.id,
        exerciseId: currentItem.exercise_id,
        exerciseName: exerciseMeta?.name ?? 'Exercise',
        setIndex: 1,
        suggestedWeight: firstSet.suggestedWeight,
        targetReps: firstSet.targetReps,
        next,
        nextAfter,
        nextNextAfter,
      });
      logger.debug('[TRAINING_NOTIF] First set scheduled from session view', {
        sessionId,
        exerciseId: currentItem.exercise_id,
      });
    })().catch((err) => logger.warn('[TRAINING_NOTIF] First set schedule failed', err));

    const hapticsEnabled = userSettingsQ.data?.hapticsEnabled ?? true;
    triggerLightHaptic({
      enabled: hapticsEnabled,
      reduceMotion,
      style: 'success',
    }).catch((e) => { if (__DEV__) logger.debug('[TrainingSessionView]', e); });
  }, [
    shouldForceGuidedNotifications,
    runtimeState,
    existingSetLogs.length,
    currentItem,
    itemsWithOverrides,
    sessionId,
    userSettingsQ.data?.hapticsEnabled,
    reduceMotion,
  ]);

  // Tick runtime timer (update elapsed time)
  useEffect(() => {
    if (!runtimeState || runtimeState.status !== 'active') return;
    
    const interval = setInterval(() => {
      setRuntimeState((prev) => (prev ? tickRuntime(prev) : null));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [runtimeState?.status]);

  const handleSetComplete = useCallback(
    async (setIndex: number, weight: number, reps: number, rpe?: number) => {
      if (!currentItem || !runtimeState) return;
      if (isEnded) {
        Alert.alert('Session completed', 'This session is already completed. Start a new session to log more sets.');
        return;
      }

      logger.debug('[SET_DONE_FLOW] Done pressed', { exerciseId: currentItem.exercise_id, setIndex, weight, reps, rpe });

      // Idempotency guard: prevent double-logging same set
      const logKey = `${currentItem.id}_${setIndex}`;
      if (loggingInFlight.current.has(logKey)) {
        logger.warn('[SET_DONE_FLOW] Duplicate prevented', { exerciseId: currentItem.exercise_id, setIndex });
        return;
      }
      loggingInFlight.current.add(logKey);

      try {
        logger.debug('[SET_DONE_FLOW] Handler called', { itemId: currentItem.id, setIndex });
        
        // STEP 1: Update runtime state with logSet
        const logResult = logSet(runtimeState, currentItem.exercise_id, {
          setIndex,
          weight,
          reps,
          rpe,
        });
        
        // Update runtime state immediately (optimistic)
        setRuntimeState(logResult.state);
        logger.debug('[SET_DONE_FLOW] Runtime state updated', { setIndex });
        
        // OPTIMISTIC UI: Update performed sets immediately so UI reflects change instantly
        const completedAt = logResult.setEntry.completedAt;
        setOptimisticPerformedSets((prev) => {
          const existing = prev[currentItem.id] || [];
          const updated = [
            ...existing.filter(s => s.setIndex !== setIndex),
            { setIndex, weight, reps, rpe, completedAt }
          ].sort((a, b) => a.setIndex - b.setIndex);
          logger.debug('[SET_DONE_FLOW] Optimistic performed sets updated', { itemId: currentItem.id, count: updated.length });
          return { ...prev, [currentItem.id]: updated };
        });
        
        // Store autoregulation message if present (will be cleared when next set starts or exercise changes)
        if (logResult.trace) {
          setLastAutoregulationMessage(logResult.trace.output.message);
        }
        
        // STEP 2: Persist to Supabase using existing API (idempotent by id)
        // Build payload using payload builder (ensures DB itemIds are used, not synthetic runtime itemIds)
        const networkAvailable = await isNetworkAvailable();
        
        const setLogPayload = buildSetLogPayload(
          currentItem.id, // Actual DB itemId (TEXT) - NOT runtime's synthetic itemId
          sessionId, // Actual DB sessionId (TEXT)
          currentItem.exercise_id,
          setIndex,
          weight,
          reps,
          rpe,
          logResult.setEntry.completedAt,
        );

        try {
          if (networkAvailable) {
            if (TRAINING_SESSION_BUFFER_WRITES_ENABLED) {
              await upsertBufferedSessionSetLog({
                id: setLogPayload.id,
                sessionId,
                sessionItemId: setLogPayload.sessionItemId,
                exerciseId: setLogPayload.exerciseId,
                setIndex: setLogPayload.setIndex,
                weight: setLogPayload.weight,
                reps: setLogPayload.reps,
                rpe: setLogPayload.rpe !== null ? setLogPayload.rpe : undefined,
                completedAt: logResult.setEntry.completedAt,
              });
              logger.debug('[SET_DONE_FLOW] Buffered set log for end-of-session flush', {
                setIndex,
                setLogId: setLogPayload.id,
                sessionId,
              });
            } else {
              // Persist using payload built with actual DB itemIds
              await logTrainingSet({
                id: setLogPayload.id,
                sessionItemId: setLogPayload.sessionItemId, // DB itemId (TEXT)
                setIndex: setLogPayload.setIndex,
                weight: setLogPayload.weight,
                reps: setLogPayload.reps,
                rpe: setLogPayload.rpe !== null ? setLogPayload.rpe : undefined,
              });
              logger.debug('[SET_DONE_FLOW] DB write success', { setIndex, setLogId: setLogPayload.id });
            }
            
            await logTrainingEvent('training_set_logged', {
              exerciseId: setLogPayload.exerciseId,
              setIndex: setLogPayload.setIndex,
              weight: setLogPayload.weight,
              reps: setLogPayload.reps,
              rpe: setLogPayload.rpe,
            }).catch((e) => { if (__DEV__) logger.debug('[TrainingSessionView]', e); });
            
            // Log autoregulation trace if present
            if (logResult.trace) {
              await logTrainingEvent('training_autoregulation_applied', {
                exerciseId: currentItem.exercise_id,
                setIndex: logResult.trace.setIndex,
                ruleId: logResult.trace.ruleId,
                reason: logResult.trace.reason,
                confidence: logResult.trace.confidence,
              }).catch((e) => { if (__DEV__) logger.debug('[TrainingSessionView]', e); });
            }
            
            // Remove from in-flight set immediately after successful persist
            loggingInFlight.current.delete(logKey);
          } else {
            // Build offline queue payload (same structure as online insert)
            const queuePayload = buildSetLogQueuePayload(
              currentItem.id, // Actual DB itemId (TEXT)
              currentItem.exercise_id,
              setIndex,
              weight,
              reps,
              rpe,
            );
            await enqueueOperation(queuePayload);
            await logTrainingEvent('training_offline_queue_used', {
              operation: 'insertSetLog',
            }).catch((e) => { if (__DEV__) logger.debug('[TrainingSessionView]', e); });
            setOfflineQueueSize((prev) => prev + 1);
            
            // Remove from in-flight set after queuing (offline queue is async-safe)
            loggingInFlight.current.delete(logKey);
          }
        } catch (persistError: any) {
          // If persist fails, enqueue offline but keep runtime state (state is source of truth)
          logger.warn('[SET_DONE_FLOW] Persist failed, queuing offline', persistError);
          try {
            // Build offline queue payload (same structure as online insert)
            const queuePayload = buildSetLogQueuePayload(
              currentItem.id, // Actual DB itemId (TEXT)
              currentItem.exercise_id,
              setIndex,
              weight,
              reps,
              rpe,
            );
            await enqueueOperation(queuePayload);
            setIsOffline(true);
            setOfflineQueueSize((prev) => prev + 1);
            logger.debug('[SET_DONE_FLOW] Queued offline', { setIndex });
            
            // Remove from in-flight set after queuing
            loggingInFlight.current.delete(logKey);
          } catch (queueError) {
            // If even queueing fails, revert optimistic state and show alert
            logger.error('[SET_DONE_FLOW] Queue failed, reverting optimistic state', queueError);
            setOptimisticPerformedSets((prev) => {
              const existing = prev[currentItem.id] || [];
              const reverted = existing.filter(s => s.setIndex !== setIndex);
              return { ...prev, [currentItem.id]: reverted };
            });
            Alert.alert('Warning', 'Set logged locally but sync failed. Will retry when online.');
            // Still remove from in-flight set (operation complete, just failed to persist)
            loggingInFlight.current.delete(logKey);
          }
        }

        // STEP 3: Update session item's performed sets (for UI consistency)
        const runtimeCompletedSets =
          logResult.state.exerciseStates[currentItem.exercise_id]?.completedSets ?? [];
        const orderedCompletedSets = [...runtimeCompletedSets].sort(
          (a, b) => a.setIndex - b.setIndex,
        );

        try {
          await updateTrainingSessionItem(currentItem.id, {
            performed: {
              sets: orderedCompletedSets.map((log) => ({
                setIndex: log.setIndex,
                weight: log.weight || 0,
                reps: log.reps,
                rpe: log.rpe || undefined,
                completedAt: log.completedAt,
              })),
            },
          });
        } catch (updateError: any) {
          // Non-critical - runtime state is source of truth
          logger.warn('Failed to update session item performed sets', updateError);
        }

        // STEP 4: Start rest timer and schedule notifications.
        // Fires for any session mode whenever the planned set has restSeconds defined.
        // Previously gated on mode === 'timed' which silently blocked all guided sessions.
        const plannedSets = currentItem.planned?.sets || [];
        if (plannedSets.length > 0) {
          const plannedSet = plannedSets.find((s: any) => s.setIndex === setIndex);
          if (plannedSet?.restSeconds && plannedSet.restSeconds > 0) {
            // Get autoregulated rest time based on RPE (if RPE provided)
            const restAdjustment = rpe !== undefined ? getAdjustedRestTime(plannedSet.restSeconds, rpe) : { restSeconds: plannedSet.restSeconds, adjustment: 'normal' as const, message: 'Standard rest period' };
            setRestTimer({ seconds: restAdjustment.restSeconds, exerciseId: currentItem.id });
            // Notify rest start/finish when app is backgrounded (watch-ready)
            const exerciseMeta = getExerciseById(currentItem.exercise_id);
            const currentIdx = itemsWithOverrides.findIndex((item) => item.id === currentItem.id);
            const nextSet = plannedSets.find((s: any) => s.setIndex === setIndex + 1);
            let next: TrainingNotificationNext = null;
            let nextAfter: TrainingNotificationNext = null;
            let nextNextAfter: TrainingNotificationNext = null;
            if (nextSet) {
              next = {
                sessionItemId: currentItem.id,
                exerciseId: currentItem.exercise_id,
                exerciseName: exerciseMeta?.name ?? 'Exercise',
                setIndex: nextSet.setIndex,
                suggestedWeight: nextSet.suggestedWeight,
                targetReps: nextSet.targetReps,
                restSeconds: nextSet.restSeconds ?? 90,
              };
              const setAfterNext = plannedSets.find((s: any) => s.setIndex === setIndex + 2);
              if (setAfterNext) {
                nextAfter = {
                  sessionItemId: currentItem.id,
                  exerciseId: currentItem.exercise_id,
                  exerciseName: exerciseMeta?.name ?? 'Exercise',
                  setIndex: setAfterNext.setIndex,
                  suggestedWeight: setAfterNext.suggestedWeight,
                  targetReps: setAfterNext.targetReps,
                  restSeconds: setAfterNext.restSeconds ?? 90,
                };
                const setThreeAhead = plannedSets.find((s: any) => s.setIndex === setIndex + 3);
                if (setThreeAhead) {
                  nextNextAfter = {
                    sessionItemId: currentItem.id,
                    exerciseId: currentItem.exercise_id,
                    exerciseName: exerciseMeta?.name ?? 'Exercise',
                    setIndex: setThreeAhead.setIndex,
                    suggestedWeight: setThreeAhead.suggestedWeight,
                    targetReps: setThreeAhead.targetReps,
                    restSeconds: setThreeAhead.restSeconds ?? 90,
                  };
                } else {
                  const nextItem = itemsWithOverrides[currentIdx + 1];
                  if (nextItem && !nextItem.skipped) {
                    const nextExMeta = getExerciseById(nextItem.exercise_id);
                    const firstSet = nextItem.planned?.sets?.[0];
                    if (firstSet) {
                      nextNextAfter = {
                        sessionItemId: nextItem.id,
                        exerciseId: nextItem.exercise_id,
                        exerciseName: nextExMeta?.name ?? 'Exercise',
                        setIndex: firstSet.setIndex ?? 1,
                        suggestedWeight: firstSet.suggestedWeight,
                        targetReps: firstSet.targetReps,
                        restSeconds: firstSet.restSeconds ?? 90,
                      };
                    }
                  }
                }
              } else {
                const nextItem = itemsWithOverrides[currentIdx + 1];
                if (nextItem && !nextItem.skipped) {
                  const nextExMeta = getExerciseById(nextItem.exercise_id);
                  const firstSet = nextItem.planned?.sets?.[0];
                  nextAfter = {
                    sessionItemId: nextItem.id,
                    exerciseId: nextItem.exercise_id,
                    exerciseName: nextExMeta?.name ?? 'Exercise',
                    setIndex: firstSet?.setIndex ?? 1,
                    suggestedWeight: firstSet?.suggestedWeight,
                    targetReps: firstSet?.targetReps,
                    restSeconds: firstSet?.restSeconds ?? 90,
                  };
                  const secondSet = nextItem.planned?.sets?.[1];
                  if (secondSet) {
                    nextNextAfter = {
                      sessionItemId: nextItem.id,
                      exerciseId: nextItem.exercise_id,
                      exerciseName: nextExMeta?.name ?? 'Exercise',
                      setIndex: secondSet.setIndex,
                      suggestedWeight: secondSet.suggestedWeight,
                      targetReps: secondSet.targetReps,
                      restSeconds: secondSet.restSeconds ?? 90,
                    };
                  }
                }
              }
            } else {
              const nextItem = itemsWithOverrides[currentIdx + 1];
              if (nextItem && !nextItem.skipped) {
                const nextExMeta = getExerciseById(nextItem.exercise_id);
                const firstSet = nextItem.planned?.sets?.[0];
                next = {
                  sessionItemId: nextItem.id,
                  exerciseId: nextItem.exercise_id,
                  exerciseName: nextExMeta?.name ?? 'Exercise',
                  setIndex: firstSet?.setIndex ?? 1,
                  suggestedWeight: firstSet?.suggestedWeight,
                  targetReps: firstSet?.targetReps,
                  restSeconds: firstSet?.restSeconds ?? 90,
                };
                const secondSet = nextItem.planned?.sets?.[1];
                if (secondSet) {
                  nextAfter = {
                    sessionItemId: nextItem.id,
                    exerciseId: nextItem.exercise_id,
                    exerciseName: nextExMeta?.name ?? 'Exercise',
                    setIndex: secondSet.setIndex,
                    suggestedWeight: secondSet.suggestedWeight,
                    targetReps: secondSet.targetReps,
                    restSeconds: secondSet.restSeconds ?? 90,
                  };
                  const thirdSet = nextItem.planned?.sets?.[2];
                  if (thirdSet) {
                    nextNextAfter = {
                      sessionItemId: nextItem.id,
                      exerciseId: nextItem.exercise_id,
                      exerciseName: nextExMeta?.name ?? 'Exercise',
                      setIndex: thirdSet.setIndex,
                      suggestedWeight: thirdSet.suggestedWeight,
                      targetReps: thirdSet.targetReps,
                      restSeconds: thirdSet.restSeconds ?? 90,
                    };
                  } else {
                    const nextNextItem = itemsWithOverrides[currentIdx + 2];
                    if (nextNextItem && !nextNextItem.skipped) {
                      const nextNextExMeta = getExerciseById(nextNextItem.exercise_id);
                      const firstSetNN = nextNextItem.planned?.sets?.[0];
                      if (firstSetNN) {
                        nextNextAfter = {
                          sessionItemId: nextNextItem.id,
                          exerciseId: nextNextItem.exercise_id,
                          exerciseName: nextNextExMeta?.name ?? 'Exercise',
                          setIndex: firstSetNN.setIndex ?? 1,
                          suggestedWeight: firstSetNN.suggestedWeight,
                          targetReps: firstSetNN.targetReps,
                          restSeconds: firstSetNN.restSeconds ?? 90,
                        };
                      }
                    }
                  }
                }
              }
            }
            restNotificationContextRef.current = {
              sessionId,
              sessionItemId: currentItem.id,
              exerciseId: currentItem.exercise_id,
              exerciseName: exerciseMeta?.name ?? 'Exercise',
              nextSetIndex: next?.setIndex,
              nextSetReps: next?.targetReps,
              nextSetWeight: next?.suggestedWeight,
              totalSets: plannedSets.length,
              next,
              nextAfter,
              nextNextAfter,
              restSeconds: restAdjustment.restSeconds,
            };
            restStartNotifiedRef.current = null;
            notifyRestStartIfNeeded(restAdjustment.restSeconds).catch((e) => { if (__DEV__) logger.debug('[TrainingSessionView]', e); });
            scheduleRestFinishNotification(restAdjustment.restSeconds).catch((e) => { if (__DEV__) logger.debug('[TrainingSessionView]', e); });
            
            // Show rest adjustment message if rest was adjusted
            if (restAdjustment.adjustment !== 'normal' && rpe !== undefined) {
              setLastAutoregulationMessage(restAdjustment.message);
            }
          }
        }

        qc.invalidateQueries({ queryKey: ['training:set_logs', currentItem.id] });
        qc.invalidateQueries({ queryKey: ['training:session', sessionId] });
        logger.debug('[SET_DONE_FLOW] Queries invalidated', { setIndex });
        
        // Clear autoregulation message if next set doesn't exist or doesn't have autoregulation
        const nextSetIndex = setIndex + 1;
        const hasNextSet = plannedSets.some((s: any) => s.setIndex === nextSetIndex);
        if (!hasNextSet || !logResult.trace) {
          // No next set or no autoregulation - clear message after a short delay
          setTimeout(() => {
            setLastAutoregulationMessage(null);
          }, 5000);
        }
      } catch (error: any) {
        logger.error('[SET_DONE_FLOW] Failed to log set', error);
        // Revert optimistic state on error
        setOptimisticPerformedSets((prev) => {
          const existing = prev[currentItem.id] || [];
          const reverted = existing.filter(s => s.setIndex !== setIndex);
          return { ...prev, [currentItem.id]: reverted };
        });
        Alert.alert('Error', error?.message || 'Failed to log set');
        // Remove from in-flight set on error
        loggingInFlight.current.delete(logKey);
      }
      // Note: logKey removal is handled in try/catch blocks above (immediate removal on success/error)
    },
    [currentItem, runtimeState, setLogsQ.data, qc, sessionId, isEnded, session],
  );

  // Handle set update (editing without marking done)
  const handleSetUpdate = useCallback(
    async (setIndex: number, weight: number, reps: number, rpe?: number) => {
      if (!currentItem || !runtimeState) return;
      if (isEnded) {
        Alert.alert('Session completed', 'This session is already completed.');
        return;
      }

      const logKey = `${currentItem.id}_${setIndex}_update`;
      if (loggingInFlight.current.has(logKey)) {
        logger.warn('Set update already in flight, ignoring duplicate', { exerciseId: currentItem.exercise_id, setIndex });
        return;
      }
      loggingInFlight.current.add(logKey);

      try {
        // Update the set log directly (idempotent by id)
        const existingLogs = setLogsQ.data || [];
        const existingLog = existingLogs.find((log) => log.set_index === setIndex);
        
        if (!existingLog) {
          // Set not logged yet - treat as new log
          await handleSetComplete(setIndex, weight, reps, rpe);
          loggingInFlight.current.delete(logKey);
          return;
        }

        // Update existing log
        const networkAvailable = await isNetworkAvailable();
        const setLogId = existingLog.id;

        try {
          if (networkAvailable) {
            await updateTrainingSetLog(setLogId, {
              weight,
              reps,
              rpe: rpe !== undefined ? rpe : null,
            });

            // Update performed sets in session item
            const updatedLogs = existingLogs.map((log) =>
              log.set_index === setIndex
                ? { ...log, weight, reps, rpe: rpe || null }
                : log
            );

            await updateTrainingSessionItem(currentItem.id, {
              performed: {
                sets: updatedLogs.map((log) => ({
                  setIndex: log.set_index,
                  weight: log.weight || 0,
                  reps: log.reps,
                  rpe: log.rpe || undefined,
                  completedAt: log.completed_at,
                })),
              },
            });
          } else {
            // Offline: Update performed sets in session item (can be queued)
            const updatedLogs = existingLogs.map((log) =>
              log.set_index === setIndex
                ? { ...log, weight, reps, rpe: rpe || null }
                : log
            );
            await enqueueOperation({
              type: 'upsertItem',
              sessionId: sessionId,
              itemId: currentItem.id,
              payload: {
                performed: {
                  sets: updatedLogs.map((log) => ({
                    setIndex: log.set_index,
                    weight: log.weight || 0,
                    reps: log.reps,
                    rpe: log.rpe || undefined,
                    completedAt: log.completed_at,
                  })),
                },
              },
              timestamp: new Date().toISOString(),
            });
            setOfflineQueueSize((prev) => prev + 1);
          }

          qc.invalidateQueries({ queryKey: ['training:set_logs', currentItem.id] });
          qc.invalidateQueries({ queryKey: ['training:session', sessionId] });
        } catch (persistError: any) {
          logger.warn('Failed to update set log', persistError);
          Alert.alert('Warning', 'Set update failed. Will retry when online.');
          if (!networkAvailable) {
            // Queue for retry when offline
            const updatedLogs = existingLogs.map((log) =>
              log.set_index === setIndex
                ? { ...log, weight, reps, rpe: rpe || null }
                : log
            );
            await enqueueOperation({
              type: 'upsertItem',
              sessionId: sessionId,
              itemId: currentItem.id,
              payload: {
                performed: {
                  sets: updatedLogs.map((log) => ({
                    setIndex: log.set_index,
                    weight: log.weight || 0,
                    reps: log.reps,
                    rpe: log.rpe || undefined,
                    completedAt: log.completed_at,
                  })),
                },
              },
              timestamp: new Date().toISOString(),
            });
            setOfflineQueueSize((prev) => prev + 1);
          }
        }

        loggingInFlight.current.delete(logKey);
      } catch (error: any) {
        logger.warn('Failed to update set', error);
        Alert.alert('Error', error?.message || 'Failed to update set');
        loggingInFlight.current.delete(logKey);
      }
    },
    [currentItem, runtimeState, setLogsQ.data, qc, sessionId, isEnded, handleSetComplete],
  );

  // Handle exercise replacement (session or program scope)
  const handleReplaceExercise = useCallback(
    async ({ newExerciseId, scope }: { newExerciseId: string; scope: 'session' | 'program' }) => {
      if (!currentItem || !runtimeState) return;

      const oldExerciseId = currentItem.exercise_id;
      const rawSets = currentItem.planned?.sets ?? [];
      const newPlannedSets =
        rawSets.length > 0
          ? rawSets.map((s) => ({
              setIndex: s.setIndex,
              targetReps: s.targetReps,
              suggestedWeight: s.suggestedWeight,
              restSeconds: s.restSeconds ?? 90,
            }))
          : [
              { setIndex: 1, targetReps: 10, suggestedWeight: 0, restSeconds: 90 },
              { setIndex: 2, targetReps: 10, suggestedWeight: 0, restSeconds: 90 },
              { setIndex: 3, targetReps: 10, suggestedWeight: 0, restSeconds: 90 },
            ];

      logger.debug('[REPLACE_EX] Starting', {
        oldId: oldExerciseId,
        newId: newExerciseId,
        scope,
        itemId: currentItem.id,
      });

      try {
        // Optimistic UI update: update local state immediately
        setExerciseIdOverrides((prev) => ({
          ...prev,
          [currentItem.id]: newExerciseId,
        }));

        // Also update query cache for consistency
        const sessionQueryKey = ['training:session', sessionId];
        const currentSessionData = qc.getQueryData<typeof sessionData>(sessionQueryKey);

        if (currentSessionData) {
          const updatedItems = currentSessionData.items.map((item) =>
            item.id === currentItem.id ? { ...item, exercise_id: newExerciseId } : item
          );
          qc.setQueryData(sessionQueryKey, {
            ...currentSessionData,
            items: updatedItems,
          });
        }

        if (scope === 'session') {
          await updateTrainingSessionItem(currentItem.id, { exercise_id: newExerciseId });
          logger.debug('[REPLACE_EX] Session done', { itemId: currentItem.id });

          setRuntimeState((prev) =>
            prev ? replaceExerciseInRuntime(prev, oldExerciseId, newExerciseId, newPlannedSets) : prev
          );

          // Refresh session data to ensure consistency
          await qc.invalidateQueries({ queryKey: ['training:session', sessionId] });
          await qc.invalidateQueries({ queryKey: ['training:lastSessionSets'] });
        } else {
          // PROGRAM scope: Update program day (if it exists)
          const programDayId = (session as any).program_day_id;
          if (!programDayId) {
            Alert.alert('No program day', 'This session is not linked to a program day. Use "This session only" instead.');
            logger.warn('[REPLACE_EX] No program_day_id', { sessionId });
            // Revert optimistic update
            setExerciseIdOverrides((prev) => {
              const next = { ...prev };
              delete next[currentItem.id];
              return next;
            });
            if (currentSessionData) {
              qc.setQueryData(sessionQueryKey, currentSessionData);
            }
            return;
          }

          // Note: Program days store intents/template, not specific exercises
          // For now, update the session item (session scope)
          await updateTrainingSessionItem(currentItem.id, { exercise_id: newExerciseId });
          logger.debug('[REPLACE_EX] Program done', {
            itemId: currentItem.id,
            programDayId,
          });

          setRuntimeState((prev) =>
            prev ? replaceExerciseInRuntime(prev, oldExerciseId, newExerciseId, newPlannedSets) : prev
          );

          await qc.invalidateQueries({ queryKey: ['training:session', sessionId] });
          await qc.invalidateQueries({ queryKey: ['training:programDays'] });
        }
      } catch (error: any) {
        // Revert optimistic update on error
        setExerciseIdOverrides((prev) => {
          const next = { ...prev };
          delete next[currentItem.id];
          return next;
        });
        const sessionQueryKey = ['training:session', sessionId];
        const currentSessionData = qc.getQueryData<typeof sessionData>(sessionQueryKey);
        if (currentSessionData) {
          qc.setQueryData(sessionQueryKey, currentSessionData);
        }
        
        logger.warn('[REPLACE_EX] Failed', { error: error?.message });
        Alert.alert('Error', error?.message || 'Failed to replace exercise');
      }
    },
    [currentItem, runtimeState, session, sessionId, qc, sessionData],
  );

  const handleComplete = useCallback(async () => {
    if (isEnded) {
      onComplete();
      return;
    }
    if (isFinalizing || !runtimeState) return;

    logger.debug('[SESSION_END_FLOW] Finish pressed', { sessionId, totalSetsLogged });
    setIsFinalizing(true);

    try {
      logger.debug('[SESSION_END_FLOW] Handler called', { sessionId });
      
      // STEP 1: Get exercise names for runtime.endSession
      const exerciseNames: Record<string, string> = {};
      for (const item of itemsWithOverrides) {
        const ex = getExerciseById(item.exercise_id);
        if (ex) {
          exerciseNames[item.exercise_id] = ex.name;
        }
      }
      
      // STEP 2: Get previous bests for PR detection
      const previousBests: Record<string, {
        bestWeight?: number;
        bestReps?: number;
        bestE1RM?: number;
        bestVolume?: number;
      }> = {};
      
      for (const item of itemsWithOverrides) {
        if (!item.performed?.sets || item.performed.sets.length === 0) continue;
        try {
          const best = await getExerciseBestPerformance(item.exercise_id);
          if (best) {
            previousBests[item.exercise_id] = {
              bestWeight: best.bestWeight,
              bestReps: best.bestReps,
              bestE1RM: best.bestE1RM,
              bestVolume: best.bestVolume,
            };
          }
        } catch (error) {
          logger.warn('Failed to get previous best for exercise', item.exercise_id, error);
        }
      }
      
      // STEP 3: Compute session result using runtime.endSession
      const sessionResult = endSession(runtimeState, exerciseNames, previousBests);
      logger.debug('[SESSION_END_FLOW] Session result computed', { endedAt: sessionResult.endedAt });
      
      // FIX: CRITICAL OPTIMISTIC STATE UPDATE
      // Set ended timestamp immediately so timer stops and UI updates BEFORE DB write completes.
      // This prevents the timer from continuing to run and prevents "Finishing..." from hanging.
      // The timer logic uses `isEnded` which is derived from `optimisticEndedAt || session.ended_at`,
      // so setting this immediately stops the timer even if the DB write or refetch is slow.
      setOptimisticEndedAt(sessionResult.endedAt);
      logger.debug('[SESSION_END_FLOW] Optimistic ended state set', { endedAt: sessionResult.endedAt });
      
      // Update runtime state to completed
      setRuntimeState((prev) => prev ? { ...prev, status: 'completed' } : null);

      if (TRAINING_SESSION_BUFFER_WRITES_ENABLED) {
        const flushResult = await flushBufferedSessionWrites(sessionId);
        if (flushResult.failed > 0) {
          logger.warn('[SESSION_END_FLOW] Some buffered set logs failed to flush', {
            sessionId,
            failed: flushResult.failed,
            queuedForRetry: flushResult.queuedForRetry,
            errors: flushResult.errors,
          });
          Alert.alert(
            'Some sets queued for retry',
            'A few set logs could not sync right now. They were kept locally and will retry automatically.',
          );
        }
      }
      
      // STEP 4: Persist session end and summary (optional Health Connect active calories for this wall-clock window)
      const networkAvailable = await isNetworkAvailable();

      const energyExtras = await mergeHealthConnectActiveEnergyIntoTrainingSummary(
        sessionData.session.started_at,
        sessionResult.endedAt,
        null,
      );

      const summary = {
        durationMinutes: sessionResult.durationMinutes,
        exercisesCompleted: sessionResult.exercisesCompleted,
        exercisesSkipped: sessionResult.exercisesSkipped,
        totalVolume: sessionResult.totalVolume,
        totalSets: sessionResult.totalSets,
        prs: sessionResult.prs,
        levelUpEvents: sessionResult.levelUpEvents.length > 0 ? sessionResult.levelUpEvents : undefined,
        adaptationTrace: sessionResult.adaptationTrace, // Include full trace for debugging/analytics
        ...energyExtras,
      };
      
      if (networkAvailable) {
        await updateTrainingSession(sessionId, {
          endedAt: sessionResult.endedAt,
          summary,
        });
        logger.debug('[SESSION_END_FLOW] DB write success', { sessionId, endedAt: sessionResult.endedAt });
        
        await logTrainingEvent('training_session_completed', {
          sessionId: sessionId, // TEXT sessionId in payload JSONB - safe
          durationMinutes: sessionResult.durationMinutes,
          prsCount: sessionResult.prs.length,
          exercisesCompleted: sessionResult.exercisesCompleted,
          exercisesSkipped: sessionResult.exercisesSkipped,
          totalVolume: sessionResult.totalVolume,
        }).catch((e) => { if (__DEV__) logger.debug('[TrainingSessionView]', e); });
        
        // Log adaptation trace events if any
        for (const trace of sessionResult.adaptationTrace) {
          await logTrainingEvent('training_adaptation_applied', {
            exerciseId: trace.exerciseId,
            setIndex: trace.setIndex,
            ruleId: trace.ruleId,
            reason: trace.reason,
            confidence: trace.confidence,
            sessionId: sessionId, // TEXT in JSONB payload
          }).catch((e) => { if (__DEV__) logger.debug('[TrainingSessionView]', e); });
        }
      } else {
        await enqueueOperation({
          type: 'finalizeSession',
          sessionId,
          payload: {
            endedAt: sessionResult.endedAt,
            summary,
          },
          timestamp: new Date().toISOString(),
        });
        logger.debug('[SESSION_END_FLOW] Queued offline', { sessionId });
      }

      await qc.invalidateQueries({ queryKey: ['training:session', sessionId] });
      await qc.invalidateQueries({ queryKey: ['training:sessions'] });
      await qc.invalidateQueries({ queryKey: ['training:sessions:analytics'] });
      logger.debug('[SESSION_END_FLOW] Queries invalidated', { sessionId });

      // Clear training intents to prevent stale "Rest complete" / "Next set" / "Session started" notifications
      try {
        await clearIntentsByPrefix(`training_rest:${sessionId}:`);
        await clearIntentsByPrefix(`training_set:${sessionId}:`);
        await clearIntentsByPrefix(`training_first:${sessionId}:`);
        await reconcileNotifications();
      } catch (e) {
        logger.warn('[SESSION_END_FLOW] Failed to clear training intents', e);
      }

      setShowMoodPrompt(true);
    } catch (error: any) {
      logger.error('[SESSION_END_FLOW] Failed to complete session', error);
      // Revert optimistic ended state on error
      setOptimisticEndedAt(null);
      Alert.alert('Error', error?.message || 'Failed to complete session');
    } finally {
      // FIX: CRITICAL - Always clear loading state to prevent infinite "Finishing..."
      // This ensures that even if DB write fails or throws, the button returns to
      // "Finish session" state instead of staying stuck on "Finishing...".
      // Combined with optimistic ended state above, this guarantees UI always clears
      // loading on success OR failure (no infinite "Finishing...").
      setIsFinalizing(false);
      logger.debug('[SESSION_END_FLOW] Finalizing cleared', { sessionId });
    }
  }, [isEnded, isFinalizing, runtimeState, sessionId, sessionData.session.started_at, itemsWithOverrides, qc, onComplete, totalSetsLogged]);

  const handleCancelSession = useCallback(async () => {
    if (isEnded) {
      // Session already ended, just close
      onCancel();
      return;
    }

    Alert.alert(
      'Cancel session?',
      'This will permanently delete this session and all logged sets. This cannot be undone.',
      [
        { text: 'Keep session', style: 'cancel' },
        {
          text: 'Cancel & delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear training intents to prevent stale notifications
              await clearIntentsByPrefix(`training_rest:${sessionId}:`);
              await clearIntentsByPrefix(`training_set:${sessionId}:`);
              await clearIntentsByPrefix(`training_first:${sessionId}:`);
              await reconcileNotifications();
              await deleteTrainingSession(sessionId);
              await clearBufferedSessionWrites(sessionId);
              await qc.invalidateQueries({ queryKey: ['training:sessions'] });
              await qc.invalidateQueries({ queryKey: ['training:sessions:analytics'] });
              await qc.invalidateQueries({ queryKey: ['training:session', sessionId] });
              logger.debug('[CANCEL_SESSION] Session deleted', { sessionId });
              onCancel();
            } catch (error: any) {
              logger.error('[CANCEL_SESSION] Failed to delete session', error);
              Alert.alert('Error', error?.message || 'Failed to cancel session. Please try again.');
            }
          },
        },
      ]
    );
  }, [sessionId, isEnded, qc, onCancel]);

  const handleNext = useCallback(() => {
    if (currentExerciseIndex < itemsWithOverrides.length - 1) {
      // Clear autoregulation message when advancing to next exercise
      setLastAutoregulationMessage(null);
      setCurrentExerciseIndex(currentExerciseIndex + 1);
    } else {
      Alert.alert('Complete session?', 'Finish this training session? You can review it in History.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Complete', style: 'default', onPress: () => void handleComplete() },
      ]);
    }
  }, [currentExerciseIndex, itemsWithOverrides.length, handleComplete]);

  const handleSkip = useCallback(async () => {
    if (!currentItem || !runtimeState) return;
    if (isEnded) {
      Alert.alert('Session completed', 'This session is already completed.');
      return;
    }

    const currentPlannedSets = currentItem.planned?.sets ?? [];
    const exerciseId = currentItem.exercise_id;
    const exerciseState = runtimeState.exerciseStates[exerciseId];
    const setIndex = exerciseState?.currentSetIndex ?? 1;

    try {
      const now = new Date().toISOString();
      setOptimisticPerformedSets((prev) => {
        const existing = prev[currentItem.id] || [];
        const updated = [
          ...existing.filter(s => s.setIndex !== setIndex),
          { setIndex, weight: 0, reps: 0, completedAt: now, skipped: true },
        ].sort((a, b) => a.setIndex - b.setIndex);
        return { ...prev, [currentItem.id]: updated };
      });

      if (exerciseState) {
        const nextSetIndex = setIndex + 1;
        const allSetsHandled = nextSetIndex > currentPlannedSets.length;
        setRuntimeState((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            exerciseStates: {
              ...prev.exerciseStates,
              [exerciseId]: {
                ...exerciseState,
                currentSetIndex: nextSetIndex,
                status: allSetsHandled ? 'completed' : exerciseState.status,
              },
            },
          };
        });
      }

      await logTrainingEvent('training_set_skipped', {
        exerciseId,
        sessionId,
        setIndex,
      }).catch((e) => { if (__DEV__) logger.debug('[TrainingSessionView]', e); });

      const allPlannedDone = currentPlannedSets.every((p: any) => {
        if (p.setIndex === setIndex) return true;
        const inOptimistic = (optimisticPerformedSets[currentItem.id] ?? []).some((s) => s.setIndex === p.setIndex);
        const inRuntime = exerciseState?.completedSets.some((s) => s.setIndex === p.setIndex);
        const inServer = (currentItem.performed?.sets ?? []).some((s: any) => s.setIndex === p.setIndex);
        return inOptimistic || inRuntime || inServer;
      });

      if (allPlannedDone) {
        setLastAutoregulationMessage(null);
        handleNext();
      }
    } catch (error: any) {
      logger.warn('[SKIP_SET] Failed', error);
      Alert.alert('Error', error?.message || 'Failed to skip set');
    }
  }, [
    currentItem,
    runtimeState,
    optimisticPerformedSets,
    sessionId,
    isEnded,
    handleNext,
  ]);

  // Auto-advance: when rest timer ends and all sets for the current exercise are done,
  // move to next exercise automatically. Also clear RPE selection on exercise change.
  const autoAdvanceAfterRest = useCallback(() => {
    if (!currentItem || isEnded) return;
    const allDone = isExerciseFullyLoggedForItem(currentItem, runtimeState, optimisticPerformedSets);
    if (allDone) {
      handleNext();
    }
    setSelectedRpe(null);
  }, [currentItem, isEnded, runtimeState, optimisticPerformedSets, handleNext]);

  restCompleteHandlerRef.current = useCallback(() => {
    setRestTimer(null);
    setRestTimerPaused(false);
    restNotificationContextRef.current = null;
    restStartNotifiedRef.current = null;
    cancelRestFinishNotification().catch((e) => { if (__DEV__) logger.debug('[TrainingSessionView]', e); });
    autoAdvanceAfterRest();
  }, [autoAdvanceAfterRest, cancelRestFinishNotification]);

  // Clear RPE when exercise changes
  useEffect(() => {
    setSelectedRpe(null);
  }, [currentExerciseIndex]);

  // Compute completion statuses for FullSessionPanel
  const exerciseCompletionStatuses = useMemo<ExerciseCompletionStatus[]>(() => {
    return itemsWithOverrides.map((item) => {
      const totalSets = item.planned?.sets?.length ?? 0;
      const logged = getEffectiveLoggedSetIndices(item, runtimeState, optimisticPerformedSets);
      return {
        exerciseId: item.exercise_id,
        completedSets: logged.size,
        totalSets,
        skipped: !!item.skipped,
      };
    });
  }, [itemsWithOverrides, runtimeState, optimisticPerformedSets]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const plannedSets = currentItem?.planned?.sets || [];
  /** Merge DB + runtime + optimistic by setIndex so UI advances immediately on Done (no refetch wait). */
  const performedSets = useMemo(() => {
    if (!currentItem) return [];
    const byIndex = new Map<
      number,
      { setIndex: number; weight: number; reps: number; rpe?: number; completedAt: string }
    >();

    for (const s of currentItem.performed?.sets ?? []) {
      byIndex.set(s.setIndex, {
        setIndex: s.setIndex,
        weight: s.weight ?? 0,
        reps: s.reps,
        rpe: s.rpe,
        completedAt: s.completedAt,
      });
    }

    const runtimeCompleted =
      runtimeState?.exerciseStates[currentItem.exercise_id]?.completedSets ?? [];
    for (const s of runtimeCompleted) {
      byIndex.set(s.setIndex, {
        setIndex: s.setIndex,
        weight: s.weight ?? 0,
        reps: s.reps,
        rpe: s.rpe,
        completedAt: s.completedAt,
      });
    }

    for (const s of optimisticPerformedSets[currentItem.id] ?? []) {
      byIndex.set(s.setIndex, { ...s });
    }

    return [...byIndex.values()].sort((a, b) => a.setIndex - b.setIndex);
  }, [
    currentItem?.id,
    currentItem?.exercise_id,
    currentItem?.performed?.sets,
    optimisticPerformedSets,
    runtimeState,
  ]);

  const firstPendingSetIndex = useMemo(() => {
    const firstPendingSet = plannedSets.find((planned: any) => {
      const performed = performedSets.find((s: any) => s.setIndex === planned.setIndex);
      return !performed;
    });
    return firstPendingSet?.setIndex ?? null;
  }, [plannedSets, performedSets]);

  // Notification actions: focus or edit the requested set
  useEffect(() => {
    if (!notificationAction) return;
    if (notificationAction.sessionId && notificationAction.sessionId !== sessionId) {
      onNotificationActionHandled?.();
      return;
    }
    const targetSetIndex = notificationAction.setIndex ?? firstPendingSetIndex;
    if (!targetSetIndex) {
      onNotificationActionHandled?.();
      return;
    }
    if (notificationAction.exerciseId) {
      const idx = itemsWithOverrides.findIndex((item) => item.exercise_id === notificationAction.exerciseId);
      if (idx >= 0 && idx !== currentExerciseIndex) {
        setCurrentExerciseIndex(idx);
      }
    }
    const isPerformed = performedSets.some((s: any) => s.setIndex === targetSetIndex);
    if (notificationAction.action === 'edit_set' || isPerformed) {
      setPendingEditSetIndex(targetSetIndex);
    } else {
      setFocusOverlaySetIndex(targetSetIndex);
      setShowSetFocusOverlay(true);
    }
    onNotificationActionHandled?.();
  }, [
    notificationAction,
    sessionId,
    firstPendingSetIndex,
    itemsWithOverrides,
    currentExerciseIndex,
    performedSets,
    onNotificationActionHandled,
  ]);

  if (!currentItem) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator />
      </View>
    );
  }

  const exercise = getExerciseById(currentItem.exercise_id);

  const sessionAny = session as any;
  const sessionTypeLabel: string | undefined = (sessionAny.session_type_label ?? undefined) as string | undefined;
  const weekIndex: number | undefined = (sessionAny.week_index ?? undefined) as number | undefined;

  const sessionLabel = sessionTypeLabel ? `Week ${weekIndex ?? '?'} · ${sessionTypeLabel}` : 'Training Session';

  const plannedExercises = useMemo(() => {
    return itemsWithOverrides
      .map((item) => {
        const ex = getExerciseById(item.exercise_id);
        if (!ex) return null;

        return {
          exerciseId: item.exercise_id,
          exercise: ex,
          orderIndex: item.order_index,
          plannedSets: item.planned?.sets || [],
          intents: item.planned?.intents || [],
          priority: item.planned?.priority || 'accessory',
          decisionTrace: item.planned?.decisionTrace,
        };
      })
      .filter(Boolean) as any[];
  }, [itemsWithOverrides]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: appTheme.spacing.lg,
          paddingTop: appTheme.spacing.lg,
          paddingBottom: Math.max(160, insets.bottom + (compactSessionLayout ? 240 : 200)),
        }}
      >
        {/* Session header: label + timer + progress */}
        <View style={{ marginBottom: appTheme.spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text variant="titleLarge" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                {sessionLabel}
              </Text>
              {isEnded ? (
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                  Completed
                </Text>
              ) : (
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                  Exercise {currentExerciseIndex + 1}/{itemsWithOverrides.length} · {completedCount} done
                  {skippedCount > 0 ? ` · ${skippedCount} skipped` : ''}
                </Text>
              )}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onSurface, fontVariant: ['tabular-nums'] }}>
                {formatTime(elapsedSeconds)}
              </Text>
              <Button mode="text" compact onPress={() => setShowFullSession(true)} labelStyle={{ fontSize: 12 }}>
                Full plan
              </Button>
            </View>
          </View>

          {/* Session progress bar */}
          <View style={{ flexDirection: 'row', gap: 3, marginTop: appTheme.spacing.sm }}>
            {itemsWithOverrides.map((item, idx) => {
              const isCurrent = idx === currentExerciseIndex;
              const isDone =
                !item.skipped && isExerciseFullyLoggedForItem(item, runtimeState, optimisticPerformedSets);
              const isSkipped = item.skipped;
              return (
                <View
                  key={item.id}
                  style={{
                    flex: 1,
                    height: 4,
                    backgroundColor: isDone
                      ? theme.colors.primary
                      : isSkipped
                        ? theme.colors.error
                        : isCurrent
                          ? theme.colors.secondary
                          : theme.colors.surfaceVariant,
                    borderRadius: 2,
                  }}
                />
              );
            })}
          </View>
        </View>

        {isOffline && (
          <Card
            mode="elevated"
            style={{
              marginBottom: appTheme.spacing.lg,
              backgroundColor: theme.colors.errorContainer,
              borderLeftWidth: 4,
              borderLeftColor: theme.colors.error,
              borderRadius: appTheme.borderRadius.xl,
            }}
          >
            <Card.Content>
              <Text variant="bodyMedium" style={{ color: theme.colors.onErrorContainer }}>
                Offline — {offlineQueueSize} operation{offlineQueueSize !== 1 ? 's' : ''} will sync when network returns
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* Single-set focus: rest countdown OR set card */}
        {exercise && !isEnded && (() => {
          const isResting = !!(restTimer && restTimer.exerciseId === currentItem?.id);

          if (isResting) {
            // Compute "next" set info for the rest countdown card
            const nextSetInfo = (() => {
              const nextPendingSet = plannedSets.find((s) => {
                return !performedSets.some((p) => p.setIndex === s.setIndex);
              });
              if (nextPendingSet) {
                return {
                  exerciseName: exercise.name,
                  setIndex: nextPendingSet.setIndex,
                  totalSets: plannedSets.length,
                  weight: nextPendingSet.suggestedWeight,
                  reps: nextPendingSet.targetReps,
                  isNewExercise: false,
                };
              }
              // Current exercise is done — peek at next exercise
              const nextItemIdx = currentExerciseIndex + 1;
              const nextItem = itemsWithOverrides[nextItemIdx];
              if (nextItem && !nextItem.skipped) {
                const nextEx = getExerciseById(nextItem.exercise_id);
                const nextFirstSet = nextItem.planned?.sets?.[0];
                return {
                  exerciseName: nextEx?.name ?? 'Next exercise',
                  setIndex: nextFirstSet?.setIndex ?? 1,
                  totalSets: nextItem.planned?.sets?.length ?? 0,
                  weight: nextFirstSet?.suggestedWeight ?? 0,
                  reps: nextFirstSet?.targetReps ?? 0,
                  isNewExercise: true,
                };
              }
              return {
                exerciseName: exercise.name,
                setIndex: 1,
                totalSets: plannedSets.length,
                weight: 0,
                reps: 0,
                isNewExercise: false,
              };
            })();

            return (
              <>
                <RestCountdownCard
                  totalSeconds={restTimer.seconds}
                  remainingSeconds={restCountdown.remaining}
                  isPaused={restTimerPaused}
                  nextExerciseName={nextSetInfo.exerciseName}
                  nextSetIndex={nextSetInfo.setIndex}
                  nextTotalSets={nextSetInfo.totalSets}
                  nextWeight={nextSetInfo.weight}
                  nextReps={nextSetInfo.reps}
                  isNewExercise={nextSetInfo.isNewExercise}
                  onSkipRest={() => {
                    setRestTimer(null);
                    setRestTimerPaused(false);
                    restNotificationContextRef.current = null;
                    restStartNotifiedRef.current = null;
                    cancelRestFinishNotification().catch((e) => { if (__DEV__) logger.debug('[TrainingSessionView]', e); });
                    autoAdvanceAfterRest();
                  }}
                  onExtend={(seconds: number) => {
                    restCountdown.extend(seconds);
                    setRestTimer((prev) => (prev ? { ...prev, seconds: prev.seconds + seconds } : null));
                    if (shouldForceGuidedNotifications || AppState.currentState !== 'active') {
                      const remaining = restCountdown.remaining + seconds;
                      scheduleRestFinishNotification(remaining).catch((e) => { if (__DEV__) logger.debug('[TrainingSessionView]', e); });
                    }
                  }}
                  onTogglePause={() => setRestTimerPaused((prev) => !prev)}
                />
              </>
            );
          }

          // Not resting — show the focused set card
          const focusSet = (() => {
            if (firstPendingSetIndex != null) {
              const planned = plannedSets.find((s) => s.setIndex === firstPendingSetIndex);
              if (planned) {
                // Check for autoregulation adjustment
                if (runtimeState) {
                  try {
                    const adjusted = getAdjustedSetParams(runtimeState, currentItem.exercise_id, planned.setIndex);
                    if (adjusted.hasAdjustment) {
                      return {
                        setIndex: planned.setIndex,
                        weight: adjusted.suggestedWeight,
                        reps: adjusted.targetReps,
                        restSeconds: planned.restSeconds ?? 90,
                        autoregMessage: adjusted.adjustmentMessage,
                      };
                    }
                  } catch { /* use planned */ }
                }
                return {
                  setIndex: planned.setIndex,
                  weight: planned.suggestedWeight,
                  reps: planned.targetReps,
                  restSeconds: planned.restSeconds ?? 90,
                  autoregMessage: lastAutoregulationMessage,
                };
              }
            }
            // Fallback: all sets done for this exercise
            return null;
          })();

          if (!focusSet) {
            // All sets done for this exercise — show completion + next button
            return (
              <Card
                mode="elevated"
                style={{
                  backgroundColor: theme.colors.primaryContainer,
                  borderRadius: appTheme.borderRadius.xl,
                  marginBottom: appTheme.spacing.lg,
                }}
              >
                <Card.Content style={{ padding: appTheme.spacing.lg, alignItems: 'center' }}>
                  <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onPrimaryContainer, marginBottom: appTheme.spacing.xs }}>
                    {exercise.name}
                  </Text>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onPrimaryContainer, marginBottom: appTheme.spacing.lg }}>
                    All {plannedSets.length} sets complete
                  </Text>
                  <Button mode="contained" onPress={handleNext}>
                    {currentExerciseIndex < itemsWithOverrides.length - 1 ? 'Next exercise' : 'Finish session'}
                  </Button>
                </Card.Content>
              </Card>
            );
          }

          // Compute previous set data for this specific set
          const lastSessionSets = lastSessionSetsQ.data?.sets || [];
          const prevSet = lastSessionSets.find((s) => s.setIndex === focusSet.setIndex);

          return (
            <SetFocusCard
              exercise={exercise}
              setIndex={focusSet.setIndex}
              totalSets={plannedSets.length}
              plannedWeight={focusSet.weight}
              plannedReps={focusSet.reps}
              priority={currentItem.planned?.priority as string | undefined}
              intents={currentItem.planned?.intents as string[] | undefined}
              autoregMessage={focusSet.autoregMessage}
              lastPerformance={
                lastPerformanceQ.data
                  ? { weight: lastPerformanceQ.data.weight, reps: lastPerformanceQ.data.reps, date: lastPerformanceQ.data.session_date }
                  : null
              }
              previousSet={prevSet ? { weight: prevSet.weight || 0, reps: prevSet.reps } : null}
              onDone={(weight, reps, rpe) => {
                handleSetComplete(focusSet.setIndex, weight, reps, rpe);
              }}
              onSkip={handleSkip}
              onEdit={() => setPendingEditSetIndex(focusSet.setIndex)}
              onRpeSelect={(rpe) => setSelectedRpe(rpe === 0 ? null : rpe)}
              selectedRpe={selectedRpe}
              isSessionEnded={isEnded}
            />
          );
        })()}

        {/* Completed sets summary for current exercise */}
        {exercise && !isEnded && performedSets.length > 0 && (
          <Card
            mode="elevated"
            style={{
              backgroundColor: theme.colors.elevation.level1,
              borderRadius: appTheme.borderRadius.xl,
              marginBottom: appTheme.spacing.md,
            }}
          >
            <Card.Content>
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: appTheme.spacing.sm }}>
                Logged sets
              </Text>
              {performedSets.map((s) => (
                <View key={s.setIndex} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurface }}>
                    Set {s.setIndex}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                    {s.weight}kg × {s.reps}{s.rpe ? ` @ RPE ${s.rpe}` : ''}
                  </Text>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        {/* Set Focus Overlay (from notification deep-link) */}
        {exercise && focusOverlaySetIndex !== null && (() => {
          const focusedSet = plannedSets.find((s) => s.setIndex === focusOverlaySetIndex);
          const focusedPerformed = performedSets.find((s) => s.setIndex === focusOverlaySetIndex);
          if (!focusedSet) return null;
          
          return (
            <SetFocusOverlay
              visible={showSetFocusOverlay}
              exerciseName={exercise.name}
              setIndex={focusedSet.setIndex}
              totalSets={plannedSets.length}
              plannedWeight={focusedSet.suggestedWeight}
              plannedReps={focusedSet.targetReps}
              isCompleted={!!focusedPerformed}
              isResting={!!(restTimer && restTimer.exerciseId === currentItem?.id)}
              restRemaining={restTimer ? restCountdown.remaining : undefined}
              restPaused={restTimerPaused}
              onDone={() => {
                handleSetComplete(focusedSet.setIndex, focusedSet.suggestedWeight, focusedSet.targetReps);
                setShowSetFocusOverlay(false);
              }}
              onAdjust={() => {
                setShowSetFocusOverlay(false);
                setPendingEditSetIndex(focusedSet.setIndex);
              }}
              onStartRest={() => {
                setShowSetFocusOverlay(false);
                if (focusedSet.restSeconds && focusedSet.restSeconds > 0 && currentItem) {
                  setRestTimer({ seconds: focusedSet.restSeconds, exerciseId: currentItem.id });
                }
              }}
              onToggleRestPause={() => setRestTimerPaused((prev) => !prev)}
              onClose={() => {
                setShowSetFocusOverlay(false);
                setFocusOverlaySetIndex(null);
              }}
            />
          );
        })()}

        {/* Edit Set Dialog (B3 — re-enabled per-set edit) */}
        {pendingEditSetIndex !== null && (() => {
          const editSet = plannedSets.find((s) => s.setIndex === pendingEditSetIndex);
          if (!editSet) return null;
          const existingPerf = performedSets.find((s: any) => s.setIndex === pendingEditSetIndex);
          return (
            <EditSetDialog
              visible
              setIndex={editSet.setIndex}
              totalSets={plannedSets.length}
              initialWeight={existingPerf?.weight ?? editSet.suggestedWeight}
              initialReps={existingPerf?.reps ?? editSet.targetReps}
              initialRpe={existingPerf?.rpe ?? null}
              isUpdate={!!existingPerf}
              onSave={(weight, reps, rpe) => {
                if (existingPerf) {
                  handleSetUpdate(editSet.setIndex, weight, reps, rpe ?? undefined);
                } else {
                  handleSetComplete(editSet.setIndex, weight, reps, rpe ?? undefined);
                }
                setPendingEditSetIndex(null);
              }}
              onCancel={() => setPendingEditSetIndex(null)}
            />
          );
        })()}
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: appTheme.spacing.lg,
          paddingTop: appTheme.spacing.md,
          paddingBottom: Math.max(insets.bottom, appTheme.spacing.md),
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.outlineVariant,
        }}
      >
        {/* Primary action row: Minimize (safe, session persists) + Finish session (positive) */}
        <View
          style={{
            flexDirection: compactSessionLayout ? 'column' : 'row',
            gap: 10,
            alignItems: 'stretch',
          }}
        >
          <Button
            mode="outlined"
            onPress={onCancel}
            style={[{ minWidth: 0, alignSelf: 'stretch' }, tertiaryCapsule.style, !compactSessionLayout ? { flex: 1 } : undefined]}
            contentStyle={[tertiaryCapsule.contentStyle, { minHeight: 48 }]}
            labelStyle={tertiaryCapsule.labelStyle}
          >
            {isEnded ? 'Close' : 'Minimize'}
          </Button>
          <Button
            mode="contained"
            onPress={() => void handleComplete()}
            buttonColor={theme.colors.primary}
            textColor={theme.colors.onPrimary}
            style={[{ minWidth: 0, alignSelf: 'stretch' }, primaryCapsule.style, !compactSessionLayout ? { flex: 1 } : undefined]}
            contentStyle={[primaryCapsule.contentStyle, { minHeight: 48 }]}
            labelStyle={[primaryCapsule.labelStyle, { color: theme.colors.onPrimary }]}
            disabled={isEnded || isFinalizing}
          >
            {isEnded ? 'Completed' : isFinalizing ? 'Finishing…' : 'Finish session'}
          </Button>
        </View>
        {/* Destructive action — visually separated and demoted to prevent accidental tap */}
        {!isEnded && (
          <View style={{ alignItems: 'center', marginTop: 6 }}>
            <Button
              mode="text"
              compact
              onPress={handleCancelSession}
              textColor={theme.colors.error}
              labelStyle={{ fontSize: 12, letterSpacing: 0 }}
            >
              Cancel & delete session
            </Button>
          </View>
        )}
      </View>

      <FullSessionPanel
        visible={showFullSession}
        exercises={plannedExercises as any}
        currentExerciseIndex={currentExerciseIndex}
        sessionLabel={sessionLabel}
        completionStatuses={exerciseCompletionStatuses}
        onGoToExercise={(index) => {
          setLastAutoregulationMessage(null);
          setSelectedRpe(null);
          setCurrentExerciseIndex(index);
        }}
        onClose={() => setShowFullSession(false)}
      />

      <PostSessionMoodPrompt
        visible={showMoodPrompt}
        sessionId={sessionId}
        onComplete={() => {
          setShowMoodPrompt(false);
          onComplete();
        }}
      />
    </View>
  );
}

export default React.memo(TrainingSessionView);
