// C:\Reclaim\app\src\screens\Dashboard.tsx
import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
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

  const medsQ = useQuery<Med[]>({
    queryKey: ['meds:list'],
    queryFn: listMeds,
  });

  const sleepQ = useQuery<SleepSession | null>({
    queryKey: ['dashboard:lastSleep'],
    queryFn: fetchLatestSleep,
  });

  const moodMutation = useMutation({
    mutationFn: (mood: number) =>
      addMoodCheckin({
        mood,
        ctx: { source: 'dashboard_quick_mood' },
      }),
    onSuccess: () => {
      setSnackbar({ visible: true, message: 'Mood logged. Thank you!' });
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meds:list'] });
      setSnackbar({ visible: true, message: 'Dose logged as taken.' });
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
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['meds:list'] }),
        qc.invalidateQueries({ queryKey: ['dashboard:lastSleep'] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [qc]);

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text variant="headlineLarge" style={{ marginBottom: 16 }}>
          Today
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
