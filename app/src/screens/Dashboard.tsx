// C:\Reclaim\app\src\screens\Dashboard.tsx
import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { AppState, AppStateStatus, RefreshControl, ScrollView, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Button,
  Card,
  IconButton,
  List,
  Snackbar,
  Text,
  useTheme,
} from 'react-native-paper';
import {
  addMoodCheckin,
  listMeds,
  logMedDose,
  upcomingDoseTimes,
  type Med,
} from '@/lib/api';
import { getUnifiedHealthService } from '@/lib/health';
import type { SleepSession } from '@/lib/health/types';
import { logger } from '@/lib/logger';
import { formatDistanceToNow } from 'date-fns';
import { getLastSyncISO, syncHealthData } from '@/lib/sync';
import { getRecoveryProgress, getStageById, type RecoveryStageId } from '@/lib/recovery';
import { getStreakStore, getBadgesFor, recordStreakEvent } from '@/lib/streaks';
import { getUserSettings } from '@/lib/userSettings';

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

function sourceLabel(platform: SleepSession['source'] | undefined) {
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

async function fetchLatestSleep(): Promise<SleepSession | null> {
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

  const streaksQ = useQuery({
    queryKey: ['streaks'],
    queryFn: getStreakStore,
  });

  const moodBadges = useMemo(() => getBadgesFor('mood'), []);
  const medBadges = useMemo(() => getBadgesFor('medication'), []);
  const moodStreak = streaksQ.data?.mood ?? { count: 0, longest: 0, badges: [] as string[] };
  const medStreak = streaksQ.data?.medication ?? { count: 0, longest: 0, badges: [] as string[] };
  const moodBadgeSet = useMemo(() => new Set(moodStreak.badges ?? []), [moodStreak.badges]);
  const medBadgeSet = useMemo(() => new Set(medStreak.badges ?? []), [medStreak.badges]);

  const sleepQ = useQuery<SleepSession | null>({
    queryKey: ['dashboard:lastSleep'],
    queryFn: fetchLatestSleep,
  });

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
    [qc],
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
    onSuccess: async () => {
      setSnackbar({ visible: true, message: 'Mood logged. Thank you!' });
      if (userSettingsQ.data?.badgesEnabled !== false) {
        await recordStreakEvent('mood', new Date());
        await qc.invalidateQueries({ queryKey: ['streaks'] });
      }
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
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ['meds:list'] });
      setSnackbar({ visible: true, message: 'Dose logged as taken.' });
      if (userSettingsQ.data?.badgesEnabled !== false) {
        await recordStreakEvent('medication', new Date());
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await runHealthSync({ showToast: true });
      await qc.invalidateQueries({ queryKey: ['meds:list'] });
    } finally {
      setRefreshing(false);
    }
  }, [qc, runHealthSync]);

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing || isSyncing} onRefresh={onRefresh} />
        }
      >
        <View
          style={{
            marginBottom: 12,
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
          >
            Sync now
          </Button>
        </View>
        <Text variant="bodySmall" style={{ opacity: 0.6, marginBottom: 16 }}>
          Last synced{' '}
          {lastSyncedAt
            ? `${formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true })}`
            : 'never'}.
        </Text>

        <Card mode="elevated" style={{ marginBottom: 16 }}>
          <Card.Title title="Today’s Meds" subtitle="Your next scheduled doses" />
          <Card.Content>
            {medsQ.isLoading && <ActivityIndicator animating />}
            {medsQ.error && (
              <Text style={{ color: theme.colors.error }}>
                {(medsQ.error as any)?.message ?? 'Unable to load medications.'}
              </Text>
            )}
            {!medsQ.isLoading && !medsQ.error && upcomingDoses.length === 0 && (
              <Text style={{ opacity: 0.7 }}>You’re all caught up for today.</Text>
            )}
            {upcomingDoses.map(({ id, med, scheduled }) => (
              <List.Item
                key={id}
                title={med.name}
                description={() => (
                  <Text variant="bodyMedium" style={{ opacity: 0.7 }}>
                    {formatTime(scheduled)}
                    {med.dose ? ` • ${med.dose}` : ''}
                  </Text>
                )}
                right={() => (
                  <Button
                    mode="contained-tonal"
                    compact
                    onPress={() =>
                      takeDoseMutation.mutate({
                        medId: med.id!,
                        scheduledISO: scheduled.toISOString(),
                      })
                    }
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

        <Card mode="elevated" style={{ marginBottom: 16 }}>
          <Card.Title title="Last Night Sleep" subtitle="Most recent synced session" />
          <Card.Content>
            {sleepQ.isLoading && <ActivityIndicator animating />}
            {sleepQ.error && (
              <Text style={{ color: theme.colors.error }}>
                {(sleepQ.error as any)?.message ?? 'Unable to load sleep data.'}
              </Text>
            )}
            {!sleepQ.isLoading && !sleepQ.error && !sleepQ.data && (
              <Text style={{ opacity: 0.7 }}>
                Connect a health provider or sync to see your latest sleep.
              </Text>
            )}
            {sleepQ.data && (
              <>
                <Text variant="titleLarge">{formatDuration(sleepQ.data.durationMinutes)}</Text>
                <Text variant="bodyMedium" style={{ opacity: 0.7, marginBottom: 8 }}>
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
                <Text variant="bodyMedium" style={{ opacity: 0.7 }}>
                  Source: {sourceLabel(sleepQ.data.source)}
                </Text>
              </>
            )}
          </Card.Content>
        </Card>

        <Card mode="elevated" style={{ marginBottom: 16 }}>
          <Card.Title title="Recovery Plan" subtitle="Where you are in the roadmap" />
          <Card.Content>
            <Text variant="titleMedium">{recoveryStage.title}</Text>
            <Text variant="bodyMedium" style={{ marginTop: 4, opacity: 0.75 }}>
              {recoveryStage.summary}
            </Text>
            <View style={{ marginTop: 8, marginLeft: 12 }}>
              {recoveryStage.focus.slice(0, 2).map((item) => (
                <Text key={item} variant="bodySmall" style={{ opacity: 0.7, marginTop: 2 }}>
                  • {item}
                </Text>
              ))}
            </View>
            <Button
              mode="outlined"
              style={{ marginTop: 12 }}
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

        <Card mode="elevated">
          <Card.Title title="Quick Mood" subtitle="How are you feeling right now?" />
          <Card.Content>
            <Text variant="bodyMedium" style={{ marginBottom: 12 }}>
              Tap a number (1 = low, 5 = great).
            </Text>
            <List.Section style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {[1, 2, 3, 4, 5].map((score) => (
                <Button
                  key={score}
                  mode="contained-tonal"
                  compact
                  style={{ flex: 1, marginHorizontal: 4 }}
                  onPress={() => moodMutation.mutate(score)}
                  disabled={moodMutation.isPending}
                >
                  {score}
                </Button>
              ))}
            </List.Section>
          </Card.Content>
        </Card>

        {userSettingsQ.data?.badgesEnabled !== false && (
          <Card mode="elevated" style={{ marginTop: 16 }}>
            <Card.Title title="Streaks & Badges" subtitle="Stay consistent and celebrate wins" />
            <Card.Content>
              <Text variant="titleSmall">
                Mood streak: {moodStreak.count} day{moodStreak.count === 1 ? '' : 's'}
              </Text>
              <Text variant="bodySmall" style={{ opacity: 0.7 }}>
                Longest streak: {moodStreak.longest} day{moodStreak.longest === 1 ? '' : 's'}
              </Text>
              <View style={{ marginTop: 6, marginLeft: 12 }}>
                {moodBadges.map((badge) => {
                  const unlocked = moodBadgeSet.has(badge.id);
                  return (
                    <Text
                      key={badge.id}
                      variant="bodySmall"
                      style={{ opacity: unlocked ? 0.85 : 0.55, marginTop: 2 }}
                    >
                      • {badge.title} — {unlocked ? 'Unlocked' : `${badge.threshold}-day goal`}
                    </Text>
                  );
                })}
              </View>

              <View style={{ marginTop: 12 }} />

              <Text variant="titleSmall">
                Medication streak: {medStreak.count} day{medStreak.count === 1 ? '' : 's'}
              </Text>
              <Text variant="bodySmall" style={{ opacity: 0.7 }}>
                Longest streak: {medStreak.longest} day{medStreak.longest === 1 ? '' : 's'}
              </Text>
              <View style={{ marginTop: 6, marginLeft: 12 }}>
                {medBadges.map((badge) => {
                  const unlocked = medBadgeSet.has(badge.id);
                  return (
                    <Text
                      key={badge.id}
                      variant="bodySmall"
                      style={{ opacity: unlocked ? 0.85 : 0.55, marginTop: 2 }}
                    >
                      • {badge.title} — {unlocked ? 'Unlocked' : `${badge.threshold}-day goal`}
                    </Text>
                  );
                })}
              </View>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

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
