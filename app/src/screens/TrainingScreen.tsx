// Training Screen - Main entry point for training module
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, ScrollView, Alert, Linking, AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRoute, type RouteProp } from '@react-navigation/native';
import {
  Button,
  Card,
  Text,
  useTheme,
  ActivityIndicator,
  IconButton,
  Chip,
} from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { InformationalCard, ActionCard } from '@/components/ui';
import { FeatureCardHeader } from '@/components/ui/FeatureCardHeader';
import { useAppTheme } from '@/theme';
import {
  reclaimPrimaryCapsuleButton,
  reclaimTertiaryOutlineCapsuleButton,
  reclaimGhostCapsuleButton,
  reclaimUtilityCardSurface,
  reclaimGuidedActionCardShell,
} from '@/theme/reclaimVisualLanguage';
import { buildSessionFromProgramDay, getExerciseById } from '@/lib/training/engine';
import {
  createTrainingSession,
  createTrainingSessionItems,
  listTrainingSessions,
  getTrainingSession,
  getTrainingProfile,
  logTrainingEvent,
  getActiveProgramInstance,
  getProgramDays,
  updateTrainingSession,
  deleteTrainingSession,
} from '@/lib/api';
import { syncOfflineQueue } from '@/lib/training/offlineSync';
import { getQueueSize } from '@/lib/training/offlineQueue';
import { clearBufferedSessionWrites } from '@/lib/training/sessionWriteBuffer';
import TrainingSetupScreen from './training/TrainingSetupScreen';
import type { SessionPlan, SessionTemplate, MovementIntent } from '@/lib/training/types';
import { logger } from '@/lib/logger';
import TrainingSessionView from '@/components/training/TrainingSessionView';
import TrainingHistoryView from '@/components/training/TrainingHistoryView';
import SessionPreviewModal from '@/components/training/SessionPreviewModal';
import GuidedPrepScreen from '@/components/training/GuidedPrepScreen';
import WeekView from '@/components/training/WeekView';
import FourWeekPreview from '@/components/training/FourWeekPreview';
import TrainingAnalyticsScreen from './training/TrainingAnalyticsScreen';
import { getPrimaryIntentLabels } from '@/utils/trainingIntentLabels';
import type { DrawerParamList } from '@/navigation/types';
import { ensureReclaimChannels, reconcileNotifications } from '@/lib/notifications/NotificationScheduler';
import {
  scheduleTrainingFirstSet,
  type TrainingNotificationNext,
} from '@/lib/notifications/trainingNotificationScheduler';
import { clearIntentsByPrefix } from '@/lib/notifications/NotificationIntentStore';
import { getUserSettings, type GuidedPrepSeconds } from '@/lib/userSettings';
import { formatLocalDateYYYYMMDD } from '@/lib/training/dateUtils';
import {
  dismissTrainingFirstVisitGuide,
  isTrainingFirstVisitGuideDismissed,
} from '@/lib/firstRunGuide';
import { useAuth } from '@/providers/AuthProvider';
import { mergeHealthConnectActiveEnergyIntoTrainingSummary } from '@/lib/health/healthConnectService';
import {
  evaluateGuidedActiveSessionResume,
  GUIDED_SNAPSHOT_MAX_AGE_MS,
} from '@/lib/training/guidedActiveSessionResume';
import {
  loadGuidedActiveSessionSnapshot,
  clearGuidedActiveSessionSnapshot,
} from '@/lib/localData/guidedActiveSessionSnapshotRepository';

type Tab = 'today' | 'history';
/** Normalized action passed to TrainingSessionView; route param may also include 'next_set' (normalized to set_done). */
type TrainingNotificationAction = {
  action: 'set_done' | 'edit_set';
  sessionId?: string;
  exerciseId?: string;
  setIndex?: number;
  guidedExternalSetDone?: import('@/lib/training/guidedExternalSetDoneTransition').GuidedExternalSetDonePayload;
  /** TRAINING_REST NEXT_SET — normalized to set_done; prefer SetFocus over edit when performed state is stale */
  fromRestNextSet?: boolean;
};

// CRITICAL: Use local date formatting to prevent weekday drift in timezones ahead of UTC
// See dateUtils.ts for rationale
function toYMD(d: Date) {
  return formatLocalDateYYYYMMDD(d);
}

