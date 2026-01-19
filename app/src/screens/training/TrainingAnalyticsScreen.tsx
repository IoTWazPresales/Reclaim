// Training Analytics Screen - Graphs and trends for training data
import React, { useState, useMemo } from 'react';
import { View, ScrollView } from 'react-native';
import { Button, Card, Text, useTheme, ActivityIndicator, Chip, IconButton } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { useAppTheme } from '@/theme';
import {
  listSetLogsByExercise,
  listSetLogsBySessions,
  listTrainingSessions,
  getTrainingSession,
} from '@/lib/api';
import {
  buildExerciseTrendSeries,
  buildSessionSummary,
  groupLogsByExercise,
} from '@/lib/training/analytics';
import { getExerciseById, listExercises } from '@/lib/training/engine';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

interface TrainingAnalyticsScreenProps {
  onClose: () => void;
}

export default function TrainingAnalyticsScreen({ onClose }: TrainingAnalyticsScreenProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'strength' | 'volume' | 'prs'>('strength');

  // Load recent sessions
  const sessionsQ = useQuery({
    queryKey: ['training:sessions:analytics'],
    queryFn: () => listTrainingSessions(30),
    staleTime: 30000,
  });

  // Load set logs for selected exercise
  const setLogsQ = useQuery({
    queryKey: ['training:setLogs:exercise', selectedExerciseId],
    queryFn: () => (selectedExerciseId ? listSetLogsByExercise(selectedExerciseId, { limit: 200 }) : []),
    enabled: !!selectedExerciseId,
    staleTime: 60000,
  });

  // Load most recent session data
  const mostRecentSessionId = useMemo(() => {
    const sessions = sessionsQ.data || [];
    return sessions.length > 0 ? sessions[0].id : null;
  }, [sessionsQ.data]);

  const recentSessionQ = useQuery({
    queryKey: ['training:session', mostRecentSessionId],
    queryFn: () => (mostRecentSessionId ? getTrainingSession(mostRecentSessionId) : null),
    enabled: !!mostRecentSessionId,
    staleTime: 60000,
  });

  const recentSessionSetLogsQ = useQuery({
    queryKey: ['training:setLogs:session', mostRecentSessionId],
    queryFn: () => (mostRecentSessionId ? listSetLogsBySessions([mostRecentSessionId]) : []),
    enabled: !!mostRecentSessionId,
    staleTime: 60000,
  });

  // Get exercises with logs (for picker)
  const exercisesWithLogs = useMemo(() => {
    if (!sessionsQ.data || sessionsQ.data.length === 0) return [];
    
    const exerciseIds = new Set<string>();
    // Get exercise IDs from sessions (would need to query session items, but for now use available exercises)
    const allExercises = listExercises();
    return allExercises.slice(0, 20); // Limit to first 20 for now
  }, [sessionsQ.data]);

  // Build trend data for selected exercise
  const trendData = useMemo(() => {
    if (!selectedExerciseId || !setLogsQ.data || setLogsQ.data.length === 0) return null;
    
    const exercise = getExerciseById(selectedExerciseId);
    if (!exercise) return null;
    
    return buildExerciseTrendSeries(setLogsQ.data, selectedExerciseId, exercise.name);
  }, [selectedExerciseId, setLogsQ.data]);

  // Build session summary for most recent session
  const sessionSummary = useMemo(() => {
    if (!recentSessionSetLogsQ.data || recentSessionSetLogsQ.data.length === 0 || !recentSessionQ.data) return null;
    
    const session = recentSessionQ.data.session;
    return buildSessionSummary(recentSessionSetLogsQ.data, {
      sessionId: session.id,
      startedAt: session.started_at || new Date().toISOString(),
      endedAt: session.ended_at || undefined,
      exercisesSkipped: session.summary?.exercisesSkipped,
    });
  }, [recentSessionSetLogsQ.data, recentSessionQ.data]);

  // Chart dimensions
  const chartWidth = Dimensions.get('window').width - (appTheme.spacing.lg * 2);
  const chartHeight = 220;

  // Chart config
  const chartConfig = {
    backgroundColor: theme.colors.surface,
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(${theme.colors.primary === '#6200EE' ? '98, 0, 238' : '0, 0, 0'}, ${opacity})`, // Fallback for theme
    labelColor: (opacity = 1) => theme.colors.onSurface,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: theme.colors.primary,
    },
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: appTheme.spacing.lg,
          paddingTop: appTheme.spacing.lg,
          paddingBottom: appTheme.spacing.md,
        }}
      >
        <IconButton icon="close" size={24} onPress={onClose} accessibilityLabel="Close analytics" />
        <Text variant="headlineSmall" style={{ flex: 1, fontWeight: '700', color: theme.colors.onSurface }}>
          Training Analytics
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: appTheme.spacing.lg, paddingBottom: 140 }}
      >
        {/* Exercise Picker */}
        <Card mode="outlined" style={{ marginBottom: appTheme.spacing.lg, borderRadius: appTheme.borderRadius.xl }}>
          <Card.Content>
            <Text variant="titleMedium" style={{ fontWeight: '700', marginBottom: appTheme.spacing.sm, color: theme.colors.onSurface }}>
              Select Exercise
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: appTheme.spacing.sm }}>
              <View style={{ flexDirection: 'row', gap: appTheme.spacing.xs }}>
                {exercisesWithLogs.map((exercise) => (
                  <Chip
                    key={exercise.id}
                    selected={selectedExerciseId === exercise.id}
                    onPress={() => setSelectedExerciseId(exercise.id)}
                    style={{ marginRight: appTheme.spacing.xs }}
                  >
                    {exercise.name}
                  </Chip>
                ))}
              </View>
            </ScrollView>
            {exercisesWithLogs.length === 0 && (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: appTheme.spacing.xs }}>
                No exercises with logs yet. Complete a training session to see analytics.
              </Text>
            )}
          </Card.Content>
        </Card>

        {/* Exercise Charts */}
        {selectedExerciseId && trendData && (
          <Card mode="outlined" style={{ marginBottom: appTheme.spacing.lg, borderRadius: appTheme.borderRadius.xl }}>
            <Card.Content>
              <Text variant="titleMedium" style={{ fontWeight: '700', marginBottom: appTheme.spacing.md, color: theme.colors.onSurface }}>
                {getExerciseById(selectedExerciseId)?.name || selectedExerciseId}
              </Text>

              <View style={{ flexDirection: 'row', gap: 10, marginBottom: appTheme.spacing.md }}>
                <Button
                  mode={activeTab === 'strength' ? 'contained' : 'outlined'}
                  onPress={() => setActiveTab('strength')}
                  style={{ flex: 1 }}
                >
                  Strength
                </Button>
                <Button
                  mode={activeTab === 'volume' ? 'contained' : 'outlined'}
                  onPress={() => setActiveTab('volume')}
                  style={{ flex: 1 }}
                >
                  Volume
                </Button>
                <Button
                  mode={activeTab === 'prs' ? 'contained' : 'outlined'}
                  onPress={() => setActiveTab('prs')}
                  style={{ flex: 1 }}
                >
                  PRs
                </Button>
              </View>

              {activeTab === 'strength' && trendData.e1rmTrend.length > 0 && (
                <View>
                  <LineChart
                    data={{
                      labels: trendData.e1rmTrend.slice(-7).map((p) => {
                        const date = new Date(p.date);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }),
                      datasets: [
                        {
                          data: trendData.e1rmTrend.slice(-7).map((p) => p.value),
                          color: (opacity = 1) => theme.colors.primary,
                          strokeWidth: 2,
                        },
                      ],
                    }}
                    width={chartWidth}
                    height={chartHeight}
                    chartConfig={chartConfig}
                    bezier
                    style={{ borderRadius: appTheme.borderRadius.md }}
                  />
                  {trendData.e1rmTrend.length > 7 && (
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: appTheme.spacing.xs, textAlign: 'center' }}>
                      Showing last 7 data points
                    </Text>
                  )}
                </View>
              )}

              {activeTab === 'volume' && trendData.volumeTrend.length > 0 && (
                <View>
                  <LineChart
                    data={{
                      labels: trendData.volumeTrend.slice(-7).map((p) => {
                        const date = new Date(p.date);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }),
                      datasets: [
                        {
                          data: trendData.volumeTrend.slice(-7).map((p) => p.value),
                          color: (opacity = 1) => theme.colors.secondary || theme.colors.primary,
                          strokeWidth: 2,
                        },
                      ],
                    }}
                    width={chartWidth}
                    height={chartHeight}
                    chartConfig={chartConfig}
                    bezier
                    style={{ borderRadius: appTheme.borderRadius.md }}
                  />
                  {trendData.volumeTrend.length > 7 && (
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: appTheme.spacing.xs, textAlign: 'center' }}>
                      Showing last 7 data points
                    </Text>
                  )}
                </View>
              )}

              {activeTab === 'prs' && setLogsQ.data && (
                <View>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    PR detection coming soon. Complete more sessions to track personal records.
                  </Text>
                </View>
              )}
            </Card.Content>
          </Card>
        )}

        {selectedExerciseId && setLogsQ.isLoading && (
          <Card mode="outlined" style={{ marginBottom: appTheme.spacing.lg }}>
            <Card.Content>
              <ActivityIndicator />
              <Text variant="bodyMedium" style={{ marginTop: appTheme.spacing.sm, color: theme.colors.onSurfaceVariant }}>
                Loading exercise data...
              </Text>
            </Card.Content>
          </Card>
        )}

        {selectedExerciseId && !setLogsQ.isLoading && setLogsQ.data && setLogsQ.data.length === 0 && (
          <Card mode="outlined" style={{ marginBottom: appTheme.spacing.lg }}>
            <Card.Content>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                No set logs found for this exercise yet.
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* Most Recent Session Summary */}
        {sessionSummary && (
          <Card mode="outlined" style={{ marginBottom: appTheme.spacing.lg, borderRadius: appTheme.borderRadius.xl }}>
            <Card.Content>
              <Text variant="titleMedium" style={{ fontWeight: '700', marginBottom: appTheme.spacing.md, color: theme.colors.onSurface }}>
                Most Recent Session
              </Text>

              {sessionSummary.volumeByIntent.length > 0 && (
                <View style={{ marginBottom: appTheme.spacing.md }}>
                  <Text variant="bodySmall" style={{ marginBottom: appTheme.spacing.xs, color: theme.colors.onSurfaceVariant }}>
                    Volume by Intent
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: appTheme.spacing.xs }}>
                    {sessionSummary.volumeByIntent.map((vb, idx) => (
                      <Chip key={idx} style={{ marginRight: appTheme.spacing.xs }}>
                        {vb.intent.replace('_', ' ')}: {vb.volume}kg ({vb.percentage}%)
                      </Chip>
                    ))}
                  </View>
                </View>
              )}

              {sessionSummary.fatigueIndicator && (
                <View style={{ marginBottom: appTheme.spacing.md }}>
                  <Text variant="bodySmall" style={{ marginBottom: appTheme.spacing.xs, color: theme.colors.onSurfaceVariant }}>
                    Fatigue Score
                  </Text>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                    {Math.round(sessionSummary.fatigueIndicator.fatigueScore * 100)}% (RPE avg: {sessionSummary.fatigueIndicator.indicators.rpeAverage?.toFixed(1) || 'N/A'})
                  </Text>
                </View>
              )}

              {sessionSummary.prs.length > 0 && (
                <View>
                  <Text variant="bodySmall" style={{ marginBottom: appTheme.spacing.xs, color: theme.colors.onSurfaceVariant }}>
                    Personal Records
                  </Text>
                  {sessionSummary.prs.map((pr, idx) => (
                    <Chip key={idx} style={{ marginRight: appTheme.spacing.xs, marginBottom: appTheme.spacing.xs }}>
                      {pr.exerciseName}: {pr.metric} PR ({pr.value}{pr.metric === 'weight' || pr.metric === 'volume' ? 'kg' : ''})
                    </Chip>
                  ))}
                </View>
              )}
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}
