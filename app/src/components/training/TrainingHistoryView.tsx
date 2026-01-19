// Training History View with Analytics
import React, { useState, useMemo } from 'react';
import { View } from 'react-native';
import { Card, Text, useTheme, ActivityIndicator, Button } from 'react-native-paper';
import { useAppTheme } from '@/theme';
import { FeatureCardHeader } from '@/components/ui/FeatureCardHeader';
import { InformationalCard } from '@/components/ui';
import ExerciseDetailsModal from './ExerciseDetailsModal';
import type { TrainingSessionRow } from '@/lib/api';

interface TrainingHistoryViewProps {
  sessions: TrainingSessionRow[];
  isLoading: boolean;
}

type ViewMode = 'list' | 'weekly';

function safeSummary(summary: any): any | null {
  // Summary sometimes arrives as null, object, or occasionally a serialized string.
  if (!summary) return null;
  if (typeof summary === 'string') {
    try {
      const parsed = JSON.parse(summary);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }
  if (typeof summary === 'object') return summary;
  return null;
}

export default function TrainingHistoryView({ sessions, isLoading }: TrainingHistoryViewProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);

  // Compute weekly summary (Monday start to match the "week" logic elsewhere)
  const weeklySummary = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    const day = weekStart.getDay(); // 0 Sun .. 6 Sat
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // Monday
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);

    const weekSessions = sessions.filter((s) => {
      if (!s.started_at) return false;
      const date = new Date(s.started_at);
      return date >= weekStart;
    });

    const totalSets = weekSessions.reduce((sum, s) => {
      const summary = safeSummary((s as any).summary);
      return sum + (summary?.totalSets || 0);
    }, 0);

    const totalVolume = weekSessions.reduce((sum, s) => {
      const summary = safeSummary((s as any).summary);
      return sum + (summary?.totalVolume || 0);
    }, 0);

    const prs = weekSessions.reduce((all, s) => {
      const summary = safeSummary((s as any).summary);
      const arr = Array.isArray(summary?.prs) ? summary.prs : [];
      return [...all, ...arr];
    }, [] as any[]);

    return {
      sessionsCompleted: weekSessions.filter((s) => !!s.ended_at).length,
      sessionsStarted: weekSessions.length,
      totalSets,
      totalVolume: Math.round(totalVolume),
      prs: prs.length,
    };
  }, [sessions]);

  if (isLoading) {
    return (
      <View style={{ paddingVertical: 24 }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <View style={{ paddingVertical: 24, alignItems: 'center' }}>
        <Text style={{ color: theme.colors.onSurfaceVariant }}>No training sessions yet.</Text>
        <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: appTheme.spacing.sm }}>
          Start your first session to see history here.
        </Text>
      </View>
    );
  }

  return (
    <View>
      {/* View mode switcher (replaces SegmentedButtons for older react-native-paper versions) */}
      <View style={{ marginBottom: appTheme.spacing.lg, flexDirection: 'row', gap: 10 }}>
        <Button mode={viewMode === 'list' ? 'contained' : 'outlined'} onPress={() => setViewMode('list')} style={{ flex: 1 }}>
          List
        </Button>
        <Button mode={viewMode === 'weekly' ? 'contained' : 'outlined'} onPress={() => setViewMode('weekly')} style={{ flex: 1 }}>
          Weekly
        </Button>
      </View>

      {viewMode === 'weekly' && (
        <View style={{ marginBottom: appTheme.spacing.lg }}>
          <InformationalCard>
            <FeatureCardHeader icon="chart-line" title="This Week" />
            <View style={{ marginTop: 8 }}>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: appTheme.spacing.xs }}>
                Sessions: {weeklySummary.sessionsCompleted}/{weeklySummary.sessionsStarted}
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: appTheme.spacing.xs }}>
                Total Sets: {weeklySummary.totalSets}
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: appTheme.spacing.xs }}>
                Total Volume: ~{weeklySummary.totalVolume}kg
              </Text>
              {weeklySummary.prs > 0 && (
                <Text variant="bodyMedium" style={{ color: theme.colors.primary, fontWeight: '700', marginTop: appTheme.spacing.xs }}>
                  🎉 {weeklySummary.prs} Personal Record{weeklySummary.prs > 1 ? 's' : ''}!
                </Text>
              )}
            </View>
          </InformationalCard>
        </View>
      )}

      {viewMode === 'list' &&
        sessions.map((session) => {
          const startDate = session.started_at ? new Date(session.started_at) : null;
          const endDate = session.ended_at ? new Date(session.ended_at) : null;

          // Only compute duration if ended. (If not ended, calling it duration in history is misleading and causes huge timers.)
          const durationMins =
            startDate && endDate ? Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / 60000)) : null;

          const summary = safeSummary((session as any).summary);

          const exercisesCompleted = summary?.exercisesCompleted ?? summary?.exercises_completed ?? 0;
          const totalSets = summary?.totalSets ?? summary?.total_sets ?? 0;
          const totalVolume = summary?.totalVolume ?? summary?.total_volume ?? null;
          const prs = Array.isArray(summary?.prs) ? summary.prs : [];

          const inProgress = !!session.started_at && !session.ended_at;

          return (
            <Card
              key={session.id}
              mode="outlined"
              style={{
                marginBottom: appTheme.spacing.md,
                backgroundColor: theme.colors.surface,
                borderRadius: appTheme.borderRadius.xl,
              }}
            >
              <Card.Content>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                    {startDate?.toLocaleDateString() || 'Session'}
                  </Text>
                  {inProgress ? (
                    <Text variant="bodySmall" style={{ color: theme.colors.primary, fontWeight: '700' }}>
                      In progress
                    </Text>
                  ) : null}
                </View>

                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: appTheme.spacing.xs }}>
                  {startDate?.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) || ''}
                  {durationMins !== null ? ` • ${durationMins} min` : ''}
                  {session.mode === 'timed' ? ' • Timed' : ' • Manual'}
                </Text>

                {summary ? (
                  <>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: appTheme.spacing.xs }}>
                      {exercisesCompleted} exercises • {totalSets} sets
                    </Text>

                    {typeof totalVolume === 'number' ? (
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        Volume: ~{Math.round(totalVolume)}kg
                      </Text>
                    ) : null}

                    {prs.length > 0 ? (
                      <Text variant="bodySmall" style={{ color: theme.colors.primary, marginTop: appTheme.spacing.xs, fontWeight: '700' }}>
                        🎉 {prs.length} PR{prs.length > 1 ? 's' : ''}!
                      </Text>
                    ) : null}
                  </>
                ) : null}
              </Card.Content>
            </Card>
          );
        })}

      <ExerciseDetailsModal
        visible={!!selectedExerciseId}
        exercise={null} // TODO: Load exercise by ID
        onDismiss={() => setSelectedExerciseId(null)}
      />
    </View>
  );
}
