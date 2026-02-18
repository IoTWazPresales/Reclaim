// C:\Reclaim\app\src\screens\Dashboard.tsx
import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  AccessibilityInfo,
  AppState,
  AppStateStatus,
  Dimensions,
  Linking,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, Button, Card, Chip, Portal, Snackbar, Text, FAB, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  addMoodCheckin,
  listMeds,
  logMedDose,
  upcomingDoseTimes,
  listMedDoseLogsRemoteLastNDays,
  computeAdherenceFromSchedule,
  listMoodCheckins,
  listSleepSessions,
  getActiveProgramInstance,
  getProgramDays,
  listTrainingSessions,
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
  sleepConsistencyText,
  medsOnTrackText,
  ROUTINE_NO_SLOT_REASON,
} from '@/lib/dashboard/utils';
import { logger } from '@/lib/logger';
import { formatDistanceToNow } from 'date-fns';
import { getLastHealthSyncSuccessISO, getLastSyncISO } from '@/lib/sync';
import { requestHealthSync, type HealthSyncReason } from '@/sync/SyncCoordinator';
import type { SleepSession as HealthSleepSession } from '@/lib/health/types';
import { getRecoveryProgress, getStageById, type RecoveryStageId } from '@/lib/recovery';
import { getStreakStore, recordStreakEvent } from '@/lib/streaks';
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
import type { InsightScope } from '@/lib/insights/pickInsightForScreen';
import { useAuth } from '@/providers/AuthProvider';
import { triggerLightHaptic } from '@/lib/haptics';
import { getTodayEvents, type CalendarEvent } from '@/lib/calendar';
import { InformationalCard, ActionCard } from '@/components/ui';
import { FeatureCardHeader } from '@/components/ui/FeatureCardHeader';
import { CelebrateRow } from '@/components/dashboard/CelebrateRow';
import { DashboardExercise } from '@/components/dashboard/DashboardExercise';
import { DashboardGreeting } from '@/components/dashboard/DashboardGreeting';
import { DashboardInsight } from '@/components/dashboard/DashboardInsight';
import { DashboardPrimaryAction } from '@/components/dashboard/DashboardPrimaryAction';
import { DashboardProgress } from '@/components/dashboard/DashboardProgress';
import { DashboardSleep } from '@/components/dashboard/DashboardSleep';
import { DashboardToday } from '@/components/dashboard/DashboardToday';
import { getLifecycleNodeStatuses, LifecycleHero } from '@/components/dashboard/LifecycleHero';
import { PremiumStarfield } from '@/components/dashboard/PremiumStarfield';
import { loadSleepSettings, type SleepSettings } from '@/lib/sleepSettings';
import { ScheduleOverlay, type ScheduleOverlayItem } from '@/components/dashboard/ScheduleOverlay';
import {
  defaultRoutineTemplates,
  loadRoutineState,
  saveRoutineState,
  fetchRoutineSuggestionsRemote,
  upsertRoutineSuggestionRemote,
  fetchRoutineTemplatesRemote,
  getLocalDateKey,
  type RoutineSuggestionRecord,
  type RoutineTemplate,
} from '@/lib/routines';
import { loadRoutineTemplateSettings, type RoutineTemplateSettings } from '@/lib/routineSettings';
import { formatLocalDateYYYYMMDD } from '@/lib/training/dateUtils';
import { CRISIS_HELPLINE_LABEL, CRISIS_HELPLINE_URL } from '@/lib/storeCompliance';
import { getSessionTemplateLabel, formatTrainingRoutineTemplateId } from '@/lib/training/sessionLabels';
import type { SessionTemplate } from '@/lib/training/types';
import * as Notifications from 'expo-notifications';

const INTENT_KEY = '@reclaim/routine_intent';
const INTENT_TTL_MS = 15 * 60 * 1000;

/**
 * ✅ Fixes the TS "Record<...> missing properties" error by providing ALL keys
 * for SleepSessionRow['source'].
 */
function mapSleepRowToHealthSession(row: SleepSessionRow): HealthSleepSession {
  const sourceMap: Record<SleepSessionRow['source'], HealthSleepSession['source']> = {
    healthkit: 'apple_healthkit',
    googlefit: 'google_fit',
    healthconnect: 'health_connect',
    samsung_health: 'samsung_health',
    phone_infer: 'unknown',
    manual: 'unknown',
  };

  const stagesArray = Array.isArray(row.stages) ? row.stages : [];

  return {
    startTime: new Date(row.start_time),
    endTime: new Date(row.end_time),
    durationMinutes: row.duration_minutes ?? 0,
    efficiency: row.efficiency ?? undefined,
    source: sourceMap[row.source] ?? 'unknown',
    stages: stagesArray.map((stage) => ({
      start: new Date(stage.start),
      end: new Date(stage.end),
      stage: (stage.stage as any) ?? 'unknown',
    })),
    metadata: row.metadata ?? undefined,
  };
}