function startOfWeekMonday(dateIn: Date) {
  const date = new Date(dateIn);
  const day = date.getDay(); // 0=Sun..6=Sat
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Monday
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(dateIn: Date, days: number) {
  const d = new Date(dateIn);
  d.setDate(d.getDate() + days);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isPast(date: Date, today: Date): boolean {
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return dateDay < todayDay;
}

/**
 * Compute the first-set notification payload from a session plan.
 * Uses deterministic item IDs (sessionId_item_N) and linearises all planned sets
 * across exercises to compute up to 3 levels of lookahead.
 */
function computeFirstSetInfo(
  sessionId: string,
  plan: SessionPlan,
): Parameters<typeof scheduleTrainingFirstSet>[0] | null {
  const exercises = plan.exercises;
  if (!exercises?.length) return null;
  const ex0 = exercises[0];
  const sets0 = ex0.plannedSets ?? [];
  const set1 = sets0[0];
  if (!set1) return null;

  // Linearise all sets across exercises in order
  const allSets: Array<{ exIdx: number; si: number }> = [];
  for (let ei = 0; ei < exercises.length; ei++) {
    const eSets = exercises[ei].plannedSets ?? [];
    for (let si = 0; si < eSets.length; si++) {
      allSets.push({ exIdx: ei, si });
    }
  }

  const buildNext = (entry: { exIdx: number; si: number } | undefined): TrainingNotificationNext => {
    if (!entry) return null;
    const ex = exercises[entry.exIdx];
    if (!ex) return null;
    const s = (ex.plannedSets ?? [])[entry.si];
    if (!s) return null;
    const meta = getExerciseById(ex.exerciseId);
    return {
      sessionItemId: `${sessionId}_item_${entry.exIdx}`,
      exerciseId: ex.exerciseId,
      exerciseName: meta?.name ?? 'Exercise',
      setIndex: s.setIndex,
      suggestedWeight: s.suggestedWeight,
      targetReps: s.targetReps,
      restSeconds: s.restSeconds ?? 90,
    };
  };

  const ex0Meta = getExerciseById(ex0.exerciseId);
  return {
    sessionId,
    sessionItemId: `${sessionId}_item_0`,
    exerciseId: ex0.exerciseId,
    exerciseName: ex0Meta?.name ?? 'Exercise',
    setIndex: set1.setIndex,
    suggestedWeight: set1.suggestedWeight,
    targetReps: set1.targetReps,
    next: buildNext(allSets[1]),
    nextAfter: buildNext(allSets[2]),
    nextNextAfter: buildNext(allSets[3]),
  };
}

/** End & save from alerts: same HC active-calorie merge as the full session finish flow. */
async function endInProgressSessionWithOptionalEnergySummary(session: {
  id: string;
  started_at: string | null;
  summary?: Record<string, any> | null;
}): Promise<void> {
  const endedAt = new Date().toISOString();
  const summary = await mergeHealthConnectActiveEnergyIntoTrainingSummary(
    session.started_at,
    endedAt,
    session.summary ?? null,
  );
  await updateTrainingSession(session.id, {
    endedAt,
    ...(Object.keys(summary).length > 0 ? { summary } : {}),
  });
}

export default function TrainingScreen() {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const utilitySurface = useMemo(() => reclaimUtilityCardSurface(appTheme, 'journey'), [appTheme]);
  const primaryCapsule = useMemo(() => reclaimPrimaryCapsuleButton(appTheme), [appTheme]);
  const tertiaryCapsule = useMemo(() => reclaimTertiaryOutlineCapsuleButton(appTheme), [appTheme]);
  const ghostCapsule = useMemo(() => reclaimGhostCapsuleButton(appTheme), [appTheme]);
  const guidedShell = useMemo(() => reclaimGuidedActionCardShell(appTheme), [appTheme]);
  const qc = useQueryClient();
  const route = useRoute<RouteProp<DrawerParamList, 'Training'>>();
  const { session } = useAuth();

  // Bucket 2: Entry chain marker - TrainingScreen mount
  useEffect(() => {
    logger.debug(`[ENTRY_CHAIN] TrainingScreen mounted`);
  }, []);

  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const activeSessionIdRef = useRef<string | null>(null);
  activeSessionIdRef.current = activeSessionId;

  // used to focus a session in History later (safe to keep even if not yet wired)
  const [historySelectedSessionId, setHistorySelectedSessionId] = useState<string | null>(null);

  const [showSetup, setShowSetup] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [sessionMode, setSessionMode] = useState<'normal' | 'guided'>('normal');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<SessionPlan | null>(null);
  const [selectedProgramDay, setSelectedProgramDay] = useState<any | null>(null);
  const [pendingNotificationAction, setPendingNotificationAction] = useState<TrainingNotificationAction | null>(null);
  const lastNotificationKeyRef = useRef<string | null>(null);
  /** Exit session UI without ending workout — blocks snapshot auto-resume until AppState foreground */
  const dismissedResumeSessionIdRef = useRef<string | null>(null);
  const [showGuidedPrep, setShowGuidedPrep] = useState(false);
  const [guidedPrepPayload, setGuidedPrepPayload] = useState<{
    plan: SessionPlan;
    programDay: any;
    notificationMode: 'normal' | 'guided';
    prepSeconds: number;
    /** Pre-generated session ID; set immediately so first-set notification can be pre-scheduled */
    prepSessionId: string;
  } | null>(null);
  /** Tracks whether the prep countdown has already completed (for mutation race) */
  const prepOnCompleteCalledRef = useRef(false);
  const staleProgramInvalidatedRef = useRef<string | null>(null);

  // Bucket 5: Post-setup reconcile state to prevent CTA flash
  const [setupJustCompletedAt, setSetupJustCompletedAt] = useState<number | null>(null);

  // This drives the week currently shown in WeekView
  const [currentWeekAnchor, setCurrentWeekAnchor] = useState<Date>(new Date());
  const [showTrainingFirstVisitGuide, setShowTrainingFirstVisitGuide] = useState(false);

  // Load profile
  const profileQ = useQuery({
    queryKey: ['training:profile'],
    queryFn: () => getTrainingProfile(),
    retry: false,
    staleTime: 3_600_000, // 1 hour
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Load active program
  const activeProgramQ = useQuery({
    queryKey: ['training:activeProgram'],
    queryFn: () => getActiveProgramInstance(),
    retry: false,
    staleTime: 3_600_000, // 1 hour — active program rarely changes mid-day
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Compute current week range (Mon..Sun)
  const weekStart = useMemo(() => startOfWeekMonday(currentWeekAnchor), [currentWeekAnchor]);
  const weekEnd = useMemo(() => {
    const d = addDays(weekStart, 6);
    d.setHours(23, 59, 59, 999);
    return d;
  }, [weekStart]);

  // Compute 4-week range starting from the displayed week (Mon..Sun + 3 more weeks)
  const fourWeekStart = useMemo(() => weekStart, [weekStart]);
  const fourWeekEnd = useMemo(() => {
    const d = addDays(fourWeekStart, 27); // 4 weeks window (28 days)
    d.setHours(23, 59, 59, 999);
    return d;
  }, [fourWeekStart]);

  // Load program days for current week
  const programDaysWeekQ = useQuery({
    queryKey: ['training:programDays:week', activeProgramQ.data?.id, weekStart.toISOString()],
    queryFn: () => {
      if (!activeProgramQ.data) return [];
      return getProgramDays(activeProgramQ.data.id, toYMD(weekStart), toYMD(weekEnd));
    },
    enabled: !!activeProgramQ.data,
    staleTime: 1_800_000, // 30 min — queryKey changes on week navigation anyway
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Load program days for 4-week preview window
  const programDaysFourWeekQ = useQuery({
    queryKey: ['training:programDays:fourWeek', activeProgramQ.data?.id, fourWeekStart.toISOString()],
    queryFn: () => {
      if (!activeProgramQ.data) return [];
      return getProgramDays(activeProgramQ.data.id, toYMD(fourWeekStart), toYMD(fourWeekEnd));
    },
    enabled: !!activeProgramQ.data,
    staleTime: 1_800_000, // 30 min
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Load sessions
  const sessionsQ = useQuery({
    queryKey: ['training:sessions'],
    queryFn: () => listTrainingSessions(50),
    retry: false,
    staleTime: 1_800_000, // 30 min — sessions list changes when a session is completed
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Fix: Detect stale cached program (program exists in cache but no days in DB)
  useEffect(() => {
    if (
      activeProgramQ.data &&
      !programDaysWeekQ.isLoading &&
      !programDaysFourWeekQ.isLoading &&
      (programDaysWeekQ.data?.length ?? 0) === 0 &&
      (programDaysFourWeekQ.data?.length ?? 0) === 0
    ) {
      const activeProgramId = activeProgramQ.data.id;
      if (staleProgramInvalidatedRef.current === activeProgramId) {
        return;
      }
      staleProgramInvalidatedRef.current = activeProgramId;
      console.warn('[TrainingScreen] Stale program detected (0 days), invalidating cache');
      qc.invalidateQueries({ queryKey: ['training:activeProgram'] });
      qc.invalidateQueries({ queryKey: ['training:profile'] });
    }
  }, [
    activeProgramQ.data,
    programDaysWeekQ.isLoading,
    programDaysWeekQ.data,
    programDaysFourWeekQ.isLoading,
    programDaysFourWeekQ.data,
    qc,
  ]);

  // Get active session if exists
  const activeSessionQ = useQuery({
    queryKey: ['training:session', activeSessionId],
    queryFn: () => (activeSessionId ? getTrainingSession(activeSessionId) : null),
    enabled: !!activeSessionId,
    retry: false,
  });

  // Check for in-progress session (started but not ended)
  const inProgressSession = useMemo(() => {
    if (!sessionsQ.data) return null;
    return (sessionsQ.data as any[]).find((s: any) => s.started_at && !s.ended_at) || null;
  }, [sessionsQ.data]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') dismissedResumeSessionIdRef.current = null;
    });
    return () => sub.remove();
  }, []);

  // Guided snapshot resume (cold start / foreground / list caught up). Does not compete with notification routes.
  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid || showSetup || showAnalytics) return;
    if (sessionsQ.isLoading) return;

    let cancelled = false;

    void (async () => {
      const result = await evaluateGuidedActiveSessionResume({
        loadSnapshot: () => loadGuidedActiveSessionSnapshot(uid),
        clearSnapshot: () => clearGuidedActiveSessionSnapshot(uid),
        maxAgeMs: GUIDED_SNAPSHOT_MAX_AGE_MS,
        nowMs: Date.now(),
        hasActiveSession: !!activeSessionIdRef.current,
        dismissedSessionId: dismissedResumeSessionIdRef.current,
        notificationSessionPending: route.params?.notification != null,
        inProgressSession,
        fetchFullSession: getTrainingSession,
        shouldStillResume: () => !activeSessionIdRef.current,
      });

      if (cancelled || activeSessionIdRef.current) return;

      if (result.outcome === 'resumed') {
        if (result.prefetched) {
          qc.setQueryData(['training:session', result.sessionId], result.prefetched);
        }
        setActiveSessionId(result.sessionId);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    session?.user?.id,
    showSetup,
    showAnalytics,
    sessionsQ.isLoading,
    sessionsQ.data,
    inProgressSession,
    route.params?.notification,
    qc,
  ]);

  // Notification deep link → route into active session (do not start new)
  useEffect(() => {
    const notif = route.params?.notification;
    if (!notif) return;
    const key = JSON.stringify(notif);
    if (lastNotificationKeyRef.current === key) return;
    lastNotificationKeyRef.current = key;
    // "next_set" from TRAINING_REST action opens app and advances to next set (same UX as set_done)
    const normalized: TrainingNotificationAction =
      notif.action === 'next_set'
        ? { ...notif, action: 'set_done', fromRestNextSet: true }
        : { ...notif, action: notif.action };
    setPendingNotificationAction(normalized);
    if (notif.sessionId) {
      setActiveSessionId(notif.sessionId);
    } else if (inProgressSession && !activeSessionId) {
      setActiveSessionId(inProgressSession.id);
    }
  }, [route.params?.notification, inProgressSession, activeSessionId]);

  // Cast ProgramDayRow[] -> ProgramDay[] expected by WeekView/FourWeekPreview
  const programDaysWeekForUI = useMemo(() => {
    const raw = programDaysWeekQ.data || [];
    return raw.map((d: any) => ({
      ...d,
      template_key: (d.template_key as unknown) as SessionTemplate,
    }));
  }, [programDaysWeekQ.data]);

  const programDaysFourWeekForUI = useMemo(() => {
    const raw = programDaysFourWeekQ.data || [];
    return raw.map((d: any) => ({
      ...d,
      template_key: (d.template_key as unknown) as SessionTemplate,
    }));
  }, [programDaysFourWeekQ.data]);

  // Sync offline queue on mount
  useEffect(() => {
    (async () => {
      try {
        const queueSize = await getQueueSize();
        if (queueSize > 0) {
          await syncOfflineQueue();
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  // Bucket 5: Post-setup reconcile - show loading state for N seconds after setup completion
  const isInPostSetupReconcile =
    setupJustCompletedAt !== null && Date.now() - setupJustCompletedAt < 4_000; // 4 seconds
  const shouldShowLoading =
    isInPostSetupReconcile ||
    profileQ.isLoading ||
    activeProgramQ.isLoading ||
    (isInPostSetupReconcile && (profileQ.isFetching || activeProgramQ.isFetching));

  // ✅ FIX: hook must always run (never after early returns)
  useEffect(() => {
    if (setupJustCompletedAt !== null && profileQ.data && activeProgramQ.data) {
      setSetupJustCompletedAt(null);
    }
  }, [setupJustCompletedAt, profileQ.data, activeProgramQ.data]);

  // Start new session
  const startSessionMutation = useMutation({
    mutationFn: async ({
      plan,
      programDay,
      notificationMode,
      prepSessionId,
    }: {
      plan: SessionPlan;
      programDay: any;
      notificationMode: 'normal' | 'guided';
      /** Pre-generated ID from guided-prep flow; if absent a new one is generated */
      prepSessionId?: string;
    }) => {
      const sessionId = prepSessionId ?? `training_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const program = activeProgramQ.data;

      // GoalWeights -> Record<string, number>
      const goalsRecord: Record<string, number> = ({ ...(plan.goals as any) } as unknown) as Record<
        string,
        number
      >;

      await createTrainingSession({
        id: sessionId,
        mode: 'timed',
        goals: goalsRecord,
        startedAt: new Date().toISOString(),
        programId: program?.id,
        programDayId: programDay.id,
        weekIndex: programDay.week_index,
        dayIndex: programDay.day_index,
        sessionTypeLabel: programDay.label,
      });

      await updateTrainingSession(sessionId, {
        decisionTrace: { notificationMode },
      });

      const items = plan.exercises.map((ex, idx) => ({
        id: `${sessionId}_item_${idx}`,
        exerciseId: ex.exerciseId,
        orderIndex: ex.orderIndex,
        planned: {
          sets: ex.plannedSets,
          priority: ex.priority,
          intents: ex.intents,
          decisionTrace: ex.decisionTrace,
        },
      }));

      await createTrainingSessionItems(sessionId, items);

      await logTrainingEvent('training_session_generated', {
        sessionId,
        programDayId: programDay.id,
        label: programDay.label,
        exercisesCount: plan.exercises.length,
      }).catch((e) => { if (__DEV__) logger.debug('[TrainingScreen]', e); });

      return { sessionId, plan };
    },
    onSuccess: (data, variables) => {
      setShowPreview(false);
      setPendingPlan(null);
      setSelectedProgramDay(null);
      qc.invalidateQueries({ queryKey: ['training:sessions'] });
      qc.invalidateQueries({ queryKey: ['training:sessions:analytics'] });

      if (variables.prepSessionId) {
        // Prep-mode: session was created during the countdown.
        // If the countdown already completed, activate now; otherwise onComplete handles it.
        if (prepOnCompleteCalledRef.current) {
          setActiveSessionId(data.sessionId);
          setShowGuidedPrep(false);
          setGuidedPrepPayload(null);
          prepOnCompleteCalledRef.current = false;
        }
        // If prep still in progress: onComplete will call setActiveSessionId(prepSessionId)
        return;
      }

      // Normal (non-prep) flow
      setActiveSessionId(data.sessionId);
      setShowGuidedPrep(false);
      setGuidedPrepPayload(null);
    },
    onError: (error: any, variables) => {
      // Close prep screen on error so user isn't stuck
      setShowGuidedPrep(false);
      setGuidedPrepPayload(null);
      prepOnCompleteCalledRef.current = false;
      // Cancel the pre-scheduled first-set notification if any
      if (variables.prepSessionId) {
        clearIntentsByPrefix(`training_first:${variables.prepSessionId}:`)
          .then(() => reconcileNotifications())
          .catch(() => {});
      }
      logger.warn('Failed to start training session', {
        message: error?.message,
        stack: error?.stack,
      });
      Alert.alert(
        'Couldn\'t start session',
        error?.message || 'Something went wrong. Check your connection and try again.',
        [
          { text: 'OK', style: 'cancel', onPress: () => { setShowPreview(false); setPendingPlan(null); } },
          {
            text: 'Try again',
            onPress: () => variables && startSessionMutation.mutate(variables),
          },
        ]
      );
    },
  });

  const handleDayPress = useCallback(
    (programDay: any) => {
      // FIX: Check for active session before allowing new session preview
      if (inProgressSession) {
        Alert.alert(
          'Session in progress',
          `You have an active session from ${new Date(inProgressSession.started_at).toLocaleDateString()}. What would you like to do?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Resume session', onPress: () => setActiveSessionId(inProgressSession.id) },
            { text: 'End & save', onPress: async () => {
              // End the active session first, then allow preview
              // Note: User will need to confirm starting new session after ending current one
              try {
                await endInProgressSessionWithOptionalEnergySummary(inProgressSession);
                await qc.invalidateQueries({ queryKey: ['training:sessions'] });
                await qc.invalidateQueries({ queryKey: ['training:sessions:analytics'] });
                // Now allow preview to proceed
                setSelectedProgramDay(programDay);
                const profile = profileQ.data;
                const program = activeProgramQ.data;
                if (!profile || !program) return;
                const plan = buildSessionFromProgramDay(
                  {
                    label: programDay.label,
                    intents: programDay.intents,
                    template_key: programDay.template_key,
                  },
                  program.profile_snapshot,
                );
                setPendingPlan(plan);
                setShowPreview(true);
              } catch (error: any) {
                logger.warn('Failed to end active session', error);
                Alert.alert('Error', 'Failed to end active session. Please try again.');
              }
            }},
            {
              text: 'Cancel & delete',
              style: 'destructive',
              onPress: async () => {
                try {
                  const activeId = inProgressSession.id;
                  // Clear training intents to prevent stale notifications
                  await clearIntentsByPrefix(`training_rest:${activeId}:`);
                  await clearIntentsByPrefix(`training_set:${activeId}:`);
                  await clearIntentsByPrefix(`training_first:${activeId}:`);
                  await reconcileNotifications();

                  // Clear any buffered writes for this session (feature-flagged, safe regardless)
                  await clearBufferedSessionWrites(activeId);

                  await deleteTrainingSession(activeId);
                  if (session?.user?.id) await clearGuidedActiveSessionSnapshot(session.user.id);
                  await qc.invalidateQueries({ queryKey: ['training:sessions'] });
                  await qc.invalidateQueries({ queryKey: ['training:sessions:analytics'] });
                  await qc.invalidateQueries({ queryKey: ['training:session', activeId] });
                  setActiveSessionId(null);

                  // Now allow preview to proceed
                  setSelectedProgramDay(programDay);
                  const profile = profileQ.data;
                  const program = activeProgramQ.data;
                  if (!profile || !program) return;
                  const plan = buildSessionFromProgramDay(
                    {
                      label: programDay.label,
                      intents: programDay.intents,
                      template_key: programDay.template_key,
                    },
                    program.profile_snapshot,
                  );
                  setPendingPlan(plan);
                  setShowPreview(true);
                } catch (error: any) {
                  logger.error('Failed to cancel & delete active session', error);
                  Alert.alert('Error', error?.message || 'Failed to cancel and delete session. Please try again.');
                }
              },
            },
          ]
        );
        return;
      }

      setSelectedProgramDay(programDay);

      const profile = profileQ.data;
      const program = activeProgramQ.data;
      if (!profile || !program) return;

      const plan = buildSessionFromProgramDay(
        {
          label: programDay.label,
          intents: programDay.intents,
          template_key: programDay.template_key,
        },
        program.profile_snapshot,
      );

      setPendingPlan(plan);
      setShowPreview(true);
    },
    [profileQ.data, activeProgramQ.data, inProgressSession, qc, session?.user?.id],
  );

  const ensureGuidedNotificationPermission = useCallback(async (): Promise<'guided' | 'normal' | null> => {
    try {
      const hasPermission = (perm: Notifications.NotificationPermissionsStatus) =>
        perm.granted ||
        perm.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED ||
        perm.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

      const current = await Notifications.getPermissionsAsync();
      let granted = hasPermission(current);
      if (!granted) {
        const requested = await Notifications.requestPermissionsAsync();
        granted = hasPermission(requested);
      }

      if (granted) {
        await ensureReclaimChannels();
        // Categories (TRAINING_SET with SKIP_SET, TRAINING_REST) are registered by
        // useNotifications on app start — do not re-register here as it would overwrite
        // and drop the SKIP_SET action from TRAINING_SET.
        const categories = await Notifications.getNotificationCategoriesAsync();
        const hasSetCategory = categories.some((cat) => cat.identifier === 'TRAINING_SET');
        const hasRestCategory = categories.some((cat) => cat.identifier === 'TRAINING_REST');
        if (!hasSetCategory || !hasRestCategory) {
          logger.warn('Guided precheck failed: training categories missing after setup', {
            hasSetCategory,
            hasRestCategory,
          });
          return 'normal';
        }
        return 'guided';
      }
    } catch (error) {
      logger.warn('Failed to verify notifications for guided mode', error);
    }

    return await new Promise<'guided' | 'normal' | null>((resolve) => {
      Alert.alert(
        'Guided mode needs notifications',
        'Guided sessions require notification permission so rest/set actions can be sent to your phone and watch.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
          {
            text: 'Open Settings',
            onPress: () => {
              Linking.openSettings().catch(() => {
                // no-op
              });
              resolve(null);
            },
          },
          { text: 'Start in normal mode', onPress: () => resolve('normal') },
        ],
      );
    });
  }, []);

  const handleConfirmSession = useCallback(async () => {
    if (!pendingPlan || !selectedProgramDay) return;

    // FIX: Double-check for active session before starting (defensive check)
    if (inProgressSession) {
      Alert.alert(
        'Session in progress',
        `You have an active session from ${new Date(inProgressSession.started_at).toLocaleDateString()}. Please resume or end it first.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Resume session', onPress: () => setActiveSessionId(inProgressSession.id) },
          {
            text: 'End & save',
            onPress: async () => {
              try {
                await endInProgressSessionWithOptionalEnergySummary(inProgressSession);
                await qc.invalidateQueries({ queryKey: ['training:sessions'] });
                await qc.invalidateQueries({ queryKey: ['training:sessions:analytics'] });
                setActiveSessionId(null);
              } catch (error: any) {
                logger.warn('Failed to end active session', error);
                Alert.alert('Error', 'Failed to end active session. Please try again.');
              }
            },
          },
          {
            text: 'Cancel & delete',
            style: 'destructive',
            onPress: async () => {
              try {
                const activeId = inProgressSession.id;
                await clearIntentsByPrefix(`training_rest:${activeId}:`);
                await clearIntentsByPrefix(`training_set:${activeId}:`);
                await clearIntentsByPrefix(`training_first:${activeId}:`);
                await reconcileNotifications();
                await clearBufferedSessionWrites(activeId);
                await deleteTrainingSession(activeId);
                if (session?.user?.id) await clearGuidedActiveSessionSnapshot(session.user.id);
                await qc.invalidateQueries({ queryKey: ['training:sessions'] });
                await qc.invalidateQueries({ queryKey: ['training:sessions:analytics'] });
                await qc.invalidateQueries({ queryKey: ['training:session', activeId] });
                setActiveSessionId(null);
              } catch (error: any) {
                logger.error('Failed to cancel & delete active session', error);
                Alert.alert('Error', error?.message || 'Failed to cancel and delete session. Please try again.');
              }
            },
          },
        ]
      );
      return;
    }

    let modeToStart: 'normal' | 'guided' = sessionMode;
    if (sessionMode === 'guided') {
      const resolvedMode = await ensureGuidedNotificationPermission();
      if (resolvedMode === null) return;
      modeToStart = resolvedMode;
      if (resolvedMode === 'normal') {
        setSessionMode('normal');
      }
    }

    const settings = await getUserSettings();
    const prepSeconds = (settings.guidedPrepSeconds ?? 30) as GuidedPrepSeconds;

    if (modeToStart === 'guided' && prepSeconds > 0) {
      // Pre-generate the session ID so we can schedule the first-set notification
      // from the OS at T+prepSeconds without waiting for the DB write.
      const prepSessionId = `training_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const firstSetInfo = computeFirstSetInfo(prepSessionId, pendingPlan);
      if (firstSetInfo) {
        scheduleTrainingFirstSet({
          ...firstSetInfo,
          delaySeconds: prepSeconds,
        }).catch((e) => logger.warn('[TRAINING_PREP] first-set pre-schedule failed', e));
      }
      prepOnCompleteCalledRef.current = false;
      setGuidedPrepPayload({
        plan: pendingPlan,
        programDay: selectedProgramDay,
        notificationMode: modeToStart,
        prepSeconds,
        prepSessionId,
      });
      setShowPreview(false);
      setShowGuidedPrep(true);
      logger.debug('[GUIDED_START] guided prep countdown opening', { prepSeconds, prepSessionId });
      // Fire DB write in parallel with the 30-second countdown
      startSessionMutation.mutate({
        plan: pendingPlan,
        programDay: selectedProgramDay,
        notificationMode: modeToStart,
        prepSessionId,
      });
      return;
    }

    startSessionMutation.mutate({
      plan: pendingPlan,
      programDay: selectedProgramDay,
      notificationMode: modeToStart,
    });
  }, [
    pendingPlan,
    selectedProgramDay,
    startSessionMutation,
    inProgressSession,
    sessionMode,
    ensureGuidedNotificationPermission,
    session?.user?.id,
  ]);

  const handleResumeSession = useCallback(() => {
    if (inProgressSession) {
      setActiveSessionId(inProgressSession.id);
    }
  }, [inProgressSession]);

  const weekNumber = useMemo(() => {
    try {
      const start = new Date(activeProgramQ.data?.start_date || new Date());
      const diff = new Date().getTime() - start.getTime();
      const wk = Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1;
      return wk > 0 ? wk : 1;
    } catch {
      return 1;
    }
  }, [activeProgramQ.data?.start_date]);

  // Find next session (first program day >= today)
  const nextSession = useMemo(() => {
    if (!programDaysFourWeekQ.data || programDaysFourWeekQ.data.length === 0) return null;
    if (!profileQ.data || !activeProgramQ.data) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sorted = [...(programDaysFourWeekQ.data as any[])]
      .filter((pd) => {
        const pdDate = new Date(pd.date);
        pdDate.setHours(0, 0, 0, 0);
        return pdDate >= today;
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    if (sorted.length === 0) return null;

    const nextDay = sorted[0];
    try {
      const plan = buildSessionFromProgramDay(
        {
          label: nextDay.label,
          intents: (nextDay.intents || []) as MovementIntent[],
          template_key: nextDay.template_key as SessionTemplate,
        },
        activeProgramQ.data.profile_snapshot,
      );
      return {
        programDay: nextDay,
        plan,
        date: new Date(nextDay.date),
      };
    } catch {
      return null;
    }
  }, [programDaysFourWeekQ.data, profileQ.data, activeProgramQ.data]);

  useEffect(() => {
    let cancelled = false;
    const uid = session?.user?.id ?? null;
    if (!uid) {
      setShowTrainingFirstVisitGuide(false);
      return;
    }
    void (async () => {
      const dismissed = await isTrainingFirstVisitGuideDismissed(uid);
      if (!cancelled) setShowTrainingFirstVisitGuide(!dismissed);
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const handleDismissTrainingFirstVisitGuide = useCallback(async () => {
    setShowTrainingFirstVisitGuide(false);
    await dismissTrainingFirstVisitGuide(session?.user?.id);
  }, [session?.user?.id]);

  if (showSetup) {
    return (
      <TrainingSetupScreen
        onComplete={async (reason = 'saved') => {
          setShowSetup(false);

          // Prevent "Loading your updated plan..." loop for delete/close actions.
          const shouldReconcileAsSaved = reason === 'saved';
          setSetupJustCompletedAt(shouldReconcileAsSaved ? Date.now() : null);

          if (reason === 'closed') return;

          await qc.invalidateQueries({ queryKey: ['training:profile'] });
          await qc.invalidateQueries({ queryKey: ['training:activeProgram'] });
          await qc.invalidateQueries({ queryKey: ['training:programDays:week'] });
          await qc.invalidateQueries({ queryKey: ['training:programDays:fourWeek'] });
        }}
      />
    );
  }

  if (showAnalytics) {
    return <TrainingAnalyticsScreen onClose={() => setShowAnalytics(false)} />;
  }

  if (activeSessionId && activeSessionQ.data) {
    return (
      <TrainingSessionView
        sessionId={activeSessionId}
        sessionData={activeSessionQ.data}
        notificationMode={
          (activeSessionQ.data?.session as any)?.decision_trace?.notificationMode === 'guided'
            ? 'guided'
            : 'normal'
        }
        notificationAction={pendingNotificationAction ?? undefined}
        onNotificationActionHandled={() => setPendingNotificationAction(null)}
        onComplete={() => {
          setActiveSessionId(null);
          qc.invalidateQueries({ queryKey: ['training:sessions'] });
          qc.invalidateQueries({ queryKey: ['training:sessions:analytics'] });
        }}
        onCancel={() => {
          if (activeSessionId) dismissedResumeSessionIdRef.current = activeSessionId;
          setActiveSessionId(null);
        }}
      />
    );
  }

  if (shouldShowLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: appTheme.spacing.md, color: theme.colors.onSurfaceVariant }}>
          {isInPostSetupReconcile ? 'Loading your updated plan...' : 'Loading...'}
        </Text>
      </View>
    );
  }

  // Guardrails - canonical setup CTA
  if (!profileQ.data || !activeProgramQ.data) {
    const hasError = profileQ.isError || activeProgramQ.isError;

    if (hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: appTheme.spacing.lg,
              paddingTop: appTheme.spacing.lg,
              paddingBottom: 140,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <InformationalCard style={utilitySurface}>
              <FeatureCardHeader icon="alert-circle" title="Unable to load training plan" />
              <Text style={{ marginTop: 8, marginBottom: 12, color: theme.colors.onSurfaceVariant }}>
                There was an error loading your training profile. Please try again.
              </Text>
              {__DEV__ && (
                <Text style={{ marginBottom: 12, color: theme.colors.error, fontSize: 12 }}>
                  Profile: {profileQ.isError ? 'error' : 'ok'} | Program:{' '}
                  {activeProgramQ.isError ? 'error' : 'ok'}
                </Text>
              )}
              <Button
                mode="contained"
                onPress={() => {
                  qc.invalidateQueries({ queryKey: ['training:profile'] });
                  qc.invalidateQueries({ queryKey: ['training:activeProgram'] });
                }}
                buttonColor={theme.colors.primary}
                textColor={theme.colors.onPrimary}
                style={primaryCapsule.style}
                contentStyle={primaryCapsule.contentStyle}
                labelStyle={[primaryCapsule.labelStyle, { color: theme.colors.onPrimary }]}
              >
                Retry
              </Button>
            </InformationalCard>
          </ScrollView>
        </View>
      );
    }

    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: appTheme.spacing.lg,
            paddingTop: appTheme.spacing.lg,
            paddingBottom: 140,
          }}
        >
          <InformationalCard style={utilitySurface}>
            <FeatureCardHeader icon="dumbbell" title="Training Setup" subtitle="Get started in 60 seconds" />
            <Text style={{ marginTop: 8, marginBottom: 12, color: theme.colors.onSurfaceVariant }}>
              {!profileQ.data
                ? 'Set up your training profile to get personalized workout recommendations based on your goals, equipment, and experience level.'
                : 'Create your 4-week training program to get started.'}
            </Text>
            <Button
              mode="contained"
              onPress={() => setShowSetup(true)}
              buttonColor={theme.colors.primary}
              textColor={theme.colors.onPrimary}
              style={primaryCapsule.style}
              contentStyle={primaryCapsule.contentStyle}
              labelStyle={[primaryCapsule.labelStyle, { color: theme.colors.onPrimary }]}
            >
              {!profileQ.data ? 'Start setup' : 'Create program'}
            </Button>
          </InformationalCard>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Tab switcher + Edit Program button */}
      <View
        style={{
          paddingHorizontal: appTheme.spacing.lg,
          paddingTop: appTheme.spacing.lg,
          paddingBottom: appTheme.spacing.sm,
          flexDirection: 'row',
          gap: 8,
          alignItems: 'center',
        }}
      >
        <View style={{ flex: 1, flexDirection: 'row', gap: 8, minWidth: 0 }}>
          <Button
            mode={activeTab === 'today' ? 'contained' : 'outlined'}
            onPress={() => setActiveTab('today')}
            buttonColor={activeTab === 'today' ? theme.colors.primary : undefined}
            textColor={activeTab === 'today' ? theme.colors.onPrimary : undefined}
            style={[{ flex: 1, minWidth: 0 }, activeTab === 'today' ? primaryCapsule.style : tertiaryCapsule.style]}
            contentStyle={[
              activeTab === 'today' ? primaryCapsule.contentStyle : tertiaryCapsule.contentStyle,
              { paddingHorizontal: 10 },
            ]}
            labelStyle={
              activeTab === 'today'
                ? [primaryCapsule.labelStyle, { color: theme.colors.onPrimary }]
                : tertiaryCapsule.labelStyle
            }
          >
            Today
          </Button>
          <Button
            mode={activeTab === 'history' ? 'contained' : 'outlined'}
            onPress={() => setActiveTab('history')}
            buttonColor={activeTab === 'history' ? theme.colors.primary : undefined}
            textColor={activeTab === 'history' ? theme.colors.onPrimary : undefined}
            style={[{ flex: 1, minWidth: 0 }, activeTab === 'history' ? primaryCapsule.style : tertiaryCapsule.style]}
            contentStyle={[
              activeTab === 'history' ? primaryCapsule.contentStyle : tertiaryCapsule.contentStyle,
              { paddingHorizontal: 10 },
            ]}
            labelStyle={
              activeTab === 'history'
                ? [primaryCapsule.labelStyle, { color: theme.colors.onPrimary }]
                : tertiaryCapsule.labelStyle
            }
          >
            History
          </Button>
        </View>
        <View style={{ flexDirection: 'row', flexShrink: 0 }}>
          <IconButton
            icon="chart-line"
            size={22}
            onPress={() => setShowAnalytics(true)}
            accessibilityLabel="View analytics"
          />
          <IconButton
            icon="cog"
            size={22}
            onPress={() => setShowSetup(true)}
            accessibilityLabel="Edit training program"
          />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: appTheme.spacing.lg,
          paddingTop: appTheme.spacing.lg,
          paddingBottom: 140,
        }}
      >
        {activeTab === 'today' ? (
          <>
            {inProgressSession ? (
              <View style={{ marginBottom: appTheme.spacing.lg }}>
                <ActionCard>
                  <FeatureCardHeader icon="dumbbell" title="Session in progress" />
                  <Text
                    style={{
                      marginTop: appTheme.spacing.sm,
                      marginBottom: appTheme.spacing.md,
                      color: theme.colors.onSurfaceVariant,
                    }}
                  >
                    You have an active session. Resume to continue logging sets.
                  </Text>
                  <Button
                    mode="contained"
                    onPress={handleResumeSession}
                    buttonColor={theme.colors.primary}
                    textColor={theme.colors.onPrimary}
                    style={primaryCapsule.style}
                    contentStyle={primaryCapsule.contentStyle}
                    labelStyle={[primaryCapsule.labelStyle, { color: theme.colors.onPrimary }]}
                  >
                    Resume session
                  </Button>
                </ActionCard>
              </View>
            ) : nextSession ? (
              <View style={{ marginBottom: appTheme.spacing.lg }}>
                <Card
                  mode="elevated"
                  style={[
                    guidedShell as any,
                    { borderRadius: appTheme.borderRadius.xl },
                  ]}
                  onPress={() => handleDayPress(nextSession.programDay)}
                >
                  <Card.Content style={{ padding: appTheme.spacing.md }}>
                    <View
                      style={{
                        flexDirection: 'column',
                        alignItems: 'stretch',
                        marginBottom: appTheme.spacing.sm,
                        gap: appTheme.spacing.sm,
                      }}
                    >
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          variant="titleMedium"
                          style={{
                            fontWeight: '700',
                            color: theme.colors.onPrimaryContainer,
                            marginBottom: appTheme.spacing.xs,
                          }}
                        >
                          Next Session
                        </Text>

                        <Text
                          variant="bodySmall"
                          style={{ color: theme.colors.onPrimaryContainer, marginBottom: appTheme.spacing.xs }}
                        >
                          {(() => {
                            const day = nextSession.programDay;
                            if (day.week_index && day.day_index !== undefined) {
                              return `Week ${day.week_index} • Day ${day.day_index} — ${day.label}`;
                            }
                            return day.label;
                          })()}
                        </Text>

                        {(() => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const sessionDate = new Date(nextSession.date);
                          sessionDate.setHours(0, 0, 0, 0);

                          let dateLabel = 'Today';
                          if (!isSameDay(sessionDate, today)) {
                            const tomorrow = addDays(today, 1);
                            if (isSameDay(sessionDate, tomorrow)) {
                              dateLabel = 'Tomorrow';
                            } else {
                              dateLabel = sessionDate.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              });
                            }
                          }

                          return (
                            <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer, opacity: 0.8 }}>
                              {dateLabel}
                            </Text>
                          );
                        })()}
                      </View>

                      <View
                        style={{
                          flexDirection: 'row',
                          gap: appTheme.spacing.xs,
                          flexWrap: 'wrap',
                          justifyContent: 'flex-start',
                          alignItems: 'center',
                        }}
                      >
                        {getPrimaryIntentLabels((nextSession.programDay.intents || []) as MovementIntent[], 2).map(
                          (label, idx) => (
                            <Chip
                              key={`next_${idx}`}
                              mode="flat"
                              compact
                              textStyle={{
                                fontSize: 10,
                                fontWeight: '600',
                                color: theme.colors.onPrimary,
                              }}
                              style={{
                                backgroundColor: theme.colors.primary,
                                maxWidth: '100%',
                              }}
                            >
                              {label}
                            </Chip>
                          ),
                        )}
                      </View>
                    </View>

                    {nextSession.plan.estimatedDurationMinutes ? (
                      <Text
                        variant="bodySmall"
                        style={{
                          color: theme.colors.onPrimaryContainer,
                          opacity: 0.8,
                          marginBottom: appTheme.spacing.sm,
                        }}
                      >
                        ~{nextSession.plan.estimatedDurationMinutes} min
                      </Text>
                    ) : null}

                    <Button
                      mode="contained"
                      compact
                      onPress={() => handleDayPress(nextSession.programDay)}
                      style={[primaryCapsule.style, { marginTop: appTheme.spacing.xs }]}
                      contentStyle={primaryCapsule.contentStyle}
                      labelStyle={primaryCapsule.labelStyle}
                      buttonColor={theme.colors.primary}
                      textColor={theme.colors.onPrimary}
                    >
                      {(() => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const sessionDate = new Date(nextSession.date);
                        sessionDate.setHours(0, 0, 0, 0);
                        if (isSameDay(sessionDate, today)) return 'Start';
                        if (isPast(sessionDate, today)) return 'Review';
                        return 'Preview';
                      })()}
                    </Button>
                  </Card.Content>
                </Card>
              </View>
            ) : null}

            {showTrainingFirstVisitGuide && !inProgressSession ? (
              <View style={{ marginBottom: appTheme.spacing.lg }}>
                <InformationalCard icon="information-outline" style={utilitySurface}>
                  <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                    Your training plan
                  </Text>
                  {nextSession ? (
                    <Text variant="bodySmall" style={{ marginTop: 8, color: theme.colors.onSurfaceVariant, lineHeight: 20 }}>
                      The rest of your week is in <Text style={{ fontWeight: '600', color: theme.colors.onSurface }}>This week</Text>{' '}
                      below—tap any day to preview or start.
                    </Text>
                  ) : (
                    <Text variant="bodySmall" style={{ marginTop: 8, color: theme.colors.onSurfaceVariant, lineHeight: 20 }}>
                      Tap a day in <Text style={{ fontWeight: '600', color: theme.colors.onSurface }}>This week</Text> below to
                      preview or start a session.
                    </Text>
                  )}
                  <Button
                    mode="text"
                    onPress={() => void handleDismissTrainingFirstVisitGuide()}
                    textColor={theme.colors.primary}
                    style={[ghostCapsule.style, { marginTop: 10, alignSelf: 'flex-start' }]}
                    contentStyle={ghostCapsule.contentStyle}
                    labelStyle={ghostCapsule.labelStyle}
                  >
                    Got it
                  </Button>
                </InformationalCard>
              </View>
            ) : null}

            {/* Current Week header + navigation */}
                       <View style={{ marginBottom: appTheme.spacing.md }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: appTheme.spacing.sm,
                  gap: 10,
                  flexWrap: 'wrap',
                }}
              >
                <View style={{ flex: 1, minWidth: 160 }}>
                  <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                    This Week
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Week {weekNumber} • {weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – {weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 8, flexShrink: 0 }}>
                  <Button
                    mode="outlined"
                    compact
                    onPress={() => setCurrentWeekAnchor((prev) => addDays(prev, -7))}
                    style={tertiaryCapsule.style}
                    contentStyle={[tertiaryCapsule.contentStyle, { minWidth: 64 }]}
                    labelStyle={tertiaryCapsule.labelStyle}
                  >
                    Prev
                  </Button>
                  <Button
                    mode="outlined"
                    compact
                    onPress={() => setCurrentWeekAnchor((prev) => addDays(prev, 7))}
                    style={tertiaryCapsule.style}
                    contentStyle={[tertiaryCapsule.contentStyle, { minWidth: 64 }]}
                    labelStyle={tertiaryCapsule.labelStyle}
                  >
                    Next
                  </Button>
                </View>
              </View>

              {programDaysWeekQ.isLoading ? (
                <View style={{ paddingVertical: 16 }}>
                  <ActivityIndicator />
                </View>
              ) : (
                <WeekView
                  programDays={programDaysWeekForUI as any}
                  currentDate={currentWeekAnchor}
                  onDayPress={handleDayPress}
                />
              )}
            </View>

            {/* 4-Week Preview */}
            <View style={{ marginBottom: appTheme.spacing.lg }}>
              <Text
                variant="titleMedium"
                style={{ fontWeight: '700', marginBottom: appTheme.spacing.md, color: theme.colors.onSurface }}
              >
                4-Week Program
              </Text>

              {programDaysFourWeekQ.isLoading ? (
                <View style={{ paddingVertical: 16 }}>
                  <ActivityIndicator />
                </View>
              ) : (
                <FourWeekPreview programDays={programDaysFourWeekForUI as any} />
              )}
            </View>

            {/* Recent sessions */}
            {sessionsQ.isLoading ? (
              <View style={{ paddingVertical: 24 }}>
                <ActivityIndicator />
              </View>
            ) : sessionsQ.data && sessionsQ.data.length > 0 ? (
              <View style={{ marginBottom: appTheme.spacing.lg }}>
                <Text
                  variant="titleMedium"
                  style={{ marginBottom: appTheme.spacing.md, fontWeight: '700', color: theme.colors.onSurface }}
                >
                  Recent sessions
                </Text>

                {(sessionsQ.data as any[]).slice(0, 5).map((s: any) => (
                  <Card
                    key={s.id}
                    mode="outlined"
                    style={{
                      marginBottom: appTheme.spacing.sm,
                      backgroundColor: theme.colors.surface,
                      borderRadius: appTheme.borderRadius.xl,
                    }}
                    onPress={() => {
                      setHistorySelectedSessionId(s.id);
                      setActiveTab('history');
                    }}
                  >
                    <Card.Content>
                      <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                        {s.started_at ? new Date(s.started_at).toLocaleDateString() : 'Session'}
                      </Text>
                      <Text
                        variant="bodySmall"
                        style={{ color: theme.colors.onSurfaceVariant, marginTop: appTheme.spacing.xs }}
                      >
                        {s.mode === 'timed' ? 'Timed' : 'Manual'} • {Object.keys(s.goals || {}).length} exercise{Object.keys(s.goals || {}).length === 1 ? '' : 's'}
                      </Text>
                    </Card.Content>
                  </Card>
                ))}
              </View>
            ) : null}
          </>
        ) : (
          <TrainingHistoryView sessions={(sessionsQ.data as any[]) || []} isLoading={sessionsQ.isLoading} />
        )}
      </ScrollView>

      {/* Session Preview Modal */}
      <SessionPreviewModal
        visible={showPreview}
        plan={pendingPlan}
        sessionMode={sessionMode}
        onSessionModeChange={setSessionMode}
        onConfirm={handleConfirmSession}
        onCancel={() => {
          setShowPreview(false);
          setPendingPlan(null);
        }}
      />

      {/* Guided prep countdown - gives time to lock phone before first-set notification */}
      <GuidedPrepScreen
        visible={showGuidedPrep}
        secondsTotal={guidedPrepPayload?.prepSeconds ?? 30}
        isStarting={startSessionMutation.isPending}
        onComplete={() => {
          const prepId = guidedPrepPayload?.prepSessionId;
          if (prepId) {
            // If the DB write already finished, activate now; otherwise mark the flag
            // so onSuccess activates as soon as the mutation resolves.
            if (!startSessionMutation.isPending) {
              setActiveSessionId(prepId);
              setShowGuidedPrep(false);
              setGuidedPrepPayload(null);
              prepOnCompleteCalledRef.current = false;
            } else {
              prepOnCompleteCalledRef.current = true;
            }
          }
        }}
        onCancel={() => {
          const prepId = guidedPrepPayload?.prepSessionId;
          if (prepId) {
            clearIntentsByPrefix(`training_first:${prepId}:`)
              .then(() => reconcileNotifications())
              .catch(() => {});
          }
          prepOnCompleteCalledRef.current = false;
          setGuidedPrepPayload(null);
          setShowGuidedPrep(false);
          setPendingPlan(null);
          setSelectedProgramDay(null);
        }}
      />
    </View>
  );
}
