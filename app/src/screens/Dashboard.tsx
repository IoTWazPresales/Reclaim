// C:\Reclaim\app\src\screens\Dashboard.tsx
import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  AccessibilityInfo,
  AppState,
  AppStateStatus,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, Button, Chip, Portal, Snackbar, Text, FAB, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  addMoodCheckin,
  listMeds,
  logMedDose,
  upcomingDoseTimes,
  listMedDoseLogsRemoteLastNDays,
  computeAdherence,
  listSleepSessions,
  type Med,
  type SleepSession as SleepSessionRow,
} from '@/lib/api';
import { logger } from '@/lib/logger';
import { formatDistanceToNow } from 'date-fns';
import { getLastSyncISO, syncHealthData } from '@/lib/sync';
import type { SleepSession as HealthSleepSession } from '@/lib/health/types';
import { getRecoveryProgress, getStageById, type RecoveryStageId } from '@/lib/recovery';
import { getStreakStore, recordStreakEvent } from '@/lib/streaks';
import { getUserSettings } from '@/lib/userSettings';
import { logTelemetry } from '@/lib/telemetry';
import { navigateToMeds, navigateToMood } from '@/navigation/nav';
import { InsightCard } from '@/components/InsightCard';
import { useScientificInsights } from '@/providers/InsightsProvider';
import { pickInsightForScreen, type InsightScope } from '@/lib/insights/pickInsightForScreen';
import { ProgressRing } from '@/components/ProgressRing';
import { useAuth } from '@/providers/AuthProvider';
import { triggerLightHaptic } from '@/lib/haptics';
import { getTodayEvents, type CalendarEvent } from '@/lib/calendar';
import { InformationalCard, ActionCard } from '@/components/ui';
import { FeatureCardHeader } from '@/components/ui/FeatureCardHeader';
import { CelebrateRow } from '@/components/dashboard/CelebrateRow';
import { loadSleepSettings, type SleepSettings } from '@/lib/sleepSettings';
import { ScheduleOverlay, type ScheduleOverlayItem } from '@/components/dashboard/ScheduleOverlay';

type UpcomingDose = {
  id: string;
  med: Med;
  scheduled: Date;
};

type ScheduleItem =
  | {
      key: string;
      time: Date;
      kind: 'med';
      icon: keyof typeof MaterialCommunityIcons.glyphMap;
      title: string;
      subtitle?: string;
      medId: string;
      scheduledISO: string;
      onPress?: () => void;
    }
  | {
      key: string;
      time: Date;
      kind: 'sleep';
      icon: keyof typeof MaterialCommunityIcons.glyphMap;
      title: string;
      subtitle?: string;
      onPress?: () => void;
    }
  | {
      key: string;
      time: Date;
      kind: 'info';
      icon: keyof typeof MaterialCommunityIcons.glyphMap;
      title: string;
      subtitle?: string;
      onPress?: () => void;
    };

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getSleepMidpointMinutes(startISO?: string | null, endISO?: string | null): number | null {
  if (!startISO || !endISO) return null;
  const start = new Date(startISO).getTime();
  const end = new Date(endISO).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  const midpoint = start + (end - start) / 2;
  const midpointDate = new Date(midpoint);
  return midpointDate.getHours() * 60 + midpointDate.getMinutes();
}

