// Training Session View - Active workout interface
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { Button, Card, Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  updateTrainingSession,
  updateTrainingSessionItem,
  logTrainingSet,
  getTrainingSetLogs,
  getExerciseBestPerformance,
  logTrainingEvent,
} from '@/lib/api';
import { getLastPerformanceForExercise } from '@/lib/training/lastPerformance';
import { getExerciseById } from '@/lib/training/engine';
import { detectPRs } from '@/lib/training/progression';
import { useAppTheme } from '@/theme';
import ExerciseCard from './ExerciseCard';
import RestTimer from './RestTimer';
import FullSessionPanel from './FullSessionPanel';
import PostSessionMoodPrompt from './PostSessionMoodPrompt';
import { logger } from '@/lib/logger';
import { enqueueOperation, getQueueSize } from '@/lib/training/offlineQueue';
import { isNetworkAvailable } from '@/lib/training/offlineSync';
import type { TrainingSessionRow, TrainingSessionItemRow } from '@/lib/api';

interface TrainingSessionViewProps {
  sessionId: string;
  sessionData: {
    session: TrainingSessionRow;
    items: TrainingSessionItemRow[];
  };
  onComplete: () => void;
  onCancel: () => void;
}

export default function TrainingSessionView({ sessionId, sessionData, onComplete, onCancel }: TrainingSessionViewProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const qc = useQueryClient();

  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showFullSession, setShowFullSession] = useState(false);
  const [showMoodPrompt, setShowMoodPrompt] = useState(false);
  const [restTimer, setRestTimer] = useState<{ seconds: number; exerciseId: string } | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [offlineQueueSize, setOfflineQueueSize] = useState(0);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const { session, items } = sessionData;

  const isEnded = !!(session as any).ended_at;
  const startedAtMs = (session as any).started_at ? new Date((session as any).started_at).getTime() : null;
  const endedAtMs = (session as any).ended_at ? new Date((session as any).ended_at).getTime() : null;

  const currentItem = items[currentExerciseIndex];

  const completedCount = useMemo(
    () => items.filter((item) => item.performed && !item.skipped).length,
    [items],
  );
  const skippedCount = useMemo(() => items.filter((item) => item.skipped).length, [items]);

  // Load last performance for current exercise (null -> undefined)
  const lastPerformanceQ = useQuery({
    queryKey: ['training:lastPerformance', currentItem?.exercise_id, (session as any).session_type_label],
    queryFn: async () => {
      if (!currentItem || !(session as any).user_id) return null;

      const sessionTypeLabel: string | undefined = ((session as any).session_type_label ?? undefined) as
        | string
        | undefined;

      return getLastPerformanceForExercise(
        (session as any).user_id as string,
        currentItem.exercise_id as string,
        ((session as any).started_at ?? undefined) as string | undefined,
        sessionTypeLabel,
      );
    },
    enabled: !!currentItem && !!(session as any).user_id,
    staleTime: Infinity,
  });

  // Timer: counts from started_at -> NOW if active, or started_at -> ended_at if ended.
  useEffect(() => {
    if (!startedAtMs) return;

    const tick = () => {
      const end = endedAtMs ?? Date.now();
      const diffSec = Math.max(0, Math.floor((end - startedAtMs) / 1000));
      setElapsedSeconds(diffSec);
    };

    tick();

    if (endedAtMs) return;

    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAtMs, endedAtMs]);

  // Check network status and queue size
  useEffect(() => {
    const checkNetwork = async () => {
      const available = await isNetworkAvailable();
      setIsOffline(!available);
      if (!available) {
        const size = await getQueueSize();
        setOfflineQueueSize(size);
      }
    };
    checkNetwork();
    const interval = setInterval(checkNetwork, 10000);
    return () => clearInterval(interval);
  }, []);

  // Load set logs for current exercise
  const setLogsQ = useQuery({
    queryKey: ['training:set_logs', currentItem?.id],
    queryFn: () => (currentItem?.id ? getTrainingSetLogs(currentItem.id) : []),
    enabled: !!currentItem?.id,
  });

  const handleSetComplete = useCallback(
    async (setIndex: number, weight: number, reps: number, rpe?: number) => {
      if (!currentItem) return;
      if (isEnded) {
        Alert.alert('Session completed', 'This session is already completed. Start a new session to log more sets.');
        return;
      }

      const setLogId = `${currentItem.id}_set_${setIndex}_${Date.now()}`;
      const networkAvailable = await isNetworkAvailable();

      try {
        if (networkAvailable) {
          await logTrainingSet({
            id: setLogId,
            sessionItemId: currentItem.id,
            setIndex,
            weight,
            reps,
            rpe,
          });
          await logTrainingEvent('training_set_logged', {
            exerciseId: currentItem.exercise_id,
            setIndex,
            weight,
            reps,
          }).catch(() => {});
        } else {
          await enqueueOperation({
            type: 'insertSetLog',
            sessionItemId: currentItem.id,
            id: setLogId,
            payload: { setIndex, weight, reps, rpe },
            timestamp: new Date().toISOString(),
          });
          await logTrainingEvent('training_offline_queue_used', {
            operation: 'insertSetLog',
          }).catch(() => {});
          setOfflineQueueSize((prev) => prev + 1);
        }

        const existingLogs = setLogsQ.data || [];
        const newLogs = [
          ...existingLogs,
          {
            id: `${currentItem.id}_set_${setIndex}`,
            session_item_id: currentItem.id,
            set_index: setIndex,
            weight,
            reps,
            rpe: rpe || null,
            completed_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
        ];

        await updateTrainingSessionItem(currentItem.id, {
          performed: {
            sets: newLogs.map((log) => ({
              setIndex: log.set_index,
              weight: log.weight || 0,
              reps: log.reps,
              rpe: log.rpe || undefined,
              completedAt: log.completed_at,
            })),
          },
        });

        // Start rest timer if in timed mode
        const plannedSets = currentItem.planned?.sets || [];
        if ((session as any).mode === 'timed' && plannedSets.length > 0) {
          const plannedSet = plannedSets.find((s: any) => s.setIndex === setIndex);
          if (plannedSet?.restSeconds && plannedSet.restSeconds > 0) {
            setRestTimer({ seconds: plannedSet.restSeconds, exerciseId: currentItem.id });
          }
        }

        qc.invalidateQueries({ queryKey: ['training:set_logs', currentItem.id] });
        qc.invalidateQueries({ queryKey: ['training:session', sessionId] });
      } catch (error: any) {
        logger.warn('Failed to log set', error);
        try {
          await enqueueOperation({
            type: 'insertSetLog',
            sessionItemId: currentItem.id,
            id: setLogId,
            payload: { setIndex, weight, reps, rpe },
            timestamp: new Date().toISOString(),
          });
          setIsOffline(true);
        } catch {
          Alert.alert('Error', error?.message || 'Failed to log set');
        }
      }
    },
    [currentItem, setLogsQ.data, qc, sessionId, isEnded, session],
  );

  const handleSkip = useCallback(async () => {
    if (!currentItem) return;
    if (isEnded) {
      Alert.alert('Session completed', 'This session is already completed.');
      return;
    }

    const networkAvailable = await isNetworkAvailable();
    try {
      if (networkAvailable) {
        await updateTrainingSessionItem(currentItem.id, { skipped: true });
        await logTrainingEvent('training_exercise_skipped', {
          exerciseId: currentItem.exercise_id,
        }).catch(() => {});
      } else {
        await enqueueOperation({
          type: 'upsertItem',
          sessionId: sessionId,
          itemId: currentItem.id,
          payload: { skipped: true },
          timestamp: new Date().toISOString(),
        });
        setOfflineQueueSize((prev) => prev + 1);
      }

      qc.invalidateQueries({ queryKey: ['training:session', sessionId] });

      if (currentExerciseIndex < items.length - 1) {
        setCurrentExerciseIndex(currentExerciseIndex + 1);
      }
    } catch (error: any) {
      logger.warn('Failed to skip exercise', error);
      Alert.alert('Error', error?.message || 'Failed to skip exercise');
    }
  }, [currentItem, currentExerciseIndex, items.length, qc, sessionId, isEnded]);

  const handleComplete = useCallback(async () => {
    if (isEnded) {
      onComplete();
      return;
    }
    if (isFinalizing) return;

    setIsFinalizing(true);

    try {
      const allPRs: any[] = [];

      const totalVolume = items.reduce((sum, item) => {
        if (!item.performed?.sets) return sum;
        const volume = item.performed.sets.reduce((s, set) => s + (set.weight || 0) * set.reps, 0);
        return sum + volume;
      }, 0);

      const totalSets = items.reduce((sum, item) => sum + (item.performed?.sets?.length || 0), 0);

      for (const item of items) {
        if (!item.performed?.sets || item.performed.sets.length === 0) continue;
        const ex = getExerciseById(item.exercise_id);
        if (!ex) continue;

        try {
          const previousBest = await getExerciseBestPerformance(item.exercise_id);
          const performedSets = item.performed.sets.map((s) => ({
            weight: s.weight || 0,
            reps: s.reps,
          }));
          const prs = detectPRs(item.exercise_id, ex.name, performedSets, previousBest || undefined);
          allPRs.push(...prs);
        } catch (error) {
          logger.warn('Failed to detect PRs for exercise', item.exercise_id, error);
        }
      }

      const levelUpEvents = allPRs.map((pr) => ({
        exerciseId: pr.exerciseId,
        exerciseName: pr.exerciseName,
        metric: pr.metric,
        value: pr.value,
        message: `New ${
          pr.metric === 'e1rm' ? 'e1RM' : pr.metric
        } PR: ${pr.value}${
          pr.metric === 'e1rm' ? 'kg' : pr.metric === 'volume' ? 'kg' : pr.metric === 'weight' ? 'kg' : ''
        }`,
      }));

      const endedAtIso = new Date().toISOString();

      const summary = {
        durationMinutes: Math.floor(elapsedSeconds / 60),
        exercisesCompleted: completedCount,
        exercisesSkipped: skippedCount,
        totalVolume: Math.round(totalVolume),
        totalSets,
        prs: allPRs,
        levelUpEvents: levelUpEvents.length > 0 ? levelUpEvents : undefined,
      };

      const networkAvailable = await isNetworkAvailable();
      if (networkAvailable) {
        await updateTrainingSession(sessionId, {
          endedAt: endedAtIso,
          summary,
        });
        await logTrainingEvent('training_session_completed', {
          sessionId,
          durationMinutes: summary.durationMinutes,
          prsCount: allPRs.length,
        }).catch(() => {});
      } else {
        await enqueueOperation({
          type: 'finalizeSession',
          sessionId,
          payload: {
            endedAt: endedAtIso,
            summary,
          },
          timestamp: new Date().toISOString(),
        });
      }

      await qc.invalidateQueries({ queryKey: ['training:session', sessionId] });
      await qc.invalidateQueries({ queryKey: ['training:sessions'] });

      setShowMoodPrompt(true);
    } catch (error: any) {
      logger.warn('Failed to complete session', error);
      Alert.alert('Error', error?.message || 'Failed to complete session');
    } finally {
      setIsFinalizing(false);
    }
  }, [isEnded, isFinalizing, sessionId, elapsedSeconds, completedCount, skippedCount, items, qc, onComplete]);

  const handleNext = useCallback(() => {
    if (currentExerciseIndex < items.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
    } else {
      Alert.alert('Complete session?', 'Finish this training session? You can review it in History.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Complete', style: 'default', onPress: () => void handleComplete() },
      ]);
    }
  }, [currentExerciseIndex, items.length, handleComplete]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentItem) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator />
      </View>
    );
  }

  const exercise = getExerciseById(currentItem.exercise_id);

  const plannedSets = currentItem.planned?.sets || [];
  const performedSets = currentItem.performed?.sets || [];

  const isComplete = plannedSets.length > 0 ? performedSets.length >= plannedSets.length : performedSets.length > 0;

  const sessionAny = session as any;
  const sessionTypeLabel: string | undefined = (sessionAny.session_type_label ?? undefined) as string | undefined;
  const weekIndex: number | undefined = (sessionAny.week_index ?? undefined) as number | undefined;

  const sessionLabel = sessionTypeLabel ? `Week ${weekIndex ?? '?'} · ${sessionTypeLabel}` : 'Training Session';

  const plannedExercises = useMemo(() => {
    return items
      .map((item) => {
        const ex = getExerciseById(item.exercise_id);
        if (!ex) return null;

        return {
          exerciseId: item.exercise_id,
          exercise: ex,
          orderIndex: item.order_index,
          plannedSets: item.planned?.sets || [],
          intents: item.planned?.intents || [],
          priority: item.planned?.priority || 'accessory',
          decisionTrace: item.planned?.decisionTrace,
        };
      })
      .filter(Boolean) as any[];
  }, [items]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: appTheme.spacing.lg, paddingTop: appTheme.spacing.lg, paddingBottom: 140 }}
      >
        <View style={{ marginBottom: appTheme.spacing.md }}>
          <Text variant="titleLarge" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
            {sessionLabel}
          </Text>

          {isEnded ? (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: appTheme.spacing.xs }}>
              Completed • Timer frozen • View-only
            </Text>
          ) : null}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: appTheme.spacing.xs }}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Exercise {currentExerciseIndex + 1} of {items.length}
            </Text>
            <Button mode="text" compact onPress={() => setShowFullSession(true)}>
              View full session
            </Button>
          </View>
        </View>

        {isOffline && (
          <Card
            mode="outlined"
            style={{
              marginBottom: appTheme.spacing.lg,
              backgroundColor: theme.colors.errorContainer,
              borderLeftWidth: 4,
              borderLeftColor: theme.colors.error,
              borderRadius: appTheme.borderRadius.xl,
            }}
          >
            <Card.Content>
              <Text variant="bodyMedium" style={{ color: theme.colors.onErrorContainer }}>
                Offline — {offlineQueueSize} operation{offlineQueueSize !== 1 ? 's' : ''} will sync when network returns
              </Text>
            </Card.Content>
          </Card>
        )}

        {restTimer && restTimer.exerciseId === currentItem?.id && (
          <RestTimer
            targetSeconds={restTimer.seconds}
            onComplete={() => setRestTimer(null)}
            onExtend={(seconds: number) =>
              setRestTimer((prev) => (prev ? { ...prev, seconds: prev.seconds + seconds } : null))
            }
            onSkip={() => setRestTimer(null)}
          />
        )}

        <Card mode="outlined" style={{ marginBottom: appTheme.spacing.lg, backgroundColor: theme.colors.surface, borderRadius: appTheme.borderRadius.xl }}>
          <Card.Content>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                  {formatTime(elapsedSeconds)}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: appTheme.spacing.xs }}>
                  Exercise {currentExerciseIndex + 1} of {items.length}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {completedCount} completed
                </Text>
                {skippedCount > 0 && (
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {skippedCount} skipped
                  </Text>
                )}
              </View>
            </View>
          </Card.Content>
        </Card>

        {exercise && (
          <ExerciseCard
            exercise={exercise}
            plannedSets={plannedSets}
            performedSets={performedSets}
            decisionTrace={undefined as any}
            onSetComplete={handleSetComplete}
            onSkip={handleSkip}
            onNext={handleNext}
            isComplete={isComplete}
            lastPerformance={
              lastPerformanceQ.data
                ? { weight: lastPerformanceQ.data.weight, reps: lastPerformanceQ.data.reps, date: lastPerformanceQ.data.session_date }
                : undefined
            }
          />
        )}

        <View style={{ marginTop: appTheme.spacing.lg }}>
          <Text variant="bodySmall" style={{ marginBottom: appTheme.spacing.sm, color: theme.colors.onSurfaceVariant }}>
            Session progress
          </Text>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {items.map((item, idx) => {
              const isCurrent = idx === currentExerciseIndex;
              const isDone = item.performed && !item.skipped;
              const isSkipped = item.skipped;

              return (
                <View
                  key={item.id}
                  style={{
                    flex: 1,
                    height: 4,
                    backgroundColor: isDone
                      ? theme.colors.primary
                      : isSkipped
                      ? theme.colors.error
                      : isCurrent
                      ? theme.colors.secondary
                      : theme.colors.surfaceVariant,
                    borderRadius: 2,
                  }}
                />
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: appTheme.spacing.lg,
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.outlineVariant,
        }}
      >
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button mode="outlined" onPress={onCancel} style={{ flex: 1 }}>
            Close
          </Button>
          <Button
            mode="contained"
            onPress={() => {
              Alert.alert('Complete session?', 'Finish this training session? You can review it in History.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Complete', style: 'default', onPress: () => void handleComplete() },
              ]);
            }}
            style={{ flex: 1 }}
            disabled={isEnded || isFinalizing}
          >
            {isEnded ? 'Completed' : isFinalizing ? 'Finishing…' : 'Finish session'}
          </Button>
        </View>
      </View>

      <FullSessionPanel
        visible={showFullSession}
        exercises={plannedExercises as any}
        currentExerciseIndex={currentExerciseIndex}
        sessionLabel={sessionLabel}
        onClose={() => setShowFullSession(false)}
      />

      <PostSessionMoodPrompt
        visible={showMoodPrompt}
        sessionId={sessionId}
        onComplete={() => {
          setShowMoodPrompt(false);
          onComplete();
        }}
      />
    </View>
  );
}
