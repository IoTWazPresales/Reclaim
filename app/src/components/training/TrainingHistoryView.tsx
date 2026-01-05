// Training History View with Analytics
import React, { useState, useMemo } from 'react';
import { View, ScrollView } from 'react-native';
import { Card, Text, useTheme, ActivityIndicator, Button, SegmentedButtons } from 'react-native-paper';
import { useAppTheme } from '@/theme';
import { useQuery } from '@tanstack/react-query';
import { getTrainingSession } from '@/lib/api';
import { FeatureCardHeader } from '@/components/ui/FeatureCardHeader';
import { InformationalCard } from '@/components/ui';
import ExerciseDetailsModal from './ExerciseDetailsModal';
import type { TrainingSessionRow } from '@/lib/api';

interface TrainingHistoryViewProps {
  sessions: TrainingSessionRow[];
  isLoading: boolean;
}

type ViewMode = 'list' | 'weekly';

export default function TrainingHistoryView({ sessions, isLoading }: TrainingHistoryViewProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);

  // Compute weekly summary
  const weeklySummary = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Sunday
    weekStart.setHours(0, 0, 0, 0);

    const weekSessions = sessions.filter((s) => {
      if (!s.started_at) return false;
      const date = new Date(s.started_at);
      return date >= weekStart;
    });

    const totalSets = weekSessions.reduce((sum, s) => {
      const summary = s.summary as any;
      return sum + (summary?.totalSets || 0);
    }, 0);

    const totalVolume = weekSessions.reduce((sum, s) => {
      const summary = s.summary as any;
      return sum + (summary?.totalVolume || 0);
    }, 0);

    const prs = weekSessions.reduce((all, s) => {
      const summary = s.summary as any;
      return [...all, ...(summary?.prs || [])];
    }, [] as any[]);

    return {
      sessionsCompleted: weekSessions.length,
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

  if (sessions.length === 0) {
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
      <View style={{ marginBottom: appTheme.spacing.lg }}>
        <SegmentedButtons
          value={viewMode}
          onValueChange={(value) => setViewMode(value as ViewMode)}
          buttons={[
            { value: 'list', label: 'List' },
            { value: 'weekly', label: 'Weekly' },
          ]}
        />
      </View>

      {viewMode === 'weekly' && (
        <View style={{ marginBottom: appTheme.spacing.lg }}>
          <InformationalCard>
            <FeatureCardHeader icon="chart-line" title="This Week" />
            <View style={{ marginTop: 8 }}>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: appTheme.spacing.xs }}>
                Sessions: {weeklySummary.sessionsCompleted}
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: appTheme.spacing.xs }}>
                Total Sets: {weeklySummary.totalSets}
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: appTheme.spacing.xs }}>
                Total Volume: ~{weeklySummary.totalVolume}kg
              </Text>
              {weeklySummary.prs > 0 && (
                <Text variant="bodyMedium" style={{ color: theme.colors.primary, fontWeight: '700', marginTop: appTheme.spacing.xs }}>
                  🎉 {weeklySummary.prs} Personal Records!
                </Text>
              )}
            </View>
          </InformationalCard>
        </View>
      )}

      {sessions.map((session) => {
        const startDate = session.started_at ? new Date(session.started_at) : null;
        const endDate = session.ended_at ? new Date(session.ended_at) : null;
        const duration = startDate && endDate ? Math.floor((endDate.getTime() - startDate.getTime()) / 60000) : null;
        const summary = session.summary as any;

        return (
          <Card
            key={session.id}
            mode="outlined"
            style={{ marginBottom: appTheme.spacing.md, backgroundColor: theme.colors.surface, borderRadius: appTheme.borderRadius.xl }}
          >
            <Card.Content>
              <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                {startDate?.toLocaleDateString() || 'Session'}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: appTheme.spacing.xs }}>
                {startDate?.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) || ''}
                {duration ? ` • ${duration} min` : ''}
                {session.mode === 'timed' ? ' • Timed' : ' • Manual'}
              </Text>
              {summary && (
                <>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: appTheme.spacing.xs }}>
                    {summary.exercisesCompleted || 0} exercises • {summary.totalSets || 0} sets
                  </Text>
                  {summary.totalVolume && (
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      Volume: ~{Math.round(summary.totalVolume)}kg
                    </Text>
                  )}
                  {summary.prs && summary.prs.length > 0 && (
                    <Text variant="bodySmall" style={{ color: theme.colors.primary, marginTop: appTheme.spacing.xs, fontWeight: '700' }}>
                      🎉 {summary.prs.length} PR{summary.prs.length > 1 ? 's' : ''}!
                    </Text>
                  )}
                </>
              )}
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
