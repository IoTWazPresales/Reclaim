// C:\Reclaim\app\src\screens\Dashboard.tsx
import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  AccessibilityInfo,
  AppState,
  AppStateStatus,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Divider,
  List,
  Portal,
  Snackbar,
  Text,
  FAB,
  useTheme,
} from 'react-native-paper';
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
import { getStreakStore, getBadgesFor, recordStreakEvent } from '@/lib/streaks';
import { getUserSettings } from '@/lib/userSettings';
import { logTelemetry } from '@/lib/telemetry';
import { navigateToMeds, navigateToMood } from '@/navigation/nav';
import { InsightCard } from '@/components/InsightCard';
import { useScientificInsights } from '@/providers/InsightsProvider';
import { ProgressRing } from '@/components/ProgressRing';
import { useAuth } from '@/providers/AuthProvider';
import { triggerLightHaptic } from '@/lib/haptics';
import { CalendarCard } from '@/components/CalendarCard';
import { SectionHeader } from '@/components/ui';

type UpcomingDose = {
  id: string;
  med: Med;
  scheduled: Date;
};

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatDuration(minutes?: number | null) {
  if (minutes === undefined || minutes === null) return '—';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const parts = [];
  if (hrs > 0) parts.push(`${hrs}h`);
  if (mins > 0 || parts.length === 0) parts.push(`${mins}m`);
  return parts.join(' ');
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
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
  const variance =
    values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function sourceLabel(platform: HealthSleepSession['source'] | undefined) {
  switch (platform) {
    case 'google_fit':
      return 'Google Fit';
    case 'apple_healthkit':
      return 'Apple Health';
    default:
      return 'Unknown source';
  }
}

function mapSleepRowToHealthSession(row: SleepSessionRow): HealthSleepSession {
  const sourceMap: Record<SleepSessionRow['source'], HealthSleepSession['source']> = {
    healthkit: 'apple_healthkit',
    googlefit: 'google_fit',
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
  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: '',
  });

  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncingRef = useRef(false);

  const [reduceMotion, setReduceMotion] = useState(false);
  const reduceMotionRef = useRef(false);

  const [fabOpen, setFabOpen] = useState(false);

  // ✅ Hard guards to prevent sync loops
  const didInitialSyncRef = useRef(false);
  const lastActiveSyncAtRef = useRef(0);

  const {
    insight,
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

  const moodBadges = useMemo(() => getBadgesFor('mood'), []);
  const medBadges = useMemo(() => getBadgesFor('medication'), []);
  const sleepBadges = useMemo(() => getBadgesFor('sleep'), []);

  const moodBadgeSet = useMemo(() => new Set(moodStreak.badges ?? []), [moodStreak.badges]);
  const medBadgeSet = useMemo(() => new Set(medStreak.badges ?? []), [medStreak.badges]);
  const sleepBadgeSet = useMemo(() => new Set(sleepStreak.badges ?? []), [sleepStreak.badges]);

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
      items.push({
        key: 'mood',
        progress: moodProgress,
        valueText: `${moodStreak.count}d`,
        label: 'Mood streak',
        accessibilityLabel: `Mood streak ${moodStreak.count} days`,
        icon: 'emoticon-happy-outline',
      });
    }

    if (medProgress !== null && medAdherencePct !== null) {
      items.push({
        key: 'meds',
        progress: medProgress,
        valueText: `${Math.round(medAdherencePct)}%`,
        label: 'Meds (7d)',
        accessibilityLabel: `Medication adherence ${Math.round(medAdherencePct)} percent over the last seven days`,
        icon: 'pill',
      });
    }

    if (sleepProgress !== null && sleepMidpointStd !== null) {
      items.push({
        key: 'sleep',
        progress: sleepProgress,
        valueText: `${Math.round(sleepMidpointStd)}m`,
        label: 'Sleep variance',
        accessibilityLabel: `Sleep midpoint variance ${Math.round(sleepMidpointStd)} minutes`,
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

    return items.sort((a, b) => a.scheduled.getTime() - b.scheduled.getTime()).slice(0, 3);
  }, [medsQ.data, medLogsQ.data]);

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
          ]);
          await sleepQ.refetch();
        }

        if (result.sleepSynced || result.activitySynced) {
          refreshInsight('health-sync').catch((err) => logger.warn('Insight refresh failed after health sync', err));

          if (result.sleepSynced && userSettingsQ.data?.badgesEnabled !== false) {
            try {
              const store = await recordStreakEvent('sleep', new Date());
              await logTelemetry({
                name: 'sleep_streak_updated',
                properties: { count: store.sleep.count, longest: store.sleep.longest },
              });
              await qc.invalidateQueries({ queryKey: ['streaks'] });
            } catch (error) {
              logger.warn('Failed to record sleep streak:', error);
            }
          }

          if (options.showToast) fireHaptic('success');
        }

        if (options.showToast) {
          setSnackbar({ visible: true, message: 'Health data synced.' });
        }
      } catch (error: any) {
        logger.warn('Health sync failed:', error);
        if (options.showToast) {
          setSnackbar({ visible: true, message: error?.message ?? 'Health sync failed.' });
        }
      } finally {
        isSyncingRef.current = false;
        setIsSyncing(false);
      }
    },
    [fireHaptic, qc, refreshInsight, sleepQ, userSettingsQ.data?.badgesEnabled],
  );

  // ✅ FIXED: initial sync runs ONCE, even if runHealthSync identity changes
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
  }, []); // intentionally empty to prevent loop

  // ✅ FIXED: AppState sync throttled by ref timestamp
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
      setSnackbar({ visible: true, message: 'Mood logged. Thank you!' });
      await logTelemetry({ name: 'mood_logged', properties: { source: 'dashboard_quick_mood', mood: moodValue } });

      if (userSettingsQ.data?.badgesEnabled !== false) {
        const store = await recordStreakEvent('mood', new Date());
        await logTelemetry({
          name: 'mood_streak_updated',
          properties: { count: store.mood.count, longest: store.mood.longest },
        });
        await qc.invalidateQueries({ queryKey: ['streaks'] });
      }

      refreshInsight('dashboard-mood-log').catch((err) => logger.warn('Insight refresh failed after mood log', err));
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
      setSnackbar({ visible: true, message: 'Dose logged as taken.' });
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

  const handleInsightAction = useCallback(async () => {
    if (!insight) return;
    setInsightActionBusy(true);
    try {
      await logTelemetry({
        name: 'insight_action_triggered',
        properties: { insightId: insight.id, source: 'dashboard' },
      });
      setSnackbar({ visible: true, message: insight.action || 'Action queued. Nice one!' });
      refreshInsight('dashboard-action').catch((err) => logger.warn('Insight refresh failed after action', err));
    } catch (error: any) {
      setSnackbar({ visible: true, message: error?.message ?? 'Unable to follow up on that insight right now.' });
    } finally {
      setInsightActionBusy(false);
    }
  }, [insight, refreshInsight]);

  const handleInsightRefresh = useCallback(() => {
    if (insightStatus === 'loading') return;
    refreshInsight('dashboard-manual').catch((err) => {
      logger.warn('Manual insight refresh failed', err);
      setSnackbar({ visible: true, message: 'Unable to refresh insights right now.' });
    });
  }, [refreshInsight, insightStatus]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await runHealthSync({ showToast: true });
      await qc.invalidateQueries({ queryKey: ['meds:list'] });
      refreshInsight('dashboard-refresh-gesture').catch((err) =>
        logger.warn('Insight refresh failed during pull-to-refresh', err),
      );
    } finally {
      setRefreshing(false);
    }
  }, [qc, refreshInsight, runHealthSync]);

  const cardRadius = 18;
  const sectionGap = 14;

  const greetingSubtitle = useMemo(() => {
    if (moodStreak.count > 0) return `Mood streak • ${moodStreak.count} day${moodStreak.count === 1 ? '' : 's'}`;
    if (medAdherencePct !== null) return `Medication adherence • ${Math.round(medAdherencePct)}% this week`;
    return 'Let’s make today feel a little lighter.';
  }, [medAdherencePct, moodStreak.count]);

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
        title: 'Next dose',
        subtitle: `${next.med.name}${next.med.dose ? ` • ${next.med.dose}` : ''}`,
        meta: `Due ${formatTime(next.scheduled)}`,
        icon: 'pill' as const,
        cta: 'Take now',
        onPress: () => handleTakeDose(next.med.id!, next.scheduled.toISOString()),
        loading:
          takeDoseMutation.isPending &&
          takeDoseMutation.variables?.medId === next.med.id &&
          takeDoseMutation.variables?.scheduledISO === next.scheduled.toISOString(),
      };
    }

    if (!sleepQ.data && !sleepQ.isLoading) {
      return {
        title: 'No sleep synced yet',
        subtitle: 'Tap to sync your latest sleep session.',
        meta: lastSyncedAt ? `Last synced ${formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true })}` : 'Never synced',
        icon: 'sleep' as const,
        cta: 'Sync now',
        onPress: () => runHealthSync({ showToast: true }),
        loading: isSyncing,
      };
    }

    return {
      title: 'Quick check-in',
      subtitle: 'How are you feeling right now?',
      meta: 'Takes 2 seconds',
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

  const FriendlyEmptyState = useCallback(
    ({ icon, title, subtitle }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; title: string; subtitle: string }) => (
      <View style={{ alignItems: 'center', paddingVertical: 18 }}>
        <MaterialCommunityIcons
          name={icon}
          size={42}
          color={theme.colors.onSurfaceVariant}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <Text variant="titleSmall" style={{ marginTop: 12, color: theme.colors.onSurface }}>
          {title}
        </Text>
        <Text variant="bodySmall" style={{ marginTop: 6, textAlign: 'center', color: theme.colors.onSurfaceVariant }}>
          {subtitle}
        </Text>
      </View>
    ),
    [theme.colors.onSurface, theme.colors.onSurfaceVariant],
  );

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 140 }}
        refreshControl={<RefreshControl refreshing={refreshing || isSyncing} onRefresh={onRefresh} />}
      >
        {/* HERO */}
        <Card
          mode="elevated"
          style={{
            borderRadius: 24,
            backgroundColor: theme.colors.secondaryContainer,
            marginBottom: sectionGap,
          }}
        >
          <Card.Content style={{ flexDirection: 'row', alignItems: 'center' }}>
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
              <Text variant="titleMedium" style={{ color: theme.colors.onSecondaryContainer, fontWeight: '700' }}>
                {greetingText}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSecondaryContainer, marginTop: 4 }}>
                {greetingSubtitle}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSecondaryContainer, marginTop: 4, opacity: 0.85 }}>
                Last synced{' '}
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
          </Card.Content>
        </Card>

        {/* PRIMARY NEXT ACTION */}
        <Card mode="elevated" style={{ borderRadius: cardRadius, marginBottom: sectionGap }}>
          <Card.Content style={{ paddingVertical: 14 }}>
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
                  <Text variant="titleMedium" style={{ fontWeight: '700' }}>
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
              <Button
                mode="contained"
                onPress={primaryAction.onPress}
                loading={primaryAction.loading}
                disabled={primaryAction.loading}
              >
                {primaryAction.cta}
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* PROGRESS */}
        {progressMetrics.length ? (
          <View style={{ marginBottom: sectionGap }}>
            <SectionHeader title="Progress" caption="Small wins add up." icon="chart-donut" />
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
          </View>
        ) : null}

        {/* TODAY */}
        <View style={{ marginBottom: sectionGap }}>
          <SectionHeader title="Today" caption="Your day, sorted." icon="calendar-today" />

          <Card mode="elevated" style={{ borderRadius: cardRadius, marginTop: 10 }}>
            <Card.Content style={{ paddingVertical: 6, paddingHorizontal: 8 }}>
              <List.Accordion
                title="Medication"
                description="What’s due next"
                left={(props) => <List.Icon {...props} icon="pill" />}
              >
                {medsQ.isLoading ? <ActivityIndicator style={{ paddingVertical: 12 }} /> : null}
                {medsQ.error ? (
                  <Text style={{ color: theme.colors.error, paddingHorizontal: 16, paddingBottom: 12 }}>
                    {(medsQ.error as any)?.message ?? 'Unable to load medications.'}
                  </Text>
                ) : null}

                {!medsQ.isLoading && !medsQ.error && upcomingDoses.length === 0 ? (
                  <View style={{ paddingHorizontal: 8 }}>
                    <FriendlyEmptyState
                      icon="calendar-check"
                      title="No doses due"
                      subtitle="All scheduled medications are up to date."
                    />
                  </View>
                ) : null}

                {upcomingDoses.map(({ id, med, scheduled }) => (
                  <List.Item
                    key={id}
                    title={med.name}
                    description={`${formatTime(scheduled)}${med.dose ? ` • ${med.dose}` : ''}`}
                    right={() => (
                      <Button
                        mode="contained-tonal"
                        compact
                        onPress={() => handleTakeDose(med.id!, scheduled.toISOString())}
                        loading={
                          takeDoseMutation.isPending &&
                          takeDoseMutation.variables?.medId === med.id &&
                          takeDoseMutation.variables?.scheduledISO === scheduled.toISOString()
                        }
                      >
                        Take
                      </Button>
                    )}
                  />
                ))}

                <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                  <Button mode="text" onPress={navigateToMeds}>
                    View all meds
                  </Button>
                </View>
              </List.Accordion>

              <Divider />

              <List.Accordion
                title="Sleep"
                description={
                  sleepQ.data
                    ? `${formatDuration(sleepQ.data.durationMinutes)} • ${sourceLabel(sleepQ.data.source)}`
                    : 'Most recent session'
                }
                left={(props) => <List.Icon {...props} icon="sleep" />}
              >
                {sleepQ.isLoading && !sleepQ.data ? <ActivityIndicator style={{ paddingVertical: 12 }} /> : null}

                {sleepQ.error ? (
                  <Text style={{ color: theme.colors.error, paddingHorizontal: 16, paddingBottom: 12 }}>
                    {(sleepQ.error as any)?.message ?? 'Unable to load sleep data.'}
                  </Text>
                ) : null}

                {!sleepQ.isLoading && !sleepQ.error && !sleepQ.data ? (
                  <View style={{ paddingHorizontal: 8 }}>
                    <FriendlyEmptyState
                      icon="sleep"
                      title="No sleep synced yet"
                      subtitle="Connect a health provider or tap Sync to pull your latest sleep session."
                    />
                    <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                      <Button mode="contained-tonal" onPress={() => runHealthSync({ showToast: true })} loading={isSyncing}>
                        Sync now
                      </Button>
                    </View>
                  </View>
                ) : null}

                {sleepQ.data ? (
                  <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                    <Text variant="headlineSmall">{formatDuration(sleepQ.data.durationMinutes)}</Text>
                    <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}>
                      Start {sleepQ.data.startTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} • End{' '}
                      {sleepQ.data.endTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </Text>
                    <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                      Source: {sourceLabel(sleepQ.data.source)}
                    </Text>
                  </View>
                ) : null}
              </List.Accordion>

              <Divider />

              <List.Accordion
                title="Schedule"
                description="Upcoming events"
                left={(props) => <List.Icon {...props} icon="calendar-month-outline" />}
              >
                <View style={{ paddingHorizontal: 8, paddingBottom: 12 }}>
                  <CalendarCard testID="dashboard-calendar-card" />
                </View>
              </List.Accordion>

              <Divider />

              <List.Accordion
                title="Recovery plan"
                description={recoveryStage.title}
                left={(props) => <List.Icon {...props} icon="meditation" />}
              >
                <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                    <Text variant="titleMedium">{recoveryStage.title}</Text>
                    {recoveryQ.data?.currentWeek ? (
                      <Chip mode="flat" compact style={{ backgroundColor: theme.colors.primaryContainer }} textStyle={{ fontSize: 12 }}>
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
                    Manage recovery plan
                  </Button>
                </View>
              </List.Accordion>

              <Divider />

              <List.Accordion title="Quick mood" description="Tap a score" left={(props) => <List.Icon {...props} icon="emoticon-happy-outline" />}>
                <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                  <Text variant="bodyMedium" style={{ marginBottom: 12 }}>
                    Tap the score that matches your mood right now.
                  </Text>
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
                  <Text variant="bodySmall" style={{ marginTop: 12, color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                    Your check-ins help build streaks and personalised insights.
                  </Text>
                </View>
              </List.Accordion>
            </Card.Content>
          </Card>
        </View>

        {/* INSIGHT */}
        <View style={{ marginBottom: sectionGap }}>
          {insightsEnabled ? (
            <>
              <SectionHeader title="Scientific insight" caption="One useful nudge." icon="lightbulb-on-outline" />

              {insightStatus === 'loading' ? (
                <Card mode="outlined" style={{ borderRadius: cardRadius, marginTop: 10 }}>
                  <Card.Content style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <ActivityIndicator />
                    <Text style={{ color: theme.colors.onSurfaceVariant }}>Refreshing insights…</Text>
                  </Card.Content>
                </Card>
              ) : null}

              {insightStatus === 'error' ? (
                <Card mode="outlined" style={{ borderRadius: cardRadius, marginTop: 10 }}>
                  <Card.Content style={{ flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
                    <Text style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}>
                      We couldn’t refresh insights right now.
                    </Text>
                    <Button mode="text" compact onPress={handleInsightRefresh}>
                      Try again
                    </Button>
                  </Card.Content>
                </Card>
              ) : null}

              {insight && insightStatus === 'ready' ? (
                <View style={{ marginTop: 10 }}>
                  <InsightCard
                    insight={insight}
                    onActionPress={handleInsightAction}
                    onRefreshPress={handleInsightRefresh}
                    isProcessing={insightActionBusy}
                    disabled={insightActionBusy}
                    testID="dashboard-insight-card"
                  />
                </View>
              ) : null}
            </>
          ) : (
            <Card mode="outlined" style={{ borderRadius: cardRadius }}>
              <Card.Content>
                <Text variant="bodyMedium">Scientific insights are turned off.</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                  Re-enable them in Settings → Scientific insights to see tailored nudges here.
                </Text>
              </Card.Content>
            </Card>
          )}
        </View>

        {/* STREAKS */}
        {userSettingsQ.data?.badgesEnabled !== false ? (
          <View style={{ marginBottom: sectionGap }}>
            <SectionHeader title="Streaks & badges" caption="Celebrate consistency." icon="trophy-outline" />
            <Card mode="elevated" style={{ borderRadius: cardRadius, marginTop: 10 }}>
              <Card.Content style={{ paddingVertical: 6, paddingHorizontal: 8 }}>
                <List.Accordion title="Mood" description={`${moodStreak.count} days • Longest ${moodStreak.longest}`}>
                  <View style={{ paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {moodBadges.map((badge) => {
                      const unlocked = moodBadgeSet.has(badge.id);
                      return (
                        <Chip
                          key={badge.id}
                          icon={unlocked ? 'star-circle' : 'clock-outline'}
                          mode={unlocked ? 'flat' : 'outlined'}
                          style={{
                            backgroundColor: unlocked ? (theme.colors.secondaryContainer ?? theme.colors.surfaceVariant) : 'transparent',
                          }}
                          textStyle={{
                            color: unlocked ? (theme.colors.onSecondaryContainer ?? theme.colors.onSurface) : theme.colors.onSurfaceVariant,
                          }}
                        >
                          {badge.title}
                        </Chip>
                      );
                    })}
                  </View>
                </List.Accordion>

                <Divider />

                <List.Accordion title="Medication" description={`${medStreak.count} days • Longest ${medStreak.longest}`}>
                  <View style={{ paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {medBadges.map((badge) => {
                      const unlocked = medBadgeSet.has(badge.id);
                      return (
                        <Chip
                          key={badge.id}
                          icon={unlocked ? 'pill' : 'progress-clock'}
                          mode={unlocked ? 'flat' : 'outlined'}
                          style={{
                            backgroundColor: unlocked ? (theme.colors.secondaryContainer ?? theme.colors.surfaceVariant) : 'transparent',
                          }}
                          textStyle={{
                            color: unlocked ? (theme.colors.onSecondaryContainer ?? theme.colors.onSurface) : theme.colors.onSurfaceVariant,
                          }}
                        >
                          {badge.title}
                        </Chip>
                      );
                    })}
                  </View>
                </List.Accordion>

                <Divider />

                <List.Accordion title="Sleep" description={`${sleepStreak.count} days • Longest ${sleepStreak.longest}`}>
                  <View style={{ paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {sleepBadges.map((badge) => {
                      const unlocked = sleepBadgeSet.has(badge.id);
                      return (
                        <Chip
                          key={badge.id}
                          icon={unlocked ? 'sleep' : 'clock-outline'}
                          mode={unlocked ? 'flat' : 'outlined'}
                          style={{
                            backgroundColor: unlocked ? (theme.colors.secondaryContainer ?? theme.colors.surfaceVariant) : 'transparent',
                          }}
                          textStyle={{
                            color: unlocked ? (theme.colors.onSecondaryContainer ?? theme.colors.onSurface) : theme.colors.onSurfaceVariant,
                          }}
                        >
                          {badge.title}
                        </Chip>
                      );
                    })}
                  </View>
                </List.Accordion>
              </Card.Content>
            </Card>
          </View>
        ) : null}
      </ScrollView>

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