function standardDeviation(values: number[]): number | null {
  if (values.length < 2) return null;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function sleepConsistencyText(midpointStdMinutes: number) {
  if (!Number.isFinite(midpointStdMinutes)) return { valueText: '—', helper: '—' };
  if (midpointStdMinutes <= 20) return { valueText: 'Steady', helper: `${Math.round(midpointStdMinutes)}m drift` };
  if (midpointStdMinutes <= 45) return { valueText: 'Improving', helper: `${Math.round(midpointStdMinutes)}m drift` };
  if (midpointStdMinutes <= 75) return { valueText: 'Shifting', helper: `${Math.round(midpointStdMinutes)}m drift` };
  return { valueText: 'Unstable', helper: `${Math.round(midpointStdMinutes)}m drift` };
}

function medsOnTrackText(pct: number) {
  if (!Number.isFinite(pct)) return { valueText: '—', helper: '—' };
  const p = Math.round(pct);
  if (p >= 90) return { valueText: 'On track', helper: `${p}% this week` };
  if (p >= 70) return { valueText: 'Getting there', helper: `${p}% this week` };
  if (p >= 40) return { valueText: 'Needs a nudge', helper: `${p}% this week` };
  return { valueText: 'Off track', helper: `${p}% this week` };
}

function parseHHMMToMinutes(hhmm: string): number | null {
  const s = (hhmm ?? '').trim();
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

function dateWithTimeLikeToday(timeMins: number, base?: Date) {
  const now = base ?? new Date();
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(timeMins);
  return d;
}

// ✅ Range helper (overlay end: tomorrow 12:00)
function tomorrowNoonLocal(base = new Date()) {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  d.setHours(12, 0, 0, 0);
  return d;
}

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
    logger.warn('Dashboard sleep fetch failed', error);
    return null;
  }
}

