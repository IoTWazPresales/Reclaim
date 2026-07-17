// C:\Reclaim\app\src\screens\Dashboard.tsx
import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  AppState,
  AppStateStatus,
  Dimensions,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, Card, Surface, Text, FAB, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  createMoodCheckin,
  listMeds,
  logMedDose,
  upcomingDoseTimes,
  listMergedMedDoseLogsLastNDays,
  listMoodCheckins,
  listSleepSessions,
  getActiveProgramInstance,
  getProgramDays,
  listTrainingSessions,
  isScheduledMed,
  type Med,
  type SleepSession as SleepSessionRow,
} from '@/lib/api';
import type { ScheduleItem, UpcomingDose } from '@/lib/dashboard/types';
import {
  formatTime,
  formatRange,
  isSameDay,
  parseHHMMToMinutes,
  dateWithTimeLikeToday,
  tomorrowNoonLocal,
  minutesOfDay,
  getSleepMidpointMinutes,
  standardDeviation,
  ROUTINE_NO_SLOT_REASON,
  startOfWeekMonday,
} from '@/lib/dashboard/utils';
import { logger } from '@/lib/logger';
import {
  dismissPostOnboardingHomeGuide,
  isPostOnboardingHomeGuideDismissed,
} from '@/lib/firstRunGuide';
import { formatDistanceToNow } from 'date-fns';
import { requestHealthSync, type HealthSyncReason } from '@/sync/SyncCoordinator';
import { formatSyncGreetingLine } from '@/lib/sync/syncDisplay';
import { getLastHealthSyncSuccessISO } from '@/lib/sync';
import { useMedAdherence } from '@/hooks/useMedAdherence';
import { useSyncDisplay } from '@/hooks/useSyncDisplay';
import type { SleepSession as HealthSleepSession } from '@/lib/health/types';
import { mapDbSleepToHealth } from '@/lib/sleep/mapDbSleepToHealth';
import {
  advanceRecoveryProgressFromStageCompletion,
  getRecoveryProgress,
  getStageById,
  type RecoveryStageId,
} from '@/lib/recovery';
import { getStreakStore, recordStreakEvent, type StreakBadge } from '@/lib/streaks';
import { MilestoneCelebrationModal } from '@/components/dashboard/MilestoneCelebrationModal';
import { maybeRequestStoreReview } from '@/lib/storeReview';
import { getUserSettings } from '@/lib/userSettings';
import { logTelemetry } from '@/lib/telemetry';
import {
  navigateToAnalytics,
  navigateToMeds,
  navigateToMindfulness,
  navigateToMood,
  navigateToSleep,
  navigateToTraining,
} from '@/navigation/nav';
import { useScientificInsights } from '@/providers/InsightsProvider';
import { useInsightForScreen } from '@/lib/insights/useInsightForScreen';
import { resolveInsightAction } from '@/lib/insights/insightActions';
import {
  clearInsightVerifyPending,
  evaluateInsightVerifyLite,
  loadInsightVerifyPending,
  recordInsightActionForVerifyLite,
} from '@/lib/insights/insightVerifyLite';
import type { InsightScope } from '@/lib/insights/pickInsightForScreen';
import { scheduleDailySignalNotification } from '@/lib/notifications/dailySignalNotification';
import { scheduleWeeklyNarrativeNotification } from '@/lib/notifications/weeklyNarrativeNotification';
import { gradeForecastWithMood, recordTodayForecast } from '@/lib/forecastJournal';
import { scheduleMoodTrendAlerts } from '@/lib/notifications/moodTrendAlert';
import { useAuth } from '@/providers/AuthProvider';
import { triggerLightHaptic } from '@/lib/haptics';
import { getTodayEvents, type CalendarEvent } from '@/lib/calendar';
import { CelebrateRow } from '@/components/dashboard/CelebrateRow';
import { formatSyncCelebrationMessage } from '@/lib/display/formatSyncCelebration';
import type { MilestoneCelebrationProps } from '@/components/dashboard/MilestoneCelebrationModal';
import { DashboardForecastModal } from '@/components/dashboard/DashboardForecastModal';
import { DashboardGreeting } from '@/components/dashboard/DashboardGreeting';
import { DashboardHeroBackdrop } from '@/components/dashboard/DashboardHeroBackdrop';
import { DashboardInsight } from '@/components/dashboard/DashboardInsight';
import { DashboardPostOnboardingGuide } from '@/components/dashboard/DashboardPostOnboardingGuide';
import { DashboardPrimaryAction } from '@/components/dashboard/DashboardPrimaryAction';
import { DashboardRecovery } from '@/components/dashboard/DashboardRecovery';
import { DashboardScheduleOverlayHost } from '@/components/dashboard/DashboardScheduleOverlayHost';
import { DashboardSleepSnapshotModal } from '@/components/dashboard/DashboardSleepSnapshotModal';
import { DashboardSnackbar } from '@/components/dashboard/DashboardSnackbar';
import { DashboardStateTiles } from '@/components/dashboard/DashboardStateTiles';
import { DashboardThirtyDayArc } from '@/components/dashboard/DashboardThirtyDayArc';
import {
  computeRecoveryActionSteps,
  computeRecoveryBlockerLine,
  computeWeekInRecoveryStage,
  getRecoveryPrimaryCta,
  type RoutineSignal,
} from '@/lib/dashboard/recoveryCardMeta';
import { DashboardMoodCheckInModal } from '@/components/dashboard/DashboardMoodCheckInModal';
import { DashboardToday } from '@/components/dashboard/DashboardToday';
import { PaywallModal } from '@/components/premium/PaywallModal';
import { sleepStageColorForTile } from '@/components/dashboard/HomeDashboardTile';
import { getLifecycleNodeStatuses } from '@/components/dashboard/LifecycleHero';
import { loadSleepSettings, type SleepSettings } from '@/lib/sleepSettings';
import { getPreferredIntegration } from '@/lib/health/integrationStore';
import { fetchIntegrationStatusesWithSnapshot } from '@/lib/localData/integrationStatusReadModel';
import {
  pickLatestDedupedSleepRow,
  preferredIntegrationToDbSource,
} from '@/lib/sleep/dedupSleepSessionsByNight';
import { type ScheduleOverlayItem } from '@/components/dashboard/ScheduleOverlay';
import {
  defaultRoutineTemplates,
  loadRoutineState,
  saveRoutineState,
  fetchRoutineSuggestionsRemote,
  mergeRemoteRoutineSuggestionsIntoLocal,
  upsertRoutineSuggestionRemote,
  fetchRoutineTemplatesRemote,
  getLocalDateKey,
  type RoutineSuggestionRecord,
  type RoutineTemplate,
} from '@/lib/routines';
import { loadRoutineTemplateSettings, type RoutineTemplateSettings } from '@/lib/routineSettings';
import { formatLocalDateYYYYMMDD } from '@/lib/training/dateUtils';
import { useAppTheme } from '@/theme';
import { useHeroMotionActive } from '@/hooks/useHeroMotionActive';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import {
  reclaimGhostCapsuleButton,
  reclaimPrimaryCapsuleButton,
  reclaimTertiaryOutlineCapsuleButton,
} from '@/theme/reclaimVisualLanguage';
import {
  RECLAIM_SCREEN_SECTION_GAP,
  reclaimBelowHeroContent,
  reclaimHeroBleedScroll,
  reclaimSectionSpacing,
} from '@/theme/reclaimScreenLayout';
import { getSessionTemplateLabel, formatTrainingRoutineTemplateId } from '@/lib/training/sessionLabels';
import type { SessionTemplate } from '@/lib/training/types';
import * as Notifications from 'expo-notifications';

const INTENT_KEY = '@reclaim/routine_intent';
const INTENT_TTL_MS = 15 * 60 * 1000;

async function fetchLatestSleep(): Promise<HealthSleepSession | null> {
  try {
    const sessions = await listSleepSessions(30);
    if (!sessions.length) return null;

    const prefId = await getPreferredIntegration();
    const preferredSource = preferredIntegrationToDbSource(prefId);
    const row = pickLatestDedupedSleepRow(sessions, preferredSource);
    if (!row) return null;
    return mapDbSleepToHealth(row);
  } catch (error) {
    logger.debug('Dashboard sleep fetch failed (non-critical):', (error as Error)?.message);
    return null;
  }
}

