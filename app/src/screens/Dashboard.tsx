// C:\Reclaim\app\src\screens\Dashboard.tsx
import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  AccessibilityInfo,
  Animated,
  AppState,
  AppStateStatus,
  RefreshControl,
  SectionList,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
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
import { getUnifiedHealthService } from '@/lib/health';
import type { SleepSession as HealthSleepSession } from '@/lib/health/types';
import { logger } from '@/lib/logger';
import { formatDistanceToNow } from 'date-fns';
import { getLastSyncISO, syncHealthData } from '@/lib/sync';
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

type UpcomingDose = {
  id: string;
  med: Med;
  scheduled: Date;
};

type SectionKey = 'meds' | 'sleep' | 'recovery' | 'mood' | 'streaks';

type DashboardSection = {
  key: SectionKey;
  title: string;
  subtitle?: string;
  data: SectionKey[];
};

function AnimatedCardWrapper({
  index,
  reduceMotion,
  children,
}: {
  index: number;
  reduceMotion: boolean;
  children: React.ReactNode;
}) {
  const translateY = useRef(new Animated.Value(12)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, opacity, reduceMotion, translateY]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

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
    case 'health_connect':
      return 'Health Connect';
    case 'samsung_health':
      return 'Samsung Health';
    case 'apple_healthkit':
      return 'Apple Health';
    default:
      return 'Unknown source';
  }
}

