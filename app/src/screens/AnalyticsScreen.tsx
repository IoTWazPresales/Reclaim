/**
 * Analytics tab. Counts from this account only: finished sessions, sets,
 * volume, sleep hours, and mood check-ins for 7 and 28 days.
 */
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Text, useTheme, ActivityIndicator, Card } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { AppScreen, AppCard } from '@/components/ui';
import { useAppTheme } from '@/theme';
import { reclaimUtilityCardSurface } from '@/theme/reclaimVisualLanguage';
import { listCanonicalMoodEntriesForDays, listSleepSessions, listTrainingSessions } from '@/lib/api';
import { summarizeAccountWindow, type AccountWindowSummary } from '@/lib/analytics/accountWindow';

function WindowCard({
  summary,
  surface,
}: {
  summary: AccountWindowSummary;
  surface: object;
}) {
  const theme = useTheme();
  const lines = [
    `${summary.sessions} finished sessions`,
    `${summary.sets} sets · ${summary.volumeKg} kg volume`,
    `${summary.sleepHours} h recorded sleep`,
    `${summary.moodCheckins} mood check-ins`,
  ];
  return (
    <AppCard style={surface} marginBottom={0}>
      <Card.Content>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
          Last {summary.days} days
        </Text>
        {lines.map((line) => (
          <Text
            key={line}
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}
          >
            {line}
          </Text>
        ))}
      </Card.Content>
    </AppCard>
  );
}

export default function AnalyticsScreen() {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const utilitySurface = useMemo(() => reclaimUtilityCardSurface(appTheme), [appTheme]);

  const query = useQuery({
    queryKey: ['analytics:account-window'],
    queryFn: async () => {
      const [sessions, sleep, mood] = await Promise.all([
        listTrainingSessions(60),
        listSleepSessions(28),
        listCanonicalMoodEntriesForDays(28),
      ]);
      const nowMs = Date.now();
      const input = {
        nowMs,
        sessions: sessions.map((row) => ({
          endedAt: row.ended_at,
          totalSets: Number(row.summary?.totalSets ?? 0),
          totalVolume: Number(row.summary?.totalVolume ?? 0),
        })),
        sleep: sleep.map((row) => ({
          endTime: row.end_time,
          startTime: row.start_time,
          durationMinutes: row.duration_minutes ?? null,
        })),
        mood: mood.map((row) => ({ at: row.created_at || (row.day_date ? `${row.day_date}T12:00:00` : null) })),
      };
      return {
        week: summarizeAccountWindow(input, 7),
        month: summarizeAccountWindow(input, 28),
      };
    },
  });

  return (
    <AppScreen>
      <View style={{ gap: appTheme.spacing.md, paddingBottom: 24 }}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, lineHeight: 22 }}>
          These counts are from your own sessions, sleep, and mood check-ins.
        </Text>
        {query.isLoading ? <ActivityIndicator /> : null}
        {query.isError ? (
          <Text variant="bodyMedium" style={{ color: theme.colors.error }}>
            These counts could not be loaded. Pull to leave and open Analytics again.
          </Text>
        ) : null}
        {query.data ? (
          <>
            <WindowCard summary={query.data.week} surface={utilitySurface} />
            <WindowCard summary={query.data.month} surface={utilitySurface} />
          </>
        ) : null}
      </View>
    </AppScreen>
  );
}