function Dashboard() {
  const { session } = useAuth();
  const theme = useTheme();
  const appTheme = useAppTheme();
  const primaryCapsule = useMemo(() => reclaimPrimaryCapsuleButton(appTheme), [appTheme]);
  const ghostCapsule = useMemo(() => reclaimGhostCapsuleButton(appTheme), [appTheme]);
  const tertiaryCapsule = useMemo(() => reclaimTertiaryOutlineCapsuleButton(appTheme), [appTheme]);
  const qc = useQueryClient();
  const navigation = useNavigation<any>();
  const isDashboardFocused = useIsFocused();

  const [refreshing, setRefreshing] = useState(false);
  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });

  const syncDisplay = useSyncDisplay();
  const { snapshot: medAdherenceSnapshot } = useMedAdherence();
  const medAdherencePct = medAdherenceSnapshot.pct;

  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncingRef = useRef(false);

  const reduceMotion = useReducedMotion();
  const reduceMotionRef = useRef(false);

  const [celebrationState, setCelebrationState] = useState<{
    visible: boolean;
    badge: StreakBadge | null;
    streakCount: number;
    shieldUsed: boolean;
    micro?: MilestoneCelebrationProps['micro'];
  }>({ visible: false, badge: null, streakCount: 0, shieldUsed: false });
  const [showPostOnboardingGuide, setShowPostOnboardingGuide] = useState<boolean>(
    () => (globalThis as any).__justOnboarded === true,
  );
  const [routineStateByTemplate, setRoutineStateByTemplate] = useState<Record<string, RoutineSuggestionRecord>>({});
  const [routineRemoteHydrated, setRoutineRemoteHydrated] = useState(false);
  const autoScheduledRoutineOnceRef = useRef(false);
  const [draftOverlayItems, setDraftOverlayItems] = useState<ScheduleOverlayItem[] | null>(null);
  const todayStr = useMemo(() => getLocalDateKey(), []);
  const scheduleOverlayItemsRef = useRef<ScheduleOverlayItem[]>([]);
  const [reviewExpanded, setReviewExpanded] = useState(false);
  const [routineTemplates, setRoutineTemplates] = useState<RoutineTemplate[]>(defaultRoutineTemplates);

  // ✅ Overlay open state (repurposed for the ScheduleOverlay planning view)
  const [calendarOverlayOpen, setCalendarOverlayOpen] = useState(false);

  // ✅ Hard guards to prevent sync loops
  const didInitialSyncRef = useRef(false);
  const lastActiveSyncAtRef = useRef(0);
  const recoveryProgressionInFlightRef = useRef(false);

  // ✅ Insights (typed, no any hacks)
  const insightsCtx = useScientificInsights();
  const rankedInsights = insightsCtx.insights;
  const topInsight = rankedInsights?.[0];
  const insightStatus = insightsCtx.status;
  const refreshInsight = insightsCtx.refresh;
  const insightsEnabled = insightsCtx.enabled;

  const [insightActionBusy, setInsightActionBusy] = useState(false);
  const [verifyAcknowledgment, setVerifyAcknowledgment] = useState<string | null>(null);

  const userSettingsQ = useQuery({
    queryKey: ['user:settings'],
    queryFn: getUserSettings,
    retry: false,
    throwOnError: false,
    staleTime: 3_600_000, // 1 hour — settings rarely change mid-session
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const routineSettingsQ = useQuery<RoutineTemplateSettings>({
    queryKey: ['routine:template:settings'],
    queryFn: loadRoutineTemplateSettings,
  });

  const hapticsEnabled = userSettingsQ.data?.hapticsEnabled ?? true;

  useEffect(() => {
    let cancelled = false;
    const uid = session?.user?.id ?? null;

    (async () => {
      let shouldShow = false;
      if ((globalThis as any).__justOnboarded) {
        shouldShow = true;
        delete (globalThis as any).__justOnboarded;
      }
      try {
        const flag = await AsyncStorage.getItem('@reclaim/just_onboarded_hint');
        if (flag === '1') {
          shouldShow = true;
          await AsyncStorage.removeItem('@reclaim/just_onboarded_hint');
        }
      } catch {
        // ignore
      }

      if (cancelled) return;

      if (uid && (await isPostOnboardingHomeGuideDismissed(uid))) {
        setShowPostOnboardingGuide(false);
        return;
      }

      if (shouldShow) {
        setShowPostOnboardingGuide(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const state = await loadRoutineState(todayStr);
      if (!cancelled) setRoutineStateByTemplate(state ?? {});
      if (!cancelled) setRoutineRemoteHydrated(false);
      // Phase 3: optional remote hydration (non-blocking)
      fetchRoutineSuggestionsRemote(todayStr)
        .then((remote) => {
        if (cancelled || !remote?.length) return;
        const safeState = state ?? {};
        if (__DEV__ && state === undefined) {
          console.warn('[Dashboard] loadRoutineState returned undefined, using empty object');
        }
        const merged = mergeRemoteRoutineSuggestionsIntoLocal(safeState, remote);
        setRoutineStateByTemplate(merged);
        })
        .finally(() => {
          if (cancelled) return;
          setRoutineRemoteHydrated(true);
      });
      fetchRoutineTemplatesRemote().then((remote) => {
        if (cancelled) return;
        if (remote?.length) {
          const mapped: RoutineTemplate[] = remote.map((r) => ({
            id: r.id,
            title: r.title,
            kind: r.kind,
            durationMin: r.duration_min,
            windowStartMin: r.window_start_min,
            windowEndMin: r.window_end_min,
            exclusivity: r.exclusivity,
            enabled: r.enabled,
          }));
          setRoutineTemplates(mapped);
        }
      });
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [todayStr]);
  const hapticsEnabledRef = useRef(hapticsEnabled);
  useEffect(() => {
    hapticsEnabledRef.current = hapticsEnabled;
  }, [hapticsEnabled]);

  const fireHaptic = useCallback((style: 'impact' | 'success' | 'selection' = 'impact') => {
    triggerLightHaptic({
      enabled: hapticsEnabledRef.current,
      reduceMotion: reduceMotionRef.current,
      style,
    });
  }, []);

  const medsQ = useQuery<Med[]>({
    queryKey: ['meds'],
    queryFn: listMeds,
    retry: false,
    throwOnError: false,
    staleTime: 3_600_000, // 1 hour — med list changes rarely; MedsScreen invalidates on add/edit
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const medLogsQ = useQuery({
    queryKey: ['meds:logs:7d'],
    queryFn: () => listMergedMedDoseLogsLastNDays(7),
    enabled: !!session,
    retry: false,
    throwOnError: false,
    staleTime: 1_800_000, // 30 min — logs change when doses are logged
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const sleepQ = useQuery<HealthSleepSession | null>({
    queryKey: ['dashboard:lastSleep'],
    queryFn: fetchLatestSleep,
    retry: false,
    throwOnError: false,
    staleTime: 21_600_000, // 6 hours — sleep data is once-per-day; AppState listener drives refresh
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const sleepSettingsQ = useQuery<SleepSettings>({
    queryKey: ['sleep:settings'],
    queryFn: loadSleepSettings,
    retry: false,
    throwOnError: false,
    staleTime: 43_200_000, // 12 hours — sleep settings rarely change mid-session
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const integrationsQ = useQuery({
    queryKey: ['health:integrations:status'],
    queryFn: () => fetchIntegrationStatusesWithSnapshot(session?.user?.id),
    enabled: !!session,
    retry: false,
    throwOnError: false,
    staleTime: 120_000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const hasSleepCapableProvider = useMemo((): boolean | undefined => {
    const s = integrationsQ.data;
    if (s === undefined) return undefined;
    const ids = ['health_connect', 'apple_healthkit', 'samsung_health'] as const;
    return ids.some((id) => s[id]?.connected === true);
  }, [integrationsQ.data]);

  const recoveryQ = useQuery({
    queryKey: ['recovery:progress'],
    queryFn: getRecoveryProgress,
    retry: false,
    throwOnError: false,
    staleTime: 3_600_000, // 1 hour — only changes after recovery-stage events
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const streaksQ = useQuery({
    queryKey: ['streaks'],
    queryFn: getStreakStore,
    retry: false,
    throwOnError: false,
    staleTime: 1_800_000, // 30 min — invalidated explicitly when streak events fire
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const sleepSessionsRingQ = useQuery({
    queryKey: ['sleep:sessions:ring'],
    queryFn: () => listSleepSessions(7),
    enabled: !!session,
    retry: false,
    throwOnError: false,
    staleTime: 21_600_000, // 6 hours — nightly data; health sync invalidates
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const moodCheckinsQ = useQuery({
    queryKey: ['mood:checkins:7d'],
    queryFn: () => listMoodCheckins(15),
    enabled: !!session,
    retry: false,
    throwOnError: false,
    staleTime: 1_800_000, // 30 min
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const moodArcCheckinsQ = useQuery({
    queryKey: ['mood:checkins:60d'],
    queryFn: () => listMoodCheckins(60),
    enabled: !!session,
    retry: false,
    throwOnError: false,
    staleTime: 1_800_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const sleepArcSessionsQ = useQuery({
    queryKey: ['sleep:sessions:30d'],
    queryFn: () => listSleepSessions(30),
    enabled: !!session,
    retry: false,
    throwOnError: false,
    staleTime: 21_600_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const hasMoodCheckinsRecent = useMemo(() => {
    const checkins = (moodCheckinsQ.data ?? []) as Array<{ created_at?: string }>;
    if (!checkins.length) return false;
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return checkins.some((c) => new Date(c.created_at ?? 0).getTime() >= sevenDaysAgo);
  }, [moodCheckinsQ.data]);

  // ✅ Calendar query lives here (so we can show next 2 events in Today)
  const calendarQ = useQuery<CalendarEvent[]>({
    queryKey: ['calendar', 'today'],
    queryFn: getTodayEvents,
    refetchInterval: 5 * 60 * 1000,
    retry: false,
    throwOnError: false,
  });

  // Training: active program, today's program day, sessions
  const trainingActiveProgramQ = useQuery({
    queryKey: ['training:activeProgram'],
    queryFn: getActiveProgramInstance,
    retry: false,
    throwOnError: false,
    staleTime: 3_600_000, // 1 hour — active program rarely changes mid-day
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
  const todayYMD = useMemo(() => formatLocalDateYYYYMMDD(new Date()), []);
  const trainingProgramDaysQ = useQuery({
    queryKey: ['training:programDays:today', trainingActiveProgramQ.data?.id, todayYMD],
    queryFn: () => {
      if (!trainingActiveProgramQ.data) return [];
      return getProgramDays(trainingActiveProgramQ.data.id, todayYMD, todayYMD);
    },
    enabled: !!trainingActiveProgramQ.data,
    retry: false,
    throwOnError: false,
    staleTime: 1_800_000, // 30 min — TrainingScreen invalidates on session start/end
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
  const trainingSessionsQ = useQuery({
    queryKey: ['training:sessions'],
    queryFn: () => listTrainingSessions(20),
    retry: false,
    throwOnError: false,
    staleTime: 1_800_000, // 30 min — invalidated explicitly on session completion
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const recoveryStage = useMemo(
    () => getStageById((recoveryQ.data?.currentStageId ?? 'foundation') as RecoveryStageId),
    [recoveryQ.data?.currentStageId],
  );

  const recoveryWeekInStage = useMemo(
    () =>
      computeWeekInRecoveryStage(
        recoveryQ.data?.currentWeek,
        (recoveryQ.data?.currentStageId ?? 'foundation') as RecoveryStageId,
      ),
    [recoveryQ.data?.currentWeek, recoveryQ.data?.currentStageId],
  );

  const firstName = useMemo(() => {
    const metadata = (session?.user?.user_metadata as Record<string, unknown>) ?? {};
    const raw =
      (metadata.preferred_name as string | undefined) ??
      (metadata.first_name as string | undefined) ??
      (metadata.given_name as string | undefined) ??
      (metadata.full_name as string | undefined) ??
      (metadata.name as string | undefined) ??
      session?.user?.email ??
      '';
    const trimmed = raw?.trim?.();
    if (!trimmed) return null;
    return trimmed.split(/\s+/)[0];
  }, [session?.user]);

  const greeting = useMemo(() => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good morning';
    if (hours < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const greetingText = useMemo(() => `${greeting}, ${firstName ?? 'there'}`, [greeting, firstName]);

  const streaks = streaksQ.data ?? {
    mood: { count: 0, longest: 0, badges: [] as string[] },
    medication: { count: 0, longest: 0, badges: [] as string[] },
    sleep: { count: 0, longest: 0, badges: [] as string[] },
  };

  const moodStreak = streaks.mood ?? { count: 0, longest: 0, badges: [] as string[] };
  const medStreak = streaks.medication ?? { count: 0, longest: 0, badges: [] as string[] };
  const sleepStreak = streaks.sleep ?? { count: 0, longest: 0, badges: [] as string[] };

  // Training: today's program day, in-progress session, completed today
  const todayProgramDay = useMemo(() => {
    const days = trainingProgramDaysQ.data ?? [];
    return (Array.isArray(days) ? days : []).find((d: any) => d?.date === todayYMD) ?? null;
  }, [trainingProgramDaysQ.data, todayYMD]);
  const inProgressSession = useMemo(() => {
    const sessions = (trainingSessionsQ.data ?? []) as any[];
    return sessions.find((s) => s?.started_at && !s?.ended_at) ?? null;
  }, [trainingSessionsQ.data]);
  const completedSessionToday = useMemo(() => {
    const sessions = (trainingSessionsQ.data ?? []) as any[];
    const today = new Date();
    return (
      sessions.find((s) => {
        if (!s?.ended_at) return false;
        const end = new Date(s.ended_at);
        return (
          end.getFullYear() === today.getFullYear() &&
          end.getMonth() === today.getMonth() &&
          end.getDate() === today.getDate()
        );
      }) ?? null
    );
  }, [trainingSessionsQ.data]);

  const sleepMidpointStd = useMemo(() => {
    if (!Array.isArray(sleepSessionsRingQ.data) || sleepSessionsRingQ.data.length < 2) return null;
    const midpoints = sleepSessionsRingQ.data
      .map((s: SleepSessionRow) => getSleepMidpointMinutes(s.start_time, s.end_time))
      .filter((v): v is number => v !== null);
    if (midpoints.length < 2) return null;
    return standardDeviation(midpoints);
  }, [sleepSessionsRingQ.data]);

  const routineSignals = useMemo((): RoutineSignal[] => {
    const signals: RoutineSignal[] = [];
    if ((moodStreak.count ?? 0) > 0) {
      signals.push({ key: 'mood', progress: Math.min((moodStreak.count ?? 0) / 7, 1) });
    }
    if (medAdherencePct !== null && Array.isArray(medsQ.data) && medsQ.data.length > 0) {
      signals.push({ key: 'meds', progress: Math.max(0, Math.min(1, medAdherencePct / 100)) });
    }
    if (sleepMidpointStd !== null) {
      signals.push({ key: 'sleep', progress: Math.max(0, Math.min(1, 1 - sleepMidpointStd / 120)) });
    }
    return signals;
  }, [medAdherencePct, medsQ.data, moodStreak.count, sleepMidpointStd]);

  const recoveryBlockerLine = useMemo(
    () => computeRecoveryBlockerLine(routineSignals, { medAdherencePct, sleepMidpointStd }),
    [routineSignals, medAdherencePct, sleepMidpointStd],
  );

  const hasConfiguredMeds = Array.isArray(medsQ.data) && medsQ.data.length > 0;

  const recoveryActionSteps = useMemo(
    () =>
      computeRecoveryActionSteps((recoveryQ.data?.currentStageId ?? 'foundation') as RecoveryStageId, recoveryStage, {
        sleepSettings: sleepSettingsQ.data,
        medLogs: Array.isArray(medLogsQ.data) ? medLogsQ.data : [],
        sleepSessions: Array.isArray(sleepSessionsRingQ.data) ? sleepSessionsRingQ.data : [],
        moodStreakCount: moodStreak.count ?? 0,
        sleepMidpointStd,
        hasConfiguredMeds,
      }),
    [
      recoveryQ.data?.currentStageId,
      recoveryStage,
      sleepSettingsQ.data,
      medLogsQ.data,
      sleepSessionsRingQ.data,
      moodStreak.count,
      sleepMidpointStd,
      hasConfiguredMeds,
    ],
  );

  const recoveryPrimaryCta = useMemo(
    () =>
      getRecoveryPrimaryCta(recoveryActionSteps, (recoveryQ.data?.currentStageId ?? 'foundation') as RecoveryStageId),
    [recoveryActionSteps, recoveryQ.data?.currentStageId],
  );

  useEffect(() => {
    if (!recoveryQ.data) return;
    if (recoveryQ.isLoading) return;
    if (recoveryProgressionInFlightRef.current) return;
    const currentStageId = (recoveryQ.data.currentStageId ?? 'foundation') as RecoveryStageId;
    const allStepsDone = recoveryActionSteps.length > 0 && recoveryActionSteps.every((s) => s.state === 'done');
    if (!allStepsDone) return;
    if ((recoveryQ.data.completedStageIds ?? []).includes(currentStageId)) return;

    recoveryProgressionInFlightRef.current = true;
    advanceRecoveryProgressFromStageCompletion(true)
      .then((next) => {
        qc.setQueryData(['recovery:progress'], next);
      })
      .catch((error) => {
        logger.warn('[RECOVERY_PROGRESS] failed to advance from stage completion', error);
      })
      .finally(() => {
        recoveryProgressionInFlightRef.current = false;
      });
  }, [qc, recoveryActionSteps, recoveryQ.data, recoveryQ.isLoading]);

  const handleRecoveryStepPress = useCallback(
    (stepId: string) => {
      switch (stepId) {
        case 'foundation_wake':
        case 'foundation_sleep':
        case 'stabilize_sessions':
        case 'stabilize_rhythm':
          navigateToSleep();
          return;
        case 'foundation_meds':
          navigateToMeds();
          return;
        case 'stabilize_mood':
          navigateToMood();
          return;
        default:
          navigation.navigate('Settings', { openSection: 'recovery' });
      }
    },
    [navigation],
  );

  const handleRecoveryCtaPress = useCallback(() => {
    if (recoveryPrimaryCta.stepId === 'plan') {
      navigation.navigate('Settings', { openSection: 'recovery' });
      return;
    }
    handleRecoveryStepPress(recoveryPrimaryCta.stepId);
  }, [handleRecoveryStepPress, navigation, recoveryPrimaryCta]);

  const upcomingDoses: UpcomingDose[] = useMemo(() => {
    if (!Array.isArray(medsQ.data)) return [];
    const logs = (medLogsQ.data ?? []) as Array<{
      med_id: string;
      scheduled_for?: string | null;
      status: 'taken' | 'skipped' | 'missed';
    }>;

    const items: UpcomingDose[] = [];

    medsQ.data.forEach((med) => {
      if (!med.id || !isScheduledMed(med)) return;

      upcomingDoseTimes(med.schedule as { times: string[]; days: number[] }, 24).forEach((scheduled) => {
        const scheduledDate = new Date(scheduled);

        // Only show doses for today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (scheduledDate < today || scheduledDate >= tomorrow) return;

        const alreadyLogged = logs.some((l: any) => {
          if (l.med_id !== med.id || l.status !== 'taken') return false;

          if (l.scheduled_for) {
            const diff = Math.abs(new Date(l.scheduled_for).getTime() - scheduled.getTime());
            return diff < 60000;
          }

          const loggedAt = new Date((l as any).taken_at ?? (l as any).created_at ?? new Date().toISOString());
          return isSameDay(loggedAt, scheduled);
        });

        if (alreadyLogged) return;

        items.push({
          id: `${med.id}-${scheduled.toISOString()}`,
          med,
          scheduled,
        });
      });
    });

    return items.sort((a, b) => a.scheduled.getTime() - b.scheduled.getTime()).slice(0, 6);
  }, [medsQ.data, medLogsQ.data]);

  // ✅ Next 2 calendar events
  const nextTwoCalendarEvents = useMemo(() => {
    const now = new Date();
    const events = Array.isArray(calendarQ.data) ? calendarQ.data : [];
    return events
      .filter((e) => e?.endDate && new Date(e.endDate).getTime() > now.getTime())
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 2);
  }, [calendarQ.data]);

  useEffect(() => {
    reduceMotionRef.current = reduceMotion;
  }, [reduceMotion]);

  const runHealthSync = useCallback(
    async (options: { showToast?: boolean; invalidateQueries?: boolean; reason?: HealthSyncReason } = {}) => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      setIsSyncing(true);
      try {
        const result = await requestHealthSync({
          reason: options.reason ?? 'dashboard_manual',
          invalidateSummaryQueries: options.invalidateQueries !== false,
        });
        syncDisplay.refresh();

        // Insights read from sleep_sessions; refetch so they see new data
        if (result.sleepSynced || result.activitySynced) {
          refreshInsight('health-sync').catch((e) => { if (__DEV__) logger.debug('[Dashboard]', e); });
        }
        // Celebration policy: only a USER-INITIATED import (showToast) with NEW
        // nights celebrates. Cold-open / background syncs stay silent — the sync
        // status line updates quietly instead.
        if (options.showToast) {
          const hardSleepFailure =
            result.debug?.sleepSyncStatus === 'write_failed' || !!result.debug?.saveError;
          if (hardSleepFailure) {
            const reason =
              result.debug?.saveError ??
              result.debug?.sleepWriteErrors?.[0] ??
              'No sleep sessions were saved.';
            setSnackbar({ visible: true, message: `Sleep sync failed: ${reason}` });
          } else {
            const celebrationLine = formatSyncCelebrationMessage(result);
            if (celebrationLine) {
              setCelebrationState({
                visible: true,
                badge: null,
                streakCount: 0,
                shieldUsed: false,
                micro: {
                  icon: 'cloud-sync',
                  title: celebrationLine,
                  subtitle: 'Your sleep and health data are up to date.',
                },
              });
            } else {
              setSnackbar({ visible: true, message: 'Up to date — no new nights.' });
            }
          }
        }
      } catch (error: any) {
        logger.warn('Health sync failed:', error);
        if (options.showToast) setSnackbar({ visible: true, message: error?.message ?? 'Health sync failed.' });
      } finally {
        isSyncingRef.current = false;
        setIsSyncing(false);
        syncDisplay.refresh();
      }
    },
    [qc, refreshInsight, syncDisplay],
  );

  useEffect(() => {
    if (didInitialSyncRef.current) return;
    didInitialSyncRef.current = true;

    let cancelled = false;
    (async () => {
      try {
        const lastSync = await getLastHealthSyncSuccessISO();
        if (!lastSync) {
          if (!cancelled) await runHealthSync({ invalidateQueries: false, reason: 'dashboard_initial' });
          return;
        }
        const lastSyncTime = new Date(lastSync).getTime();
        const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
        if (lastSyncTime < fifteenMinutesAgo && !cancelled) {
          await runHealthSync({ invalidateQueries: false, reason: 'dashboard_initial' });
        }
      } catch {
        // silent
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const SYNC_COOLDOWN = 15 * 60 * 1000;

    const handleAppState = async (state: AppStateStatus) => {
      if (state !== 'active') return;
      if (!isDashboardFocused) return;

      const now = Date.now();
      if (now - lastActiveSyncAtRef.current < 60_000) return;
      const lastSync = await getLastHealthSyncSuccessISO();
      if (cancelled) return;
      if (lastSync) {
        const lastSyncTime = new Date(lastSync).getTime();
        if (Number.isFinite(lastSyncTime) && now - lastSyncTime < SYNC_COOLDOWN) return;
      }

      lastActiveSyncAtRef.current = now;
      if (cancelled) return;
      await runHealthSync({ invalidateQueries: true, reason: 'dashboard_foreground' });
    };

    const sub = AppState.addEventListener('change', handleAppState);
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [isDashboardFocused, runHealthSync]);

  const moodMutation = useMutation({
    mutationFn: (rating: number) =>
      createMoodCheckin({
        rating,
        source: 'dashboard_quick_mood',
      }),
    onSuccess: async (_result, moodValue) => {
      qc.invalidateQueries({ queryKey: ['mood:canonical'] });
      qc.invalidateQueries({ queryKey: ['mood:checkins:7d'] });
      qc.invalidateQueries({ queryKey: ['mood:daily:supabase'] });
      qc.invalidateQueries({ queryKey: ['mood:local'] });
      // Grade today's forecast against the actual check-in (forecast vs actual).
      const gradeLine = await gradeForecastWithMood(moodValue).catch(() => null);
      setSnackbar({
        visible: true,
        message: gradeLine ?? 'Mood logged. Proud of you for checking in.',
      });
      await logTelemetry({
        name: 'mood_logged',
        properties: { source: 'dashboard_quick_mood', mood: moodValue, uiSurface: 'home_tile_modal' },
      });

      if (userSettingsQ.data?.badgesEnabled !== false) {
        const result = await recordStreakEvent('mood', new Date());
        await logTelemetry({
          name: 'mood_streak_updated',
          properties: { count: result.store.mood.count, longest: result.store.mood.longest },
        });
        await qc.invalidateQueries({ queryKey: ['streaks'] });
        if (result.newBadges.length > 0) {
          setCelebrationState({
            visible: true,
            badge: result.newBadges[0],
            streakCount: result.store.mood.count,
            shieldUsed: result.shieldUsed,
          });
          const totalBadges = Object.values(result.store).reduce((n, s) => n + (s.badges?.length ?? 0), 0);
          maybeRequestStoreReview(totalBadges).catch((e) => { if (__DEV__) logger.debug('[Dashboard]', e); });
        }
      }

      refreshInsight('dashboard-mood-log').catch((err: unknown) => logger.warn('Insight refresh failed after mood log', err));
    },
    onError: (error: any) => {
      setSnackbar({ visible: true, message: error?.message ?? 'Unable to log mood right now.' });
    },
  });

  const takeDoseMutation = useMutation({
    mutationFn: (input: { medId: string; scheduledISO: string }) =>
      logMedDose({
        med_id: input.medId,
        status: 'taken',
        taken_at: new Date().toISOString(),
        scheduled_for: input.scheduledISO,
      }),
    onSuccess: async (_result, variables) => {
      fireHaptic('success');
      qc.invalidateQueries({ queryKey: ['meds'] });
      qc.invalidateQueries({ queryKey: ['meds:logs:7d'] });
      setSnackbar({ visible: true, message: 'Dose logged. Nice work staying consistent.' });
      await logTelemetry({ name: 'med_dose_logged', properties: { medId: variables?.medId } });

      if (userSettingsQ.data?.badgesEnabled !== false) {
        const result = await recordStreakEvent('medication', new Date());
        await logTelemetry({
          name: 'med_streak_updated',
          properties: { count: result.store.medication.count, longest: result.store.medication.longest },
        });
        await qc.invalidateQueries({ queryKey: ['streaks'] });
        if (result.newBadges.length > 0) {
          setCelebrationState({
            visible: true,
            badge: result.newBadges[0],
            streakCount: result.store.medication.count,
            shieldUsed: result.shieldUsed,
            micro: undefined,
          });
          const totalBadges = Object.values(result.store).reduce((n, s) => n + (s.badges?.length ?? 0), 0);
          maybeRequestStoreReview(totalBadges).catch((e) => { if (__DEV__) logger.debug('[Dashboard]', e); });
        } else {
          setCelebrationState({
            visible: true,
            badge: null,
            streakCount: 0,
            shieldUsed: false,
            micro: {
              icon: 'pill',
              title: 'Dose logged',
              subtitle: 'Nice work staying on schedule.',
            },
          });
        }
      }
    },
    onError: (error: any) => {
      setSnackbar({ visible: true, message: error?.message ?? 'Failed to log medication dose.' });
    },
  });

  const handleMoodQuickTap = useCallback(
    (score: number) => {
      fireHaptic();
      moodMutation.mutate(score);
    },
    [fireHaptic, moodMutation],
  );

  const handleTakeDose = useCallback(
    (medId: string, scheduledISO: string) => {
      fireHaptic('selection');
      takeDoseMutation.mutate({ medId, scheduledISO });
    },
    [fireHaptic, takeDoseMutation],
  );

  const handleDismissPostOnboardingGuide = useCallback(async () => {
    setShowPostOnboardingGuide(false);
    const uid = session?.user?.id;
    await dismissPostOnboardingHomeGuide(uid);
  }, [session?.user?.id]);

  // ✅ Dashboard insight selection (Phase 6: centralized via useInsightForScreen)
  const dashboardPreferredScopes = useMemo(() => {
    const prefs = {
      needsSleepSync: !sleepQ.data && !sleepQ.isLoading,
      hasUpcomingMeds: upcomingDoses.length > 0,
      lowMedAdherence: medAdherencePct !== null && medAdherencePct < 70,
      needsMood: (moodStreak.count ?? 0) <= 0,
    };
    const preferred: InsightScope[] = [];
    if (prefs.needsSleepSync) preferred.push('sleep');
    if (hasConfiguredMeds && (prefs.hasUpcomingMeds || prefs.lowMedAdherence)) preferred.push('meds');
    if (prefs.needsMood) preferred.push('mood');
    const fallbackOrder: InsightScope[] = hasConfiguredMeds ? ['sleep', 'meds', 'mood'] : ['sleep', 'mood'];
    fallbackOrder.forEach((s) => {
      if (!preferred.includes(s)) preferred.push(s);
    });
    return preferred;
  }, [
    sleepQ.data,
    sleepQ.isLoading,
    upcomingDoses.length,
    medAdherencePct,
    moodStreak.count,
    hasConfiguredMeds,
  ]);

  const dashboardInsight = useInsightForScreen(rankedInsights, session, {
    screen: 'dashboard',
    preferredScopes: dashboardPreferredScopes,
    dashboardFirst: true,
    allowGlobalFallback: true,
  });

  // Schedule tomorrow's daily signal notification whenever the top insight is ready.
  // Fires at most once per day per unique insight (idempotent).
  useEffect(() => {
    if (dashboardInsight) {
      scheduleDailySignalNotification(dashboardInsight).catch((e) => { if (__DEV__) logger.debug('[Dashboard]', e); });
    }
  }, [dashboardInsight]);

  // Proactive mood trend alerts — nudge if silent for 3+ days, safety alert if last log was low.
  useEffect(() => {
    const allMoods = (moodCheckinsQ.data ?? []) as Array<{ rating?: number; mood?: number; created_at?: string }>;
    const sorted = [...allMoods].sort(
      (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
    );
    const latest = sorted[0];
    const lastLogISO = latest?.created_at ?? null;
    const lastScore =
      typeof latest?.rating === 'number'
        ? latest.rating
        : typeof latest?.mood === 'number'
        ? latest.mood
        : null;
    scheduleMoodTrendAlerts(lastLogISO, lastScore).catch((e) => { if (__DEV__) logger.debug('[Dashboard]', e); });
  }, [moodCheckinsQ.data]);

  const lifecycleNodeStatuses = useMemo(
    () =>
      getLifecycleNodeStatuses({
        moodStreakCount: moodStreak.count ?? 0,
        hasMoodCheckinsRecent,
        sleepData: sleepQ.data ? { durationMinutes: sleepQ.data.durationMinutes } : null,
        medLifecycleStatus: medAdherenceSnapshot.lifecycleStatus,
        hasInsight: !!dashboardInsight,
        todayProgramDay,
        inProgressSession,
        completedSessionToday,
        hasActiveProgram: !!trainingActiveProgramQ.data,
      }),
    [
      moodStreak.count,
      hasMoodCheckinsRecent,
      sleepQ.data,
      medAdherenceSnapshot.lifecycleStatus,
      dashboardInsight,
      todayProgramDay,
      inProgressSession,
      completedSessionToday,
      trainingActiveProgramQ.data,
    ],
  );

  const handleLifecycleNodePress = useCallback(
    (id: import('@/components/dashboard/LifecycleHero').LifecycleNodeId) => {
      fireHaptic();
      switch (id) {
        case 'mood':
          navigateToMood();
          break;
        case 'sleep':
          navigateToSleep();
          break;
        case 'training':
          navigateToTraining();
          break;
        case 'meds':
          navigateToMeds();
          break;
        case 'breath':
          navigateToMindfulness();
          break;
        case 'insights':
          navigateToAnalytics();
          break;
      }
    },
    [fireHaptic],
  );

  const handleInsightActionPress = useCallback(async () => {
    if (!dashboardInsight) return;
    const resolved = resolveInsightAction(dashboardInsight);
    if (resolved.kind === 'none') {
      // Advice-only: guidance already on the card — no fake "queued" snackbar.
      return;
    }

    fireHaptic();
    setInsightActionBusy(true);
    try {
      await logTelemetry({
        name: 'insight_action_executed',
        properties: {
          insightId: dashboardInsight.id,
          intent: resolved.intent,
          source: 'dashboard',
        },
      });

      await recordInsightActionForVerifyLite({
        userId: session?.user?.id,
        match: dashboardInsight,
        intent: resolved.intent,
      });

      switch (resolved.intent) {
        case 'open_training':
          navigateToTraining();
          break;
        case 'open_sleep':
          navigateToSleep();
          break;
        case 'open_mood_checkin':
          navigateToMood();
          break;
        case 'open_meditation':
          navigateToMindfulness();
          break;
        case 'open_meds_today':
          navigateToMeds();
          break;
        case 'open_analytics':
          navigateToAnalytics();
          break;
        default:
          break;
      }

      refreshInsight('dashboard-action').catch((err: unknown) =>
        logger.warn('Insight refresh failed after action', err),
      );
    } catch (error: any) {
      setSnackbar({
        visible: true,
        message: error?.message ?? 'Unable to follow up on that insight right now.',
      });
    } finally {
      setInsightActionBusy(false);
    }
  }, [dashboardInsight, refreshInsight, fireHaptic, session?.user?.id]);

  // Verify-lite: after a prior action, acknowledge when driving conditions cleared.
  useEffect(() => {
    if (!isDashboardFocused || insightStatus !== 'ready') return;
    let cancelled = false;
    (async () => {
      const pending = await loadInsightVerifyPending(session?.user?.id);
      const result = evaluateInsightVerifyLite({
        pending,
        context: insightsCtx.lastContext,
      });
      if (cancelled) return;
      if (result.status === 'expired') {
        await clearInsightVerifyPending(session?.user?.id);
        return;
      }
      if (result.status === 'cleared') {
        setVerifyAcknowledgment(result.acknowledgment);
        await clearInsightVerifyPending(session?.user?.id);
        logTelemetry({
          name: 'insight_condition_cleared',
          properties: {
            insightId: result.pending.insightId,
            intent: result.pending.intent,
            source: 'dashboard',
          },
        }).catch((e) => {
          if (__DEV__) logger.debug('[Dashboard]', e);
        });
      }
    })().catch((e) => {
      if (__DEV__) logger.debug('[Dashboard] verifyLite eval failed', e);
    });
    return () => {
      cancelled = true;
    };
  }, [
    isDashboardFocused,
    insightStatus,
    insightsCtx.lastContext,
    insightsCtx.lastUpdatedAt,
    session?.user?.id,
  ]);

  const handleInsightRefreshPress = useCallback(() => {
    if (insightStatus === 'loading') return;

    // Log telemetry for manual refresh
    logTelemetry({
      name: 'insight_refresh_pressed',
      properties: {
        screenSource: 'dashboard',
        reason: 'dashboard-manual',
      },
    }).catch((e) => { if (__DEV__) logger.debug('[Dashboard]', e); }); // Non-blocking

    refreshInsight('dashboard-manual').catch((err: unknown) => {
      logger.warn('Manual insight refresh failed', err);
      setSnackbar({ visible: true, message: 'Unable to refresh insights right now.' });
    });
  }, [refreshInsight, insightStatus]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await runHealthSync({ showToast: true });
      await qc.invalidateQueries({ queryKey: ['meds'] });
      await qc.invalidateQueries({ queryKey: ['meds:logs:7d'] });
      await qc.invalidateQueries({ queryKey: ['calendar', 'today'] });
      await qc.invalidateQueries({ queryKey: ['training:sessions'] });
      await qc.invalidateQueries({ queryKey: ['training:sessions:analytics'] });
      await qc.invalidateQueries({ queryKey: ['training:programDays:today'] });
      await qc.invalidateQueries({ queryKey: ['training:activeProgram'] });

      // Log telemetry for pull-to-refresh insight refresh
      logTelemetry({
        name: 'insight_refresh_pressed',
        properties: {
          screenSource: 'dashboard',
          reason: 'dashboard-refresh-gesture',
        },
      }).catch((e) => { if (__DEV__) logger.debug('[Dashboard]', e); }); // Non-blocking

      refreshInsight('dashboard-refresh-gesture').catch((err: unknown) =>
        logger.warn('Insight refresh failed during pull-to-refresh', err),
      );
    } finally {
      setRefreshing(false);
    }
  }, [qc, refreshInsight, runHealthSync]);

  const persistRoutineState = useCallback(
    async (next: Record<string, RoutineSuggestionRecord>) => {
      const safeNext = next ?? {};
      if (__DEV__ && next === undefined) {
        console.warn('[Dashboard] persistRoutineState received undefined next, using empty object');
      }
      setRoutineStateByTemplate(safeNext);
      await saveRoutineState(todayStr, safeNext);
      // Best-effort remote sync (phase 3)
      Object.values(safeNext).forEach((r) => {
        upsertRoutineSuggestionRemote({
          routine_template_id: r.templateId,
          date: todayStr,
          state: r.state,
          suggested_start_ts: r.startISO ?? null,
          suggested_end_ts: r.endISO ?? null,
          reason: null,
        }).catch((e) => { if (__DEV__) logger.debug('[Dashboard]', e); });
      });
    },
    [todayStr],
  );

  const handleAcceptRoutine = useCallback(
    async (tpl: RoutineTemplate, start: Date, end: Date) => {
      const safeState = routineStateByTemplate ?? {};
      if (__DEV__ && routineStateByTemplate === undefined) {
        console.warn('[Dashboard] routineStateByTemplate is undefined in handleAcceptRoutine, using empty object');
      }
      const next = { ...safeState };
      next[tpl.id] = {
        templateId: tpl.id,
        state: 'accepted',
        startISO: start.toISOString(),
        endISO: end.toISOString(),
      };
      await persistRoutineState(next);
    },
    [persistRoutineState, routineStateByTemplate],
  );

  const handleSkipRoutine = useCallback(
    async (tpl: RoutineTemplate) => {
      const safeState = routineStateByTemplate ?? {};
      if (__DEV__ && routineStateByTemplate === undefined) {
        console.warn('[Dashboard] routineStateByTemplate is undefined in handleSkipRoutine, using empty object');
      }
      const next = { ...safeState };
      next[tpl.id] = { templateId: tpl.id, state: 'skipped' };
      await persistRoutineState(next);
    },
    [persistRoutineState, routineStateByTemplate],
  );

  const handleAdjustRoutine = useCallback(
    (tpl: RoutineTemplate, start: Date, end: Date) => {
      const draft: ScheduleOverlayItem = {
        key: `draft-${tpl.id}`,
        time: start,
        kind: 'info',
        icon: 'calendar-plus',
        title: `Draft: ${tpl.title}`,
        subtitle: `${formatRange(start, end)} • Tap to place`,
        onPress: () => handleAcceptRoutine(tpl, start, end),
      };
      const safeRef = Array.isArray(scheduleOverlayItemsRef.current) ? scheduleOverlayItemsRef.current : [];
      if (__DEV__ && !Array.isArray(scheduleOverlayItemsRef.current)) {
        console.warn('[Dashboard] scheduleOverlayItemsRef.current is not an array, using empty array');
      }
      setDraftOverlayItems([draft, ...safeRef]);
      setCalendarOverlayOpen(true);
    },
    [handleAcceptRoutine],
  );

  const greetingSubtitle = useMemo(() => {
    if (upcomingDoses.length > 0) {
      const next = upcomingDoses[0];
      return `Today: ${next.med.name}${next.med.dose ? ` (${next.med.dose})` : ''} at ${formatTime(next.scheduled)}.`;
    }

    if (!sleepQ.data && !sleepQ.isLoading) return 'Let’s get your sleep synced — then we’ll keep it simple.';
    if (moodStreak.count > 0)
      return `You’re showing up • ${moodStreak.count} day${moodStreak.count === 1 ? '' : 's'} in a row.`;
    if (medAdherenceSnapshot.hasScheduledMeds) {
      return `Medication: ${medAdherenceSnapshot.headline} • ${medAdherenceSnapshot.subline}.`;
    }

    return 'One step at a time — you’re not alone in this.';
  }, [upcomingDoses, sleepQ.data, sleepQ.isLoading, moodStreak.count, medAdherenceSnapshot]);

  const greetingIcon = useMemo(() => {
    if (moodStreak.count >= 7) return 'emoticon-cool-outline';
    if (moodStreak.count >= 3) return 'emoticon-happy-outline';
    if (moodStreak.count >= 1) return 'emoticon-neutral-outline';
    return 'emoticon-outline';
  }, [moodStreak.count]);

  const stateForecast = useMemo(() => {
    const drivers: string[] = [];
    let risk = 0;
    let signalPoints = 0;
    if (sleepQ.data) signalPoints += 1;
    if (sleepMidpointStd !== null) signalPoints += 1;
    if (medAdherencePct !== null) signalPoints += 1;
    if (moodStreak.count >= 3) signalPoints += 1;

    if (!sleepQ.data && !sleepQ.isLoading) {
      risk += 20;
      drivers.push('sleep data missing');
    } else if (sleepMidpointStd !== null) {
      if (sleepMidpointStd > 90) {
        risk += 30;
        drivers.push('sleep timing drift is high');
      } else if (sleepMidpointStd > 60) {
        risk += 20;
        drivers.push('sleep timing is drifting');
      } else if (sleepMidpointStd > 45) {
        risk += 12;
        drivers.push('sleep timing slightly off');
      }
    }

    if (hasConfiguredMeds) {
      if (medAdherencePct === null) {
        risk += 8;
        drivers.push('medication trend still learning');
      } else if (medAdherencePct < 60) {
        risk += 28;
        drivers.push('medication adherence is low');
      } else if (medAdherencePct < 75) {
        risk += 14;
        drivers.push('medication rhythm is slipping');
      }
    }

    if (moodStreak.count <= 0) {
      risk += 10;
      drivers.push('mood signal is thin');
    } else if (moodStreak.count < 3) {
      risk += 6;
      drivers.push('mood trend is still forming');
    }

    const nextDose = upcomingDoses[0];
    const minsToNextDose = nextDose ? Math.round((nextDose.scheduled.getTime() - Date.now()) / 60000) : null;
    if (minsToNextDose !== null && minsToNextDose <= 120 && minsToNextDose >= -30) {
      risk += 12;
      drivers.push('next dose is due soon');
    }

    const boundedRisk = Math.max(0, Math.min(95, Math.round(risk)));
    const tone: '+' | '~' | '-' = boundedRisk >= 65 ? '-' : boundedRisk >= 40 ? '~' : '+';
    const thinSignals = signalPoints <= 2;
    const headline =
      tone === '-'
        ? thinSignals
          ? 'A bumpier stretch is possible — light data so far'
          : 'You may feel stretched in the next 12h'
        : tone === '~'
        ? thinSignals
          ? 'Mixed day ahead — forecast still calibrating'
          : 'You should feel okay with a few dips'
        : thinSignals
          ? 'Mostly steady is plausible — early read'
          : 'Patterns suggest a steadier window ahead';

    const confidenceBase =
      38 +
      signalPoints * 14 -
      Math.min(18, drivers.length * 6) -
      (thinSignals ? 8 : 0);
    const confidence = Math.max(34, Math.min(88, Math.round(confidenceBase)));

    let action = 'You are doing well. Keep your rhythm steady.';
    if (!sleepQ.data && !sleepQ.isLoading) {
      action = 'Sleep confidence builds automatically as more nights come in.';
    } else if (medAdherencePct !== null && medAdherencePct < 75 && nextDose) {
      action = `Try to take your next dose by ${formatTime(nextDose.scheduled)}.`;
    } else if (sleepMidpointStd !== null && sleepMidpointStd > 60) {
      action = 'Aim for a calmer wind-down tonight.';
    } else if (moodStreak.count <= 0) {
      action = 'A quick mood check-in will improve this forecast.';
    }

    return {
      tone,
      headline,
      confidence,
      drivers: drivers.slice(0, 2),
      action,
    };
  }, [
    sleepQ.data,
    sleepQ.isLoading,
    sleepMidpointStd,
    medAdherencePct,
    hasConfiguredMeds,
    moodStreak.count,
    upcomingDoses,
  ]);

  // Journal today's forecast so the evening check-in can grade it (forecast vs actual).
  useEffect(() => {
    recordTodayForecast({
      tone: stateForecast.tone,
      headline: stateForecast.headline,
      confidence: stateForecast.confidence,
    }).catch((e) => { if (__DEV__) logger.debug('[Dashboard] forecast journal', e); });
  }, [stateForecast.tone, stateForecast.headline, stateForecast.confidence]);

  // Schedule the weekly narrative notification (Sunday 19:30) with this week's stats.
  // Idempotent — fires at most once per calendar week.
  useEffect(() => {
    const moodRatings = ((moodCheckinsQ.data ?? []) as Array<{ rating?: number; mood?: number; created_at?: string }>)
      .filter((c) => {
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        return new Date(c.created_at ?? 0).getTime() >= sevenDaysAgo;
      })
      .map((c) => (typeof c.rating === 'number' ? c.rating : typeof c.mood === 'number' ? c.mood : null))
      .filter((v): v is number => v !== null);

    const moodAvg = moodRatings.length
      ? moodRatings.reduce((s, v) => s + v, 0) / moodRatings.length
      : null;
    const moodTrend =
      moodRatings.length >= 4
        ? moodRatings[0] > moodRatings[moodRatings.length - 1]
          ? 'down'
          : moodRatings[0] < moodRatings[moodRatings.length - 1]
            ? 'up'
            : 'stable'
        : null;

    const sleepAvgHours =
      sleepQ.data?.durationMinutes != null ? sleepQ.data.durationMinutes / 60 : null;

    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const weekSessions = (
      (trainingSessionsQ.data ?? []) as Array<{ started_at?: string | null; summary?: any }>
    ).filter((s) => s.started_at && Date.now() - new Date(s.started_at).getTime() < weekMs);
    const trainingPRCount = weekSessions.reduce((n, s) => {
      const prs = s.summary && typeof s.summary === 'object' ? s.summary.prs : null;
      return n + (Array.isArray(prs) ? prs.length : 0);
    }, 0);

    scheduleWeeklyNarrativeNotification({
      moodAvg,
      moodTrend: moodTrend as 'up' | 'down' | 'stable' | null,
      sleepAvgHours,
      trainingSessionCount: weekSessions.length,
      trainingPRCount,
      medAdherencePct,
      streakCount: moodStreak.count ?? null,
      insightLine: dashboardInsight?.message ?? null,
      focusLine: stateForecast.action ?? null,
    }).catch((e) => { if (__DEV__) logger.debug('[Dashboard]', e); });
  }, [
    moodCheckinsQ.data,
    sleepQ.data,
    trainingSessionsQ.data,
    medAdherencePct,
    moodStreak.count,
    dashboardInsight?.message,
    stateForecast.action,
  ]);


  const predictionTileSubline = useMemo(() => {
    const d0 = stateForecast.drivers[0];
    if (d0) {
      return d0.charAt(0).toUpperCase() + d0.slice(1);
    }
    const c = stateForecast.confidence;
    if (c >= 72) return 'Reasonably grounded in your recent rhythm';
    if (c >= 55) return 'Directional hint — still calibrating';
    return 'Light signals — log sleep & mood to tighten this';
  }, [stateForecast.drivers, stateForecast.confidence]);

  const primaryAction = useMemo(() => {
    if (upcomingDoses.length > 0) {
      const next = upcomingDoses[0];
      return {
        title: 'Next up',
        subtitle: `${next.med.name}${next.med.dose ? ` • ${next.med.dose}` : ''}`,
        meta: `Due ${formatTime(next.scheduled)}`,
        icon: 'pill' as const,
        cta: 'Mark taken',
        onPress: () => handleTakeDose(next.med.id!, next.scheduled.toISOString()),
        loading:
          takeDoseMutation.isPending &&
          takeDoseMutation.variables?.medId === next.med.id &&
          takeDoseMutation.variables?.scheduledISO === next.scheduled.toISOString(),
      };
    }

    if (dashboardInsight && dashboardInsight.id !== 'mood-sustained-low') {
      const resolved = resolveInsightAction(dashboardInsight);
      if (resolved.kind !== 'none' && resolved.ctaLabel) {
        const msg = String(dashboardInsight.message ?? '').trim();
        const subtitle = msg.length > 80 ? `${msg.slice(0, 77)}…` : msg;
        return {
          title: "From today's signal",
          subtitle: subtitle || 'A practical next step from your daily read.',
          meta: 'Daily signal',
          icon: 'lightbulb-on-outline' as const,
          cta: resolved.ctaLabel,
          onPress: () => {
            void handleInsightActionPress();
          },
          loading: insightActionBusy,
        };
      }
    }

    if (!sleepQ.data && !sleepQ.isLoading) {
      return {
        title: 'Get your sleep in',
        subtitle: 'One sync and you’re set.',
        meta:
          syncDisplay.phase === 'never'
            ? 'Never synced'
            : syncDisplay.phase === 'syncing'
              ? 'Syncing…'
              : `Last synced ${syncDisplay.relativeLabel}`,
        icon: 'sleep' as const,
        cta: 'Sync now',
        onPress: () => {
          fireHaptic('selection');
          runHealthSync({ showToast: true });
        },
        loading: isSyncing,
      };
    }

    if (inProgressSession) {
      return {
        title: 'Resume workout',
        subtitle: 'Pick up where you left off.',
        meta: 'In progress · same session on Training tile',
        icon: 'dumbbell' as const,
        cta: 'Resume',
        onPress: () => {
          fireHaptic('selection');
          navigateToTraining();
        },
        loading: false,
      };
    }

    if (todayProgramDay) {
      const templateLabel =
        (todayProgramDay as any)?.template_key != null
          ? getSessionTemplateLabel((todayProgramDay as any).template_key)
          : 'Today';
      return {
        title: `${templateLabel} workout`,
        subtitle: 'Ready when you are.',
        meta: 'Planned for today · also on Training tile',
        icon: 'dumbbell' as const,
        cta: 'Start',
        onPress: () => {
          fireHaptic('selection');
          navigateToTraining();
        },
        loading: false,
      };
    }

    return {
      title: 'Quick check-in',
      subtitle: 'How are you, right now?',
      meta: '2 seconds',
      icon: 'emoticon-happy-outline' as const,
      cta: 'Log mood',
      onPress: () => {
        fireHaptic('selection');
        navigateToMood();
      },
      loading: false,
    };
  }, [
    upcomingDoses,
    handleTakeDose,
    takeDoseMutation.isPending,
    takeDoseMutation.variables?.medId,
    takeDoseMutation.variables?.scheduledISO,
    dashboardInsight,
    handleInsightActionPress,
    insightActionBusy,
    sleepQ.data,
    sleepQ.isLoading,
    syncDisplay,
    runHealthSync,
    isSyncing,
    inProgressSession,
    todayProgramDay,
    fireHaptic,
    navigateToTraining,
    navigateToMood,
  ]);

  // ======================================================================
  // ✅ Accepted routine items (must be defined BEFORE scheduleItemsAll)
  // ======================================================================
  const acceptedRoutineItems = useMemo(() => {
    const entries = Object.values(routineStateByTemplate ?? {}).filter(
      (r) => r.state === 'accepted' && r.startISO && r.endISO,
    );
    const safeTemplates = Array.isArray(routineTemplates) ? routineTemplates : [];
    return entries
      .map((r) => {
        const start = new Date(r.startISO!);
        const end = new Date(r.endISO!);
        if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return null;
        const tpl = safeTemplates.find((t) => t.id === r.templateId);
        const title =
          tpl?.title ??
          (r.templateId.startsWith('training_') ? `${formatTrainingRoutineTemplateId(r.templateId)} workout` : 'Routine');
        return {
          id: `routine-${r.templateId}-${r.startISO}`,
          templateId: r.templateId,
          title,
          start,
          end,
          reason: tpl?.reason,
        };
      })
      .filter((v): v is NonNullable<typeof v> => !!v);
  }, [routineStateByTemplate, routineTemplates]);

  // ======================================================================
  // ✅ Combined schedule list → preview (6) + overlay (window, cap 25)
  // ======================================================================

  const scheduleItemsAll: ScheduleItem[] = useMemo(() => {
    const now = new Date();
    const items: ScheduleItem[] = [];

    // Calendar next 2
    const safeCalendarEvents = Array.isArray(nextTwoCalendarEvents) ? nextTwoCalendarEvents : [];
    if (__DEV__ && !Array.isArray(nextTwoCalendarEvents)) {
      console.warn('[Dashboard] nextTwoCalendarEvents is not an array, using empty array');
    }
    for (const ev of safeCalendarEvents) {
      const start = new Date(ev.startDate);
      const timeLabel = ev.allDay ? 'All day' : formatTime(start);
      const subtitleParts = [timeLabel];
      if (ev.location) subtitleParts.push(`📍 ${ev.location}`);
      items.push({
        key: `cal-${ev.id}`,
        time: start,
        kind: 'info',
        icon: 'calendar-clock',
        title: ev.title,
        subtitle: subtitleParts.join(' • '),
        onPress: () => setCalendarOverlayOpen(true),
      });
    }

    // Med schedule items (today)
    const safeUpcomingDoses = Array.isArray(upcomingDoses) ? upcomingDoses : [];
    if (__DEV__ && !Array.isArray(upcomingDoses)) {
      console.warn('[Dashboard] upcomingDoses is not an array, using empty array');
    }
    for (const d of safeUpcomingDoses) {
      items.push({
        key: `med-${d.id}`,
        time: d.scheduled,
        kind: 'med',
        icon: 'pill',
        title: d.med.name,
        subtitle: `${formatTime(d.scheduled)}${d.med.dose ? ` • ${d.med.dose}` : ''}`,
        medId: d.med.id!,
        scheduledISO: d.scheduled.toISOString(),
      });
    }

    // Sleep plan items
    const settings = sleepSettingsQ.data;
    const targetMins = settings?.targetSleepMinutes ?? 480;
    const wakeHHMM = settings?.typicalWakeHHMM ?? settings?.desiredWakeHHMM ?? '07:00';
    const wakeMins = parseHHMMToMinutes(wakeHHMM);

    if (wakeMins !== null) {
      const bedtimeMins = wakeMins - targetMins;
      const windDownBuffer = 60;
      const windDownMins = bedtimeMins - windDownBuffer;

      const windDownDate = dateWithTimeLikeToday(windDownMins, now);
      const bedtimeDate = dateWithTimeLikeToday(bedtimeMins, now);

      if (windDownDate.getTime() < now.getTime() - 5 * 60 * 1000) windDownDate.setDate(windDownDate.getDate() + 1);
      if (bedtimeDate.getTime() < now.getTime() - 5 * 60 * 1000) bedtimeDate.setDate(bedtimeDate.getDate() + 1);

      items.push({
        key: `sleep-winddown-${windDownDate.toISOString()}`,
        time: windDownDate,
        kind: 'sleep',
        icon: 'weather-night',
        title: 'Start winding down',
        subtitle: `${formatTime(windDownDate)} • Target ${Math.round(targetMins / 60)}h sleep`,
      });

      items.push({
        key: `sleep-bedtime-${bedtimeDate.toISOString()}`,
        time: bedtimeDate,
        kind: 'sleep',
        icon: 'sleep',
        title: 'Target bedtime',
        subtitle: `${formatTime(bedtimeDate)} • Wake ${wakeHHMM}`,
      });
    } else {
      items.push({
        key: 'sleep-plan-missing',
        time: new Date(now.getTime() + 60 * 60 * 1000),
        kind: 'info',
        icon: 'clock-outline',
        title: 'Set your wake time',
        subtitle: 'Add a typical wake time in Sleep to generate a bedtime plan.',
      });
    }

    // Accepted routines (including training)
    for (const r of acceptedRoutineItems) {
      const isTraining = r.templateId.startsWith('training_');
      items.push({
        key: r.id,
        time: r.start,
        kind: isTraining ? 'training' : 'info',
        icon: isTraining ? 'dumbbell' : 'clock-outline',
        title: r.title,
        subtitle: `${formatTime(r.start)} • ${r.reason ?? 'Added to your schedule'}`,
        ...(isTraining && { sessionTemplate: r.templateId.replace('training_', '') as SessionTemplate }),
        ...(isTraining ? { onPress: () => { fireHaptic(); navigateToTraining(); } } : {}),
      } as ScheduleItem);
    }

    // Guard: only add the program-day fallback if no training-kind item has
    // already been pushed by accepted routines. Checking by item.kind (rather
    // than templateId prefix) is robust against custom remote template IDs
    // that don't follow the 'training_' naming convention.
    const alreadyHasTrainingItem = items.some((it) => it.kind === 'training');

    // Today's program-day fallback only when no explicit training item is present.
    if (todayProgramDay && !alreadyHasTrainingItem) {
      const profile = trainingActiveProgramQ.data;
      const timeWindow = (profile as any)?.preferred_time_window ?? {};
      const isMorning = timeWindow.morning ?? false;
      const defaultHour = isMorning ? 9 : 17;
      const suggestedStart = new Date(now);
      suggestedStart.setHours(defaultHour, 0, 0, 0);
      if (suggestedStart.getTime() > now.getTime() - 60 * 60 * 1000) {
        items.push({
          key: `training-today-${todayYMD}`,
          time: suggestedStart,
          kind: 'training',
          icon: 'dumbbell',
          title: `${getSessionTemplateLabel((todayProgramDay as any)?.template_key ?? 'full_body')} workout`,
          subtitle: `${formatTime(suggestedStart)} • Planned for today`,
          sessionTemplate: (todayProgramDay as any)?.template_key ?? ('full_body' as SessionTemplate),
          onPress: () => { fireHaptic(); navigateToTraining(); },
        });
      }
    }

    return items
      .filter((it) => it?.time && Number.isFinite(it.time.getTime()))
      .sort((a, b) => a.time.getTime() - b.time.getTime());
  }, [
    nextTwoCalendarEvents,
    upcomingDoses,
    sleepSettingsQ.data,
    acceptedRoutineItems,
    routineStateByTemplate,
    todayProgramDay,
    todayYMD,
    trainingActiveProgramQ.data,
  ]);

  // Guard: ensure scheduleItemsAll is always an array
  const safeScheduleItemsAll = Array.isArray(scheduleItemsAll) ? scheduleItemsAll : [];
  if (__DEV__ && !Array.isArray(scheduleItemsAll)) {
    console.warn('[Dashboard] scheduleItemsAll is not an array, using empty array');
  }

  type BusyBlock = { start: Date; end: Date };

  const routineSuggestions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateStr = today.toISOString().slice(0, 10);

    // Build busy blocks from schedule items (approximate durations)
    const safeScheduleItems = Array.isArray(scheduleItemsAll) ? scheduleItemsAll : [];
    if (__DEV__ && !Array.isArray(scheduleItemsAll)) {
      console.warn('[Dashboard] scheduleItemsAll is not an array in routineSuggestions, using empty array');
    }
    const busy: BusyBlock[] = safeScheduleItems.map((it) => {
      const start = it.time;
      const durationMin =
        it.kind === 'sleep' ? 90 : it.kind === 'med' ? 30 : it.kind === 'training' ? 60 : 45;
      const end = new Date(start.getTime() + durationMin * 60000);
      return { start, end };
    });

    const byTemplateState = routineStateByTemplate ?? {};

    const slots: Array<{
      template: RoutineTemplate;
      start: Date;
      end: Date;
      reason: string;
      state: RoutineSuggestionRecord['state'];
    }> = [];

    const safeTemplates = Array.isArray(routineTemplates) ? routineTemplates : [];
    if (__DEV__ && !Array.isArray(routineTemplates)) {
      console.warn('[Dashboard] routineTemplates is not an array, using empty array');
    }
    const settings = routineSettingsQ.data ?? {};
    const templates = safeTemplates
      .filter((t) => {
        const enabled = settings[t.id] ?? t.enabled;
        return enabled;
      })
      .slice(0, 5);

    const isFree = (start: Date, end: Date) => {
      return !busy.some((b) => !(end <= b.start || start >= b.end));
    };

    const findFirstSlot = (tpl: RoutineTemplate): { start: Date; end: Date; reason: string } | null => {
      const now = new Date();
      const dayStart = new Date(now);
      dayStart.setHours(0, 0, 0, 0);

      const windowStart = new Date(dayStart.getTime());
      windowStart.setMinutes(tpl.windowStartMin);
      const windowEnd = new Date(dayStart.getTime());
      windowEnd.setMinutes(tpl.windowEndMin);

      let cursor = new Date(Math.max(now.getTime(), windowStart.getTime()));
      while (cursor.getTime() + tpl.durationMin * 60000 <= windowEnd.getTime()) {
        const end = new Date(cursor.getTime() + tpl.durationMin * 60000);
        if (isFree(cursor, end)) {
          const reason =
            cursor >= windowStart && cursor <= windowEnd
              ? tpl.reason ?? 'Fits inside your preferred window.'
              : 'Fits between your commitments.';
          return { start: cursor, end, reason };
        }
        // Advance by 15 minutes to search next slot
        cursor = new Date(cursor.getTime() + 15 * 60000);
      }
      // No free slot found; fall back to window start as edit-only
      return null;
    };

    const fallbackAnchorMinutes = (tpl: RoutineTemplate): number => {
      const windowSpan = Math.max(0, tpl.windowEndMin - tpl.windowStartMin);
      const withinWindow = (ratio: number) =>
        Math.round(tpl.windowStartMin + windowSpan * ratio);

      switch (tpl.id) {
        case 'breakfast':
          return withinWindow(0.35); // earlier in breakfast window
        case 'lunch':
          return withinWindow(0.5); // center of lunch window
        case 'dinner':
          return withinWindow(0.45); // slightly earlier than center for digestion
        case 'walk_break':
          return withinWindow(0.5);
        case 'plan_tomorrow':
          return withinWindow(0.6); // later evening prep
        default:
          return withinWindow(0.5);
      }
    };

    for (const tpl of templates) {
      const existing = byTemplateState[tpl.id];
      if (existing?.state === 'accepted' || existing?.state === 'skipped') continue;

      const slot = findFirstSlot(tpl);
      if (!slot) {
        // No free gap found: place a semantic fallback time (meal anchors, etc.)
        // clamped into the template window. This keeps intents visible/editable
        // without collapsing multiple suggestions onto the app-open timestamp.
        const base = new Date();
        base.setHours(0, 0, 0, 0);
        const windowStartDate = new Date(base.getTime() + tpl.windowStartMin * 60000);
        const windowEndDate = new Date(base.getTime() + tpl.windowEndMin * 60000);
        const latestValidStartMs = windowEndDate.getTime() - tpl.durationMin * 60000;
        const anchorMs = base.getTime() + fallbackAnchorMinutes(tpl) * 60000;
        const clampedStartMs = Math.max(windowStartDate.getTime(), Math.min(anchorMs, latestValidStartMs));
        const fallbackStart = new Date(clampedStartMs);
        const fallbackEnd = new Date(fallbackStart.getTime() + tpl.durationMin * 60000);
        slots.push({
          template: tpl,
          start: fallbackStart,
          end: fallbackEnd,
          reason: ROUTINE_NO_SLOT_REASON,
          state: 'suggested',
        });
        continue;
      }
      slots.push({
        template: tpl,
        start: slot.start,
        end: slot.end,
        reason: slot.reason,
        state: existing?.state ?? 'suggested',
      });
    }

    // Filter out accepted/skipped
    const filtered = slots.filter((s) => {
      const state = routineStateByTemplate?.[s.template.id]?.state;
      return state !== 'accepted' && state !== 'skipped';
    });

    return filtered.slice(0, 3);
  }, [routineStateByTemplate, scheduleItemsAll, routineSettingsQ.data, routineTemplates]);

  // Guard: ensure routineSuggestions is always an array
  const safeRoutineSuggestions = Array.isArray(routineSuggestions) ? routineSuggestions : [];
  if (__DEV__ && !Array.isArray(routineSuggestions)) {
    console.warn('[Dashboard] routineSuggestions is not an array, using empty array');
  }

  // ✅ Preview list: next 6 combined
  const scheduleItems: ScheduleItem[] = useMemo(() => {
    const safe = Array.isArray(scheduleItemsAll) ? scheduleItemsAll : [];
    if (__DEV__ && !Array.isArray(scheduleItemsAll)) {
      console.warn('[Dashboard] scheduleItemsAll is not an array in scheduleItems, using empty array');
    }
    return safe.slice(0, 6);
  }, [scheduleItemsAll]);

  /** Today plan: local calendar day only; drops Next up med + program fallback when that’s the primary CTA. */
  const todayPlanScheduleItems: ScheduleItem[] = useMemo(() => {
    const safe = Array.isArray(scheduleItemsAll) ? scheduleItemsAll : [];
    let rows = safe.filter((it) => formatLocalDateYYYYMMDD(it.time) === todayYMD);
    const nextDose = upcomingDoses[0];
    if (nextDose?.med?.id) {
      const iso = nextDose.scheduled.toISOString();
      rows = rows.filter(
        (it) => !(it.kind === 'med' && it.medId === nextDose.med.id && it.scheduledISO === iso),
      );
    }
    if (todayProgramDay && upcomingDoses.length === 0 && !inProgressSession) {
      rows = rows.filter((it) => it.key !== `training-today-${todayYMD}`);
    }
    return [...rows].sort((a, b) => a.time.getTime() - b.time.getTime());
  }, [scheduleItemsAll, todayYMD, upcomingDoses, todayProgramDay, inProgressSession]);

  /** First item tomorrow for light empty-state hint (not mixed into today’s list). */
  const todayPlanTomorrowPreview = useMemo(() => {
    const safe = Array.isArray(scheduleItemsAll) ? scheduleItemsAll : [];
    const nextCal = new Date();
    nextCal.setDate(nextCal.getDate() + 1);
    const yTomorrow = formatLocalDateYYYYMMDD(nextCal);
    const sorted = safe
      .filter((it) => formatLocalDateYYYYMMDD(it.time) === yTomorrow)
      .sort((a, b) => a.time.getTime() - b.time.getTime());
    const first = sorted[0];
    if (!first) return null;
    return {
      label: `${formatTime(first.time)} · ${first.title}`,
      onPress: () => {
        setDraftOverlayItems(null);
        setCalendarOverlayOpen(true);
      },
    };
  }, [scheduleItemsAll]);

  // ✅ Overlay list: include "just started" (now - 5 min) → tomorrow 12:00, cap 25
  const scheduleOverlayItems: ScheduleItem[] = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getTime() - 5 * 60 * 1000);
    const end = tomorrowNoonLocal(now);
    const safe = Array.isArray(scheduleItemsAll) ? scheduleItemsAll : [];
    if (__DEV__ && !Array.isArray(scheduleItemsAll)) {
      console.warn('[Dashboard] scheduleItemsAll is not an array in scheduleOverlayItems, using empty array');
    }

    return safe
      .filter((it) => it.time.getTime() >= start.getTime() && it.time.getTime() <= end.getTime())
      .slice(0, 25);
  }, [scheduleItemsAll]);

  // ✅ Feed ScheduleOverlay component
  const scheduleOverlayItemsForComponent: ScheduleOverlayItem[] = useMemo(() => {
    const safe = Array.isArray(scheduleOverlayItems) ? scheduleOverlayItems : [];
    if (__DEV__ && !Array.isArray(scheduleOverlayItems)) {
      console.warn('[Dashboard] scheduleOverlayItems is not an array, using empty array');
    }
    return safe.map((it) => ({
      key: it.key,
      time: it.time,
      kind: it.kind,
      icon: it.icon,
      title: it.title,
      subtitle: it.subtitle,
      onPress: it.onPress,
      ...(it.kind === 'med'
        ? {
            medId: it.medId,
            scheduledISO: it.scheduledISO,
          }
        : {}),
    })) as any;
  }, [scheduleOverlayItems]);

  useEffect(() => {
    scheduleOverlayItemsRef.current = scheduleOverlayItemsForComponent;
  }, [scheduleOverlayItemsForComponent]);

  const hasValidSlot = (s: { start?: Date; end?: Date; reason?: string }) =>
    !!s.start && !!s.end;

  const isWithinWindow = (s: any) => {
    if (!s.start || !s.end) return false;
    const tpl = s.template as RoutineTemplate;
    const startMin = minutesOfDay(s.start);
    const endMin = startMin + (tpl.durationMin ?? 0);
    return startMin >= tpl.windowStartMin && endMin <= tpl.windowEndMin;
  };

  const isAcceptAllSafe = useMemo(() => {
    const safe = Array.isArray(routineSuggestions) ? routineSuggestions : [];
    if (__DEV__ && !Array.isArray(routineSuggestions)) {
      console.warn('[Dashboard] routineSuggestions is not an array in isAcceptAllSafe, using empty array');
    }
    const candidates = safe.filter((s) => hasValidSlot(s));
    if (!candidates.length) return false;
    for (const s of candidates) {
      if (!s.start || !s.end) return false;
      if (!isWithinWindow(s)) return false;
    }

    // Pairwise overlap among suggestions
    for (let i = 0; i < candidates.length; i++) {
      for (let j = i + 1; j < candidates.length; j++) {
        const a = candidates[i];
        const b = candidates[j];
        if (!a.start || !a.end || !b.start || !b.end) return false;
        const overlap = !(a.end <= b.start || b.end <= a.start);
        if (overlap) return false;
      }
    }
    return true;
  }, [routineSuggestions]);

  const handleAcceptAll = useCallback(async () => {
    if (!isAcceptAllSafe) {
      setReviewExpanded(true);
      setSnackbar({ visible: true, message: 'A couple items need your input.' });
      return;
    }
    const safeRoutineSuggestions = Array.isArray(routineSuggestions) ? routineSuggestions : [];
    if (__DEV__ && !Array.isArray(routineSuggestions)) {
      console.warn('[Dashboard] routineSuggestions is not an array in handleAcceptAll, using empty array');
    }
    const safe = safeRoutineSuggestions.filter((s) => hasValidSlot(s));
    const safeState = routineStateByTemplate ?? {};
    if (__DEV__ && routineStateByTemplate === undefined) {
      console.warn('[Dashboard] routineStateByTemplate is undefined in handleAcceptAll, using empty object');
    }
    const next = { ...safeState };
    for (const s of safe) {
      next[s.template.id] = {
        templateId: s.template.id,
        state: 'accepted',
        startISO: s.start!.toISOString(),
        endISO: s.end!.toISOString(),
      };
    }
    await persistRoutineState(next);
    setSnackbar({ visible: true, message: `Added ${safe.length} items to your schedule.` });
  }, [isAcceptAllSafe, persistRoutineState, routineSuggestions, routineStateByTemplate, setSnackbar]);

  // Auto-schedule daily intentions:
  // If there's no routine state persisted for today yet, accept today's suggestions
  // even when they overlap existing calendar items (the user can still adjust later).
  useEffect(() => {
    if (autoScheduledRoutineOnceRef.current) return;
    if (!routineRemoteHydrated) return;

    const state = routineStateByTemplate ?? {};
    if (Object.keys(state).length > 0) return;

    const safe = Array.isArray(routineSuggestions) ? routineSuggestions : [];
    const toAccept = safe
      .filter((s) => !!s.start && !!s.end)
      .slice(0, 3); // match visible daily intentions list

    if (!toAccept.length) return;

    autoScheduledRoutineOnceRef.current = true;
    const next: Record<string, RoutineSuggestionRecord> = {};
    for (const s of toAccept) {
      next[s.template.id] = {
        templateId: s.template.id,
        state: 'accepted',
        startISO: s.start!.toISOString(),
        endISO: s.end!.toISOString(),
      };
    }

    void persistRoutineState(next);
  }, [routineRemoteHydrated, routineStateByTemplate, routineSuggestions, persistRoutineState]);

  // Removed scheduleMorningNotification - morning review is now handled by NotificationScheduler
  // which schedules it at wake time + 30 min based on sleep settings, with proper appTag for deduping

  const processRoutineIntent = useCallback(
    (intent: any) => {
      if (!intent) return;
      const ts = intent.ts ?? 0;
      if (Date.now() - ts > INTENT_TTL_MS) return;
      if (intent.action === 'review') {
        setReviewExpanded(true);
      } else if (intent.action === 'edit') {
        setReviewExpanded(true);
        const safe = Array.isArray(routineSuggestions) ? routineSuggestions : [];
        if (__DEV__ && !Array.isArray(routineSuggestions)) {
          console.warn('[Dashboard] routineSuggestions is not an array in processRoutineIntent, using empty array');
        }
        const first = safe[0];
        if (first) {
          handleAdjustRoutine(first.template, first.start, first.end);
        }
      } else if (intent.action === 'accept_all') {
        if (isAcceptAllSafe) {
          handleAcceptAll();
        } else {
          setReviewExpanded(true);
          setSnackbar({ visible: true, message: 'A couple items need your input.' });
        }
      }
    },
    [handleAcceptAll, handleAdjustRoutine, isAcceptAllSafe, routineSuggestions, setSnackbar],
  );

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const intents: any[] = [];
      const globalIntent = (globalThis as any).__routineIntent;
      if (globalIntent) intents.push(globalIntent);
      try {
        const raw = await AsyncStorage.getItem(INTENT_KEY);
        if (raw) {
          const stored = JSON.parse(raw);
          intents.push(stored);
          await AsyncStorage.removeItem(INTENT_KEY);
        }
      } catch {
        // ignore
      }
      if (!intents.length || cancelled) return;
      intents.sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0));
      const latest = intents[0];
      delete (globalThis as any).__routineIntent;
      processRoutineIntent(latest);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [processRoutineIntent]);

  const cardRadius = 18;
  /** Between major stack blocks (insight, primary, Today, recovery, streaks). */
  const sectionGap = RECLAIM_SCREEN_SECTION_GAP;
  /** Vertical gap between the two state-tile rows only — same screen section rhythm. */
  const tileRowGap = RECLAIM_SCREEN_SECTION_GAP;
  const [contentHeight, setContentHeight] = useState(2000);
  const [heroInView, setHeroInView] = useState(true);
  const screenWidth = Dimensions.get('window').width;
  const [sleepTileOpen, setSleepTileOpen] = useState(false);
  const [forecastTileOpen, setForecastTileOpen] = useState(false);
  const [moodTileOpen, setMoodTileOpen] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);

  const sleepQualityHeadline = useMemo(() => {
    if (sleepQ.isLoading && !sleepQ.data) return 'Checking last night…';
    if (!sleepQ.data) {
      if (hasSleepCapableProvider === undefined) return 'Checking last night…';
      return hasSleepCapableProvider ? 'No night in Reclaim yet' : 'Connect a sleep source';
    }
    const mins = sleepQ.data.durationMinutes ?? 0;
    const hours = mins / 60;
    const targetMin = sleepSettingsQ.data?.targetSleepMinutes ?? 480;
    const targetH = targetMin / 60;
    const stagesRaw = (sleepQ.data as any)?.stages as Array<{ stage?: string; start?: Date | string; end?: Date | string }> | undefined;
    let awakeMin = 0;
    let awakeSegCount = 0;
    if (Array.isArray(stagesRaw)) {
      for (const seg of stagesRaw) {
        if (!String(seg.stage ?? '').toLowerCase().includes('awake')) continue;
        awakeSegCount += 1;
        const st = seg.start ? new Date(seg.start).getTime() : NaN;
        const en = seg.end ? new Date(seg.end).getTime() : NaN;
        if (Number.isFinite(st) && Number.isFinite(en) && en > st) awakeMin += (en - st) / 60000;
      }
    }
    const fragmented = awakeMin >= 40 || awakeSegCount >= 4;
    if (hours < 5) return 'Short night';
    if (fragmented) return 'Broken sleep';
    if (hours >= targetH - 0.25 && hours <= targetH + 1.25) return 'Close to your target';
    if (hours >= 6.5) return 'Solid night';
    return 'Uneven night';
  }, [sleepQ.data, sleepQ.isLoading, sleepSettingsQ.data, hasSleepCapableProvider]);

  const sleepTileEmpty = !sleepQ.isLoading && !sleepQ.data;
  const sleepTileSubline = useMemo(() => {
    if (sleepQ.isLoading && !sleepQ.data) return '…';
    if (!sleepQ.data) {
      return 'Log tonight\'s sleep to draw this';
    }
    if (!sleepQ.data?.startTime || !sleepQ.data?.endTime) {
      return 'Sync when you can — we’ll fill this in';
    }
    const start = new Date(sleepQ.data.startTime);
    const end = new Date(sleepQ.data.endTime);
    const h = sleepQ.data.durationMinutes ? (sleepQ.data.durationMinutes / 60).toFixed(1) : null;
    const range = `${start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} → ${end.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    })}`;
    const stagesRaw = (sleepQ.data as any)?.stages as unknown[] | undefined;
    const stageHint =
      Array.isArray(stagesRaw) && stagesRaw.length > 0 ? ' · Hypnogram from last night' : '';
    return h ? `${h}h · ${range}${stageHint}` : `${range}${stageHint}`;
  }, [sleepQ.data, sleepQ.isLoading, hasSleepCapableProvider]);

  const sleepTileHypnogram = useMemo(() => {
    type RawSeg = { stage: string; durationMinutes: number };
    type HypSeg = { key: string; leftPct: number; widthPct: number; y: number; color: string; stage: string };
    const rawStages = (sleepQ.data as any)?.stages;
    const hasRealStages = Array.isArray(rawStages) && rawStages.length > 0;
    if (!hasRealStages) return [];

    const source = rawStages as any[];

    const mapped: RawSeg[] = source.map((seg: any) => {
      const stage = `${seg?.stage ?? 'light'}`.toLowerCase();
      const startMs = seg?.start ? new Date(seg.start).getTime() : NaN;
      const endMs = seg?.end ? new Date(seg.end).getTime() : NaN;
      const durationMinutes =
        Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs
          ? Math.max(1, Math.round((endMs - startMs) / 60000))
          : Math.max(1, Math.round((seg?.weight ?? 1) * 24));
      return { stage, durationMinutes };
    });

    const rows: RawSeg[] = [];
    for (const row of mapped) {
      const prev = rows[rows.length - 1];
      if (prev && prev.stage === row.stage) {
        prev.durationMinutes += row.durationMinutes;
      } else {
        rows.push({ ...row });
      }
    }

    const total = Math.max(1, rows.reduce((sum: number, r: RawSeg) => sum + r.durationMinutes, 0));
    const stageY = (stage: string) => {
      if (stage.includes('deep')) return 2;
      if (stage.includes('rem')) return 1.4;
      if (stage.includes('awake')) return 0.35;
      return 1;
    };

    let leftPct = 0;
    return rows.map((r: RawSeg, i: number): HypSeg => {
      const widthPct = Math.max(6, Math.round((r.durationMinutes / total) * 100));
      const segment: HypSeg = {
        key: `sleep-hyp-seg-${i}`,
        leftPct,
        widthPct,
        y: stageY(r.stage),
        color: sleepStageColorForTile(r.stage, theme.dark),
        stage: r.stage,
      };
      leftPct += widthPct;
      return segment;
    });
  }, [sleepQ.data, theme.dark]);

  const todayMoodForTile = useMemo(() => {
    const all = (moodCheckinsQ.data ?? []) as Array<{ rating?: number; mood?: number; created_at?: string }>;
    const today = new Date();
    let best: { rating: number; at: string } | null = null;
    for (const c of all) {
      const d = new Date(c.created_at ?? 0);
      if (!isSameDay(d, today)) continue;
      const r = c.rating ?? c.mood;
      if (r == null || Number.isNaN(Number(r))) continue;
      const at = c.created_at ?? '';
      if (!best || new Date(at).getTime() > new Date(best.at).getTime()) {
        best = { rating: Number(r), at };
      }
    }
    return best;
  }, [moodCheckinsQ.data]);

  const moodTileHeadline = useMemo(() => {
    if (moodCheckinsQ.isLoading && moodCheckinsQ.data == null) return 'Loading…';
    if (!todayMoodForTile) return 'Check in with how you feel';
    const r = todayMoodForTile.rating;
    if (r <= 5) {
      if (r <= 1) return 'Heavy day, noted';
      if (r === 2) return 'Rough patch logged';
      if (r === 3) return 'Hanging in there';
      if (r === 4) return 'Mostly steady today';
      return 'A good day so far';
    }
    if (r <= 7) return 'Steady enough today';
    return 'Lifted mood today';
  }, [moodCheckinsQ.isLoading, moodCheckinsQ.data, todayMoodForTile]);

  const moodTileVisualGlow = useMemo(() => {
    if (!todayMoodForTile) return undefined;
    const r = todayMoodForTile.rating;
    const n = r > 5 ? r / 2 : r;
    if (n <= 2) return theme.dark ? 'rgba(248,113,113,0.14)' : 'rgba(220,38,38,0.09)';
    if (n <= 3.5) return theme.dark ? 'rgba(251,191,36,0.13)' : 'rgba(217,119,6,0.09)';
    if (n <= 4.5) return theme.dark ? 'rgba(96,165,250,0.14)' : 'rgba(59,130,246,0.1)';
    return theme.dark ? 'rgba(52,211,153,0.12)' : 'rgba(5,150,105,0.09)';
  }, [todayMoodForTile, theme.dark]);

  const moodWeekDots = useMemo(() => {
    type C = { rating?: number; mood?: number; created_at?: string };
    const checkins = (moodCheckinsQ.data ?? []) as C[];
    const latestByYmd = new Map<string, { rating: number; t: number }>();
    for (const c of checkins) {
      const r = c.rating ?? c.mood;
      if (r == null || Number.isNaN(Number(r))) continue;
      const t = new Date(c.created_at ?? 0).getTime();
      const ymd = formatLocalDateYYYYMMDD(new Date(c.created_at ?? 0));
      const rating = Number(r);
      const prev = latestByYmd.get(ymd);
      if (!prev || t >= prev.t) latestByYmd.set(ymd, { rating, t });
    }
    const out: { key: string; rating: number | null; isToday: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(12, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const ymd = formatLocalDateYYYYMMDD(d);
      out.push({ key: ymd, rating: latestByYmd.get(ymd)?.rating ?? null, isToday: ymd === todayYMD });
    }
    return out;
  }, [moodCheckinsQ.data, todayYMD]);

  const moodTileEmpty = useMemo(
    () => !moodWeekDots.some((d) => d.rating != null),
    [moodWeekDots],
  );

  const moodTileSubline = useMemo(() => {
    if (moodTileEmpty) return 'Log mood to draw this rhythm';
    if (!todayMoodForTile) return 'A quick log helps the forecast';
    return `Updated ${formatDistanceToNow(new Date(todayMoodForTile.at), { addSuffix: true })}`;
  }, [todayMoodForTile, moodTileEmpty]);

  const trainingTileHeadline = useMemo(() => {
    if (inProgressSession) return 'Session in progress';
    if (completedSessionToday) return 'Done for today';
    if (todayProgramDay) {
      const tk = String((todayProgramDay as any)?.template_key ?? '').toLowerCase();
      if (tk.includes('push')) return 'Push day';
      if (tk.includes('pull')) return 'Pull day';
      const label = getSessionTemplateLabel((todayProgramDay as any)?.template_key ?? 'full_body');
      return label.toLowerCase().includes('day') ? label : `${label} day`;
    }
    if (trainingActiveProgramQ.data) return 'Rest day';
    return 'Training not set up';
  }, [inProgressSession, completedSessionToday, todayProgramDay, trainingActiveProgramQ.data]);

  const trainingTileEmpty = !trainingActiveProgramQ.data && !inProgressSession;
  const trainingTileSubline = useMemo(() => {
    if (trainingTileEmpty) return 'Add a program to fill the week rail';
    if (inProgressSession) return 'Continue when you’re ready';
    if (completedSessionToday) return 'Recovery counts too';
    if (todayProgramDay) {
      const mon = startOfWeekMonday(new Date());
      const sessionsList = (trainingSessionsQ.data ?? []) as Array<{ ended_at?: string }>;
      let weekSessions = 0;
      for (const s of sessionsList) {
        if (!s?.ended_at) continue;
        const d = new Date(s.ended_at);
        const dayIdx = Math.floor((d.getTime() - mon.getTime()) / 86_400_000);
        if (dayIdx >= 0 && dayIdx < 7) weekSessions += 1;
      }
      const exCount = (todayProgramDay as any)?.exercise_count;
      const exLine =
        typeof exCount === 'number' && exCount > 0
          ? `${exCount} exercise${exCount === 1 ? '' : 's'} queued`
          : 'Session ready — tap to train';
      if (weekSessions > 0) {
        return `${exLine} · ${weekSessions} day${weekSessions === 1 ? '' : 's'} logged this week`;
      }
      return exLine;
    }
    if (trainingActiveProgramQ.data) return 'Light movement optional';
    return 'Add a program anytime';
  }, [inProgressSession, completedSessionToday, todayProgramDay, trainingActiveProgramQ.data, trainingSessionsQ.data]);

  const trainingWeekRailCells = useMemo(() => {
    const sessionsList = (trainingSessionsQ.data ?? []) as Array<{ ended_at?: string }>;
    const doneY = new Set<string>();
    for (const s of sessionsList) {
      if (s?.ended_at) doneY.add(formatLocalDateYYYYMMDD(new Date(s.ended_at)));
    }
    const mon = startOfWeekMonday(new Date());
    const cells: { key: string; state: 'future' | 'done' | 'planned' | 'rest' | 'in_progress' | 'empty'; isToday: boolean }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      const ymd = formatLocalDateYYYYMMDD(d);
      const isToday = ymd === todayYMD;
      let state: (typeof cells)[number]['state'];
      if (ymd > todayYMD) state = 'future';
      else if (doneY.has(ymd)) state = 'done';
      else if (isToday && inProgressSession) state = 'in_progress';
      else if (isToday && todayProgramDay && !completedSessionToday) state = 'planned';
      else if (isToday && trainingActiveProgramQ.data && !todayProgramDay) state = 'rest';
      else state = 'empty';
      cells.push({ key: ymd, state, isToday });
    }
    return cells;
  }, [
    trainingSessionsQ.data,
    todayYMD,
    inProgressSession,
    todayProgramDay,
    completedSessionToday,
    trainingActiveProgramQ.data,
  ]);

  const heroMotionActive = useHeroMotionActive({
    screenFocused: isDashboardFocused,
    reduceMotion,
    inView: heroInView,
  });

  const handleDashboardScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      const visible = y < Math.max(contentHeight * 0.55, 280);
      setHeroInView((prev) => (prev === visible ? prev : visible));
    },
    [contentHeight],
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: 'transparent' }}
        contentContainerStyle={reclaimHeroBleedScroll}
        refreshControl={<RefreshControl refreshing={refreshing || isSyncing} onRefresh={onRefresh} />}
        onScroll={handleDashboardScroll}
        scrollEventThrottle={32}
      >
        <DashboardHeroBackdrop
          screenWidth={screenWidth}
          contentHeight={contentHeight}
          onContentLayout={setContentHeight}
          nodeStatuses={lifecycleNodeStatuses}
          onNodePress={handleLifecycleNodePress}
          animationActive={heroMotionActive}
        >
          <View style={reclaimBelowHeroContent}>
        {/* GREETING — compact header */}
        <View style={reclaimSectionSpacing}>
          <DashboardGreeting
            greetingText={greetingText}
            greetingSubtitle={greetingSubtitle}
            greetingIcon={greetingIcon}
            syncLine={formatSyncGreetingLine(syncDisplay)}
            onSync={() => runHealthSync({ showToast: true })}
            isSyncing={isSyncing || syncDisplay.isSyncing}
          />
        </View>

        <DashboardPostOnboardingGuide
          visible={showPostOnboardingGuide}
          sectionGap={sectionGap}
          primaryCapsule={primaryCapsule}
          ghostCapsule={ghostCapsule}
          onOpenMindfulness={() => {
            fireHaptic();
            navigation.navigate('Mindfulness');
          }}
          onDismiss={() => void handleDismissPostOnboardingGuide()}
        />

        {/* Daily signal — primary interpreted read (before context tiles; aligns with onboarding “daily signal”) */}
        <View style={reclaimSectionSpacing}>
          <DashboardInsight
            insightsEnabled={insightsEnabled}
            insightStatus={insightStatus}
            dashboardInsight={dashboardInsight}
            onActionPress={handleInsightActionPress}
            onRefreshPress={handleInsightRefreshPress}
            isProcessing={insightActionBusy}
            medicationContextHints={insightsCtx.lastContext?.meds?.contextHints}
            onUpgradePress={() => setPaywallVisible(true)}
            verifyAcknowledgment={verifyAcknowledgment}
            onDismissVerifyAcknowledgment={() => setVerifyAcknowledgment(null)}
          />
        </View>

        <View style={reclaimSectionSpacing}>
          <DashboardThirtyDayArc
            moodCheckins={moodArcCheckinsQ.data ?? []}
            sleepSessions={sleepArcSessionsQ.data ?? []}
            reduceMotion={reduceMotion}
          />
        </View>

        {/* PRIMARY NEXT ACTION — supports insight / routine; recovery remains below Today */}
        <View style={reclaimSectionSpacing}>
          <DashboardPrimaryAction primaryAction={primaryAction} emphasize />
        </View>

        <DashboardStateTiles
          sectionGap={sectionGap}
          tileRowGap={tileRowGap}
          reduceMotion={reduceMotion}
          isDark={theme.dark}
          stateForecast={stateForecast}
          predictionTileSubline={predictionTileSubline}
          predictionEmpty={stateForecast.confidence < 45}
          onPredictionPress={() => setForecastTileOpen(true)}
          sleepQualityHeadline={sleepQualityHeadline}
          sleepTileSubline={sleepTileSubline}
          sleepEmpty={sleepTileEmpty}
          sleepTileHypnogram={sleepTileHypnogram}
          onSleepPress={() => setSleepTileOpen(true)}
          moodTileHeadline={moodTileHeadline}
          moodTileSubline={moodTileSubline}
          moodEmpty={moodTileEmpty}
          moodWeekDots={moodWeekDots}
          moodTileVisualGlow={moodTileVisualGlow}
          onMoodPress={() => setMoodTileOpen(true)}
          trainingTileHeadline={trainingTileHeadline}
          trainingTileSubline={trainingTileSubline}
          trainingEmpty={trainingTileEmpty}
          trainingWeekRailCells={trainingWeekRailCells}
          onTrainingPress={() => {
            fireHaptic();
            navigateToTraining();
          }}
        />

        {/* Unified Today: remainder agenda + suggestions + footer tools */}
        <View style={reclaimSectionSpacing}>
          <DashboardToday
            scheduleItems={todayPlanScheduleItems}
            isLoading={medsQ.isLoading || sleepSettingsQ.isLoading || calendarQ.isLoading}
            onTakeDose={handleTakeDose}
            takeDosePending={takeDoseMutation.isPending}
            takeDoseMedId={takeDoseMutation.variables?.medId}
            takeDoseScheduledISO={takeDoseMutation.variables?.scheduledISO}
            onOpenSchedule={() => {
              setDraftOverlayItems(null);
              setCalendarOverlayOpen(true);
            }}
            onSyncHealth={() => runHealthSync({ showToast: true })}
            isSyncing={isSyncing}
            tomorrowPreview={todayPlanTomorrowPreview}
            routineSuggestions={safeRoutineSuggestions}
            reviewExpanded={reviewExpanded}
            onAcceptRoutine={handleAcceptRoutine}
            onAdjustRoutine={handleAdjustRoutine}
            onSkipRoutine={handleSkipRoutine}
            isAcceptAllSafe={isAcceptAllSafe}
            onAcceptAll={handleAcceptAll}
          />
        </View>

        {/* RECOVERY */}
        <View style={reclaimSectionSpacing}>
          <DashboardRecovery
            stage={recoveryStage}
            currentStageId={(recoveryQ.data?.currentStageId ?? 'foundation') as RecoveryStageId}
            currentWeek={recoveryQ.data?.currentWeek}
            weekInStage={recoveryWeekInStage}
            steps={recoveryActionSteps}
            blockerLine={recoveryBlockerLine}
            ctaLabel={recoveryPrimaryCta.label}
            onCtaPress={handleRecoveryCtaPress}
            onStepPress={handleRecoveryStepPress}
          />
        </View>

        {/* STREAKS / CELEBRATE */}
        {userSettingsQ.data?.badgesEnabled !== false ? (
          <View style={reclaimSectionSpacing}>
            <CelebrateRow
              reduceMotion={reduceMotion}
              cardRadius={cardRadius}
              mood={{ count: moodStreak.count ?? 0, longest: moodStreak.longest ?? 0, shields: (moodStreak as any).shieldsAvailable ?? 0 }}
              sleep={{ count: sleepStreak.count ?? 0, longest: sleepStreak.longest ?? 0, shields: (sleepStreak as any).shieldsAvailable ?? 0 }}
              meds={{ count: medStreak.count ?? 0, longest: medStreak.longest ?? 0, shields: (medStreak as any).shieldsAvailable ?? 0 }}
              onBadgeCrossed={(badge, streakCount) => {
                setCelebrationState({
                  visible: true,
                  badge,
                  streakCount,
                  shieldUsed: false,
                });
              }}
            />
          </View>
        ) : null}
          </View>
        </DashboardHeroBackdrop>
      </ScrollView>

      <DashboardScheduleOverlayHost
        open={calendarOverlayOpen}
        onClose={() => {
          setCalendarOverlayOpen(false);
          setDraftOverlayItems(null);
        }}
        items={draftOverlayItems ?? scheduleOverlayItemsForComponent}
        onTakeDose={handleTakeDose}
      />

      <DashboardForecastModal
        visible={forecastTileOpen}
        onDismiss={() => setForecastTileOpen(false)}
        forecast={stateForecast}
        ghostCapsule={ghostCapsule}
      />

      <DashboardSleepSnapshotModal
        visible={sleepTileOpen}
        onDismiss={() => setSleepTileOpen(false)}
        headline={sleepQualityHeadline}
        subline={sleepTileSubline}
        onOpenSleep={() => {
          setSleepTileOpen(false);
          navigation.navigate('Sleep');
        }}
        primaryCapsule={primaryCapsule}
        ghostCapsule={ghostCapsule}
      />

      <DashboardMoodCheckInModal
        visible={moodTileOpen}
        onDismiss={() => setMoodTileOpen(false)}
        onSelectMood={(score) => {
          handleMoodQuickTap(score);
          setMoodTileOpen(false);
        }}
        onOpenMoodDetails={() => {
          setMoodTileOpen(false);
          navigateToMood();
        }}
        isSubmitting={moodMutation.isPending}
      />

      {/* Milestone celebration overlay — shown when a new streak badge is earned */}
      <MilestoneCelebrationModal
        visible={celebrationState.visible}
        badge={celebrationState.badge}
        streakCount={celebrationState.streakCount}
        shieldUsed={celebrationState.shieldUsed}
        micro={celebrationState.micro}
        hapticsEnabled={hapticsEnabled}
        onDismiss={() => setCelebrationState((p) => ({ ...p, visible: false, micro: undefined }))}
      />

      <PaywallModal
        visible={paywallVisible}
        featureDescription="Unlock the full insight library"
        onDismiss={() => setPaywallVisible(false)}
      />

      <DashboardSnackbar
        visible={snackbar.visible}
        message={snackbar.message}
        onDismiss={() => setSnackbar((p) => ({ ...p, visible: false }))}
      />
    </View>
  );
}

export default React.memo(Dashboard);