export default function Dashboard() {
  const { session } = useAuth();
  const theme = useTheme();
  const qc = useQueryClient();

  const [refreshing, setRefreshing] = useState(false);
  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });

  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncingRef = useRef(false);

  const [reduceMotion, setReduceMotion] = useState(false);
  const reduceMotionRef = useRef(false);

  const [fabOpen, setFabOpen] = useState(false);

  // ✅ Overlay open state (repurposed for the ScheduleOverlay planning view)
  const [calendarOverlayOpen, setCalendarOverlayOpen] = useState(false);

  // ✅ Hard guards to prevent sync loops
  const didInitialSyncRef = useRef(false);
  const lastActiveSyncAtRef = useRef(0);

  // ✅ Insights (typed, no any hacks)
  const {
    insight: topInsight,
    insights: rankedInsights,
    status: insightStatus,
    refresh: refreshInsight,
    enabled: insightsEnabled,
  } = useScientificInsights();

  const [insightActionBusy, setInsightActionBusy] = useState(false);

  const userSettingsQ = useQuery({
    queryKey: ['user:settings'],
    queryFn: getUserSettings,
    retry: false,
    throwOnError: false,
    staleTime: 60000,
  });

  const hapticsEnabled = userSettingsQ.data?.hapticsEnabled ?? true;
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
  });

  const medLogsQ = useQuery({
    queryKey: ['meds:logs:7d'],
    queryFn: () => listMedDoseLogsRemoteLastNDays(7),
    enabled: !!session,
    retry: false,
    throwOnError: false,
    staleTime: 30000,
  });

  const sleepQ = useQuery<HealthSleepSession | null>({
    queryKey: ['dashboard:lastSleep'],
    queryFn: fetchLatestSleep,
    retry: false,
    throwOnError: false,
    staleTime: 30000,
  });

  const sleepSettingsQ = useQuery<SleepSettings>({
    queryKey: ['sleep:settings'],
    queryFn: loadSleepSettings,
    retry: false,
    throwOnError: false,
    staleTime: 60000,
  });

  const recoveryQ = useQuery({
    queryKey: ['recovery:progress'],
    queryFn: getRecoveryProgress,
    retry: false,
    throwOnError: false,
    staleTime: 60000,
  });

  const streaksQ = useQuery({
    queryKey: ['streaks'],
    queryFn: getStreakStore,
    retry: false,
    throwOnError: false,
    staleTime: 60000,
  });

  const sleepSessionsRingQ = useQuery({
    queryKey: ['sleep:sessions:ring'],
    queryFn: () => listSleepSessions(7),
    enabled: !!session,
    retry: false,
    throwOnError: false,
    staleTime: 30000,
  });

  // ✅ Calendar query lives here (so we can show next 2 events in Today)
  const calendarQ = useQuery<CalendarEvent[]>({
    queryKey: ['calendar', 'today'],
    queryFn: getTodayEvents,
    refetchInterval: 5 * 60 * 1000,
    retry: false,
    throwOnError: false,
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

  const medAdherencePct = useMemo(() => {
    if (!Array.isArray(medLogsQ.data) || medLogsQ.data.length === 0) return null;
    const stats = computeAdherence(medLogsQ.data);
    return stats.pct;
  }, [medLogsQ.data]);

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
    async (options: { showToast?: boolean; invalidateQueries?: boolean } = {}) => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      setIsSyncing(true);
      try {
        const result = await syncHealthData();
        if (result.syncedAt) setLastSyncedAt(result.syncedAt);

        if (options.invalidateQueries !== false) {
          await Promise.all([
            qc.invalidateQueries({ queryKey: ['dashboard:lastSleep'] }),
            qc.invalidateQueries({ queryKey: ['sleep:last'] }),
            qc.invalidateQueries({ queryKey: ['sleep:sessions:30d'] }),
            qc.invalidateQueries({ queryKey: ['sleep:settings'] }),
          ]);
          await sleepQ.refetch();
          await sleepSettingsQ.refetch();
        }

        if (options.showToast) setSnackbar({ visible: true, message: 'Health data synced.' });
      } catch (error: any) {
        logger.warn('Health sync failed:', error);
        if (options.showToast) setSnackbar({ visible: true, message: error?.message ?? 'Health sync failed.' });
      } finally {
        isSyncingRef.current = false;
        setIsSyncing(false);
      }
    },
    [qc, sleepQ, sleepSettingsQ],
  );

  useEffect(() => {
    if (didInitialSyncRef.current) return;
    didInitialSyncRef.current = true;

    let cancelled = false;
    (async () => {
      try {
        const lastSync = await getLastSyncISO();
        if (!lastSync) {
          if (!cancelled) await runHealthSync({ invalidateQueries: false });
          return;
        }
        const lastSyncTime = new Date(lastSync).getTime();
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        if (lastSyncTime < fiveMinutesAgo && !cancelled) {
          await runHealthSync({ invalidateQueries: false });
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
    const SYNC_COOLDOWN = 60000;

    const handleAppState = async (state: AppStateStatus) => {
      if (state !== 'active') return;

      const now = Date.now();
      if (now - lastActiveSyncAtRef.current < SYNC_COOLDOWN) return;

      lastActiveSyncAtRef.current = now;
      await runHealthSync({ invalidateQueries: true });
    };

    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [runHealthSync]);

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

  // ✅ Dashboard insight selection (shared, deterministic, no local policy logic)
  const dashboardInsight = useMemo(() => {
    const candidates = rankedInsights?.length ? rankedInsights : topInsight ? [topInsight] : [];

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

    // Ensure stable order even when no prefs
    (['sleep', 'meds', 'mood'] as InsightScope[]).forEach((s) => {
      if (!preferred.includes(s)) preferred.push(s);
    });

    return pickInsightForScreen(candidates, {
      dashboardFirst: true,
      preferredScopes: preferred,
      allowGlobalFallback: true,
    });
  }, [rankedInsights, topInsight, sleepQ.data, sleepQ.isLoading, upcomingDoses.length, medAdherencePct, moodStreak.count]);

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

      refreshInsight('dashboard-refresh-gesture').catch((err: unknown) =>
        logger.warn('Insight refresh failed during pull-to-refresh', err),
      );
    } finally {
      setRefreshing(false);
    }
  }, [qc, refreshInsight, runHealthSync]);

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
  ]);

  // ======================================================================
  // ✅ Combined schedule list → preview (6) + overlay (window, cap 25)
  // ======================================================================

  const scheduleItemsAll: ScheduleItem[] = useMemo(() => {
    const now = new Date();
    const items: ScheduleItem[] = [];

    // Calendar next 2
    for (const ev of nextTwoCalendarEvents) {
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
    for (const d of upcomingDoses) {
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

    return items
      .filter((it) => it?.time && Number.isFinite(it.time.getTime()))
      .sort((a, b) => a.time.getTime() - b.time.getTime());
  }, [nextTwoCalendarEvents, upcomingDoses, sleepSettingsQ.data]);

  // ✅ Preview list: next 6 combined
  const scheduleItems: ScheduleItem[] = useMemo(() => scheduleItemsAll.slice(0, 6), [scheduleItemsAll]);

  // ✅ Overlay list: include “just started” (now - 5 min) → tomorrow 12:00, cap 25
  const scheduleOverlayItems: ScheduleItem[] = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getTime() - 5 * 60 * 1000);
    const end = tomorrowNoonLocal(now);

    return scheduleItemsAll
      .filter((it) => it.time.getTime() >= start.getTime() && it.time.getTime() <= end.getTime())
      .slice(0, 25);
  }, [scheduleItemsAll]);

  // ✅ Feed ScheduleOverlay component
  const scheduleOverlayItemsForComponent: ScheduleOverlayItem[] = useMemo(() => {
    return scheduleOverlayItems.map((it) => ({
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

  const cardRow = useCallback(
    (item: ScheduleItem) => {
      const isPast = item.time.getTime() < Date.now() - 60 * 1000;
      const timeLabel = formatTime(item.time);

      const leftTitle = item.kind === 'med' ? timeLabel : `${timeLabel} • ${item.title}`;
      const line2 = item.kind === 'med' ? item.title : item.subtitle ?? '';

      const kindStyle = (() => {
        switch (item.kind) {
          case 'med':
            return {
              bg: theme.colors.primaryContainer,
              stripe: theme.colors.primary,
              iconBg: theme.colors.background,
              iconColor: theme.colors.onSurface,
            };
          case 'sleep':
            return {
              bg: theme.colors.secondaryContainer,
              stripe: theme.colors.secondary,
              iconBg: theme.colors.background,
              iconColor: theme.colors.onSurface,
            };
          case 'info':
          default:
            return {
              bg: theme.colors.surfaceVariant,
              stripe: theme.colors.outlineVariant ?? theme.colors.outline,
              iconBg: theme.colors.background,
              iconColor: theme.colors.onSurface,
            };
        }
      })();

      return (
        <Pressable
          key={item.key}
          onPress={item.onPress}
          disabled={!item.onPress}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 14,
            backgroundColor: kindStyle.bg,
            marginBottom: 10,
            opacity: isPast ? 0.6 : 1,
            borderLeftWidth: 4,
            borderLeftColor: kindStyle.stripe,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
              backgroundColor: kindStyle.iconBg,
            }}
          >
            <MaterialCommunityIcons name={item.icon} size={20} color={kindStyle.iconColor} />
          </View>

          <View style={{ flex: 1 }}>
            <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
              {leftTitle}
            </Text>
            <Text variant="bodySmall" style={{ marginTop: 2, color: theme.colors.onSurfaceVariant }}>
              {line2}
            </Text>

            {item.kind === 'med' && item.subtitle ? (
              <Text variant="bodySmall" style={{ marginTop: 2, color: theme.colors.onSurfaceVariant, opacity: 0.85 }}>
                {item.subtitle}
              </Text>
            ) : null}
          </View>

          {item.kind === 'med' ? (
            <Button
              mode="contained"
              compact
              onPress={() => handleTakeDose(item.medId, item.scheduledISO)}
              loading={
                takeDoseMutation.isPending &&
                takeDoseMutation.variables?.medId === item.medId &&
                takeDoseMutation.variables?.scheduledISO === item.scheduledISO
              }
              disabled={
                takeDoseMutation.isPending &&
                takeDoseMutation.variables?.medId === item.medId &&
                takeDoseMutation.variables?.scheduledISO === item.scheduledISO
              }
            >
              Taken
            </Button>
          ) : null}
        </Pressable>
      );
    },
    [
      handleTakeDose,
      takeDoseMutation.isPending,
      takeDoseMutation.variables?.medId,
      takeDoseMutation.variables?.scheduledISO,
      theme.colors,
    ],
  );

  const cardRadius = 18;
  const sectionGap = 14;

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 140 }}
        refreshControl={<RefreshControl refreshing={refreshing || isSyncing} onRefresh={onRefresh} />}
      >
        {/* HERO */}
        <View style={{ marginBottom: sectionGap }}>
          <ActionCard style={{ backgroundColor: theme.colors.secondaryContainer }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 16,
                  backgroundColor: theme.colors.primary,
                }}
              >
                <MaterialCommunityIcons
                  name={greetingIcon as keyof typeof MaterialCommunityIcons.glyphMap}
                  size={26}
                  color={theme.colors.onPrimary}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                  {greetingText}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                  {greetingSubtitle}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, opacity: 0.85 }}>
                  Health sync:{' '}
                  {lastSyncedAt ? `${formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true })}` : 'never'}.
                </Text>
              </View>

              <Button
                mode="contained-tonal"
                compact
                onPress={() => runHealthSync({ showToast: true })}
                loading={isSyncing}
                disabled={isSyncing}
                accessibilityLabel="Manually sync health data"
              >
                Sync
              </Button>
            </View>
          </ActionCard>
        </View>

        {/* PRIMARY NEXT ACTION */}
        <View style={{ marginBottom: sectionGap }}>
          <ActionCard>
            <View style={{ paddingVertical: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                      backgroundColor: theme.colors.surfaceVariant,
                    }}
                  >
                    <MaterialCommunityIcons name={primaryAction.icon} size={22} color={theme.colors.onSurface} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                      {primaryAction.title}
                    </Text>
                    <Text variant="bodySmall" style={{ marginTop: 2, color: theme.colors.onSurfaceVariant }}>
                      {primaryAction.subtitle}
                    </Text>
                    <Text variant="bodySmall" style={{ marginTop: 2, color: theme.colors.onSurfaceVariant }}>
                      {primaryAction.meta}
                    </Text>
                  </View>
                </View>
                <Button mode="contained" onPress={primaryAction.onPress} loading={primaryAction.loading} disabled={primaryAction.loading}>
                  {primaryAction.cta}
                </Button>
              </View>
            </View>
          </ActionCard>
        </View>

        {/* PROGRESS */}
        {progressMetrics.length ? (
          <View style={{ marginBottom: sectionGap }}>
            <InformationalCard>
              <FeatureCardHeader icon="chart-donut" title="Your progress" subtitle="Tiny wins. Real momentum." />

              <Text style={{ marginTop: 4, color: theme.colors.onSurfaceVariant }}>
                Keep it simple today — you’re building consistency, not perfection.
              </Text>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 10 }}>
                {progressMetrics.map((metric) => (
                  <View key={metric.key} style={{ width: '32%', minWidth: 100, marginBottom: 16 }}>
                    <ProgressRing
                      progress={metric.progress}
                      valueText={metric.valueText}
                      label={metric.label}
                      accessibilityLabel={metric.accessibilityLabel}
                    />
                  </View>
                ))}
              </View>

              {sleepMidpointStd !== null ? (
                <Text style={{ marginTop: 2, color: theme.colors.onSurfaceVariant }}>
                  Sleep consistency: {sleepConsistencyText(sleepMidpointStd).helper}.
                </Text>
              ) : null}

              {medAdherencePct !== null ? (
                <Text style={{ marginTop: 2, color: theme.colors.onSurfaceVariant }}>
                  Meds: {medsOnTrackText(medAdherencePct).helper}.
                </Text>
              ) : null}
            </InformationalCard>
          </View>
        ) : null}

        {/* TODAY */}
        <View style={{ marginBottom: sectionGap }}>
          <InformationalCard>
            <FeatureCardHeader icon="calendar-today" title="Today" subtitle="Your schedule, simplified." />

            <View style={{ marginTop: 10 }}>
              {medsQ.isLoading || sleepSettingsQ.isLoading || calendarQ.isLoading ? (
                <ActivityIndicator style={{ paddingVertical: 8 }} />
              ) : null}

              {!medsQ.isLoading && !sleepSettingsQ.isLoading && !calendarQ.isLoading && scheduleItems.length === 0 ? (
                <View style={{ paddingVertical: 12 }}>
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>
                    Nothing scheduled yet. Add meds, set a wake time, or add calendar events.
                  </Text>
                </View>
              ) : null}

              {scheduleItems.map((it) => cardRow(it))}
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
              <Button mode="outlined" onPress={navigateToMeds} compact>
                View meds
              </Button>

              <Button mode="outlined" onPress={() => setCalendarOverlayOpen(true)} compact icon="calendar-month-outline">
                Open schedule
              </Button>

              <Button mode="outlined" onPress={() => runHealthSync({ showToast: true })} compact loading={isSyncing} disabled={isSyncing}>
                Sync health
              </Button>
            </View>
          </InformationalCard>
        </View>

        {/* MOOD */}
        <View style={{ marginBottom: sectionGap }}>
          <InformationalCard>
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
              </View>
            </View>
          </InformationalCard>
        </View>

        {/* RECOVERY */}
        <View style={{ marginBottom: sectionGap }}>
          <InformationalCard>
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

        {/* INSIGHT */}
        <View style={{ marginBottom: sectionGap }}>
          {insightsEnabled ? (
            <>
              {insightStatus === 'loading' ? (
                <InformationalCard>
                  <FeatureCardHeader icon="lightbulb-on-outline" title="Today’s insight" subtitle="One helpful nudge." />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 }}>
                    <ActivityIndicator />
                    <Text style={{ color: theme.colors.onSurfaceVariant }}>Refreshing…</Text>
                  </View>
                </InformationalCard>
              ) : null}

              {insightStatus === 'error' ? (
                <InformationalCard>
                  <FeatureCardHeader
                    icon="lightbulb-on-outline"
                    title="Today’s insight"
                    subtitle="One helpful nudge."
                    rightSlot={
                      <Button mode="text" compact onPress={handleInsightRefreshPress}>
                        Try again
                      </Button>
                    }
                  />
                  <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                    We couldn’t refresh insights right now.
                  </Text>
                </InformationalCard>
              ) : null}

              {insightStatus === 'ready' ? (
                dashboardInsight ? (
                  <InsightCard
                    insight={dashboardInsight}
                    onActionPress={handleInsightActionPress}
                    onRefreshPress={handleInsightRefreshPress}
                    isProcessing={insightActionBusy}
                    disabled={insightActionBusy}
                    testID="dashboard-insight-card"
                  />
                ) : (
                  <InformationalCard>
                    <FeatureCardHeader icon="lightbulb-on-outline" title="Today’s insight" subtitle="One helpful nudge." />
                    <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                      No new insight right now. Check back later.
                    </Text>
                    <View style={{ alignItems: 'flex-start', marginTop: 8 }}>
                      <Button mode="text" compact onPress={handleInsightRefreshPress}>
                        Refresh
                      </Button>
                    </View>
                  </InformationalCard>
                )
              ) : null}
            </>
          ) : (
            <InformationalCard>
              <FeatureCardHeader icon="lightbulb-on-outline" title="Today’s insight" subtitle="One helpful nudge." />
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginTop: 8 }}>
                Scientific insights are turned off.
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                Re-enable them in Settings → Scientific insights to see tailored nudges here.
              </Text>
            </InformationalCard>
          )}
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
      </ScrollView>

      {/* ✅ ScheduleOverlay planning window */}
      <Portal>
        <ScheduleOverlay
          {...({
            open: calendarOverlayOpen,
            onClose: () => setCalendarOverlayOpen(false),
            items: scheduleOverlayItemsForComponent,
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
    </>
  );
}
