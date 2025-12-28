import React, { useMemo } from 'react';
import { View, FlatList } from 'react-native';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { Card, Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { FeatureCardHeader } from '@/components/ui/FeatureCardHeader';

import {
  listMoodCheckinsRange,
  listSleepSessions,
  listMedDoseLogsRemoteLastNDays,
  type MoodCheckin,
  type SleepSession,
  type MedDoseLog,
} from '@/lib/api';

type TimelineDay = {
  key: string;
  date: Date;
  moodEntries: MoodCheckin[];
  sleepSession?: SleepSession;
  medLogs: MedDoseLog[];
};

function formatDuration(minutes?: number | null) {
  if (!minutes || Number.isNaN(minutes)) return '—';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const parts: string[] = [];
  if (hrs > 0) parts.push(`${hrs}h`);
  if (mins > 0 || parts.length === 0) parts.push(`${mins}m`);
  return parts.join(' ');
}

function getDateKey(input: Date | string) {
  const date = typeof input === 'string' ? new Date(input) : input;
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized.toISOString().slice(0, 10);
}

function moodColor(rating: number, fallback: string, theme: any) {
  if (rating >= 7) return theme.colors.primary; // Use primary blue for positive mood
  if (rating >= 4) return theme.colors.secondary; // Use secondary for neutral
  if (rating > 0) return theme.colors.error; // Use error for negative mood
  return fallback;
}

export default function ReclaimMomentsScreen() {
  const theme = useTheme();

  const now = useMemo(() => new Date(), []);
  const start = useMemo(() => {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [now]);
  const end = useMemo(() => {
    const d = new Date(now);
    d.setHours(23, 59, 59, 999);
    return d;
  }, [now]);

  const startISO = start.toISOString();
  const endISO = end.toISOString();

  const moodQ = useQuery({
    queryKey: ['timeline:mood', startISO, endISO],
    queryFn: () => listMoodCheckinsRange(startISO, endISO),
  });

  const sleepQ = useQuery({
    queryKey: ['timeline:sleep'],
    queryFn: () => listSleepSessions(14),
  });

  const medsQ = useQuery({
    queryKey: ['timeline:meds'],
    queryFn: () => listMedDoseLogsRemoteLastNDays(14),
  });

  const timelineDays = useMemo<TimelineDay[]>(() => {
    const moodMap = new Map<string, MoodCheckin[]>();
    (moodQ.data ?? []).forEach((entry) => {
      const key = getDateKey(entry.created_at);
      const arr = moodMap.get(key) ?? [];
      arr.push(entry);
      moodMap.set(key, arr);
    });

    const sleepMap = new Map<string, SleepSession>();
    (sleepQ.data ?? []).forEach((session) => {
      const key = getDateKey(session.start_time);
      if (!sleepMap.has(key)) {
        sleepMap.set(key, session);
      }
    });

    const medMap = new Map<string, MedDoseLog[]>();
    (medsQ.data ?? []).forEach((log) => {
      const ts = log.taken_at ?? log.created_at ?? null;
      if (!ts) return;
      const key = getDateKey(ts);
      const arr = medMap.get(key) ?? [];
      arr.push(log);
      medMap.set(key, arr);
    });

    const days: TimelineDay[] = [];
    for (let idx = 0; idx < 7; idx += 1) {
      const day = new Date(end);
      day.setHours(0, 0, 0, 0);
      day.setDate(end.getDate() - idx);
      const key = getDateKey(day);
      days.push({
        key,
        date: day,
        moodEntries: moodMap.get(key) ?? [],
        sleepSession: sleepMap.get(key),
        medLogs: medMap.get(key) ?? [],
      });
    }
    return days.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [end, medsQ.data, moodQ.data, sleepQ.data]);

  const loading = moodQ.isLoading || sleepQ.isLoading || medsQ.isLoading;
  const error =
    moodQ.error ||
    sleepQ.error ||
    medsQ.error;

  const renderItem = ({ item }: { item: TimelineDay }) => {
    const weekday = format(item.date, 'EEE');
    const dateLabel = format(item.date, 'MMM d');
    const moods = item.moodEntries;
    const sleep = item.sleepSession;
    const meds = item.medLogs;
    const moodAvg =
      moods.length > 0
        ? Math.round((moods.reduce((sum, entry) => sum + (entry.mood ?? 0), 0) / moods.length) * 10) / 10
        : null;
    const sleepDurationMinutes =
      sleep?.start_time && sleep?.end_time
        ? Math.max(
            0,
            Math.round(
              (new Date(sleep.end_time).getTime() - new Date(sleep.start_time).getTime()) / (60 * 1000),
            ),
          )
        : null;

    return (
      <View style={{ flexDirection: 'row', marginBottom: 20 }}>
        <View style={{ width: 64, alignItems: 'center' }}>
          <Text variant="titleSmall" style={{ color: theme.colors.primary }}>
            {weekday}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {dateLabel}
          </Text>
          <View style={{ flex: 1, width: 2, backgroundColor: theme.colors.surfaceVariant, marginTop: 8 }} />
        </View>
        <Card
          mode="elevated"
          accessible
          accessibilityRole="summary"
          accessibilityLabel={`Summary for ${weekday}, ${dateLabel}`}
          style={{ flex: 1, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 16 }}
        >
          <Card.Content>
            <FeatureCardHeader icon="calendar" title={`${weekday}, ${dateLabel}`} />
            {moods.length > 0 ? (
              <View style={{ marginBottom: 12 }}>
                <Text variant="titleSmall">Mood</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 6 }}>
                  {moods.map((entry) => (
                    <View
                      key={entry.id}
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 7,
                        marginRight: 6,
                        marginBottom: 6,
                        backgroundColor: moodColor(entry.mood ?? 0, theme.colors.primary, theme),
                      }}
                    />
                  ))}
                </View>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                  {moods.length} check-in{moods.length === 1 ? '' : 's'}
                  {moodAvg ? ` • avg ${moodAvg}` : ''}
                </Text>
              </View>
            ) : (
              <Text variant="bodySmall" style={{ marginBottom: 12, color: theme.colors.onSurfaceVariant }}>
                No mood entries logged.
              </Text>
            )}

            {sleep ? (
              <View style={{ marginBottom: 12 }}>
                <Text variant="titleSmall">Sleep</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                  {formatDuration(sleepDurationMinutes)} •{' '}
                  {sleep.start_time ? format(new Date(sleep.start_time), 'h:mm a') : '—'} –{' '}
                  {sleep.end_time ? format(new Date(sleep.end_time), 'h:mm a') : '—'}
                </Text>
              </View>
            ) : (
              <Text variant="bodySmall" style={{ marginBottom: 12, color: theme.colors.onSurfaceVariant }}>
                No sleep data found.
              </Text>
            )}

            {meds.length > 0 ? (
              <View>
                <Text variant="titleSmall">Medications</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                  {meds.length} logged dose{meds.length === 1 ? '' : 's'}
                </Text>
              </View>
            ) : (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                No medication activity.
              </Text>
            )}
          </Card.Content>
        </Card>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <ActivityIndicator />
        <Text variant="bodyMedium" style={{ marginTop: 12, color: theme.colors.onSurfaceVariant }}>
          Building your timeline…
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text variant="titleMedium" style={{ marginBottom: 8 }}>
          Unable to load timeline
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
          {(error as any)?.message ?? 'Please pull to refresh and try again.'}
        </Text>
      </View>
    );
  }

  const anyData = timelineDays.some(
    (day) => day.moodEntries.length > 0 || day.sleepSession || day.medLogs.length > 0,
  );

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 24 }}
      data={timelineDays}
      keyExtractor={(item) => item.key}
      renderItem={renderItem}
      ListHeaderComponent={
        <Text variant="headlineSmall" style={{ marginBottom: 16 }}>
          Reclaim moments
        </Text>
      }
      ListEmptyComponent={
        <View style={{ alignItems: 'center', marginTop: 48 }}>
          <Text variant="titleMedium" style={{ marginBottom: 8 }}>
            Nothing logged yet
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
            Log mood, sleep, or medication events to see them appear on your weekly timeline.
          </Text>
        </View>
      }
      ListFooterComponent={
        !anyData ? null : (
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 12 }}
          >
            Showing the past 7 days.
          </Text>
        )
      }
    />
  );
}


