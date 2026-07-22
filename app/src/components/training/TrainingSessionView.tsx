// Training Session View - Active workout interface
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, ScrollView, Alert, AppState, useWindowDimensions, Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { Button, Card, Dialog, Portal, Text, useTheme, ActivityIndicator, IconButton } from 'react-native-paper';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getTrainingSetLogs,
  getExerciseBestPerformance,
  getLastExercisePerformance,
  type TrainingSessionRow,
  type TrainingSessionItemRow,
  type TrainingSetLogRow,
  updateSessionCursorState,
  updateItemAutoregulationAdjustments,
} from '@/lib/api';
import {
  updateTrainingSessionItem,
  logTrainingEvent,
  deleteTrainingSession,
} from '@/data/TrainingRepository';
import { getLastPerformanceForExercise } from '@/lib/training/lastPerformance';
import { getExerciseById } from '@/lib/training/engine';
import { applyAutoregulation } from '@/lib/training/runtime';
import {
  isExerciseFullyLoggedForItem,
  getAdjustedSetParams,
  type LocalAdjustments,
} from '@/lib/training/sessionDerivedState';
import {
  deriveActiveWorkTarget,
  getFirstPendingSetIndexOnItem,
  getLoggedSetIndices,
  getPerformedSetsFromItem,
  isSetPerformedOnItem,
  resolveExerciseIndexFromSession,
  resolveNotificationPresentation,
} from '@/lib/training/sessionWorkAuthority';
import {
  freezeElapsedSecondsFromStartedAt,
  isSessionStaleForResume,
} from '@/lib/training/staleSessionGuard';
import { getStaleSessionThresholdMs, STALE_SESSION_HOURS } from '@/lib/training/sessionUiConstants';
import {
  patchSessionCursorInCache,
  patchSessionItemPerformedInCache,
} from '@/lib/training/sessionQueryPatch';
import { applySetCompletion, applySetSkip } from '@/lib/training/applySetCompletion';
import { applySetEdit } from '@/lib/training/applySetEdit';
import { finalizeTrainingSessionAndCleanup } from '@/lib/training/finalizeTrainingSession';
import { isSessionWorkComplete } from '@/lib/training/closeTrainingSession';
import { buildNotificationWorkChain } from '@/lib/training/trainingNotificationWorkPlan';
import {
  rescheduleGuidedTrainingPendingSetNotification,
  scheduleGuidedTrainingAfterSetPersist,
  scheduleGuidedTrainingNextSetFromDb,
  scheduleGuidedTrainingPromptForExerciseIndex,
  scheduleGuidedTrainingSessionStart,
} from '@/lib/training/scheduleGuidedTrainingAfterSetPersist';
import { mergePerformedSetSlices } from '@/lib/training/trainingSetCompletionMerge';
import { resolveRestPeriodAfterCompletingSet } from '@/lib/training/guidedPhoneRestTransition';
import { formatSessionHealthMetricsLine } from '@/lib/health/exerciseSessionWriter';
import ExerciseDetailsModal from './ExerciseDetailsModal';
import type { Exercise } from '@/lib/training/types';
import {
  evaluateGuidedExternalRestTransition,
  type GuidedExternalSetDonePayload,
} from '@/lib/training/guidedExternalSetDoneTransition';
import { takePendingGuidedExternalRest } from '@/lib/training/guidedPendingExternalRestStore';
import {
  startGuidedSessionRuntime,
  stopGuidedSessionRuntime,
} from '@/lib/training/guidedSessionRuntime';
import { traceGuidedTransition } from '@/lib/training/guidedTransitionTrace';
import { guidedNotificationOverlayChoice } from '@/lib/training/guidedNotificationRoute';
import type {
  DecisionTrace,
} from '@/lib/training/types';
import { useAppTheme } from '@/theme';
import { reclaimPrimaryCapsuleButton, reclaimTertiaryOutlineCapsuleButton } from '@/theme/reclaimVisualLanguage';
import {
  RECLAIM_SCREEN_HORIZONTAL,
  RECLAIM_SCREEN_SECTION_GAP,
  RECLAIM_SCREEN_TAB_BAR_INSET,
  RECLAIM_SCREEN_TOP_INSET,
} from '@/theme/reclaimScreenLayout';
import RestTimer from './RestTimer';
import { useRestCountdown } from './useRestCountdown';
import FullSessionPanel, { type ExerciseCompletionStatus } from './FullSessionPanel';
import PostSessionMoodPrompt from './PostSessionMoodPrompt';
import { MilestoneCelebrationModal } from '@/components/dashboard/MilestoneCelebrationModal';
import SetFocusOverlay from './SetFocusOverlay';
import SetFocusCard from './SetFocusCard';
import RestCountdownCard from './RestCountdownCard';
import ReplaceExerciseDialog from './ReplaceExerciseDialog';
import { logger } from '@/lib/logger';
import { clearIntent } from '@/lib/notifications/NotificationIntentStore';
import { clearTrainingIntentsForSession } from '@/lib/notifications/trainingNotificationScheduler';
import { ensureReclaimChannels, reconcileNotifications } from '@/lib/notifications/NotificationScheduler';
import { enqueueOperation, getQueueSize } from '@/lib/training/offlineQueue';
import { isNetworkAvailable } from '@/lib/training/offlineSync';
import {
  TRAINING_SESSION_BUFFER_WRITES_ENABLED,
  clearBufferedSessionWrites,
} from '@/lib/training/sessionWriteBuffer';
import { triggerLightHaptic } from '@/lib/haptics';
import { getUserSettings } from '@/lib/userSettings';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { getWeightStep } from '@/lib/training/progression';
import { FALLBACK_WEIGHT_INCREMENT_KG } from '@/lib/training/exerciseLoadingProfile';
import { formatWeight, formatReps } from './uiFormat';

