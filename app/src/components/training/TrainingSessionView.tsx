// Training Session View - Active workout interface
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { Button, Card, Text, useTheme, ActivityIndicator, IconButton } from 'react-native-paper';
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
import {
  resumeRuntime,
  initializeRuntime,
  logSet,
  skipExercise,
  endSession,
  getAdjustedSetParams,
  getSessionStats,
  tickRuntime,
  advanceExercise,
  getAdjustedRestTime,
} from '@/lib/training/runtime';
import { buildSetLogPayload, buildSetLogQueuePayload } from '@/lib/training/runtime/payloadBuilder';
import type {
  SessionRuntimeState,
  SessionPlan,
  PlannedExercise,
  SetLogEntry,
  AdaptationTrace,
} from '@/lib/training/types';
import { useAppTheme } from '@/theme';
import ExerciseCard from './ExerciseCard';
import RestTimer from './RestTimer';
import FullSessionPanel from './FullSessionPanel';
import PostSessionMoodPrompt from './PostSessionMoodPrompt';
import SetFocusOverlay from './SetFocusOverlay';
import { logger } from '@/lib/logger';
import { enqueueOperation, getQueueSize } from '@/lib/training/offlineQueue';
import { isNetworkAvailable } from '@/lib/training/offlineSync';
import type { TrainingSessionRow, TrainingSessionItemRow, TrainingSetLogRow } from '@/lib/api';

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
  const [restTimerPaused, setRestTimerPaused] = useState(false);
  const [restTimerRemaining, setRestTimerRemaining] = useState<number | null>(null);
  const [showSetFocusOverlay, setShowSetFocusOverlay] = useState(false);
  const [focusOverlaySetIndex, setFocusOverlaySetIndex] = useState<number | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [offlineQueueSize, setOfflineQueueSize] = useState(0);
  const [isFinalizing, setIsFinalizing] = useState(false);
  
  // Runtime state machine
  const [runtimeState, setRuntimeState] = useState<SessionRuntimeState | null>(null);
  const [lastAutoregulationMessage, setLastAutoregulationMessage] = useState<string | null>(null);
  const [adaptationTraces, setAdaptationTraces] = useState<AdaptationTrace[]>([]);
  
  // Idempotency guard for set logging (prevent double-submit)
  const loggingInFlight = useRef<Set<string>>(new Set());

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
  
  // Count total sets logged across all exercises
  const totalSetsLogged = useMemo(() => {
    return items.reduce((total, item) => {
      if (item.performed?.sets) {
        return total + item.performed.sets.length;
      }
      return total;
    }, 0);
  }, [items]);

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
  
  // Build PlannedExercise[] from sessionData for runtime (preserving actual item IDs)
  const plannedExercisesForRuntime = useMemo<PlannedExercise[]>(() => {
    if (!items || items.length === 0) return [];
    
    return items
      .sort((a, b) => a.order_index - b.order_index)
      .map((item) => {
        const exercise = getExerciseById(item.exercise_id);
        if (!exercise) return null;
        
        return {
          exerciseId: item.exercise_id,
          exercise,
          orderIndex: item.order_index,
          priority: (item.planned?.priority || 'accessory') as any,
          intents: (item.planned?.intents || []) as any[],
          plannedSets: (item.planned?.sets || []).map((s) => ({
            setIndex: s.setIndex,
            targetReps: s.targetReps,
            suggestedWeight: s.suggestedWeight,
            restSeconds: s.restSeconds,
          })),
          decisionTrace: (item.planned?.decisionTrace || {
            intent: [],
            goalBias: {},
            constraintsApplied: [],
            selectionReason: '',
            rankedAlternatives: [],
            confidence: 0.5,
          }) as any,
        };
      })
      .filter((ex): ex is PlannedExercise => ex !== null);
  }, [items]);
  
  // Build SessionPlan from sessionData for runtime initialization
  const sessionPlan = useMemo<SessionPlan | null>(() => {
    if (!session || plannedExercisesForRuntime.length === 0) return null;
    
    return {
      id: session.id,
      template: 'push' as any, // Not critical for runtime
      goals: session.goals || {},
      constraints: {
        availableEquipment: [],
        injuries: [],
        forbiddenMovements: [],
        timeBudgetMinutes: 60,
      },
      userState: {
        experienceLevel: 'intermediate',
      },
      exercises: plannedExercisesForRuntime,
      estimatedDurationMinutes: 45,
      createdAt: session.created_at,
      sessionLabel: (session as any).session_type_label || undefined,
    };
  }, [session, plannedExercisesForRuntime]);
  
  // Convert existing set logs to SetLogEntry format
  const existingSetLogs = useMemo<SetLogEntry[]>(() => {
    const allLogs: SetLogEntry[] = [];
    
    // Collect from performed sets in items
    for (const item of items) {
      if (!item.performed?.sets) continue;
      
      for (const set of item.performed.sets) {
        allLogs.push({
          id: `${item.id}_set_${set.setIndex}`,
          exerciseId: item.exercise_id,
          sessionItemId: item.id,
          setIndex: set.setIndex,
          weight: set.weight || 0,
          reps: set.reps,
          rpe: set.rpe,
          completedAt: set.completedAt,
        });
      }
    }
    
    return allLogs;
  }, [items]);
  
  // Initialize or resume runtime state when sessionData is ready (ONCE per session load)
  useEffect(() => {
    if (!sessionPlan || !session) return;
    if (runtimeState !== null) return; // Already initialized - guard prevents re-initialization
    
    const startedAt = (session as any).started_at || new Date().toISOString();
    const mode = (session.mode || 'manual') as any;
    const skippedExerciseIds = items.filter((item) => item.skipped).map((item) => item.exercise_id);
    
    try {
      // Build PlannedExercise[] from sessionPlan
      const exercises = sessionPlan.exercises;
      
      // Resume if we have existing sets or skipped exercises
      if (existingSetLogs.length > 0 || skippedExerciseIds.length > 0) {
        const resumed = resumeRuntime(
          session.id,
          startedAt,
          mode,
          exercises,
          existingSetLogs,
          skippedExerciseIds,
        );
        setRuntimeState(resumed);
      } else {
        // New session - initialize fresh
        const initialized = initializeRuntime(session.id, sessionPlan, mode);
        // Override startedAt with actual session started_at if available
        if ((session as any).started_at) {
          initialized.startedAt = (session as any).started_at;
        }
        setRuntimeState(initialized);
      }
      
      // Sync currentExerciseIndex with runtime state (only on initial load)
      const firstPendingIndex = items.findIndex(
        (item, idx) => !item.skipped && (!item.performed?.sets || item.performed.sets.length === 0),
      );
      if (firstPendingIndex >= 0 && firstPendingIndex !== currentExerciseIndex) {
        setCurrentExerciseIndex(firstPendingIndex);
      }
    } catch (error: any) {
      logger.warn('Failed to initialize runtime state', error);
    }
    // NOTE: runtimeState and currentExerciseIndex are NOT in deps - we only want to initialize once when sessionData is ready
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionPlan, session?.id, items.length, existingSetLogs.length]);
  
  // Tick runtime timer (update elapsed time)
  useEffect(() => {
    if (!runtimeState || runtimeState.status !== 'active') return;
    
    const interval = setInterval(() => {
      setRuntimeState((prev) => (prev ? tickRuntime(prev) : null));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [runtimeState?.status]);

  const handleSetComplete = useCallback(
    async (setIndex: number, weight: number, reps: number, rpe?: number) => {
      if (!currentItem || !runtimeState) return;
      if (isEnded) {
        Alert.alert('Session completed', 'This session is already completed. Start a new session to log more sets.');
        return;
      }

      // Idempotency guard: prevent double-logging same set
      const logKey = `${currentItem.id}_${setIndex}`;
      if (loggingInFlight.current.has(logKey)) {
        logger.warn('Set log already in flight, ignoring duplicate', { exerciseId: currentItem.exercise_id, setIndex });
        return;
      }
      loggingInFlight.current.add(logKey);

      try {
        // STEP 1: Update runtime state with logSet
        const logResult = logSet(runtimeState, currentItem.exercise_id, {
          setIndex,
          weight,
          reps,
          rpe,
        });
        
        // Update runtime state immediately (optimistic)
        setRuntimeState(logResult.state);
        
        // Store autoregulation message if present (will be cleared when next set starts or exercise changes)
        if (logResult.trace) {
          setAdaptationTraces((prev) => [...prev, logResult.trace!]);
          setLastAutoregulationMessage(logResult.trace.output.message);
        }
        
        // STEP 2: Persist to Supabase using existing API (idempotent by id)
        // Build payload using payload builder (ensures DB itemIds are used, not synthetic runtime itemIds)
        const networkAvailable = await isNetworkAvailable();
        
        const setLogPayload = buildSetLogPayload(
          currentItem.id, // Actual DB itemId (TEXT) - NOT runtime's synthetic itemId
          sessionId, // Actual DB sessionId (TEXT)
          currentItem.exercise_id,
          setIndex,
          weight,
          reps,
          rpe,
          logResult.setEntry.completedAt,
        );

        try {
          if (networkAvailable) {
            // Persist using payload built with actual DB itemIds
            await logTrainingSet({
              id: setLogPayload.id,
              sessionItemId: setLogPayload.sessionItemId, // DB itemId (TEXT)
              setIndex: setLogPayload.setIndex,
              weight: setLogPayload.weight,
              reps: setLogPayload.reps,
              rpe: setLogPayload.rpe !== null ? setLogPayload.rpe : undefined,
            });
            await logTrainingEvent('training_set_logged', {
              exerciseId: setLogPayload.exerciseId,
              setIndex: setLogPayload.setIndex,
              weight: setLogPayload.weight,
              reps: setLogPayload.reps,
              rpe: setLogPayload.rpe,
            }).catch(() => {});
            
            // Log autoregulation trace if present
            if (logResult.trace) {
              await logTrainingEvent('training_autoregulation_applied', {
                exerciseId: currentItem.exercise_id,
                setIndex: logResult.trace.setIndex,
                ruleId: logResult.trace.ruleId,
                reason: logResult.trace.reason,
                confidence: logResult.trace.confidence,
              }).catch(() => {});
            }
            
            // Remove from in-flight set immediately after successful persist
            loggingInFlight.current.delete(logKey);
          } else {
            // Build offline queue payload (same structure as online insert)
            const queuePayload = buildSetLogQueuePayload(
              currentItem.id, // Actual DB itemId (TEXT)
              currentItem.exercise_id,
              setIndex,
              weight,
              reps,
              rpe,
            );
            await enqueueOperation(queuePayload);
            await logTrainingEvent('training_offline_queue_used', {
              operation: 'insertSetLog',
            }).catch(() => {});
            setOfflineQueueSize((prev) => prev + 1);
            
            // Remove from in-flight set after queuing (offline queue is async-safe)
            loggingInFlight.current.delete(logKey);
          }
        } catch (persistError: any) {
          // If persist fails, enqueue offline but keep runtime state (state is source of truth)
          logger.warn('Failed to persist set log, queuing offline', persistError);
          try {
            // Build offline queue payload (same structure as online insert)
            const queuePayload = buildSetLogQueuePayload(
              currentItem.id, // Actual DB itemId (TEXT)
              currentItem.exercise_id,
              setIndex,
              weight,
              reps,
              rpe,
            );
            await enqueueOperation(queuePayload);
            setIsOffline(true);
            setOfflineQueueSize((prev) => prev + 1);
            
            // Remove from in-flight set after queuing
            loggingInFlight.current.delete(logKey);
          } catch {
            // If even queueing fails, show alert but runtime state is still updated
            Alert.alert('Warning', 'Set logged locally but sync failed. Will retry when online.');
            // Still remove from in-flight set (operation complete, just failed to persist)
            loggingInFlight.current.delete(logKey);
          }
        }

        // STEP 3: Update session item's performed sets (for UI consistency)
        const existingLogs = setLogsQ.data || [];
        const newLogs = [
          ...existingLogs,
          {
            id: setLogPayload.id,
            session_item_id: currentItem.id,
            set_index: setIndex,
            weight,
            reps,
            rpe: rpe || null,
            completed_at: logResult.setEntry.completedAt,
            created_at: new Date().toISOString(),
          },
        ];

        try {
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
        } catch (updateError: any) {
          // Non-critical - runtime state is source of truth
          logger.warn('Failed to update session item performed sets', updateError);
        }

        // STEP 4: Start rest timer with autoregulated rest time if in timed mode
        const plannedSets = currentItem.planned?.sets || [];
        if ((session as any).mode === 'timed' && plannedSets.length > 0) {
          const plannedSet = plannedSets.find((s: any) => s.setIndex === setIndex);
          if (plannedSet?.restSeconds && plannedSet.restSeconds > 0) {
            // Get autoregulated rest time based on RPE (if RPE provided)
            const restAdjustment = rpe !== undefined ? getAdjustedRestTime(plannedSet.restSeconds, rpe) : { restSeconds: plannedSet.restSeconds, adjustment: 'normal' as const, message: 'Standard rest period' };
            setRestTimer({ seconds: restAdjustment.restSeconds, exerciseId: currentItem.id });
            
            // Show rest adjustment message if rest was adjusted
            if (restAdjustment.adjustment !== 'normal' && rpe !== undefined) {
              setLastAutoregulationMessage(restAdjustment.message);
            }
          }
        }

        qc.invalidateQueries({ queryKey: ['training:set_logs', currentItem.id] });
        qc.invalidateQueries({ queryKey: ['training:session', sessionId] });
        
        // Clear autoregulation message if next set doesn't exist or doesn't have autoregulation
        const nextSetIndex = setIndex + 1;
        const hasNextSet = plannedSets.some((s: any) => s.setIndex === nextSetIndex);
        if (!hasNextSet || !logResult.trace) {
          // No next set or no autoregulation - clear message after a short delay
          setTimeout(() => {
            setLastAutoregulationMessage(null);
          }, 5000);
        }
      } catch (error: any) {
        logger.warn('Failed to log set', error);
        Alert.alert('Error', error?.message || 'Failed to log set');
        // Remove from in-flight set on error
        loggingInFlight.current.delete(logKey);
      }
      // Note: logKey removal is handled in try/catch blocks above (immediate removal on success/error)
    },
    [currentItem, runtimeState, setLogsQ.data, qc, sessionId, isEnded, session],
  );

  const handleSkip = useCallback(async () => {
    if (!currentItem || !runtimeState) return;
    if (isEnded) {
      Alert.alert('Session completed', 'This session is already completed.');
      return;
    }

    try {
      // STEP 1: Update runtime state with skipExercise (imported from runtime module)
      const skipResult = skipExercise(runtimeState, currentItem.exercise_id, 'user_skipped');
      setRuntimeState(skipResult.state);
      if (skipResult.trace) {
        setAdaptationTraces((prev) => [...prev, skipResult.trace!]);
      }
      
      // STEP 2: Persist skip to Supabase
      const networkAvailable = await isNetworkAvailable();
      
      if (networkAvailable) {
        await updateTrainingSessionItem(currentItem.id, { skipped: true });
        await logTrainingEvent('training_exercise_skipped', {
          exerciseId: currentItem.exercise_id,
          sessionId: sessionId,
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

      // STEP 3: Advance to next exercise
      const exerciseOrder = items.sort((a, b) => a.order_index - b.order_index).map(item => item.exercise_id);
      const advancedState = advanceExercise(skipResult.state, exerciseOrder);
      setRuntimeState(advancedState);
      
      // Clear autoregulation message when moving to next exercise
      setLastAutoregulationMessage(null);
      
      // Update UI exercise index to match runtime state
      if (advancedState.currentExerciseIndex < items.length) {
        setCurrentExerciseIndex(advancedState.currentExerciseIndex);
      }
    } catch (error: any) {
      logger.warn('Failed to skip exercise', error);
      Alert.alert('Error', error?.message || 'Failed to skip exercise');
    }
  }, [currentItem, runtimeState, currentExerciseIndex, items, qc, sessionId, isEnded]);

  const handleComplete = useCallback(async () => {
    if (isEnded) {
      onComplete();
      return;
    }
    if (isFinalizing || !runtimeState) return;

    setIsFinalizing(true);

    try {
      // STEP 1: Get exercise names for runtime.endSession
      const exerciseNames: Record<string, string> = {};
      for (const item of items) {
        const ex = getExerciseById(item.exercise_id);
        if (ex) {
          exerciseNames[item.exercise_id] = ex.name;
        }
      }
      
      // STEP 2: Get previous bests for PR detection
      const previousBests: Record<string, {
        bestWeight?: number;
        bestReps?: number;
        bestE1RM?: number;
        bestVolume?: number;
      }> = {};
      
      for (const item of items) {
        if (!item.performed?.sets || item.performed.sets.length === 0) continue;
        try {
          const best = await getExerciseBestPerformance(item.exercise_id);
          if (best) {
            previousBests[item.exercise_id] = {
              bestWeight: best.bestWeight,
              bestReps: best.bestReps,
              bestE1RM: best.bestE1RM,
              bestVolume: best.bestVolume,
            };
          }
        } catch (error) {
          logger.warn('Failed to get previous best for exercise', item.exercise_id, error);
        }
      }
      
      // STEP 3: Compute session result using runtime.endSession
      const sessionResult = endSession(runtimeState, exerciseNames, previousBests);
      
      // Update runtime state to completed
      setRuntimeState((prev) => prev ? { ...prev, status: 'completed' } : null);
      
      // STEP 4: Persist session end and summary
      const networkAvailable = await isNetworkAvailable();
      
      const summary = {
        durationMinutes: sessionResult.durationMinutes,
        exercisesCompleted: sessionResult.exercisesCompleted,
        exercisesSkipped: sessionResult.exercisesSkipped,
        totalVolume: sessionResult.totalVolume,
        totalSets: sessionResult.totalSets,
        prs: sessionResult.prs,
        levelUpEvents: sessionResult.levelUpEvents.length > 0 ? sessionResult.levelUpEvents : undefined,
        adaptationTrace: sessionResult.adaptationTrace, // Include full trace for debugging/analytics
      };
      
      if (networkAvailable) {
        await updateTrainingSession(sessionId, {
          endedAt: sessionResult.endedAt,
          summary,
        });
        await logTrainingEvent('training_session_completed', {
          sessionId: sessionId, // TEXT sessionId in payload JSONB - safe
          durationMinutes: sessionResult.durationMinutes,
          prsCount: sessionResult.prs.length,
          exercisesCompleted: sessionResult.exercisesCompleted,
          exercisesSkipped: sessionResult.exercisesSkipped,
          totalVolume: sessionResult.totalVolume,
        }).catch(() => {});
        
        // Log adaptation trace events if any
        for (const trace of sessionResult.adaptationTrace) {
          await logTrainingEvent('training_adaptation_applied', {
            exerciseId: trace.exerciseId,
            setIndex: trace.setIndex,
            ruleId: trace.ruleId,
            reason: trace.reason,
            confidence: trace.confidence,
            sessionId: sessionId, // TEXT in JSONB payload
          }).catch(() => {});
        }
      } else {
        await enqueueOperation({
          type: 'finalizeSession',
          sessionId,
          payload: {
            endedAt: sessionResult.endedAt,
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
  }, [isEnded, isFinalizing, runtimeState, sessionId, items, qc, onComplete]);

  const handleNext = useCallback(() => {
    if (currentExerciseIndex < items.length - 1) {
      // Clear autoregulation message when advancing to next exercise
      setLastAutoregulationMessage(null);
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
        {/* Guided session controller card */}
        {!isEnded && exercise && (
          <Card
            mode="elevated"
            style={{
              marginBottom: appTheme.spacing.md,
              backgroundColor: theme.colors.primaryContainer,
              borderRadius: appTheme.borderRadius.xl,
            }}
          >
            <Card.Content>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: appTheme.spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onPrimaryContainer }} numberOfLines={1}>
                    {exercise.name}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer, marginTop: appTheme.spacing.xs }}>
                    Set {performedSets.length + 1} of {plannedSets.length}
                  </Text>
                </View>
              </View>
              {restTimer && restTimer.exerciseId === currentItem?.id && (
                <View style={{ marginBottom: appTheme.spacing.sm, gap: appTheme.spacing.xs }}>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onPrimaryContainer, textAlign: 'center', fontWeight: '600' }}>
                    Rest: {restTimerRemaining !== null ? `${Math.floor(restTimerRemaining / 60)}:${(restTimerRemaining % 60).toString().padStart(2, '0')}` : 'Active'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: appTheme.spacing.xs, justifyContent: 'center' }}>
                    <Button
                      mode="outlined"
                      compact
                      icon={restTimerPaused ? 'play' : 'pause'}
                      onPress={() => setRestTimerPaused((prev) => !prev)}
                      textColor={theme.colors.onPrimaryContainer}
                    >
                      {restTimerPaused ? 'Resume' : 'Pause'}
                    </Button>
                    <Button
                      mode="outlined"
                      compact
                      onPress={() => setRestTimer(null)}
                      textColor={theme.colors.onPrimaryContainer}
                    >
                      Skip
                    </Button>
                  </View>
                </View>
              )}
              {totalSetsLogged > 0 && (
                <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer, textAlign: 'center', marginBottom: appTheme.spacing.xs }}>
                  {totalSetsLogged} set{totalSetsLogged !== 1 ? 's' : ''} logged
                </Text>
              )}
              <View style={{ flexDirection: 'row', gap: appTheme.spacing.sm }}>
                <Button
                  mode="outlined"
                  compact
                  onPress={() => {
                    Alert.alert(
                      'End session?',
                      `This will save everything you've logged so far (${totalSetsLogged} set${totalSetsLogged !== 1 ? 's' : ''}).`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'End & Save', style: 'default', onPress: () => void handleComplete() },
                      ]
                    );
                  }}
                  textColor={theme.colors.onPrimaryContainer}
                  style={{ flex: 1 }}
                >
                  End Session
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}

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
            onComplete={() => {
              setRestTimer(null);
              setRestTimerPaused(false);
              setRestTimerRemaining(null);
            }}
            onExtend={(seconds: number) =>
              setRestTimer((prev) => (prev ? { ...prev, seconds: prev.seconds + seconds } : null))
            }
            onSkip={() => {
              setRestTimer(null);
              setRestTimerPaused(false);
              setRestTimerRemaining(null);
            }}
            isPausedExternal={restTimerPaused}
            onTogglePauseExternal={() => setRestTimerPaused((prev) => !prev)}
            remainingSecondsExternal={restTimerRemaining ?? undefined}
            onRemainingChange={(remaining: number) => setRestTimerRemaining(remaining)}
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

        {/* Autoregulation message callout */}
        {lastAutoregulationMessage && !isEnded && (
          <Card
            mode="outlined"
            style={{
              marginBottom: appTheme.spacing.md,
              backgroundColor: theme.colors.primaryContainer,
              borderLeftWidth: 4,
              borderLeftColor: theme.colors.primary,
              borderRadius: appTheme.borderRadius.xl,
            }}
          >
            <Card.Content>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: appTheme.spacing.sm }}>
                <Text variant="titleSmall" style={{ color: theme.colors.onPrimaryContainer, fontWeight: '600' }}>
                  Autoregulation:
                </Text>
                <Text variant="bodyMedium" style={{ flex: 1, color: theme.colors.onPrimaryContainer }}>
                  {lastAutoregulationMessage}
                </Text>
                <IconButton
                  icon="close"
                  onPress={() => setLastAutoregulationMessage(null)}
                  iconColor={theme.colors.onPrimaryContainer}
                  size={20}
                />
              </View>
            </Card.Content>
          </Card>
        )}

        {exercise && (
          <ExerciseCard
            exercise={exercise}
            plannedSets={plannedSets}
            performedSets={performedSets}
            decisionTrace={currentItem.planned?.decisionTrace as any}
            onSetComplete={handleSetComplete}
            onSkip={handleSkip}
            onNext={handleNext}
            isComplete={isComplete}
            lastPerformance={
              lastPerformanceQ.data
                ? { weight: lastPerformanceQ.data.weight, reps: lastPerformanceQ.data.reps, date: lastPerformanceQ.data.session_date }
                : undefined
            }
            adjustedSetParams={runtimeState && !isEnded ? (() => {
              // Get adjusted params for NEXT PENDING SET ONLY (first non-performed set)
              // Find the first pending set index
              const firstPendingSet = plannedSets.find((planned) => {
                const performed = performedSets.find((s) => s.setIndex === planned.setIndex);
                return !performed;
              });
              
              if (!firstPendingSet) return undefined; // No pending sets
              
              try {
                const exerciseState = runtimeState.exerciseStates[currentItem.exercise_id];
                if (!exerciseState) return undefined;
                
                // Only get adjusted params for the FIRST pending set
                const adjusted = getAdjustedSetParams(runtimeState, currentItem.exercise_id, firstPendingSet.setIndex);
                if (adjusted.hasAdjustment) {
                  return {
                    setIndex: firstPendingSet.setIndex, // Next pending set index
                    targetReps: adjusted.targetReps,
                    suggestedWeight: adjusted.suggestedWeight,
                    message: adjusted.adjustmentMessage,
                  };
                }
              } catch {
                // Set not found or not ready yet - use planned params
              }
              return undefined;
            })() : undefined}
            onSetDoneShowOverlay={(setIndex) => {
              setFocusOverlaySetIndex(setIndex);
              setShowSetFocusOverlay(true);
            }}
          />
        )}

        {/* Set Focus Overlay */}
        {exercise && focusOverlaySetIndex !== null && (() => {
          const focusedSet = plannedSets.find((s) => s.setIndex === focusOverlaySetIndex);
          const focusedPerformed = performedSets.find((s) => s.setIndex === focusOverlaySetIndex);
          if (!focusedSet) return null;
          
          return (
            <SetFocusOverlay
              visible={showSetFocusOverlay}
              exerciseName={exercise.name}
              setIndex={focusedSet.setIndex}
              totalSets={plannedSets.length}
              plannedWeight={focusedSet.suggestedWeight}
              plannedReps={focusedSet.targetReps}
              isCompleted={!!focusedPerformed}
              isResting={!!(restTimer && restTimer.exerciseId === currentItem?.id)}
              restRemaining={restTimerRemaining ?? undefined}
              restPaused={restTimerPaused}
              onDone={() => {
                // Use planned values (adjustments are internal to ExerciseCard)
                handleSetComplete(focusedSet.setIndex, focusedSet.suggestedWeight, focusedSet.targetReps);
                setShowSetFocusOverlay(false);
              }}
              onAdjust={() => {
                setShowSetFocusOverlay(false);
                // Open adjust dialog - this would need to be exposed from ExerciseCard
                // For now, just close overlay and let user use the Adjust button in ExerciseCard
              }}
              onStartRest={() => {
                // Rest should auto-start after set completion, but we can trigger it here if needed
                setShowSetFocusOverlay(false);
              }}
              onToggleRestPause={() => setRestTimerPaused((prev) => !prev)}
              onClose={() => {
                setShowSetFocusOverlay(false);
                setFocusOverlaySetIndex(null);
              }}
            />
          );
        })()}

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