async function fetchLatestSleep(): Promise<HealthSleepSession | null> {
  try {
    const sessions = await listSleepSessions(1);
    if (!sessions.length) return null;
    return mapSleepRowToHealthSession(sessions[0]);
  } catch (error) {
    logger.debug('Dashboard sleep fetch failed (non-critical):', (error as Error)?.message);
    return null;
  }
}

export default function Dashboard() {
  const { session } = useAuth();
  const theme = useTheme();
  const qc = useQueryClient();
  const navigation = useNavigation<any>();
  const isDashboardFocused = useIsFocused();

  const [refreshing, setRefreshing] = useState(false);
  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });

  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncingRef = useRef(false);

  const [reduceMotion, setReduceMotion] = useState(false);
  const reduceMotionRef = useRef(false);

  const [fabOpen, setFabOpen] = useState(false);
  const [showMindfulnessHint, setShowMindfulnessHint] = useState<boolean>((globalThis as any).__justOnboarded === true);
  const [routineStateByTemplate, setRoutineStateByTemplate] = useState<Record<string, RoutineSuggestionRecord>>({});
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

  // ✅ Insights (typed, no any hacks)
  const insightsCtx = useScientificInsights();
  const rankedInsights = insightsCtx.insights;
  const topInsight = rankedInsights?.[0];
  const insightStatus = insightsCtx.status;
  const refreshInsight = insightsCtx.refresh;
  const insightsEnabled = insightsCtx.enabled;

  const [insightActionBusy, setInsightActionBusy] = useState(false);

  const userSettingsQ = useQuery({
    queryKey: ['user:settings'],
    queryFn: getUserSettings,
    retry: false,
    throwOnError: false,
    staleTime: 60000,
  });

  const routineSettingsQ = useQuery<RoutineTemplateSettings>({
    queryKey: ['routine:template:settings'],
    queryFn: loadRoutineTemplateSettings,
  });

  const hapticsEnabled = userSettingsQ.data?.hapticsEnabled ?? true;

  useEffect(() => {
    if ((globalThis as any).__justOnboarded) {
      setShowMindfulnessHint(true);
      delete (globalThis as any).__justOnboarded;
    }
    AsyncStorage.setItem('@reclaim/just_onboarded_hint', '').catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const flag = await AsyncStorage.getItem('@reclaim/just_onboarded_hint');
        if (!cancelled && flag === '1') {
          setShowMindfulnessHint(true);
          await AsyncStorage.removeItem('@reclaim/just_onboarded_hint');
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const state = await loadRoutineState(todayStr);
      if (!cancelled) setRoutineStateByTemplate(state ?? {});
      // Phase 3: optional remote hydration (non-blocking)
      fetchRoutineSuggestionsRemote(todayStr).then((remote) => {
        if (cancelled || !remote?.length) return;
        const safeState = state ?? {};
        if (__DEV__ && state === undefined) {
          console.warn('[Dashboard] loadRoutineState returned undefined, using empty object');
        }
        const merged: Record<string, RoutineSuggestionRecord> = { ...safeState };
        for (const row of remote) {
          merged[row.routine_template_id] = {
            templateId: row.routine_template_id,
            state: row.state,
            startISO: row.suggested_start_ts ?? undefined,
            endISO: row.suggested_end_ts ?? undefined,
          };
        }
        setRoutineStateByTemplate(merged);
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

  const fireHaptic = useCallback((style: 'impact' | 'success' = 'impact') => {
    triggerLightHaptic({
      enabled: hapticsEnabledRef.current,
      reduceMotion: reduceMotionRef.current,
      style,
    });
  }, []);

  const medsQ = useQuery<Med[]>({
    queryKey: ['meds:list'],
    queryFn: listMeds,
    retry: false,
    throwOnError: false,
    staleTime: 30000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const medLogsQ = useQuery({
    queryKey: ['meds:logs:7d'],
    queryFn: () => listMedDoseLogsRemoteLastNDays(7),
    enabled: !!session,
    retry: false,
    throwOnError: false,
    staleTime: 30000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const sleepQ = useQuery<HealthSleepSession | null>({
    queryKey: ['dashboard:lastSleep'],
    queryFn: fetchLatestSleep,
    retry: false,
    throwOnError: false,
    staleTime: 30000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const sleepSettingsQ = useQuery<SleepSettings>({
    queryKey: ['sleep:settings'],
    queryFn: loadSleepSettings,
    retry: false,
    throwOnError: false,
    staleTime: 60000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const recoveryQ = useQuery({
    queryKey: ['recovery:progress'],
    queryFn: getRecoveryProgress,
    retry: false,
    throwOnError: false,
    staleTime: 60000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const streaksQ = useQuery({
    queryKey: ['streaks'],
    queryFn: getStreakStore,
    retry: false,
    throwOnError: false,
    staleTime: 60000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const sleepSessionsRingQ = useQuery({
    queryKey: ['sleep:sessions:ring'],
    queryFn: () => listSleepSessions(7),
    enabled: !!session,
    retry: false,
    throwOnError: false,
    staleTime: 30000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const moodCheckinsQ = useQuery({
    queryKey: ['mood:checkins:7d'],
    queryFn: () => listMoodCheckins(15),
    enabled: !!session,
    retry: false,
    throwOnError: false,
    staleTime: 30000,
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
    staleTime: 300_000,
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
    staleTime: 60_000,
  });
  const trainingSessionsQ = useQuery({
    queryKey: ['training:sessions'],
    queryFn: () => listTrainingSessions(20),
    retry: false,
    throwOnError: false,
    staleTime: 30_000,
  });

  const recoveryStage = useMemo(
    () => getStageById((recoveryQ.data?.currentStageId ?? 'foundation') as RecoveryStageId),
    [recoveryQ.data?.currentStageId],
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

  const medAdherencePct = useMemo(() => {
    const logs = Array.isArray(medLogsQ.data) ? medLogsQ.data : [];
    const meds = Array.isArray(medsQ.data) ? medsQ.data : [];
    if (!meds.length) return null;
    const stats = computeAdherenceFromSchedule(logs, meds, 7);
    return stats.pct;
  }, [medLogsQ.data, medsQ.data]);

  const sleepMidpointStd = useMemo(() => {
    if (!Array.isArray(sleepSessionsRingQ.data) || sleepSessionsRingQ.data.length < 2) return null;
    const midpoints = sleepSessionsRingQ.data
      .map((s: SleepSessionRow) => getSleepMidpointMinutes(s.start_time, s.end_time))
      .filter((v): v is number => v !== null);
    if (midpoints.length < 2) return null;
    return standardDeviation(midpoints);
  }, [sleepSessionsRingQ.data]);

  const moodProgress = useMemo(() => {
    if (moodStreak.count <= 0) return null;
    return Math.min(moodStreak.count / 7, 1);
  }, [moodStreak.count]);

  const medProgress = useMemo(() => {
    if (medAdherencePct === null) return null;
    return Math.max(0, Math.min(1, medAdherencePct / 100));
  }, [medAdherencePct]);

  const sleepProgress = useMemo(() => {
    if (sleepMidpointStd === null) return null;
    return Math.max(0, Math.min(1, 1 - sleepMidpointStd / 120));
  }, [sleepMidpointStd]);

  const progressMetrics = useMemo(() => {
    const items: Array<{
      key: string;
      progress: number;
      valueText: string;
      label: string;
      accessibilityLabel: string;
      icon: keyof typeof MaterialCommunityIcons.glyphMap;
    }> = [];

    if (moodProgress !== null) {
      const streakTxt = moodStreak.count >= 7 ? 'Locked in' : moodStreak.count >= 3 ? 'Building' : 'Started';
      items.push({
        key: 'mood',
        progress: moodProgress,
        valueText: streakTxt,
        label: 'Mood check-ins',
        accessibilityLabel: `Mood check-in streak ${moodStreak.count} days`,
        icon: 'emoticon-happy-outline',
      });
    }

    if (medProgress !== null && medAdherencePct !== null) {
      const medsTxt = medsOnTrackText(medAdherencePct);
      items.push({
        key: 'meds',
        progress: medProgress,
        valueText: medsTxt.valueText,
        label: 'Meds on track',
        accessibilityLabel: `Medication adherence ${Math.round(medAdherencePct)} percent over the last seven days`,
        icon: 'pill',
      });
    }

    if (sleepProgress !== null && sleepMidpointStd !== null) {
      const sleepTxt = sleepConsistencyText(sleepMidpointStd);
      items.push({
        key: 'sleep',
        progress: sleepProgress,
        valueText: sleepTxt.valueText,
        label: 'Sleep consistency',
        accessibilityLabel: `Sleep consistency drift ${Math.round(sleepMidpointStd)} minutes`,
        icon: 'sleep',
      });
    }

    return items;
  }, [medAdherencePct, medProgress, moodProgress, moodStreak.count, sleepMidpointStd, sleepProgress]);

  const upcomingDoses: UpcomingDose[] = useMemo(() => {
    if (!Array.isArray(medsQ.data)) return [];
    const logs = (medLogsQ.data ?? []) as Array<{
      med_id: string;
      scheduled_for?: string | null;
      status: 'taken' | 'skipped' | 'missed';
    }>;

    const items: UpcomingDose[] = [];

    medsQ.data.forEach((med) => {
      if (!med.id || !med.schedule) return;

      upcomingDoseTimes(med.schedule, 24).forEach((scheduled) => {
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
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduceMotion(value);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
      setReduceMotion(value);
    });
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    reduceMotionRef.current = reduceMotion;
  }, [reduceMotion]);

  const loadLastSync = useCallback(async () => {
    try {
      const iso = await getLastSyncISO();
      setLastSyncedAt(iso);
    } catch (error) {
      logger.warn('Failed to load last sync timestamp:', error);
    }
  }, []);

  useEffect(() => {
    loadLastSync();
  }, [loadLastSync]);

  const runHealthSync = useCallback(
    async (options: { showToast?: boolean; invalidateQueries?: boolean; reason?: HealthSyncReason } = {}) => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      setIsSyncing(true);
      try {
        const result = await requestHealthSync({
          reason: options.reason ?? 'dashboard_manual',
        });
        if (result.syncedAt) setLastSyncedAt(result.syncedAt);

        const shouldInvalidateQueries =
          options.invalidateQueries !== false &&
          (
            result.sleepSynced ||
            result.activitySynced ||
            result.debug?.sleepSyncStatus === 'write_failed' ||
            !!result.debug?.saveError
          );
        if (shouldInvalidateQueries) {
          await Promise.all([
            qc.invalidateQueries({ queryKey: ['dashboard:lastSleep'] }),
            qc.invalidateQueries({ queryKey: ['sleep:last'] }),
            qc.invalidateQueries({ queryKey: ['sleep:sessions:30d'] }),
            qc.invalidateQueries({ queryKey: ['sleep:settings'] }),
          ]);
        }

        // Insights read from sleep_sessions; refetch so they see new data
        if (result.sleepSynced || result.activitySynced) {
          refreshInsight('health-sync').catch(() => {});
        }
        if (options.showToast) {
          const hardSleepFailure =
            result.debug?.sleepSyncStatus === 'write_failed' || !!result.debug?.saveError;
          if (hardSleepFailure) {
            const reason =
              result.debug?.saveError ??
              result.debug?.sleepWriteErrors?.[0] ??
              'No sleep sessions were written to Supabase.';
            setSnackbar({ visible: true, message: `Sleep sync failed: ${reason}` });
          } else if (!result.sleepSynced) {
            setSnackbar({ visible: true, message: 'Health sync complete. No new sleep sessions.' });
          } else {
            setSnackbar({ visible: true, message: 'Health data synced.' });
          }
        }
      } catch (error: any) {
        logger.warn('Health sync failed:', error);
        if (options.showToast) setSnackbar({ visible: true, message: error?.message ?? 'Health sync failed.' });
      } finally {
        isSyncingRef.current = false;
        setIsSyncing(false);
      }
    },
    [qc, refreshInsight],
  );

  useEffect(() => {
    if (didInitialSyncRef.current) return;
    didInitialSyncRef.current = true;

    let cancelled = false;
    (async () => {
      try {
        const lastSync = (await getLastHealthSyncSuccessISO()) ?? (await getLastSyncISO());
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const SYNC_COOLDOWN = 15 * 60 * 1000;

    const handleAppState = async (state: AppStateStatus) => {
      if (state !== 'active') return;
      if (!isDashboardFocused) return;

      const now = Date.now();
      if (now - lastActiveSyncAtRef.current < 60_000) return;
      const lastSync = (await getLastHealthSyncSuccessISO()) ?? (await getLastSyncISO());
      if (lastSync) {
        const lastSyncTime = new Date(lastSync).getTime();
        if (Number.isFinite(lastSyncTime) && now - lastSyncTime < SYNC_COOLDOWN) return;
      }

      lastActiveSyncAtRef.current = now;
      await runHealthSync({ invalidateQueries: true, reason: 'dashboard_foreground' });
    };

    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [isDashboardFocused, runHealthSync]);

  const moodMutation = useMutation({
    mutationFn: (mood: number) =>
      addMoodCheckin({
        mood,
        ctx: { source: 'dashboard_quick_mood' },
      }),
    onSuccess: async (_result, moodValue) => {
      fireHaptic('success');
      setSnackbar({ visible: true, message: 'Mood logged. Proud of you for checking in.' });
      await logTelemetry({
        name: 'mood_logged',
        properties: { source: 'dashboard_quick_mood', mood: moodValue },
      });

      if (userSettingsQ.data?.badgesEnabled !== false) {
        const store = await recordStreakEvent('mood', new Date());
        await logTelemetry({
          name: 'mood_streak_updated',
          properties: { count: store.mood.count, longest: store.mood.longest },
        });
        await qc.invalidateQueries({ queryKey: ['streaks'] });
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
      qc.invalidateQueries({ queryKey: ['meds:list'] });
      qc.invalidateQueries({ queryKey: ['meds:logs:7d'] });
      setSnackbar({ visible: true, message: 'Dose logged. Nice work staying consistent.' });
      await logTelemetry({ name: 'med_dose_logged', properties: { medId: variables?.medId } });

      if (userSettingsQ.data?.badgesEnabled !== false) {
        const store = await recordStreakEvent('medication', new Date());
        await logTelemetry({
          name: 'med_streak_updated',
          properties: { count: store.medication.count, longest: store.medication.longest },
        });
        await qc.invalidateQueries({ queryKey: ['streaks'] });
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
      fireHaptic();
      takeDoseMutation.mutate({ medId, scheduledISO });
    },
    [fireHaptic, takeDoseMutation],
  );

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
    if (prefs.hasUpcomingMeds || prefs.lowMedAdherence) preferred.push('meds');
    if (prefs.needsMood) preferred.push('mood');
    (['sleep', 'meds', 'mood'] as InsightScope[]).forEach((s) => {
      if (!preferred.includes(s)) preferred.push(s);
    });
    return preferred;
  }, [sleepQ.data, sleepQ.isLoading, upcomingDoses.length, medAdherencePct, moodStreak.count]);

  const dashboardInsight = useInsightForScreen(rankedInsights, session, {
    screen: 'dashboard',
    preferredScopes: dashboardPreferredScopes,
    dashboardFirst: true,
    allowGlobalFallback: true,
  });

  const lifecycleNodeStatuses = useMemo(
    () =>
      getLifecycleNodeStatuses({
        moodStreakCount: moodStreak.count ?? 0,
        hasMoodCheckinsRecent,
        sleepData: sleepQ.data ? { durationMinutes: sleepQ.data.durationMinutes } : null,
        medAdherencePct,
        upcomingDosesCount: upcomingDoses.length,
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
      medAdherencePct,
      upcomingDoses.length,
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
    setInsightActionBusy(true);
    try {
      await logTelemetry({
        name: 'insight_action_triggered',
        properties: { insightId: dashboardInsight.id, source: 'dashboard' },
      });
      setSnackbar({ visible: true, message: dashboardInsight.action || 'Action queued. You’ve got this.' });

      refreshInsight('dashboard-action').catch((err: unknown) => logger.warn('Insight refresh failed after action', err));
    } catch (error: any) {
      setSnackbar({
        visible: true,
        message: error?.message ?? 'Unable to follow up on that insight right now.',
      });
    } finally {
      setInsightActionBusy(false);
    }
  }, [dashboardInsight, refreshInsight]);

  const handleInsightRefreshPress = useCallback(() => {
    if (insightStatus === 'loading') return;

    // Log telemetry for manual refresh
    logTelemetry({
      name: 'insight_refresh_pressed',
      properties: {
        screenSource: 'dashboard',
        reason: 'dashboard-manual',
      },
    }).catch(() => {}); // Non-blocking

    refreshInsight('dashboard-manual').catch((err: unknown) => {
      logger.warn('Manual insight refresh failed', err);
      setSnackbar({ visible: true, message: 'Unable to refresh insights right now.' });
    });
  }, [refreshInsight, insightStatus]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await runHealthSync({ showToast: true });
      await qc.invalidateQueries({ queryKey: ['meds:list'] });
      await qc.invalidateQueries({ queryKey: ['meds:logs:7d'] });
      await qc.invalidateQueries({ queryKey: ['calendar', 'today'] });
      await qc.invalidateQueries({ queryKey: ['training:sessions'] });
      await qc.invalidateQueries({ queryKey: ['training:programDays:today'] });
      await qc.invalidateQueries({ queryKey: ['training:activeProgram'] });

      // Log telemetry for pull-to-refresh insight refresh
      logTelemetry({
        name: 'insight_refresh_pressed',
        properties: {
          screenSource: 'dashboard',
          reason: 'dashboard-refresh-gesture',
        },
      }).catch(() => {}); // Non-blocking

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
        }).catch(() => {});
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
    if (medAdherencePct !== null) {
      const medsTxt = medsOnTrackText(medAdherencePct);
      return `Medication: ${medsTxt.valueText} • ${medsTxt.helper}.`;
    }

    return 'One step at a time — you’re not alone in this.';
  }, [upcomingDoses, sleepQ.data, sleepQ.isLoading, moodStreak.count, medAdherencePct]);

  const greetingIcon = useMemo(() => {
    if (moodStreak.count >= 7) return 'emoticon-cool-outline';
    if (moodStreak.count >= 3) return 'emoticon-happy-outline';
    if (moodStreak.count >= 1) return 'emoticon-neutral-outline';
    return 'emoticon-outline';
  }, [moodStreak.count]);

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

    if (!sleepQ.data && !sleepQ.isLoading) {
      return {
        title: 'Get your sleep in',
        subtitle: 'One sync and you’re set.',
        meta: lastSyncedAt
          ? `Last synced ${formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true })}`
          : 'Never synced',
        icon: 'sleep' as const,
        cta: 'Sync now',
        onPress: () => runHealthSync({ showToast: true }),
        loading: isSyncing,
      };
    }

    if (inProgressSession) {
      return {
        title: 'Resume workout',
        subtitle: 'Pick up where you left off.',
        meta: 'In progress',
        icon: 'dumbbell' as const,
        cta: 'Resume',
        onPress: () => navigateToTraining(),
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
        meta: 'Planned for today',
        icon: 'dumbbell' as const,
        cta: 'Start',
        onPress: () => navigateToTraining(),
        loading: false,
      };
    }

    return {
      title: 'Quick check-in',
      subtitle: 'How are you, right now?',
      meta: '2 seconds',
      icon: 'emoticon-happy-outline' as const,
      cta: 'Log mood',
      onPress: () => navigateToMood(),
      loading: false,
    };
  }, [
    upcomingDoses,
    handleTakeDose,
    takeDoseMutation.isPending,
    takeDoseMutation.variables?.medId,
    takeDoseMutation.variables?.scheduledISO,
    sleepQ.data,
    sleepQ.isLoading,
    lastSyncedAt,
    runHealthSync,
    isSyncing,
    inProgressSession,
    todayProgramDay,
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
        onPress: () => { fireHaptic(); navigateToTraining(); },
      } as ScheduleItem);
    }

    const hasTrainingRoutineToday =
      acceptedRoutineItems.some((r) => r.templateId.startsWith('training_')) ||
      Object.values(routineStateByTemplate ?? {}).some((r) =>
        r.templateId.startsWith('training_') &&
        (r.state === 'accepted' || r.state === 'suggested') &&
        (
          !r.startISO ||
          (
            (() => {
              const d = new Date(r.startISO);
              return Number.isFinite(d.getTime()) && formatLocalDateYYYYMMDD(d) === todayYMD;
            })()
          )
        )
      );

    // Today's program-day fallback only when no explicit training routine exists for today.
    if (todayProgramDay && !hasTrainingRoutineToday) {
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

    for (const tpl of templates) {
      const existing = byTemplateState[tpl.id];
      if (existing?.state === 'accepted' || existing?.state === 'skipped') continue;

      const slot = findFirstSlot(tpl);
      if (!slot) {
        const base = new Date();
        base.setHours(0, 0, 0, 0);
        const start = new Date(base);
        const end = new Date(base.getTime() + tpl.durationMin * 60000);
        slots.push({
          template: tpl,
          start,
          end,
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

  const buildBusyBlocks = useCallback(() => {
    const busy: { start: Date; end: Date }[] = [];
    const safe = Array.isArray(scheduleItemsAll) ? scheduleItemsAll : [];
    if (__DEV__ && !Array.isArray(scheduleItemsAll)) {
      console.warn('[Dashboard] scheduleItemsAll is not an array in buildBusyBlocks, using empty array');
    }
    for (const it of safe) {
      const start = it.time;
      const dur =
        it.kind === 'sleep'
          ? 90
          : it.kind === 'med'
            ? 30
            : it.kind === 'training'
              ? 60
              : 45;
      const end = new Date(start.getTime() + dur * 60000);
      busy.push({ start, end });
    }
    return busy;
  }, [scheduleItemsAll]);

  const hasValidSlot = (s: { start?: Date; end?: Date; reason?: string }) =>
    !!s.start && !!s.end && s.reason !== ROUTINE_NO_SLOT_REASON;

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
    const busy = buildBusyBlocks();

    const overlapsBusy = (start: Date, end: Date) =>
      busy.some((b) => !(end.getTime() <= b.start.getTime() || start.getTime() >= b.end.getTime()));

    for (const s of candidates) {
      if (!s.start || !s.end) return false;
      if (!isWithinWindow(s)) return false;
      if (overlapsBusy(s.start, s.end)) return false;
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
  }, [buildBusyBlocks, routineSuggestions]);

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
  const sectionGap = 14;
  const cardSurface = theme.colors.surface;
  const [contentHeight, setContentHeight] = useState(2000);
  const screenWidth = Dimensions.get('window').width;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: 'transparent' }}
        contentContainerStyle={{ paddingBottom: 140 }}
        refreshControl={<RefreshControl refreshing={refreshing || isSyncing} onRefresh={onRefresh} />}
      >
        <View
          style={{ position: 'relative' }}
          onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}
        >
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
            <PremiumStarfield width={screenWidth} height={contentHeight} />
          </View>
          <LifecycleHero nodeStatuses={lifecycleNodeStatuses} onNodePress={handleLifecycleNodePress} />
          <View style={{ paddingHorizontal: 16, paddingTop: 0 }}>
        {/* GREETING */}
        <View style={{ marginBottom: sectionGap }}>
          <DashboardGreeting
            greetingText={greetingText}
            greetingSubtitle={greetingSubtitle}
            greetingIcon={greetingIcon}
            lastSyncedAt={lastSyncedAt}
            onSync={() => runHealthSync({ showToast: true })}
            isSyncing={isSyncing}
          />
        </View>

        {/* PRIMARY NEXT ACTION */}
        <View style={{ marginBottom: sectionGap }}>
          <DashboardPrimaryAction primaryAction={primaryAction} />
        </View>

        {/* INSIGHT */}
        <View style={{ marginBottom: sectionGap }}>
          <DashboardInsight
            insightsEnabled={insightsEnabled}
            insightStatus={insightStatus}
            dashboardInsight={dashboardInsight}
            onActionPress={handleInsightActionPress}
            onRefreshPress={handleInsightRefreshPress}
            isProcessing={insightActionBusy}
          />
        </View>

        {/* EXERCISE */}
        <View style={{ marginBottom: sectionGap }}>
          <DashboardExercise
            inProgressSession={inProgressSession}
            completedSessionToday={completedSessionToday}
            todayProgramDay={todayProgramDay}
            hasActiveProgram={!!trainingActiveProgramQ.data}
            onNavigateToTraining={() => {
              fireHaptic();
              navigateToTraining();
            }}
          />
        </View>

        {/* SLEEP */}
        {sleepQ.data ? (
          <View style={{ marginBottom: sectionGap }}>
            <DashboardSleep
              sleep={sleepQ.data}
              onNavigateToSleep={() => navigation.navigate('Sleep')}
            />
          </View>
        ) : null}

        {/* PROGRESS */}
        {progressMetrics.length ? (
          <View style={{ marginBottom: sectionGap }}>
            <DashboardProgress
              metrics={progressMetrics}
              sleepMidpointStd={sleepMidpointStd}
              medAdherencePct={medAdherencePct}
            />
          </View>
        ) : null}

        {/* TODAY */}
        <View style={{ marginBottom: sectionGap }}>
          <DashboardToday
            scheduleItems={scheduleItems}
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
            routineSuggestions={safeRoutineSuggestions}
            reviewExpanded={reviewExpanded}
            onAcceptRoutine={handleAcceptRoutine}
            onAdjustRoutine={handleAdjustRoutine}
            onSkipRoutine={handleSkipRoutine}
            isAcceptAllSafe={isAcceptAllSafe}
            onAcceptAll={handleAcceptAll}
            cardRadius={cardRadius}
            cardSurface={cardSurface}
          />
        </View>

        {showMindfulnessHint ? (
          <View style={{ marginBottom: sectionGap }}>
            <ActionCard feedbackScope={{ componentKey: 'dashboard-mindfulness-hint', componentTitle: 'Mindfulness hint' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                    Need a reset? Try Mindfulness.
                  </Text>
                  <Text variant="bodySmall" style={{ marginTop: 4, color: theme.colors.onSurfaceVariant }}>
                    No streaks. No pressure. Just a quick guided moment.
                  </Text>
                </View>
                <Button mode="contained-tonal" onPress={() => navigation.navigate('Mindfulness')}>
                  Open
                </Button>
              </View>
            </ActionCard>
          </View>
        ) : null}

        {/* MOOD */}
        <View style={{ marginBottom: sectionGap }}>
          <InformationalCard feedbackScope={{ componentKey: 'dashboard-mood', componentTitle: 'Mood', tags: ['dashboard', 'mood'] }}>
            <FeatureCardHeader icon="emoticon-happy-outline" title="Mood" subtitle="2 seconds. No judgement." />
            <View style={{ marginTop: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                {[1, 2, 3, 4, 5].map((score) => (
                  <Button
                    key={`mood-${score}`}
                    mode="contained-tonal"
                    compact
                    style={{ flex: 1, marginHorizontal: 4 }}
                    onPress={() => handleMoodQuickTap(score)}
                    disabled={moodMutation.isPending}
                    accessibilityLabel={`Quick mood check-in: ${score} out of 5`}
                  >
                    {score}
                  </Button>
                ))}
              </View>
              <Text variant="bodySmall" style={{ marginTop: 10, color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                Quick check-ins build personalised insights over time.
              </Text>
              <View style={{ alignItems: 'center', marginTop: 8 }}>
                <Button mode="text" onPress={navigateToMood} compact>
                  Open mood
                </Button>
                <Button
                  mode="text"
                  compact
                  onPress={() => Linking.openURL(CRISIS_HELPLINE_URL).catch(() => {})}
                  style={{ marginTop: 4, opacity: 0.8 }}
                  accessibilityLabel={`Open ${CRISIS_HELPLINE_LABEL}`}
                >
                  In crisis? 988
                </Button>
              </View>
            </View>
          </InformationalCard>
        </View>

        {/* RECOVERY */}
        <View style={{ marginBottom: sectionGap }}>
          <InformationalCard feedbackScope={{ componentKey: 'dashboard-recovery', componentTitle: 'Recovery', tags: ['dashboard', 'recovery'] }}>
            <FeatureCardHeader icon="meditation" title="Recovery" subtitle="Where you are right now." />
            <View style={{ marginTop: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                  {recoveryStage.title}
                </Text>

                {recoveryQ.data?.currentWeek ? (
                  <Chip mode="outlined" compact style={{ backgroundColor: 'transparent' }} textStyle={{ fontSize: 10 }}>
                    Week {recoveryQ.data.currentWeek}
                  </Chip>
                ) : null}
              </View>

              <Text style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}>{recoveryStage.summary}</Text>

              <View style={{ marginTop: 12, gap: 6 }}>
                {recoveryStage.focus.slice(0, 3).map((item) => (
                  <View key={item} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialCommunityIcons
                      name="check-circle-outline"
                      size={18}
                      color={theme.colors.secondary}
                      style={{ marginRight: 8 }}
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                    />
                    <Text variant="bodySmall">{item}</Text>
                  </View>
                ))}
              </View>

              <Button
                mode="outlined"
                style={{ marginTop: 14 }}
                onPress={() =>
                  setSnackbar({
                    visible: true,
                    message: 'Open Settings → Recovery to reset or review all stages.',
                  })
                }
              >
                Manage recovery
              </Button>
            </View>
          </InformationalCard>
        </View>

        {/* STREAKS / CELEBRATE */}
        {userSettingsQ.data?.badgesEnabled !== false ? (
          <View style={{ marginBottom: sectionGap }}>
            <CelebrateRow
              reduceMotion={reduceMotion}
              cardRadius={cardRadius}
              sectionGap={sectionGap}
              mood={{ count: moodStreak.count ?? 0, longest: moodStreak.longest ?? 0 }}
              sleep={{ count: sleepStreak.count ?? 0, longest: sleepStreak.longest ?? 0 }}
              meds={{ count: medStreak.count ?? 0, longest: medStreak.longest ?? 0 }}
            />
          </View>
        ) : null}
          </View>
        </View>
      </ScrollView>

      {/* ✅ ScheduleOverlay planning window */}
      <Portal>
        <ScheduleOverlay
          {...({
            open: calendarOverlayOpen,
            onClose: () => {
              setCalendarOverlayOpen(false);
              setDraftOverlayItems(null);
            },
            items: draftOverlayItems ?? scheduleOverlayItemsForComponent,
            title: 'Schedule',
            onTakeDose: handleTakeDose, // ✅ Taken works in overlay
          } as any)}
        />
      </Portal>

      <Portal>
        <FAB.Group
          open={fabOpen}
          visible
          icon={fabOpen ? 'close' : 'plus'}
          onStateChange={({ open }: { open: boolean }) => setFabOpen(open)}
          backdropColor={reduceMotion ? 'transparent' : theme.colors.backdrop}
          variant="primary"
          style={{ paddingBottom: 80 }}
          actions={[
            {
              icon: 'emoticon-happy-outline',
              label: 'Log Mood',
              onPress: () => {
                setFabOpen(false);
                navigateToMood();
              },
              accessibilityLabel: 'Navigate to Mood screen',
            },
            {
              icon: 'pill',
              label: 'Log Med',
              onPress: () => {
                setFabOpen(false);
                navigateToMeds();
              },
              accessibilityLabel: 'Navigate to Medications screen',
            },
          ]}
        />
      </Portal>

      <Snackbar
        visible={snackbar.visible}
        duration={3000}
        onDismiss={() => setSnackbar((p) => ({ ...p, visible: false }))}
      >
        {snackbar.message}
      </Snackbar>
    </View>
  );
}