function EditSetDialog({
  visible,
  setIndex,
  totalSets,
  initialWeight,
  initialReps,
  initialRpe,
  isUpdate,
  weightStep,
  onSave,
  onCancel,
  reduceMotion = false,
}: {
  visible: boolean;
  setIndex: number;
  totalSets: number;
  initialWeight: number;
  initialReps: number;
  initialRpe: number | null;
  isUpdate: boolean;
  /** Bar/machine step from catalog; dumbbells use 1 in parent. */
  weightStep: number;
  onSave: (weight: number, reps: number, rpe: number | null) => void;
  onCancel: () => void;
  reduceMotion?: boolean;
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
    <Modal visible={visible} transparent animationType={reduceMotion ? 'none' : 'fade'} onRequestClose={onCancel}>
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
              <IconButton
                icon="minus"
                mode="outlined"
                size={18}
                hitSlop={15}
                onPress={() => setWeight((w) => Math.max(0, w - weightStep))}
                accessibilityLabel={`Decrease weight by ${weightStep}`}
              />
              <View style={{ minWidth: 80, alignItems: 'center' }}>
                <Text variant="headlineSmall" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                  {formatWeight(weight)}
                </Text>
              </View>
              <IconButton
                icon="plus"
                mode="outlined"
                size={18}
                hitSlop={15}
                onPress={() => setWeight((w) => w + weightStep)}
                accessibilityLabel={`Increase weight by ${weightStep}`}
              />
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
              <IconButton icon="minus" mode="outlined" size={18} hitSlop={15} onPress={() => setReps((r) => Math.max(1, r - 1))} accessibilityLabel="Decrease reps" />
              <View style={{ minWidth: 50, alignItems: 'center' }}>
                <Text variant="headlineSmall" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                  {formatReps(reps)}
                </Text>
              </View>
              <IconButton icon="plus" mode="outlined" size={18} hitSlop={15} onPress={() => setReps((r) => r + 1)} accessibilityLabel="Increase reps" />
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
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant, marginBottom: appTheme.spacing.lg, lineHeight: 18 }}
            >
              RPE is “how hard that set felt” on a 6–10 scale (not a medical measure). Optional — leave unset if you
              prefer not to track it.
            </Text>

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
    sessionItemId?: string;
    exerciseId?: string;
    setIndex?: number;
    guidedExternalSetDone?: GuidedExternalSetDonePayload;
    /** @deprecated Notification hints only — position from sessionWorkAuthority */
    fromRestNextSet?: boolean;
  };
  onNotificationActionHandled?: () => void;
  onComplete: () => void;
  onCancel: () => void;
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

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  /** Phase 7: block live clock until user Resume/Discard on stale overnight sessions. */
  const [staleResumePrompt, setStaleResumePrompt] = useState<'unevaluated' | 'pending' | 'cleared'>(
    'unevaluated',
  );
  const [showFullSession, setShowFullSession] = useState(false);
  const [showMoodPrompt, setShowMoodPrompt] = useState(false);
  const [sessionCelebration, setSessionCelebration] = useState<{
    visible: boolean;
    micro?: { icon: 'dumbbell'; title: string; subtitle: string };
  }>({ visible: false });
  const [restTimer, setRestTimer] = useState<{ seconds: number; exerciseId: string } | null>(null);
  const [restTimerPaused, setRestTimerPaused] = useState(false);
  /** Wear Done durable drain when nav params never arrived. */
  const [drainedExternalRest, setDrainedExternalRest] = useState<GuidedExternalSetDonePayload | null>(null);
  const cursorRestRestoredRef = useRef(false);
  const restCompleteHandlerRef = useRef<(() => void) | null>(null);
  const restCountdown = useRestCountdown({
    targetSeconds: restTimer?.seconds ?? 0,
    isPaused: !restTimer || restTimerPaused,
    onComplete: () => restCompleteHandlerRef.current?.(),
  });
  const [showNotificationFocusOverlay, setShowNotificationFocusOverlay] = useState(false);
  const [pendingEditSetIndex, setPendingEditSetIndex] = useState<number | null>(null);
  const [showReplaceExerciseDialog, setShowReplaceExerciseDialog] = useState(false);
  const [selectedRpe, setSelectedRpe] = useState<number | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [offlineQueueSize, setOfflineQueueSize] = useState(0);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showCompleteSessionConfirm, setShowCompleteSessionConfirm] = useState(false);
  const [guidanceExercise, setGuidanceExercise] = useState<Exercise | null>(null);

  const restFinishNotificationIdRef = useRef<string | null>(null);
  const restFinishLogicalKeyRef = useRef<string | null>(null);
  const restStartNotifiedRef = useRef<string | null>(null);
  const appStateRef = useRef(AppState.currentState);
  
  const [localAdjustments, setLocalAdjustments] = useState<LocalAdjustments>({});
  const [lastAutoregulationMessage, setLastAutoregulationMessage] = useState<string | null>(null);
  
  // Idempotency guard for set logging (prevent double-submit)
  const loggingInFlight = useRef<Set<string>>(new Set());
  /** Allows last-set Done to call finish before handleComplete is declared in source order. */
  const handleCompleteRef = useRef<() => Promise<void>>(async () => {});
  /** Phase B: dedupe in-app rest UI apply for watch/notification SET_DONE (per idempotency key). */
  const externalRestUiAppliedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    externalRestUiAppliedRef.current.clear();
  }, [sessionId]);

  useEffect(() => {
    setStaleResumePrompt('unevaluated');
  }, [sessionId]);

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

  // Keep-awake while guided UI is mounted. FGS lives for the open session
  // (started here / at schedule start; stopped only on clear/finalize/stale).
  useEffect(() => {
    if (!shouldForceGuidedNotifications || isEnded) {
      stopGuidedSessionRuntime();
      if (isEnded) {
        void import('@/lib/training/guidedSessionFgs').then(({ stopGuidedSessionFgs }) =>
          stopGuidedSessionFgs('session_ended_ui'),
        );
      }
      return;
    }
    void startGuidedSessionRuntime(sessionId);
    return () => {
      // UI unmount / minimize: stop keep-awake only — do NOT kill FGS.
      stopGuidedSessionRuntime();
    };
  }, [shouldForceGuidedNotifications, isEnded, sessionId]);

  const startedAtMs = (session as any).started_at ? new Date((session as any).started_at).getTime() : null;
  const endedAtMs = optimisticEndedAt ? new Date(optimisticEndedAt).getTime() : (session as any).ended_at ? new Date((session as any).ended_at).getTime() : null;

  // Apply optimistic exercise ID overrides
  const itemsWithOverrides = useMemo(() => {
    return items.map((item) => ({
      ...item,
      exercise_id: exerciseIdOverrides[item.id] || item.exercise_id,
    }));
  }, [items, exerciseIdOverrides]);

  const currentExerciseIndex = useMemo(
    () => resolveExerciseIndexFromSession(itemsWithOverrides, session as TrainingSessionRow),
    [itemsWithOverrides, session],
  );

  const activeWorkTarget = useMemo(
    () => deriveActiveWorkTarget(itemsWithOverrides, currentExerciseIndex),
    [itemsWithOverrides, currentExerciseIndex],
  );

  const goToExerciseIndex = useCallback(
    async (index: number) => {
      const clamped = Math.min(Math.max(0, index), Math.max(0, itemsWithOverrides.length - 1));
      patchSessionCursorInCache(qc, sessionId, { current_exercise_index: clamped });
      await updateSessionCursorState(sessionId, { current_exercise_index: clamped }).catch((err) =>
        logger.debug('[SESSION_CURSOR] exercise index write failed', { err }),
      );
    },
    [itemsWithOverrides.length, qc, sessionId],
  );

  const jumpToExerciseIndex = useCallback(
    async (index: number) => {
      setRestTimer(null);
      setRestTimerPaused(false);
      await updateSessionCursorState(sessionId, {
        phase: 'work',
        rest_started_at: null,
        rest_ends_at: null,
      }).catch((err) => logger.debug('[SESSION_CURSOR] jump clear rest failed', { err }));
      await goToExerciseIndex(index);
      if (!shouldForceGuidedNotifications) return;
      try {
        await scheduleGuidedTrainingPromptForExerciseIndex(sessionId, itemsWithOverrides, index, {
          deferReconcile: false,
        });
      } catch (err) {
        logger.debug('[GUIDED_SCHEDULE] jump reschedule failed', { err });
      }
    },
    [goToExerciseIndex, itemsWithOverrides, sessionId, shouldForceGuidedNotifications],
  );

  const currentItem = itemsWithOverrides[currentExerciseIndex];

  const completedCount = useMemo(
    () => itemsWithOverrides.filter((item) => isExerciseFullyLoggedForItem(item)).length,
    [itemsWithOverrides],
  );
  const skippedCount = useMemo(() => itemsWithOverrides.filter((item) => item.skipped).length, [itemsWithOverrides]);

  const totalSetsLogged = useMemo(() => {
    let n = 0;
    for (const item of itemsWithOverrides) {
      if (item.skipped) continue;
      n += getLoggedSetIndices(item).length;
    }
    return n;
  }, [itemsWithOverrides]);

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
  // Timer should start when session is active, even if started_at is not yet set in DB.
  // Phase 7: while stale resume prompt is pending, hold a frozen elapsed value (no live interval).
  useEffect(() => {
    if (staleResumePrompt === 'unevaluated') return;

    if (staleResumePrompt === 'pending') {
      if (startedAtMs != null) {
        setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000)));
      }
      return;
    }

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
  }, [startedAtMs, endedAtMs, isEnded, staleResumePrompt]);

  // Phase 7 stale-session guard: evaluate when marked unevaluated.
  useEffect(() => {
    if (staleResumePrompt !== 'unevaluated') return;
    if (isEnded) {
      setStaleResumePrompt('cleared');
      return;
    }

    const startedAt = (session as any).started_at as string | null | undefined;
    const thresholdMs = getStaleSessionThresholdMs();
    const nowMs = Date.now();
    const stale = isSessionStaleForResume(startedAt, itemsWithOverrides, nowMs, thresholdMs);

    if (stale) {
      const frozen = freezeElapsedSecondsFromStartedAt(startedAt, nowMs);
      logger.debug('[STALE_SESSION] guard triggered — paused clock pending Resume/Save & close', {
        sessionId,
        startedAt,
        thresholdMs,
        staleSessionHours: STALE_SESSION_HOURS,
        frozenElapsedSeconds: frozen,
      });
      setElapsedSeconds(frozen);
      setStaleResumePrompt('pending');
    } else {
      setStaleResumePrompt('cleared');
    }
  }, [staleResumePrompt, isEnded, session, itemsWithOverrides, sessionId]);

  // Re-check staleness whenever the app returns to foreground (was mount-once before).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active' || isEnded) return;
      setStaleResumePrompt('unevaluated');
    });
    return () => sub.remove();
  }, [isEnded, sessionId]);

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

  // App background/foreground: cancel stale rest-finish intents in normal mode only.
  // Guided notifications are scheduled at persist via scheduleGuidedTrainingAfterSetPersist.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;
      if (nextState === 'active' && !shouldForceGuidedNotifications) {
        cancelRestFinishNotification().catch((e) => { if (__DEV__) logger.debug('[TrainingSessionView]', e); });
      }
    });
    return () => sub.remove();
  }, [cancelRestFinishNotification, shouldForceGuidedNotifications]);


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
  
  // Clear optimistic ended state when actual ended_at is set in prop
  useEffect(() => {
    if (optimisticEndedAt && (session as any).ended_at) {
      logger.debug('[SESSION_END_FLOW] Actual ended_at received, clearing optimistic state');
      setOptimisticEndedAt(null);
    }
  }, [(session as any).ended_at, optimisticEndedAt]);

  // Fire first-set notification + haptic once when guided session loads (DB-derived chain).
  useEffect(() => {
    if (
      !shouldForceGuidedNotifications ||
      !session ||
      firstSetNotifiedSessionRef.current === sessionId
    ) return;

    firstSetNotifiedSessionRef.current = sessionId;

    (async () => {
      const result = await scheduleGuidedTrainingSessionStart(sessionId, { deferReconcile: true });
      if (result.scheduled) {
        await reconcileNotifications();
        logger.debug('[TRAINING_NOTIF] First set scheduled from DB via unified session start', {
          sessionId,
          exerciseId: result.firstExerciseId,
          setIndex: result.firstSetIndex,
        });
      }
    })().catch((err) => logger.warn('[TRAINING_NOTIF] First set schedule failed', err));

    const hapticsEnabled = userSettingsQ.data?.hapticsEnabled ?? true;
    triggerLightHaptic({
      enabled: hapticsEnabled,
      reduceMotion,
      style: 'success',
    }).catch((e) => { if (__DEV__) logger.debug('[TrainingSessionView]', e); });
  }, [
    shouldForceGuidedNotifications,
    session,
    sessionId,
    userSettingsQ.data?.hapticsEnabled,
    reduceMotion,
  ]);

  const handleSetComplete = useCallback(
    async (setIndex: number, weight: number, reps: number, rpe?: number) => {
      if (!currentItem) return;
      if (isEnded) {
        Alert.alert('Session completed', 'This session is already completed. Start a new session to log more sets.');
        return;
      }

      logger.debug('[SET_DONE_FLOW] Done pressed', { exerciseId: currentItem.exercise_id, setIndex, weight, reps, rpe });

      const logKey = `${currentItem.id}_${setIndex}`;
      if (loggingInFlight.current.has(logKey)) {
        logger.warn('[SET_DONE_FLOW] Duplicate prevented', { exerciseId: currentItem.exercise_id, setIndex });
        return;
      }
      loggingInFlight.current.add(logKey);
      let startedInAppRestForCompletedSet = false;

      try {
        logger.debug('[SET_DONE_FLOW] Handler called', { itemId: currentItem.id, setIndex });

        // Compute autoregulation if RPE provided
        if (rpe !== undefined) {
          const planned = currentItem.planned?.sets ?? [];
          const currentPlanned = planned.find(s => s.setIndex === setIndex);
          if (currentPlanned) {
            const allLogged = getPerformedSetsFromItem(currentItem);
            const autoregResult = applyAutoregulation({
              exerciseId: currentItem.exercise_id,
              currentSetIndex: setIndex,
              currentSetRpe: rpe,
              currentSetReps: reps,
              currentSetWeight: weight,
              targetReps: currentPlanned.targetReps ?? reps,
              suggestedWeight: currentPlanned.suggestedWeight ?? weight,
              previousSets: allLogged.map(s => ({
                id: `${currentItem.id}_set_${s.setIndex}`,
                exerciseId: currentItem.exercise_id,
                sessionItemId: currentItem.id,
                setIndex: s.setIndex,
                weight: s.weight ?? 0,
                reps: s.reps,
                rpe: s.rpe,
                completedAt: s.completedAt,
              })),
              plannedSets: planned.map(s => ({
                setIndex: s.setIndex,
                targetReps: s.targetReps,
                suggestedWeight: s.suggestedWeight,
                restSeconds: s.restSeconds,
              })),
            });
            if (autoregResult.adjustment) {
              const adj = {
                weightDelta: autoregResult.adjustment.weightDelta ?? 0,
                repsDelta: autoregResult.adjustment.targetRepsDelta ?? 0,
                reason: autoregResult.adjustment.ruleId ?? 'rpe',
              };
              const nextSetIdx = setIndex + 1;
              setLocalAdjustments(prev => ({
                ...prev,
                [currentItem.id]: {
                  ...(prev[currentItem.id] ?? {}),
                  [nextSetIdx]: adj,
                },
              }));
              updateItemAutoregulationAdjustments(currentItem.id, nextSetIdx, adj)
                .catch(err => logger.debug('[SESSION] autoregulation DB write failed', { err }));
              setLastAutoregulationMessage(autoregResult.message);
            }
          }
        }

        const completedAt = new Date().toISOString();

        try {
          const { wroteOnline } = await applySetCompletion({
            sessionId,
            sessionItemId: currentItem.id,
            exerciseId: currentItem.exercise_id,
            setIndex,
            weight,
            reps,
            rpe,
            completedAt,
          });
          patchSessionItemPerformedInCache(qc, sessionId, currentItem.id, {
            setIndex,
            weight,
            reps,
            rpe,
            completedAt,
          });
          if (!wroteOnline) {
            setIsOffline(true);
            setOfflineQueueSize((prev) => prev + 1);
          }
          loggingInFlight.current.delete(logKey);
          qc.invalidateQueries({ queryKey: ['training:set_logs', currentItem.id] });
          logger.debug('[SET_DONE_FLOW] Set completion applied', { setIndex, wroteOnline });
        } catch (persistError: any) {
          logger.warn('[SET_DONE_FLOW] Persist failed', persistError);
          qc.invalidateQueries({ queryKey: ['training:session', sessionId] });
          Alert.alert('Warning', 'Set could not be saved. Please try again.');
          loggingInFlight.current.delete(logKey);
          return;
        }

        const plannedSets = currentItem.planned?.sets || [];
        const hasNextSet = plannedSets.some((s: { setIndex: number }) => s.setIndex === setIndex + 1);
        const nextItemAfter = itemsWithOverrides[currentExerciseIndex + 1];
        const hasNextExercise = !hasNextSet && !!nextItemAfter && !nextItemAfter.skipped;
        const betweenExerciseRestSeconds =
          (plannedSets[plannedSets.length - 1] as { restSeconds?: number })?.restSeconds ?? 90;

        // Shared completeness (all pending work gone) — not adjacent-item only.
        const sessionDataAfter =
          qc.getQueryData<{ session: TrainingSessionRow; items: TrainingSessionItemRow[] }>([
            'training:session',
            sessionId,
          ]);
        const itemsForCompleteCheck = sessionDataAfter?.items ?? itemsWithOverrides;
        if (isSessionWorkComplete(itemsForCompleteCheck)) {
          logger.debug('[SET_DONE_FLOW] session work complete — confirm finish', { sessionId, setIndex });
          setShowCompleteSessionConfirm(true);
          loggingInFlight.current.delete(logKey);
          return;
        }

        const restPeriod = resolveRestPeriodAfterCompletingSet(
          plannedSets as { setIndex: number; restSeconds?: number }[],
          setIndex,
          rpe,
          { hasNextExercise, betweenExerciseRestSeconds },
        );
        if (restPeriod) {
          startedInAppRestForCompletedSet = true;
          const restAdjustment = restPeriod;
          setRestTimer({ seconds: restAdjustment.restSeconds, exerciseId: currentItem.id });
          updateSessionCursorState(sessionId, {
            phase: 'rest',
            rest_started_at: new Date().toISOString(),
            rest_ends_at: new Date(Date.now() + restAdjustment.restSeconds * 1000).toISOString(),
          }).catch(err => logger.debug('[SESSION_CURSOR] rest start write failed', { err }));
          if (shouldForceGuidedNotifications) {
            if (__DEV__) {
              logger.debug('[NOTIF_MODE_DECISION]', {
                shouldForceGuidedNotifications,
                effectiveNotificationMode,
                appState: AppState.currentState,
              });
            }
            try {
              await scheduleGuidedTrainingAfterSetPersist(
                {
                  sessionId,
                  completedSessionItemId: currentItem.id,
                  completedSetIndex: setIndex,
                  rpe,
                },
                { deferReconcile: true },
              );
              restStartNotifiedRef.current = null;
              await reconcileNotifications();
            } catch (scheduleErr) {
              logger.warn('[SET_DONE_FLOW] unified schedule failed', scheduleErr);
            }
          }
          if (restAdjustment.adjustment !== 'normal' && rpe !== undefined) {
            setLastAutoregulationMessage(restAdjustment.message);
          }
        }

        const nextSetIndex = setIndex + 1;
        const hasAnotherSetOnExercise = plannedSets.some((s: any) => s.setIndex === nextSetIndex);
        if (!hasAnotherSetOnExercise) {
          setTimeout(() => {
            setLastAutoregulationMessage(null);
          }, 5000);
        }
      } catch (error: any) {
        logger.error('[SET_DONE_FLOW] Failed to log set', error);
        if (startedInAppRestForCompletedSet) {
          setRestTimer(null);
          restStartNotifiedRef.current = null;
          void cancelRestFinishNotification();
          updateSessionCursorState(sessionId, { phase: 'work', rest_started_at: null, rest_ends_at: null })
            .catch(err => logger.debug('[SESSION_CURSOR] rest end write failed', { err }));
        }
        qc.invalidateQueries({ queryKey: ['training:session', sessionId] });
        Alert.alert('Error', error?.message || 'Failed to log set');
        // Remove from in-flight set on error
        loggingInFlight.current.delete(logKey);
      }
      // Note: logKey removal is handled in try/catch blocks above (immediate removal on success/error)
    },
    [currentItem, qc, sessionId, isEnded, itemsWithOverrides, currentExerciseIndex, shouldForceGuidedNotifications, effectiveNotificationMode, cancelRestFinishNotification],
  );

  // Handle set update (editing without marking done)
  const handleSetUpdate = useCallback(
    async (setIndex: number, weight: number, reps: number, rpe?: number) => {
      if (!currentItem) return;
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
          await handleSetComplete(setIndex, weight, reps, rpe);
          loggingInFlight.current.delete(logKey);
          return;
        }

        try {
          const { wroteOnline } = await applySetEdit({
            sessionId,
            sessionItemId: currentItem.id,
            exerciseId: currentItem.exercise_id,
            setIndex,
            setLogId: existingLog.id,
            weight,
            reps,
            rpe,
            completedAt: existingLog.completed_at,
          });

          patchSessionItemPerformedInCache(qc, sessionId, currentItem.id, {
            setIndex,
            weight,
            reps,
            rpe,
            completedAt: existingLog.completed_at,
          });

          if (!wroteOnline) {
            setIsOffline(true);
            setOfflineQueueSize((prev) => prev + 1);
          }

          qc.invalidateQueries({ queryKey: ['training:set_logs', currentItem.id] });
        } catch (persistError: any) {
          logger.warn('Failed to update set log', persistError);
          Alert.alert('Warning', 'Set update failed. Will retry when online.');
        }

        loggingInFlight.current.delete(logKey);
      } catch (error: any) {
        logger.warn('Failed to update set', error);
        Alert.alert('Error', error?.message || 'Failed to update set');
        loggingInFlight.current.delete(logKey);
      }
    },
    [currentItem, setLogsQ.data, qc, sessionId, isEnded, handleSetComplete],
  );

  // Handle exercise replacement (session or program scope)
  const handleReplaceExercise = useCallback(
    async ({ newExerciseId, scope }: { newExerciseId: string; scope: 'session' | 'program' }) => {
      if (!currentItem) return;

      const oldExerciseId = currentItem.exercise_id;
      const rawSets = currentItem.planned?.sets ?? [];
      const newExercise = getExerciseById(newExerciseId);
      const newIntents = (newExercise?.intents ?? currentItem.planned?.intents ?? []).map(String);
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

      const nextPlanned: TrainingSessionItemRow['planned'] = {
        sets: newPlannedSets,
        priority: currentItem.planned?.priority ?? 'secondary',
        intents: newIntents,
        decisionTrace: {
          ...(currentItem.planned?.decisionTrace ?? {}),
          replacedFrom: oldExerciseId,
          replacedAt: new Date().toISOString(),
        },
      };

      logger.debug('[REPLACE_EX] Starting', {
        oldId: oldExerciseId,
        newId: newExerciseId,
        scope,
        itemId: currentItem.id,
        intents: newIntents,
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
            item.id === currentItem.id
              ? { ...item, exercise_id: newExerciseId, planned: nextPlanned }
              : item,
          );
          qc.setQueryData(sessionQueryKey, {
            ...currentSessionData,
            items: updatedItems,
          });
        }

        if (scope === 'session') {
          await updateTrainingSessionItem(currentItem.id, {
            exercise_id: newExerciseId,
            planned: nextPlanned,
          });
          logger.debug('[REPLACE_EX] Session done', { itemId: currentItem.id });

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
          await updateTrainingSessionItem(currentItem.id, {
            exercise_id: newExerciseId,
            planned: nextPlanned,
          });
          logger.debug('[REPLACE_EX] Program done', {
            itemId: currentItem.id,
            programDayId,
          });

          await qc.invalidateQueries({ queryKey: ['training:session', sessionId] });
          await qc.invalidateQueries({ queryKey: ['training:programDays'] });
        }

        // Rebind lock-screen / Wear prompt to the new exercise (same path as Full Plan jump).
        if (shouldForceGuidedNotifications) {
          const refreshed = qc.getQueryData<{ session: TrainingSessionRow; items: TrainingSessionItemRow[] }>(
            sessionQueryKey,
          );
          const itemsForPrompt = (refreshed?.items ?? itemsWithOverrides).map((item) =>
            item.id === currentItem.id ? { ...item, exercise_id: newExerciseId } : item,
          );
          await scheduleGuidedTrainingPromptForExerciseIndex(
            sessionId,
            itemsForPrompt,
            currentExerciseIndex,
          );
          await reconcileNotifications();
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
    [
      currentItem,
      session,
      sessionId,
      qc,
      sessionData,
      shouldForceGuidedNotifications,
      itemsWithOverrides,
      currentExerciseIndex,
    ],
  );

  const handleComplete = useCallback(async () => {
    if (isEnded) {
      onComplete();
      return;
    }
    if (isFinalizing) return;

    logger.debug('[SESSION_END_FLOW] Finish pressed', { sessionId, totalSetsLogged });
    setIsFinalizing(true);

    try {
      logger.debug('[SESSION_END_FLOW] Handler called', { sessionId });

      const endedAtIso = new Date().toISOString();
      setOptimisticEndedAt(endedAtIso);
      logger.debug('[SESSION_END_FLOW] Optimistic ended state set', { endedAt: endedAtIso });

      const finalizeResult = await finalizeTrainingSessionAndCleanup({
        sessionId,
        items: itemsWithOverrides,
        startedAt: sessionData.session.started_at,
        flushWriteBuffer: true,
      });

      if (finalizeResult.bufferFlushFailed) {
        Alert.alert(
          'Some sets queued for retry',
          'A few set logs could not sync right now. They were kept locally and will retry automatically.',
        );
      }

      logger.debug('[SESSION_END_FLOW] Session finalized', {
        sessionId,
        endedAt: finalizeResult.endedAt,
        wroteOnline: finalizeResult.wroteOnline,
      });

      await qc.invalidateQueries({ queryKey: ['training:session', sessionId] });
      await qc.invalidateQueries({ queryKey: ['training:sessions'] });
      await qc.invalidateQueries({ queryKey: ['training:sessions:analytics'] });
      logger.debug('[SESSION_END_FLOW] Queries invalidated', { sessionId });

      setSessionCelebration({
        visible: true,
        micro: {
          icon: 'dumbbell',
          title: 'Session complete',
          subtitle: finalizeResult.pendingClose
            ? 'Saved on this device — will sync when you’re online.'
            : formatSessionHealthMetricsLine({
                activeCaloriesKcal: finalizeResult.summary.activeCaloriesKcal as number | undefined,
                avgHeartRateBpm: finalizeResult.summary.avgHeartRateBpm as number | undefined,
                durationMinutes: finalizeResult.summary.durationMinutes as number | undefined,
              }) ?? 'Your workout is saved — rest and recover.',
        },
      });

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
  }, [isEnded, isFinalizing, sessionId, sessionData.session.started_at, itemsWithOverrides, qc, onComplete, totalSetsLogged]);

  handleCompleteRef.current = handleComplete;

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
              await clearTrainingIntentsForSession(sessionId);
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
      setLastAutoregulationMessage(null);
      void goToExerciseIndex(currentExerciseIndex + 1);
    } else {
      Alert.alert('Complete session?', 'Finish this training session? You can review it in History.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Complete', style: 'default', onPress: () => void handleComplete() },
      ]);
    }
  }, [currentExerciseIndex, itemsWithOverrides.length, handleComplete, goToExerciseIndex]);

  const handleSkip = useCallback(async () => {
    if (!currentItem) return;
    if (isEnded) {
      Alert.alert('Session completed', 'This session is already completed.');
      return;
    }

    const currentPlannedSets = currentItem.planned?.sets ?? [];
    const exerciseId = currentItem.exercise_id;
    const logged = getLoggedSetIndices(currentItem);
    const setIndex = logged.length > 0 ? Math.max(...logged) + 1 : 1;

    try {
      const now = new Date().toISOString();
      await applySetSkip({
        sessionId,
        sessionItemId: currentItem.id,
        exerciseId,
        setIndex,
        completedAt: now,
      });
      patchSessionItemPerformedInCache(qc, sessionId, currentItem.id, {
        setIndex,
        weight: 0,
        reps: 0,
        completedAt: now,
      });

      if (shouldForceGuidedNotifications) {
        try {
          await scheduleGuidedTrainingAfterSetPersist(
            {
              sessionId,
              completedSessionItemId: currentItem.id,
              completedSetIndex: setIndex,
            },
            { deferReconcile: true },
          );
          await reconcileNotifications();
        } catch (scheduleErr) {
          logger.warn('[SKIP_SET] unified schedule failed', scheduleErr);
        }
      }

      qc.invalidateQueries({ queryKey: ['training:set_logs', currentItem.id] });
      const performedAfterSkip = new Set([...getLoggedSetIndices(currentItem), setIndex]);
      const allPlannedDone = currentPlannedSets.every((p: { setIndex: number }) =>
        performedAfterSkip.has(p.setIndex),
      );

      if (allPlannedDone) {
        setLastAutoregulationMessage(null);
        const nextItemAfter = itemsWithOverrides[currentExerciseIndex + 1];
        if (nextItemAfter && !nextItemAfter.skipped) {
          const lastSet = currentPlannedSets[currentPlannedSets.length - 1];
          const restSecs = (lastSet as { restSeconds?: number })?.restSeconds ?? 90;
          setRestTimer({ seconds: restSecs, exerciseId: currentItem.id });
          updateSessionCursorState(sessionId, {
            phase: 'rest',
            rest_started_at: new Date().toISOString(),
            rest_ends_at: new Date(Date.now() + restSecs * 1000).toISOString(),
          }).catch((err) => logger.debug('[SESSION_CURSOR] skip rest start failed', { err }));
        } else {
          handleNext();
        }
      }
    } catch (error: any) {
      logger.warn('[SKIP_SET] Failed', error);
      Alert.alert('Error', error?.message || 'Failed to skip set');
    }
  }, [currentItem, sessionId, isEnded, handleNext, qc, shouldForceGuidedNotifications, currentExerciseIndex, itemsWithOverrides]);

  // Auto-advance: when rest timer ends and all sets for the current exercise are done,
  // move to next exercise automatically. Also clear RPE selection on exercise change.
  const autoAdvanceAfterRest = useCallback(() => {
    if (!currentItem || isEnded) return;
    const allDone = isExerciseFullyLoggedForItem(currentItem);
    if (allDone) {
      handleNext();
    }
    setSelectedRpe(null);
  }, [currentItem, isEnded, handleNext]);

  restCompleteHandlerRef.current = useCallback(() => {
    setRestTimer(null);
    setRestTimerPaused(false);
    restStartNotifiedRef.current = null;
    cancelRestFinishNotification().catch((e) => { if (__DEV__) logger.debug('[TrainingSessionView]', e); });
    updateSessionCursorState(sessionId, { phase: 'work', rest_started_at: null, rest_ends_at: null })
      .catch(err => logger.debug('[SESSION_CURSOR] rest end write failed', { err }));
    autoAdvanceAfterRest();
  }, [autoAdvanceAfterRest, cancelRestFinishNotification, sessionId]);

  // Guided watch / notification SET_DONE — mirror phone WORK → REST → NEXT WORK (Phase B)
  useEffect(() => {
    const ext = notificationAction?.guidedExternalSetDone ?? drainedExternalRest;
    if (!ext) return;
    if (notificationAction?.guidedExternalSetDone && notificationAction.sessionId && notificationAction.sessionId !== sessionId) {
      onNotificationActionHandled?.();
      return;
    }
    if (!shouldForceGuidedNotifications) {
      onNotificationActionHandled?.();
      setDrainedExternalRest(null);
      return;
    }
    if (externalRestUiAppliedRef.current.has(ext.idempotencyKey)) {
      onNotificationActionHandled?.();
      setDrainedExternalRest(null);
      return;
    }

    const evalResult = evaluateGuidedExternalRestTransition({
      items: itemsWithOverrides,
      payload: ext,
    });
    if (!evalResult.accept) {
      if (__DEV__) {
        logger.debug('[GUIDED_EXTERNAL_REST] rejected', { reason: evalResult.reason, ...ext });
      }
      traceGuidedTransition({
        source: 'ui',
        action: 'EXTERNAL_REST_REJECT',
        sessionId,
        rejectionReason: evalResult.reason,
        sessionItemId: ext.completedSessionItemId,
        exerciseId: ext.completedExerciseId,
        setIndex: ext.completedSetIndex,
        note: 'evaluateGuidedExternalRestTransition',
      });
      onNotificationActionHandled?.();
      return;
    }

    const completedIdx = itemsWithOverrides.findIndex((i) => i.id === ext.completedSessionItemId);
    if (completedIdx < 0) {
      onNotificationActionHandled?.();
      return;
    }

    const completedItem = itemsWithOverrides[completedIdx];
    if (!isSetPerformedOnItem(completedItem, ext.completedSetIndex)) {
      patchSessionItemPerformedInCache(qc, sessionId, completedItem.id, {
        setIndex: ext.completedSetIndex,
        weight: ext.weight,
        reps: ext.reps,
        completedAt: ext.completedAtIso,
      });
    }

    void goToExerciseIndex(completedIdx);
    externalRestUiAppliedRef.current.add(ext.idempotencyKey);

    traceGuidedTransition({
      source: 'ui',
      action: 'EXTERNAL_REST_APPLY',
      sessionId,
      sessionItemId: ext.completedSessionItemId,
      exerciseId: ext.completedExerciseId,
      setIndex: ext.completedSetIndex,
      restSeconds: ext.restSecondsAfterCompleted,
      nextCurrentSetIndex: ext.nextSetIndex,
      note: 'guided_external_set_done',
    });

    if (ext.restSecondsAfterCompleted <= 0) {
      const presentation = resolveNotificationPresentation(itemsWithOverrides, completedIdx, {
        sessionItemId: ext.nextSessionItemId,
        exerciseId: ext.nextExerciseId,
        setIndex: ext.nextSetIndex,
      });
      void goToExerciseIndex(presentation.cursorExerciseIndex);

      const work = presentation.work;
      const alreadyPerformed =
        work != null && isSetPerformedOnItem(itemsWithOverrides[work.exerciseIndex], work.setIndex);

      if (ext.suppressDuplicateCompletionOverlay === false && work && !alreadyPerformed) {
        setShowNotificationFocusOverlay(true);
        traceGuidedTransition({
          source: 'ui',
          action: 'OVERLAY_OPEN',
          sessionId,
          sessionItemId: work.sessionItemId,
          exerciseId: work.exerciseId,
          setIndex: work.setIndex,
          overlayOpened: true,
          note: 'suppressDuplicateCompletionOverlay_false',
        });
      } else {
        traceGuidedTransition({
          source: 'ui',
          action: 'OVERLAY_SUPPRESS',
          overlayOpened: false,
          overlaySuppressReason: 'external_set_done_authoritative',
          sessionId,
          sessionItemId: work?.sessionItemId,
          exerciseId: work?.exerciseId,
          setIndex: work?.setIndex,
        });
      }
      onNotificationActionHandled?.();
      return;
    }

    const patchedAfterComplete = itemsWithOverrides.map((item) => {
      if (item.id !== ext.completedSessionItemId) return item;
      const merged = mergePerformedSetSlices(item.performed?.sets ?? [], [
        {
          setIndex: ext.completedSetIndex,
          weight: ext.weight,
          reps: ext.reps,
          completedAt: ext.completedAtIso,
        },
      ]);
      return { ...item, performed: { sets: merged } };
    });
    const workChain = buildNotificationWorkChain(patchedAfterComplete);
    if (!workChain.next) {
      logger.warn('[GUIDED_EXTERNAL_REST] missing rest context');
      externalRestUiAppliedRef.current.delete(ext.idempotencyKey);
      onNotificationActionHandled?.();
      return;
    }

    restStartNotifiedRef.current = null;
    setRestTimer({ seconds: ext.restSecondsAfterCompleted, exerciseId: ext.completedSessionItemId });
    setRestTimerPaused(false);
    updateSessionCursorState(sessionId, {
      phase: 'rest',
      rest_started_at: new Date().toISOString(),
      rest_ends_at: new Date(Date.now() + ext.restSecondsAfterCompleted * 1000).toISOString(),
    }).catch(err => logger.debug('[SESSION_CURSOR] rest start write failed', { err }));

    traceGuidedTransition({
      source: 'ui',
      action: 'REST_START',
      sessionId,
      sessionItemId: ext.completedSessionItemId,
      exerciseId: ext.completedExerciseId,
      setIndex: ext.completedSetIndex,
      restSeconds: ext.restSecondsAfterCompleted,
      note: 'external_guided_rest_timer',
    });

    setDrainedExternalRest(null);
    onNotificationActionHandled?.();
  }, [
    notificationAction,
    drainedExternalRest,
    sessionId,
    shouldForceGuidedNotifications,
    itemsWithOverrides,
    qc,
    goToExerciseIndex,
    onNotificationActionHandled,
  ]);

  // Drain durable Wear Done rest if nav params never landed.
  useEffect(() => {
    let cancelled = false;
    void takePendingGuidedExternalRest(sessionId).then((payload) => {
      if (cancelled || !payload) return;
      logger.debug('[GUIDED_PENDING_REST] drained into session view', {
        sessionId,
        idempotencyKey: payload.idempotencyKey,
      });
      setDrainedExternalRest(payload);
    });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // Restore rest countdown from DB cursor when Wear Done wrote rest_* but UI never applied.
  useEffect(() => {
    if (cursorRestRestoredRef.current) return;
    if (restTimer) return;
    if (drainedExternalRest || notificationAction?.guidedExternalSetDone) return;
    if (staleResumePrompt === 'unevaluated' || staleResumePrompt === 'pending') return;
    if (!shouldForceGuidedNotifications) return;
    const phase = (session as TrainingSessionRow).phase;
    const endsAt = (session as TrainingSessionRow).rest_ends_at;
    if (phase !== 'rest' || !endsAt) return;
    const remaining = Math.ceil((Date.parse(endsAt) - Date.now()) / 1000);
    if (!Number.isFinite(remaining) || remaining <= 0) return;
    cursorRestRestoredRef.current = true;
    const item = itemsWithOverrides[currentExerciseIndex];
    setRestTimer({ seconds: remaining, exerciseId: item?.id ?? '' });
    setRestTimerPaused(false);
    logger.debug('[GUIDED_EXTERNAL_REST] restored from session cursor', { sessionId, remaining });
  }, [
    restTimer,
    drainedExternalRest,
    notificationAction?.guidedExternalSetDone,
    staleResumePrompt,
    shouldForceGuidedNotifications,
    session,
    itemsWithOverrides,
    currentExerciseIndex,
    sessionId,
  ]);

  // Clear RPE when exercise changes
  useEffect(() => {
    setSelectedRpe(null);
  }, [currentExerciseIndex]);

  // Compute completion statuses for FullSessionPanel
  const exerciseCompletionStatuses = useMemo<ExerciseCompletionStatus[]>(() => {
    return itemsWithOverrides.map((item) => {
      const totalSets = item.planned?.sets?.length ?? 0;
      const logged = getLoggedSetIndices(item);
      return {
        exerciseId: item.exercise_id,
        completedSets: logged.length,
        totalSets,
        skipped: !!item.skipped,
      };
    });
  }, [itemsWithOverrides]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const plannedSets = currentItem?.planned?.sets || [];
  const performedSets = useMemo(() => {
    if (!currentItem) return [];
    return getPerformedSetsFromItem(currentItem);
  }, [currentItem]);

  const firstPendingSetIndex = useMemo(() => {
    if (!currentItem) return null;
    return getFirstPendingSetIndexOnItem(currentItem);
  }, [currentItem]);

  const overlayWorkTarget = useMemo(() => {
    if (!showNotificationFocusOverlay || !activeWorkTarget) return null;
    return activeWorkTarget;
  }, [showNotificationFocusOverlay, activeWorkTarget]);

  const overlayItem = overlayWorkTarget
    ? itemsWithOverrides[overlayWorkTarget.exerciseIndex]
    : null;

  // Notification actions: focus or edit the requested set (skip when Phase B external rest payload handles UX)
  useEffect(() => {
    if (!notificationAction) return;
    if (notificationAction.sessionId && notificationAction.sessionId !== sessionId) {
      onNotificationActionHandled?.();
      return;
    }
    if (notificationAction.guidedExternalSetDone) {
      return;
    }
    const presentation = resolveNotificationPresentation(itemsWithOverrides, currentExerciseIndex, {
      exerciseId: notificationAction.exerciseId,
      sessionItemId: notificationAction.sessionItemId,
      setIndex: notificationAction.setIndex,
    });
    const work = presentation.work;
    if (!work) {
      onNotificationActionHandled?.();
      return;
    }

    void goToExerciseIndex(presentation.cursorExerciseIndex);

    const workItem = itemsWithOverrides[work.exerciseIndex];
    const isActiveSetAlreadyPerformed = isSetPerformedOnItem(workItem, work.setIndex);
    const overlay = guidedNotificationOverlayChoice({
      action: notificationAction.action,
      fromRestNextSet: notificationAction.fromRestNextSet === true,
      isActiveSetAlreadyPerformed,
    });
    logger.debug('[GUIDED_MODAL]', {
      work,
      isActiveSetAlreadyPerformed,
      overlay,
    });
    if (overlay === 'edit') {
      setPendingEditSetIndex(work.setIndex);
    } else if (overlay === 'focus') {
      setShowNotificationFocusOverlay(true);
    }
    onNotificationActionHandled?.();
  }, [
    notificationAction,
    sessionId,
    itemsWithOverrides,
    currentExerciseIndex,
    goToExerciseIndex,
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

  const editDialogWeightStep = useMemo(() => {
    if (!exercise) return FALLBACK_WEIGHT_INCREMENT_KG;
    const eq = exercise.equipment || [];
    if (eq.some((e: string) => e.includes('dumbbell') || e === 'dumbbells')) return 1;
    return getWeightStep(exercise);
  }, [exercise]);

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
          paddingHorizontal: RECLAIM_SCREEN_HORIZONTAL,
          paddingTop: RECLAIM_SCREEN_TOP_INSET,
          // Sticky footer (Minimize / Finish confirm / Done) — tab-bar rhythm + safe area;
          // compact stacks CTAs — extra section gaps keep content clear of the footer.
          paddingBottom:
            RECLAIM_SCREEN_TAB_BAR_INSET +
            insets.bottom +
            RECLAIM_SCREEN_SECTION_GAP * (compactSessionLayout ? 4 : 1),
        }}
      >
        {/* Session header: live next-set pill is the header (no truncated title) */}
        <View style={{ marginBottom: appTheme.spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              {(() => {
                const isResting = !!(restTimer && restTimer.exerciseId === currentItem?.id);
                const targetItem =
                  activeWorkTarget != null ? itemsWithOverrides[activeWorkTarget.exerciseIndex] : null;
                const targetName = targetItem
                  ? getExerciseById(targetItem.exercise_id)?.name ?? 'Exercise'
                  : null;
                const pillText = isEnded
                  ? 'Session complete'
                  : activeWorkTarget && targetName
                    ? `${isResting ? 'Next' : 'Now'}: ${targetName} · Set ${activeWorkTarget.setIndex}`
                    : 'All sets logged';
                return (
                  <View
                    style={{
                      alignSelf: 'flex-start',
                      maxWidth: '100%',
                      height: 36,
                      borderRadius: 18,
                      paddingHorizontal: 14,
                      justifyContent: 'center',
                      backgroundColor: theme.colors.primaryContainer,
                    }}
                    accessibilityRole="header"
                    accessibilityLabel={pillText}
                  >
                    <Text
                      variant="titleSmall"
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      style={{ fontWeight: '700', color: theme.colors.onPrimaryContainer }}
                    >
                      {pillText}
                    </Text>
                  </View>
                );
              })()}
              {isEnded ? null : (
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                  Exercise {currentExerciseIndex + 1}/{itemsWithOverrides.length} · {completedCount} done
                  {skippedCount > 0 ? ` · ${skippedCount} skipped` : ''}
                </Text>
              )}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onSurface, fontVariant: ['tabular-nums'] }}>
                {formatTime(elapsedSeconds)}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 0 }}>
                <Button mode="text" compact onPress={() => setShowFullSession(true)} labelStyle={{ fontSize: 12 }}>
                  Full plan
                </Button>
                {!isEnded && exercise ? (
                  <Button
                    mode="text"
                    compact
                    onPress={() => setShowReplaceExerciseDialog(true)}
                    labelStyle={{ fontSize: 12 }}
                    accessibilityLabel="Replace exercise"
                  >
                    Swap exercise
                  </Button>
                ) : null}
              </View>
            </View>
          </View>

          {/* Session progress bar */}
          <View style={{ flexDirection: 'row', gap: 3, marginTop: appTheme.spacing.sm }}>
            {itemsWithOverrides.map((item, idx) => {
              const isCurrent = idx === currentExerciseIndex;
              const isDone =
                !item.skipped && isExerciseFullyLoggedForItem(item);
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

        {/* Session-complete summary (read-only from elapsed + items) */}
        {isEnded && (
          <Card
            mode="elevated"
            style={{
              backgroundColor: theme.colors.elevation.level1,
              borderRadius: appTheme.borderRadius.xl,
              marginBottom: appTheme.spacing.md,
            }}
            accessibilityLabel="Session summary"
          >
            <Card.Content style={{ gap: appTheme.spacing.sm }}>
              <Text
                variant="titleMedium"
                style={{ fontWeight: '700', color: theme.colors.onSurface, marginBottom: appTheme.spacing.xs }}
              >
                Session summary
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  Duration
                </Text>
                <Text
                  variant="bodyMedium"
                  style={{ fontWeight: '600', color: theme.colors.onSurface, fontVariant: ['tabular-nums'] }}
                >
                  {formatTime(elapsedSeconds)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  Sets completed
                </Text>
                <Text variant="bodyMedium" style={{ fontWeight: '600', color: theme.colors.onSurface }}>
                  {totalSetsLogged}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  Exercises completed
                </Text>
                <Text variant="bodyMedium" style={{ fontWeight: '600', color: theme.colors.onSurface }}>
                  {completedCount}
                  {itemsWithOverrides.length > 0 ? ` of ${itemsWithOverrides.length}` : ''}
                </Text>
              </View>
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
                    restStartNotifiedRef.current = null;
                    cancelRestFinishNotification().catch((e) => { if (__DEV__) logger.debug('[TrainingSessionView]', e); });
                    updateSessionCursorState(sessionId, { phase: 'work', rest_started_at: null, rest_ends_at: null })
                      .catch(err => logger.debug('[SESSION_CURSOR] rest end write failed', { err }));
                    if (shouldForceGuidedNotifications) {
                      void scheduleGuidedTrainingNextSetFromDb(sessionId, { deferReconcile: true })
                        .then(() => reconcileNotifications())
                        .catch((e) => { if (__DEV__) logger.debug('[TrainingSessionView] skip rest schedule failed', e); });
                    }
                    autoAdvanceAfterRest();
                  }}
                  onExtend={(seconds: number) => {
                    restCountdown.extend(seconds);
                    setRestTimer((prev) => (prev ? { ...prev, seconds: prev.seconds + seconds } : null));
                    if (shouldForceGuidedNotifications) {
                      const remaining = restCountdown.remaining + seconds;
                      void rescheduleGuidedTrainingPendingSetNotification(sessionId, remaining, {
                        deferReconcile: true,
                      })
                        .then((key) => {
                          restFinishLogicalKeyRef.current = key;
                          return reconcileNotifications();
                        })
                        .catch((e) => { if (__DEV__) logger.debug('[TrainingSessionView] rest extend reschedule failed', e); });
                    }
                  }}
                  onTogglePause={() => setRestTimerPaused((prev) => !prev)}
                />
              </>
            );
          }

          // Not resting — hide inline card when notification overlay owns focus
          if (showNotificationFocusOverlay) {
            return null;
          }

          const focusSet = (() => {
            if (firstPendingSetIndex != null) {
              const planned = plannedSets.find((s) => s.setIndex === firstPendingSetIndex);
              if (planned) {
                // Check for autoregulation adjustment
                const adjusted = getAdjustedSetParams(currentItem, planned.setIndex, localAdjustments);
                return {
                  setIndex: planned.setIndex,
                  weight: adjusted.weight,
                  reps: adjusted.reps,
                  restSeconds: planned.restSeconds ?? 90,
                  autoregMessage: adjusted.autoregMessage ?? lastAutoregulationMessage,
                };
              }
            }
            // Fallback: all sets done for this exercise
            return null;
          })();

          if (!focusSet) {
            return null;
          }

          if (!exercise) {
            return (
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, padding: 16 }}>
                Unknown exercise — jump or swap to continue.
              </Text>
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
              progressionReason={
                ((currentItem.planned as unknown) as { decisionTrace?: { progressionReason?: string } } | undefined)
                  ?.decisionTrace?.progressionReason ?? null
              }
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
              onGuidancePress={() => setGuidanceExercise(exercise)}
            />
          );
        })()}

        {/* Completed sets summary for current exercise (hidden once exercise is done — rest card takes over) */}
        {exercise && !isEnded && performedSets.length > 0 && !isExerciseFullyLoggedForItem(currentItem) && (
          <Card
            mode="elevated"
            style={{
              backgroundColor: theme.colors.elevation.level1,
              borderRadius: appTheme.borderRadius.xl,
              marginBottom: appTheme.spacing.md,
            }}
          >
            <Card.Content>
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: appTheme.spacing.xs }}>
                Logged sets
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: appTheme.spacing.sm }}>
                Tap a row to edit weight, reps, or RPE.
              </Text>
              {performedSets.map((s) => (
                <Pressable
                  key={s.setIndex}
                  onPress={() => setPendingEditSetIndex(s.setIndex)}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit set ${s.setIndex}`}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingVertical: 8,
                    paddingHorizontal: 4,
                    borderRadius: 8,
                    backgroundColor: pressed ? theme.colors.surfaceVariant : 'transparent',
                  })}
                >
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurface }}>
                    Set {s.setIndex}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                    {s.weight}kg × {s.reps}{s.rpe ? ` @ RPE ${s.rpe}` : ''}
                  </Text>
                </Pressable>
              ))}
            </Card.Content>
          </Card>
        )}

        {/* Set Focus Overlay (from notification deep-link) */}
        {overlayWorkTarget && overlayItem && (() => {
          const overlayExercise = getExerciseById(overlayWorkTarget.exerciseId);
          const overlayPlannedSets = overlayItem.planned?.sets ?? [];
          const focusedSet = overlayPlannedSets.find((s) => s.setIndex === overlayWorkTarget.setIndex);
          if (!focusedSet || !overlayExercise) return null;
          const focusedPerformed = isSetPerformedOnItem(overlayItem, overlayWorkTarget.setIndex);

          return (
            <SetFocusOverlay
              visible={showNotificationFocusOverlay}
              exerciseName={overlayExercise.name}
              setIndex={focusedSet.setIndex}
              totalSets={overlayPlannedSets.length}
              plannedWeight={focusedSet.suggestedWeight}
              plannedReps={focusedSet.targetReps}
              isCompleted={focusedPerformed}
              isResting={!!(restTimer && restTimer.exerciseId === overlayItem.id)}
              restRemaining={restTimer ? restCountdown.remaining : undefined}
              restPaused={restTimerPaused}
              reduceMotion={reduceMotion}
              onDone={() => {
                handleSetComplete(focusedSet.setIndex, focusedSet.suggestedWeight, focusedSet.targetReps);
                setShowNotificationFocusOverlay(false);
              }}
              onAdjust={() => {
                setShowNotificationFocusOverlay(false);
                setPendingEditSetIndex(focusedSet.setIndex);
              }}
              onStartRest={() => {
                setShowNotificationFocusOverlay(false);
                if (focusedSet.restSeconds && focusedSet.restSeconds > 0) {
                  setRestTimer({ seconds: focusedSet.restSeconds, exerciseId: overlayItem.id });
                  updateSessionCursorState(sessionId, {
                    phase: 'rest',
                    rest_started_at: new Date().toISOString(),
                    rest_ends_at: new Date(Date.now() + focusedSet.restSeconds * 1000).toISOString(),
                  }).catch((err) => logger.debug('[SESSION_CURSOR] rest start write failed', { err }));
                }
              }}
              onToggleRestPause={() => setRestTimerPaused((prev) => !prev)}
              onClose={() => {
                setShowNotificationFocusOverlay(false);
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
              weightStep={editDialogWeightStep}
              reduceMotion={reduceMotion}
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
        {isEnded ? (
          /* Complete state: single Done exits via Minimize/dismiss path (onCancel → Today) */
          <Button
            mode="contained"
            onPress={onCancel}
            buttonColor={theme.colors.primary}
            textColor={theme.colors.onPrimary}
            style={[{ minWidth: 0, alignSelf: 'stretch' }, primaryCapsule.style]}
            contentStyle={[primaryCapsule.contentStyle, { minHeight: 48 }]}
            labelStyle={[primaryCapsule.labelStyle, { color: theme.colors.onPrimary }]}
            accessibilityLabel="Done"
          >
            Done
          </Button>
        ) : (
          <>
            {/* Safe action first — full-width Minimize (session persists) */}
            <Button
              mode="contained"
              onPress={onCancel}
              buttonColor={theme.colors.primary}
              textColor={theme.colors.onPrimary}
              style={[{ minWidth: 0, alignSelf: 'stretch' }, primaryCapsule.style]}
              contentStyle={[primaryCapsule.contentStyle, { minHeight: 48 }]}
              labelStyle={[primaryCapsule.labelStyle, { color: theme.colors.onPrimary }]}
              accessibilityLabel="Minimize session"
            >
              Minimize
            </Button>
            {/* Finish demoted + confirm-gated — not stacked as equal peer to Minimize (B1-S-08) */}
            <View
              style={{
                marginTop: appTheme.spacing.md,
                paddingTop: appTheme.spacing.sm,
                borderTopWidth: 1,
                borderTopColor: theme.colors.outlineVariant,
                alignItems: 'stretch',
              }}
            >
              <Button
                mode="outlined"
                onPress={() => setShowFinishConfirm(true)}
                style={[{ minWidth: 0, alignSelf: 'stretch' }, tertiaryCapsule.style]}
                contentStyle={[tertiaryCapsule.contentStyle, { minHeight: 44 }]}
                labelStyle={tertiaryCapsule.labelStyle}
                disabled={isFinalizing}
                accessibilityLabel="Finish session"
              >
                {isFinalizing ? 'Finishing…' : 'Finish session'}
              </Button>
            </View>
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
          </>
        )}
      </View>

      <Portal>
        <Dialog
          visible={staleResumePrompt === 'pending'}
          dismissable={false}
          theme={
            reduceMotion
              ? { ...theme, animation: { scale: 0 } }
              : undefined
          }
          style={{
            borderRadius: appTheme.borderRadius.xl,
            backgroundColor: theme.colors.elevation.level3,
          }}
        >
          <Dialog.Title>Resume this session?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {`This session started ${
                (session as any).started_at
                  ? new Date((session as any).started_at).toLocaleString()
                  : 'earlier'
              }. The timer is paused until you choose. Resume continues with the live clock; Save & close finishes the session.`}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                logger.debug('[STALE_SESSION] Save & close chosen — Finish path', { sessionId });
                setStaleResumePrompt('cleared');
                void handleComplete();
              }}
              textColor={theme.colors.error}
              disabled={isFinalizing}
            >
              Save & close
            </Button>
            <Button
              onPress={() => {
                logger.debug('[STALE_SESSION] Resume chosen — live clock', { sessionId });
                setStaleResumePrompt('cleared');
              }}
              textColor={theme.colors.primary}
            >
              Resume
            </Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog
          visible={showCompleteSessionConfirm}
          dismissable={false}
          onDismiss={() => setShowCompleteSessionConfirm(false)}
          theme={
            reduceMotion
              ? { ...theme, animation: { scale: 0 } }
              : undefined
          }
          style={{
            borderRadius: appTheme.borderRadius.xl,
            backgroundColor: theme.colors.elevation.level3,
          }}
        >
          <Dialog.Title>Complete session?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              All planned sets are logged. Save and close this workout?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setShowCompleteSessionConfirm(false)}
              textColor={theme.colors.onSurfaceVariant}
              disabled={isFinalizing}
            >
              Not yet
            </Button>
            <Button
              onPress={() => {
                setShowCompleteSessionConfirm(false);
                void handleComplete();
              }}
              textColor={theme.colors.primary}
              disabled={isFinalizing}
            >
              {isFinalizing ? 'Saving…' : 'Save & close'}
            </Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog
          visible={showFinishConfirm}
          onDismiss={() => setShowFinishConfirm(false)}
          theme={
            reduceMotion
              ? { ...theme, animation: { scale: 0 } }
              : undefined
          }
          style={{
            borderRadius: appTheme.borderRadius.xl,
            backgroundColor: theme.colors.elevation.level3,
          }}
        >
          <Dialog.Title>Finish session?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Remaining sets will not be logged.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowFinishConfirm(false)}>Cancel</Button>
            <Button
              onPress={() => {
                setShowFinishConfirm(false);
                void handleComplete();
              }}
              textColor={theme.colors.primary}
            >
              Confirm
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <FullSessionPanel
        visible={showFullSession}
        exercises={plannedExercises as any}
        currentExerciseIndex={currentExerciseIndex}
        sessionLabel={sessionLabel}
        completionStatuses={exerciseCompletionStatuses}
        onGoToExercise={(index) => {
          setLastAutoregulationMessage(null);
          setSelectedRpe(null);
          void jumpToExerciseIndex(index);
        }}
        onClose={() => setShowFullSession(false)}
      />

      {exercise ? (
        <ReplaceExerciseDialog
          visible={showReplaceExerciseDialog}
          exercise={exercise}
          decisionTrace={
            ((currentItem.planned as unknown) as { decisionTrace?: DecisionTrace } | undefined)?.decisionTrace ?? null
          }
          onDismiss={() => setShowReplaceExerciseDialog(false)}
          onReplace={(p) => {
            setShowReplaceExerciseDialog(false);
            void handleReplaceExercise(p);
          }}
        />
      ) : null}

      <PostSessionMoodPrompt
        visible={showMoodPrompt}
        sessionId={sessionId}
        onComplete={() => {
          setShowMoodPrompt(false);
          onComplete();
        }}
      />
      <MilestoneCelebrationModal
        visible={sessionCelebration.visible}
        micro={sessionCelebration.micro}
        onDismiss={() => setSessionCelebration({ visible: false })}
      />
      <ExerciseDetailsModal
        visible={!!guidanceExercise}
        exercise={guidanceExercise}
        onDismiss={() => setGuidanceExercise(null)}
        guidanceOnly
      />
    </View>
  );
}

export default React.memo(TrainingSessionView);