async function fetchLatestSleep(): Promise<HealthSleepSession | null> {
  try {
    const service = getUnifiedHealthService();
    if (!service) return null;
    try {
      const hasPermissions = await service.hasAllPermissions();
      if (!hasPermissions) {
        return null;
      }
    } catch (error) {
      logger.warn('Dashboard sleep permission check failed', error);
      return null;
    }
    return await service.getLatestSleepSession();
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
  const [reduceMotion, setReduceMotion] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const isSyncingRef = useRef(false);
  const reduceMotionRef = useRef(reduceMotion);
  const {
    insight,
    status: insightStatus,
    refresh: refreshInsight,
    enabled: insightsEnabled,
  } = useScientificInsights();
  const [insightActionBusy, setInsightActionBusy] = useState(false);

  const medsQ = useQuery<Med[]>({
    queryKey: ['meds:list'],
    queryFn: listMeds,
  });

  const recoveryQ = useQuery({
    queryKey: ['recovery:progress'],
    queryFn: getRecoveryProgress,
  });

  const recoveryStage = useMemo(
    () => getStageById((recoveryQ.data?.currentStageId ?? 'foundation') as RecoveryStageId),
    [recoveryQ.data?.currentStageId],
  );

  const userSettingsQ = useQuery({
    queryKey: ['user:settings'],
    queryFn: getUserSettings,
  });

  const hapticsEnabled = userSettingsQ.data?.hapticsEnabled ?? true;
  const hapticsEnabledRef = useRef(hapticsEnabled);
  useEffect(() => {
    hapticsEnabledRef.current = hapticsEnabled;
  }, [hapticsEnabled]);

  const fireHaptic = useCallback(
    (style: 'impact' | 'success' = 'impact') => {
      triggerLightHaptic({
        enabled: hapticsEnabledRef.current,
        reduceMotion: reduceMotionRef.current,
        style,
      });
    },
    [],
  );

  const streaksQ = useQuery({
    queryKey: ['streaks'],
    queryFn: getStreakStore,
  });

  const medLogsQ = useQuery({
    queryKey: ['meds:logs:7d'],
    queryFn: () => listMedDoseLogsRemoteLastNDays(7),
    enabled: !!session,
  });

  const sleepSessionsRingQ = useQuery({
    queryKey: ['sleep:sessions:ring'],
    queryFn: () => listSleepSessions(7),
    enabled: !!session,
  });

  const moodBadges = useMemo(() => getBadgesFor('mood'), []);
  const medBadges = useMemo(() => getBadgesFor('medication'), []);
  const moodStreak = streaksQ.data?.mood ?? { count: 0, longest: 0, badges: [] as string[] };
  const medStreak = streaksQ.data?.medication ?? { count: 0, longest: 0, badges: [] as string[] };
  const moodBadgeSet = useMemo(() => new Set(moodStreak.badges ?? []), [moodStreak.badges]);
  const medBadgeSet = useMemo(() => new Set(medStreak.badges ?? []), [medStreak.badges]);

  const medAdherencePct = useMemo(() => {
    if (!Array.isArray(medLogsQ.data) || medLogsQ.data.length === 0) return null;
    const stats = computeAdherence(medLogsQ.data);
    return stats.pct;
  }, [medLogsQ.data]);

  const sleepMidpointStd = useMemo(() => {
    if (!Array.isArray(sleepSessionsRingQ.data) || sleepSessionsRingQ.data.length < 2) return null;
    const midpoints = sleepSessionsRingQ.data
      .map((session: SleepSessionRow) => getSleepMidpointMinutes(session.start_time, session.end_time))
      .filter((value): value is number => value !== null);
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

  const greetingSubtitle = useMemo(() => {
    if (moodStreak.count > 0) {
      return `Mood streak • ${moodStreak.count} day${moodStreak.count === 1 ? '' : 's'}`;
    }
    if (medAdherencePct !== null) {
      return `Medication adherence • ${Math.round(medAdherencePct)}% this week`;
    }
    return 'Let’s make today feel a little lighter.';
  }, [medAdherencePct, moodStreak.count]);

  const greetingIcon = useMemo(() => {
    if (moodStreak.count >= 7) return 'emoticon-cool-outline';
    if (moodStreak.count >= 3) return 'emoticon-happy-outline';
    if (moodStreak.count >= 1) return 'emoticon-neutral-outline';
    return 'emoticon-outline';
  }, [moodStreak.count]);

  const progressMetrics = useMemo(() => {
    const items: Array<{
      key: string;
      progress: number;
      valueText: string;
      label: string;
      accessibilityLabel: string;
    }> = [];

    if (moodProgress !== null) {
      items.push({
        key: 'mood',
        progress: moodProgress,
        valueText: `${moodStreak.count}d`,
        label: 'Mood streak',
        accessibilityLabel: `Mood streak ${moodStreak.count} days, ${Math.round(moodProgress * 100)} percent of goal`,
      });
    }

    if (medProgress !== null && medAdherencePct !== null) {
      items.push({
        key: 'meds',
        progress: medProgress,
        valueText: `${Math.round(medAdherencePct)}%`,
        label: 'Meds adherence (7d)',
        accessibilityLabel: `Medication adherence ${Math.round(medAdherencePct)} percent over the last seven days`,
      });
    }

    if (sleepProgress !== null && sleepMidpointStd !== null) {
      items.push({
        key: 'sleep',
        progress: sleepProgress,
        valueText: `${Math.round(sleepMidpointStd)}m`,
        label: 'Sleep midpoint variance',
        accessibilityLabel: `Sleep midpoint variance ${Math.round(
          sleepMidpointStd,
        )} minutes standard deviation`,
      });
    }

    return items;
  }, [medAdherencePct, medProgress, moodProgress, moodStreak.count, sleepMidpointStd, sleepProgress]);
  const cardStyle = useMemo(
    () => ({
      borderRadius: 20,
      marginBottom: 16,
      backgroundColor: theme.colors.surface,
    }),
    [theme.colors.surface],
  );
  const cardContentStyle = useMemo(
    () => ({
      paddingHorizontal: 16,
      paddingVertical: 16,
    }),
    [],
  );

  const FriendlyEmptyState = useCallback(
    ({ icon, title, subtitle }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; title: string; subtitle: string }) => (
      <View style={{ alignItems: 'center', paddingVertical: 24 }}>
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
        <Text
          variant="bodySmall"
          style={{ marginTop: 6, textAlign: 'center', color: theme.colors.onSurfaceVariant }}
        >
          {subtitle}
        </Text>
      </View>
    ),
    [theme.colors.onSurface, theme.colors.onSurfaceVariant],
  );

  const sleepQ = useQuery<HealthSleepSession | null>({
    queryKey: ['dashboard:lastSleep'],
    queryFn: fetchLatestSleep,
  });

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

  const handleInsightAction = useCallback(async () => {
    if (!insight) return;
    setInsightActionBusy(true);
    try {
      await logTelemetry({
        name: 'insight_action_triggered',
        properties: {
          insightId: insight.id,
          source: 'dashboard',
        },
      });
      setSnackbar({
        visible: true,
        message: insight.action || 'Action queued. Nice one!',
      });
      await refreshInsight('dashboard-action');
    } catch (error: any) {
      setSnackbar({
        visible: true,
        message: error?.message ?? 'Unable to follow up on that insight right now.',
      });
    } finally {
      setInsightActionBusy(false);
    }
  }, [insight, refreshInsight]);

  const handleInsightRefresh = useCallback(() => {
    refreshInsight('dashboard-manual').catch(() => {
      setSnackbar({
        visible: true,
        message: 'Unable to refresh insights right now.',
      });
    });
  }, [refreshInsight]);

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
        if (result.syncedAt) {
          setLastSyncedAt(result.syncedAt);
        }
        if (options.invalidateQueries !== false) {
          await Promise.all([
            qc.invalidateQueries({ queryKey: ['dashboard:lastSleep'] }),
            qc.invalidateQueries({ queryKey: ['sleep:last'] }),
            qc.invalidateQueries({ queryKey: ['sleep:sessions:30d'] }),
          ]);
        }
        if (result.sleepSynced || result.activitySynced) {
          await refreshInsight('health-sync');
          if (options.showToast) {
            fireHaptic('success');
          }
        }
        if (options.showToast) {
          setSnackbar({ visible: true, message: 'Health data synced.' });
        }
      } catch (error: any) {
        logger.warn('Health sync failed:', error);
        if (options.showToast) {
          setSnackbar({
            visible: true,
            message: error?.message ?? 'Health sync failed.',
          });
        }
      } finally {
        isSyncingRef.current = false;
        setIsSyncing(false);
      }
    },
    [fireHaptic, qc, refreshInsight],
  );

  useEffect(() => {
    runHealthSync({ invalidateQueries: false });
  }, [runHealthSync]);

  useEffect(() => {
    const handleAppState = async (state: AppStateStatus) => {
      if (state === 'active') {
        await runHealthSync({ invalidateQueries: true });
      }
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
      await logTelemetry({
        name: 'mood_logged',
        properties: {
          source: 'dashboard_quick_mood',
          mood: moodValue,
        },
      });
      if (userSettingsQ.data?.badgesEnabled !== false) {
        const store = await recordStreakEvent('mood', new Date());
        await logTelemetry({
          name: 'mood_streak_updated',
          properties: {
            count: store.mood.count,
            longest: store.mood.longest,
          },
        });
        await qc.invalidateQueries({ queryKey: ['streaks'] });
      }
      await refreshInsight('dashboard-mood-log');
    },
    onError: (error: any) => {
      setSnackbar({
        visible: true,
        message: error?.message ?? 'Unable to log mood right now.',
      });
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
      await logTelemetry({
        name: 'med_dose_logged',
        properties: {
          medId: variables?.medId,
        },
      });
      if (userSettingsQ.data?.badgesEnabled !== false) {
        const store = await recordStreakEvent('medication', new Date());
        await logTelemetry({
          name: 'med_streak_updated',
          properties: {
            count: store.medication.count,
            longest: store.medication.longest,
          },
        });
        await qc.invalidateQueries({ queryKey: ['streaks'] });
      }
    },
    onError: (error: any) => {
      setSnackbar({
        visible: true,
        message: error?.message ?? 'Failed to log medication dose.',
      });
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

  const upcomingDoses: UpcomingDose[] = useMemo(() => {
    if (!Array.isArray(medsQ.data)) return [];
    const items: UpcomingDose[] = [];
    medsQ.data.forEach((med) => {
      if (!med.id || !med.schedule) return;
      upcomingDoseTimes(med.schedule, 6).forEach((scheduled) => {
        items.push({
          id: `${med.id}-${scheduled.toISOString()}`,
          med,
          scheduled,
        });
      });
    });
    return items
      .sort((a, b) => a.scheduled.getTime() - b.scheduled.getTime())
      .slice(0, 3);
  }, [medsQ.data]);

  const sections = useMemo<DashboardSection[]>(() => {
    const base: DashboardSection[] = [
      {
        key: 'meds',
        title: 'Today’s Meds',
        subtitle: 'Your next scheduled doses',
        data: ['meds'],
      },
      {
        key: 'sleep',
        title: 'Last Night Sleep',
        subtitle: 'Most recent synced session',
        data: ['sleep'],
      },
      {
        key: 'recovery',
        title: 'Recovery Plan',
        subtitle: 'Where you are in the roadmap',
        data: ['recovery'],
      },
      {
        key: 'mood',
        title: 'Quick Mood',
        subtitle: 'How are you feeling right now?',
        data: ['mood'],
      },
    ];
    if (userSettingsQ.data?.badgesEnabled !== false) {
      base.push({
        key: 'streaks',
        title: 'Streaks & Badges',
        subtitle: 'Stay consistent and celebrate wins',
        data: ['streaks'],
      });
    }
    return base;
  }, [userSettingsQ.data?.badgesEnabled]);

  const sectionIndexMap = useMemo(() => {
    const map = new Map<SectionKey, number>();
    sections.forEach((section, index) => {
      map.set(section.key, index);
    });
    return map;
  }, [sections]);

  const renderSectionCard = useCallback(
    (key: SectionKey) => {
      switch (key) {
        case 'meds':
          return (
            <Card mode="elevated" style={cardStyle}>
              <Card.Content style={cardContentStyle}>
                {medsQ.isLoading && <ActivityIndicator animating accessibilityLabel="Loading medications" />}
                {medsQ.error && (
                  <Text style={{ color: theme.colors.error }}>
                    {(medsQ.error as any)?.message ?? 'Unable to load medications.'}
                  </Text>
                )}
                {!medsQ.isLoading && !medsQ.error && upcomingDoses.length === 0 && (
                  <FriendlyEmptyState
                    icon="calendar-check"
                    title="No doses due"
                    subtitle="All scheduled medications are up to date."
                  />
                )}
                {upcomingDoses.map(({ id, med, scheduled }) => (
                  <List.Item
                    key={id}
                    title={med.name}
                    titleStyle={{ color: theme.colors.onSurface, fontWeight: '600' }}
                    description={`${formatTime(scheduled)}${med.dose ? ` • ${med.dose}` : ''}`}
                    descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
                    style={{ paddingHorizontal: 0 }}
                    right={() => (
                      <Button
                        mode="contained-tonal"
                        compact
                        accessibilityLabel={`Log ${med.name} dose now`}
                        onPress={() => handleTakeDose(med.id!, scheduled.toISOString())}
                        loading={
                          takeDoseMutation.isPending &&
                          takeDoseMutation.variables?.medId === med.id &&
                          takeDoseMutation.variables?.scheduledISO === scheduled.toISOString()
                        }
                      >
                        Take now
                      </Button>
                    )}
                  />
                ))}
              </Card.Content>
            </Card>
          );
        case 'sleep':
  return (
            <Card mode="elevated" style={cardStyle}>
              <Card.Content style={cardContentStyle}>
                {sleepQ.isLoading && <ActivityIndicator animating accessibilityLabel="Loading sleep data" />}
                {sleepQ.error && (
                  <Text style={{ color: theme.colors.error }}>
                    {(sleepQ.error as any)?.message ?? 'Unable to load sleep data.'}
                  </Text>
                )}
                {!sleepQ.isLoading && !sleepQ.error && !sleepQ.data && (
                  <FriendlyEmptyState
                    icon="sleep"
                    title="No sleep synced yet"
                    subtitle="Connect a health provider or tap Sync to pull your latest sleep session."
                  />
                )}
                {sleepQ.data && (
                  <View>
                    <Text variant="headlineSmall">{formatDuration(sleepQ.data.durationMinutes)}</Text>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                      {sleepQ.data.startTime
                        ? `Start: ${sleepQ.data.startTime.toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}`
                        : null}
                      {sleepQ.data.endTime
                        ? ` • End: ${sleepQ.data.endTime.toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}`
                        : null}
                    </Text>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                      Source: {sourceLabel(sleepQ.data.source)}
                    </Text>
                  </View>
                )}
              </Card.Content>
            </Card>
          );
        case 'recovery':
          return (
            <Card mode="elevated" style={cardStyle}>
              <Card.Content style={cardContentStyle}>
                <Text variant="titleMedium">{recoveryStage.title}</Text>
                <Text variant="bodyMedium" style={{ marginTop: 6, color: theme.colors.onSurfaceVariant }}>
                  {recoveryStage.summary}
                </Text>
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
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurface }}>
                        {item}
                      </Text>
                    </View>
                  ))}
                </View>
                <Button
                  mode="outlined"
                  style={{ marginTop: 16 }}
                  accessibilityLabel="Open recovery settings"
                  onPress={() =>
                    setSnackbar({
                      visible: true,
                      message: 'Open Settings → Recovery to reset or review all stages.',
                    })
                  }
                >
                  Manage recovery plan
                </Button>
              </Card.Content>
            </Card>
          );
        case 'mood':
          return (
            <Card mode="elevated" style={cardStyle}>
              <Card.Content style={cardContentStyle}>
                <Text variant="bodyMedium" style={{ marginBottom: 12 }}>
                  Tap the score that matches your mood right now.
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  {[1, 2, 3, 4, 5].map((score) => (
                    <Button
                      key={score}
                      mode="contained-tonal"
                      accessibilityLabel={`Log mood score ${score}`}
                      compact
                      style={{ flex: 1, marginHorizontal: 4 }}
                      onPress={() => handleMoodQuickTap(score)}
                      disabled={moodMutation.isPending}
                    >
                      {score}
                    </Button>
                  ))}
                </View>
                <Text
                  variant="bodySmall"
                  style={{ marginTop: 12, color: theme.colors.onSurfaceVariant, textAlign: 'center' }}
                >
                  Your check-ins help build streaks and personalised insights.
                </Text>
              </Card.Content>
            </Card>
          );
        case 'streaks':
          return (
            <Card mode="elevated" style={cardStyle}>
              <Card.Content style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}>
                <View>
                  <Text variant="titleSmall">Mood streak</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {moodStreak.count} day{moodStreak.count === 1 ? '' : 's'} • Longest {moodStreak.longest}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                    {moodBadges.map((badge) => {
                      const unlocked = moodBadgeSet.has(badge.id);
                      return (
                        <Chip
                          key={badge.id}
                          icon={unlocked ? 'star-circle' : 'clock-outline'}
                          mode={unlocked ? 'flat' : 'outlined'}
                          style={{ backgroundColor: unlocked ? theme.colors.secondaryContainer ?? theme.colors.surfaceVariant : 'transparent' }}
                          textStyle={{ color: unlocked ? theme.colors.onSecondaryContainer ?? theme.colors.onSurface : theme.colors.onSurfaceVariant }}
                        >
                          {badge.title}
                        </Chip>
                      );
                    })}
                  </View>
                </View>

                <View>
                  <Text variant="titleSmall">Medication streak</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {medStreak.count} day{medStreak.count === 1 ? '' : 's'} • Longest {medStreak.longest}
        </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                    {medBadges.map((badge) => {
                      const unlocked = medBadgeSet.has(badge.id);
                      return (
                        <Chip
                          key={badge.id}
                          icon={unlocked ? 'pill' : 'progress-clock'}
                          mode={unlocked ? 'flat' : 'outlined'}
                          style={{ backgroundColor: unlocked ? theme.colors.secondaryContainer ?? theme.colors.surfaceVariant : 'transparent' }}
                          textStyle={{ color: unlocked ? theme.colors.onSecondaryContainer ?? theme.colors.onSurface : theme.colors.onSurfaceVariant }}
                        >
                          {badge.title}
                        </Chip>
                      );
                    })}
                  </View>
                </View>
              </Card.Content>
            </Card>
          );
        default:
          return null;
      }
    },
    [
      FriendlyEmptyState,
      cardContentStyle,
      cardStyle,
      medBadgeSet,
      medBadges,
      medStreak.count,
      medStreak.longest,
      medsQ.error,
      medsQ.isLoading,
      moodBadgeSet,
      moodBadges,
      moodMutation,
      moodStreak.count,
      moodStreak.longest,
      handleMoodQuickTap,
      sleepQ.data,
      sleepQ.error,
      sleepQ.isLoading,
      takeDoseMutation,
      handleTakeDose,
      theme.colors.error,
      theme.colors.onSurface,
      theme.colors.onSurfaceVariant,
      theme.colors.secondary,
      theme.colors.secondaryContainer,
      theme.colors.onSecondaryContainer,
      upcomingDoses,
      recoveryStage,
    ],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await runHealthSync({ showToast: true });
      await qc.invalidateQueries({ queryKey: ['meds:list'] });
      await refreshInsight('dashboard-refresh-gesture');
    } finally {
      setRefreshing(false);
    }
  }, [qc, refreshInsight, runHealthSync]);

  return (
    <>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item}
        renderSectionHeader={({ section }) => (
          <View
            style={{
              paddingVertical: 8,
              backgroundColor: theme.colors.background,
            }}
          >
            <Text variant="titleMedium">{section.title}</Text>
            {section.subtitle ? (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                {section.subtitle}
              </Text>
            ) : null}
          </View>
        )}
        renderItem={({ item }) => {
          const index = sectionIndexMap.get(item) ?? 0;
          return (
            <AnimatedCardWrapper index={index} reduceMotion={reduceMotion}>
              {renderSectionCard(item)}
            </AnimatedCardWrapper>
          );
        }}
        ListHeaderComponent={
          <View style={{ marginBottom: 16 }}>
            <Card
              mode="elevated"
              style={{
                borderRadius: 24,
                paddingVertical: 4,
                backgroundColor: theme.colors.secondaryContainer,
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
                  <Text
                    variant="titleMedium"
                    style={{ color: theme.colors.onSecondaryContainer, fontWeight: '700' }}
                  >
                    {greetingText}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSecondaryContainer, marginTop: 4 }}
                  >
                    {greetingSubtitle}
          </Text>
                </View>
              </Card.Content>
            </Card>

            {progressMetrics.length ? (
              <View
                style={{
                  marginTop: 16,
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                }}
              >
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
            ) : null}

            <View
              style={{
                marginTop: 8,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text variant="headlineLarge">Today</Text>
              <Button
                mode="contained-tonal"
                compact
                onPress={() => runHealthSync({ showToast: true })}
                loading={isSyncing}
                disabled={isSyncing}
                accessibilityLabel="Manually sync health data"
              >
                Sync now
              </Button>
      </View>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
              Last synced{' '}
              {lastSyncedAt
                ? `${formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true })}`
                : 'never'}.
            </Text>
            {insightsEnabled ? (
              <>
                {insightStatus === 'loading' ? (
                  <Card mode="outlined" style={{ borderRadius: 18, marginTop: 16 }}>
                    <Card.Content style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <ActivityIndicator />
                      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                        Refreshing insights…
                      </Text>
                    </Card.Content>
                  </Card>
                ) : null}
                {insightStatus === 'error' ? (
                  <Card mode="outlined" style={{ borderRadius: 18, marginTop: 16 }}>
                    <Card.Content
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}
                    >
                      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}>
                        We couldn’t refresh insights right now.
                      </Text>
                      <Button mode="text" compact onPress={handleInsightRefresh}>
                        Try again
                      </Button>
                    </Card.Content>
                  </Card>
                ) : null}
                {insight && insightStatus === 'ready' ? (
                  <InsightCard
                    insight={insight}
                    onActionPress={handleInsightAction}
                    onRefreshPress={handleInsightRefresh}
                    isProcessing={insightActionBusy}
                    disabled={insightActionBusy}
                    testID="dashboard-insight-card"
                  />
                ) : null}
              </>
            ) : (
              <Card mode="outlined" style={{ borderRadius: 18, marginTop: 16 }}>
                <Card.Content>
                  <Text variant="bodyMedium">Scientific insights are turned off.</Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                    Re-enable them in Settings → Scientific insights to see tailored nudges here.
                  </Text>
                </Card.Content>
              </Card>
            )}
    </View>
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        stickySectionHeadersEnabled
        refreshControl={<RefreshControl refreshing={refreshing || isSyncing} onRefresh={onRefresh} />}
        style={{ flex: 1, backgroundColor: theme.colors.background }}
      />

      <Portal>
        <FAB.Group
          open={fabOpen}
          visible
          icon={fabOpen ? 'close' : 'plus'}
          onStateChange={({ open }: { open: boolean }) => setFabOpen(open)}
          backdropColor={reduceMotion ? 'transparent' : 'rgba(15,23,42,0.45)'}
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
        onDismiss={() => setSnackbar((prev) => ({ ...prev, visible: false }))}
      >
        {snackbar.message}
      </Snackbar>
    </>
  );
}
