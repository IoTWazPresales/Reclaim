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
  getLastExercisePerformance,
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
import { supabase } from '@/lib/supabase';

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

  // Local state for optimistic exercise replacements (overrides prop until refetch)
  const [exerciseIdOverrides, setExerciseIdOverrides] = useState<Record<string, string>>({});
  
  // FIX: Optimistic local state for session ended (prevents timer hang on finish)
  // When user presses "Finish session", we immediately set this to stop the timer
  // and update UI, BEFORE the DB write completes and prop refetches.
  // This ensures the timer stops instantly and "Finishing..." clears on success OR failure.
  const [optimisticEndedAt, setOptimisticEndedAt] = useState<string | null>(null);
  
  // FIX: Optimistic local state for performed sets (prevents UI lag on set completion)
  // When user presses "Done" to complete a set, we immediately update this map
  // so the checkmark/next set highlight appears instantly, BEFORE the DB write
  // completes and prop refetches. This ensures the set completion is visible immediately.
  const [optimisticPerformedSets, setOptimisticPerformedSets] = useState<Record<string, Array<{
    setIndex: number;
    weight: number;
    reps: number;
    rpe?: number;
    completedAt: string;
  }>>>({});

  const { session, items } = sessionData;

  const isEnded = !!(optimisticEndedAt || (session as any).ended_at);
  const startedAtMs = (session as any).started_at ? new Date((session as any).started_at).getTime() : null;
  const endedAtMs = optimisticEndedAt ? new Date(optimisticEndedAt).getTime() : (session as any).ended_at ? new Date((session as any).ended_at).getTime() : null;

  // Apply optimistic exercise ID overrides
  const itemsWithOverrides = useMemo(() => {
    return items.map((item) => ({
      ...item,
      exercise_id: exerciseIdOverrides[item.id] || item.exercise_id,
    }));
  }, [items, exerciseIdOverrides]);

  const currentItem = itemsWithOverrides[currentExerciseIndex];

  const completedCount = useMemo(
    () => itemsWithOverrides.filter((item) => item.performed && !item.skipped).length,
    [itemsWithOverrides],
  );
  const skippedCount = useMemo(() => itemsWithOverrides.filter((item) => item.skipped).length, [itemsWithOverrides]);
  
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

  // Load last session's sets for current exercise (for "Prev" display)
  const lastSessionSetsQ = useQuery({
    queryKey: ['training:lastSessionSets', currentItem?.exercise_id, (session as any).started_at],
    queryFn: async () => {
      if (!currentItem?.exercise_id) return null;
      return getLastExercisePerformance(currentItem.exercise_id);
    },
    enabled: !!currentItem?.exercise_id,
    staleTime: Infinity,
  });

  // Timer: counts from started_at -> NOW if active, or started_at -> ended_at if ended.
  // Timer should start when session is active, even if started_at is not yet set in DB
  useEffect(() => {
    // If session is not ended and started_at exists, start timer
    // If session is not ended and started_at doesn't exist, use current time as start
    const effectiveStartMs = startedAtMs || (!isEnded ? Date.now() : null);
    if (!effectiveStartMs) return;

    const tick = () => {
      const end = endedAtMs ?? Date.now();
      const diffSec = Math.max(0, Math.floor((end - effectiveStartMs) / 1000));
      setElapsedSeconds(diffSec);
    };

    tick();

    if (endedAtMs) return;

    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAtMs, endedAtMs, isEnded]);

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
    if (!itemsWithOverrides || itemsWithOverrides.length === 0) return [];
    
    return itemsWithOverrides
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
  }, [itemsWithOverrides]);
  
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
    
    // Collect from performed sets in itemsWithOverrides
    for (const item of itemsWithOverrides) {
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
  }, [itemsWithOverrides]);
  
  // Clear optimistic performed sets when actual data is refetched and matches/exceeds optimistic state
  useEffect(() => {
    for (const item of items) {
      const optimistic = optimisticPerformedSets[item.id];
      const actual = item.performed?.sets || [];
      if (optimistic && actual.length >= optimistic.length) {
        // Actual data has caught up - clear optimistic state for this item
        setOptimisticPerformedSets((prev) => {
          const next = { ...prev };
          delete next[item.id];
          return next;
        });
      }
    }
  }, [items, optimisticPerformedSets]);
  
  // Clear optimistic ended state when actual ended_at is set in prop
  useEffect(() => {
    if (optimisticEndedAt && (session as any).ended_at) {
      logger.debug('[SESSION_END_FLOW] Actual ended_at received, clearing optimistic state');
      setOptimisticEndedAt(null);
    }
  }, [(session as any).ended_at, optimisticEndedAt]);
  
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
      const firstPendingIndex = itemsWithOverrides.findIndex(
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

      logger.debug('[SET_DONE_FLOW] Done pressed', { exerciseId: currentItem.exercise_id, setIndex, weight, reps, rpe });

      // Idempotency guard: prevent double-logging same set
      const logKey = `${currentItem.id}_${setIndex}`;
      if (loggingInFlight.current.has(logKey)) {
        logger.warn('[SET_DONE_FLOW] Duplicate prevented', { exerciseId: currentItem.exercise_id, setIndex });
        return;
      }
      loggingInFlight.current.add(logKey);

      try {
        logger.debug('[SET_DONE_FLOW] Handler called', { itemId: currentItem.id, setIndex });
        
        // STEP 1: Update runtime state with logSet
        const logResult = logSet(runtimeState, currentItem.exercise_id, {
          setIndex,
          weight,
          reps,
          rpe,
        });
        
        // Update runtime state immediately (optimistic)
        setRuntimeState(logResult.state);
        logger.debug('[SET_DONE_FLOW] Runtime state updated', { setIndex });
        
        // OPTIMISTIC UI: Update performed sets immediately so UI reflects change instantly
        const completedAt = logResult.setEntry.completedAt;
        setOptimisticPerformedSets((prev) => {
          const existing = prev[currentItem.id] || [];
          const updated = [
            ...existing.filter(s => s.setIndex !== setIndex),
            { setIndex, weight, reps, rpe, completedAt }
          ].sort((a, b) => a.setIndex - b.setIndex);
          logger.debug('[SET_DONE_FLOW] Optimistic performed sets updated', { itemId: currentItem.id, count: updated.length });
          return { ...prev, [currentItem.id]: updated };
        });
        
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
            logger.debug('[SET_DONE_FLOW] DB write success', { setIndex, setLogId: setLogPayload.id });
            
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
          logger.warn('[SET_DONE_FLOW] Persist failed, queuing offline', persistError);
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
            logger.debug('[SET_DONE_FLOW] Queued offline', { setIndex });
            
            // Remove from in-flight set after queuing
            loggingInFlight.current.delete(logKey);
          } catch (queueError) {
            // If even queueing fails, revert optimistic state and show alert
            logger.error('[SET_DONE_FLOW] Queue failed, reverting optimistic state', queueError);
            setOptimisticPerformedSets((prev) => {
              const existing = prev[currentItem.id] || [];
              const reverted = existing.filter(s => s.setIndex !== setIndex);
              return { ...prev, [currentItem.id]: reverted };
            });
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
        logger.debug('[SET_DONE_FLOW] Queries invalidated', { setIndex });
        
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
        logger.error('[SET_DONE_FLOW] Failed to log set', error);
        // Revert optimistic state on error
        setOptimisticPerformedSets((prev) => {
          const existing = prev[currentItem.id] || [];
          const reverted = existing.filter(s => s.setIndex !== setIndex);
          return { ...prev, [currentItem.id]: reverted };
        });
        Alert.alert('Error', error?.message || 'Failed to log set');
        // Remove from in-flight set on error
        loggingInFlight.current.delete(logKey);
      }
      // Note: logKey removal is handled in try/catch blocks above (immediate removal on success/error)
    },
    [currentItem, runtimeState, setLogsQ.data, qc, sessionId, isEnded, session],
  );

  // Handle set update (editing without marking done)
  const handleSetUpdate = useCallback(
    async (setIndex: number, weight: number, reps: number, rpe?: number) => {
      if (!currentItem || !runtimeState) return;
      if (isEnded) {
        Alert.alert('Session completed', 'This session is already completed.');
        return;
      }

      const logKey = `${currentItem.id}_${setIndex}_update`;
      if (loggingInFlight.current.has(logKey)) {
        logger.warn('Set update already in flight, ignoring duplicate', { exerciseId: currentItem.exercise_id, setIndex });
        return;
      }
      loggingInFlight.current.add(logKey);

      try {
        // Update the set log directly (idempotent by id)
        const existingLogs = setLogsQ.data || [];
        const existingLog = existingLogs.find((log) => log.set_index === setIndex);
        
        if (!existingLog) {
          // Set not logged yet - treat as new log
          await handleSetComplete(setIndex, weight, reps, rpe);
          loggingInFlight.current.delete(logKey);
          return;
        }

        // Update existing log
        const networkAvailable = await isNetworkAvailable();
        const setLogId = existingLog.id;

        try {
          if (networkAvailable) {
            // Update set log directly via Supabase
            const { error } = await supabase
              .from('training_set_logs')
              .update({
                weight,
                reps,
                rpe: rpe !== undefined ? rpe : null,
              })
              .eq('id', setLogId);

            if (error) throw error;

            // Update performed sets in session item
            const updatedLogs = existingLogs.map((log) =>
              log.set_index === setIndex
                ? { ...log, weight, reps, rpe: rpe || null }
                : log
            );

            await updateTrainingSessionItem(currentItem.id, {
              performed: {
                sets: updatedLogs.map((log) => ({
                  setIndex: log.set_index,
                  weight: log.weight || 0,
                  reps: log.reps,
                  rpe: log.rpe || undefined,
                  completedAt: log.completed_at,
                })),
              },
            });
          } else {
            // Offline: Update performed sets in session item (can be queued)
            const updatedLogs = existingLogs.map((log) =>
              log.set_index === setIndex
                ? { ...log, weight, reps, rpe: rpe || null }
                : log
            );
            await enqueueOperation({
              type: 'upsertItem',
              sessionId: sessionId,
              itemId: currentItem.id,
              payload: {
                performed: {
                  sets: updatedLogs.map((log) => ({
                    setIndex: log.set_index,
                    weight: log.weight || 0,
                    reps: log.reps,
                    rpe: log.rpe || undefined,
                    completedAt: log.completed_at,
                  })),
                },
              },
              timestamp: new Date().toISOString(),
            });
            setOfflineQueueSize((prev) => prev + 1);
          }

          qc.invalidateQueries({ queryKey: ['training:set_logs', currentItem.id] });
          qc.invalidateQueries({ queryKey: ['training:session', sessionId] });
        } catch (persistError: any) {
          logger.warn('Failed to update set log', persistError);
          Alert.alert('Warning', 'Set update failed. Will retry when online.');
          if (!networkAvailable) {
            // Queue for retry when offline
            const updatedLogs = existingLogs.map((log) =>
              log.set_index === setIndex
                ? { ...log, weight, reps, rpe: rpe || null }
                : log
            );
            await enqueueOperation({
              type: 'upsertItem',
              sessionId: sessionId,
              itemId: currentItem.id,
              payload: {
                performed: {
                  sets: updatedLogs.map((log) => ({
                    setIndex: log.set_index,
                    weight: log.weight || 0,
                    reps: log.reps,
                    rpe: log.rpe || undefined,
                    completedAt: log.completed_at,
                  })),
                },
              },
              timestamp: new Date().toISOString(),
            });
            setOfflineQueueSize((prev) => prev + 1);
          }
        }

        loggingInFlight.current.delete(logKey);
      } catch (error: any) {
        logger.warn('Failed to update set', error);
        Alert.alert('Error', error?.message || 'Failed to update set');
        loggingInFlight.current.delete(logKey);
      }
    },
    [currentItem, runtimeState, setLogsQ.data, qc, sessionId, isEnded, handleSetComplete],
  );

  // Handle exercise replacement (session or program scope)
  const handleReplaceExercise = useCallback(
    async ({ newExerciseId, scope }: { newExerciseId: string; scope: 'session' | 'program' }) => {
      if (!currentItem) return;

      logger.debug('[REPLACE_EX] Starting', { 
        oldId: currentItem.exercise_id, 
        newId: newExerciseId, 
        scope,
        itemId: currentItem.id 
      });

      try {
        // Optimistic UI update: update local state immediately
        setExerciseIdOverrides((prev) => ({
          ...prev,
          [currentItem.id]: newExerciseId,
        }));

        // Also update query cache for consistency
        const sessionQueryKey = ['training:session', sessionId];
        const currentSessionData = qc.getQueryData<typeof sessionData>(sessionQueryKey);
        
        if (currentSessionData) {
          const updatedItems = currentSessionData.items.map((item) =>
            item.id === currentItem.id ? { ...item, exercise_id: newExerciseId } : item
          );
          qc.setQueryData(sessionQueryKey, {
            ...currentSessionData,
            items: updatedItems,
          });
        }

        if (scope === 'session') {
          // SESSION scope: Update session item's exercise_id directly
          const { error } = await supabase
            .from('training_session_items')
            .update({ exercise_id: newExerciseId })
            .eq('id', currentItem.id);

          if (error) throw error;

          logger.debug('[REPLACE_EX] Session done', { itemId: currentItem.id });

          // Refresh session data to ensure consistency
          await qc.invalidateQueries({ queryKey: ['training:session', sessionId] });
          await qc.invalidateQueries({ queryKey: ['training:lastSessionSets'] });
        } else {
          // PROGRAM scope: Update program day (if it exists)
          const programDayId = (session as any).program_day_id;
          if (!programDayId) {
            Alert.alert('No program day', 'This session is not linked to a program day. Use "This session only" instead.');
            logger.warn('[REPLACE_EX] No program_day_id', { sessionId });
            // Revert optimistic update
            setExerciseIdOverrides((prev) => {
              const next = { ...prev };
              delete next[currentItem.id];
              return next;
            });
            if (currentSessionData) {
              qc.setQueryData(sessionQueryKey, currentSessionData);
            }
            return;
          }

          // Note: Program days store intents/template, not specific exercises
          // Exercises are generated dynamically from intents.
          // For now, update the session item (session scope) and log that program update is not fully supported
          // TODO: Implement program day exercise override if needed

          const { error } = await supabase
            .from('training_session_items')
            .update({ exercise_id: newExerciseId })
            .eq('id', currentItem.id);

          if (error) throw error;

          logger.debug('[REPLACE_EX] Program done', { 
            itemId: currentItem.id,
            programDayId 
          });

          await qc.invalidateQueries({ queryKey: ['training:session', sessionId] });
          await qc.invalidateQueries({ queryKey: ['training:programDays'] });
        }
      } catch (error: any) {
        // Revert optimistic update on error
        setExerciseIdOverrides((prev) => {
          const next = { ...prev };
          delete next[currentItem.id];
          return next;
        });
        const sessionQueryKey = ['training:session', sessionId];
        const currentSessionData = qc.getQueryData<typeof sessionData>(sessionQueryKey);
        if (currentSessionData) {
          qc.setQueryData(sessionQueryKey, currentSessionData);
        }
        
        logger.warn('[REPLACE_EX] Failed', { error: error?.message });
        Alert.alert('Error', error?.message || 'Failed to replace exercise');
      }
    },
    [currentItem, session, sessionId, qc, sessionData],
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
      const exerciseOrder = itemsWithOverrides.sort((a, b) => a.order_index - b.order_index).map(item => item.exercise_id);
      const advancedState = advanceExercise(skipResult.state, exerciseOrder);
      setRuntimeState(advancedState);
      
      // Clear autoregulation message when moving to next exercise
      setLastAutoregulationMessage(null);
      
      // Update UI exercise index to match runtime state
      if (advancedState.currentExerciseIndex < itemsWithOverrides.length) {
        setCurrentExerciseIndex(advancedState.currentExerciseIndex);
      }
    } catch (error: any) {
      logger.warn('Failed to skip exercise', error);
      Alert.alert('Error', error?.message || 'Failed to skip exercise');
    }
  }, [currentItem, runtimeState, currentExerciseIndex, itemsWithOverrides, qc, sessionId, isEnded]);

  const handleComplete = useCallback(async () => {
    if (isEnded) {
      onComplete();
      return;
    }
    if (isFinalizing || !runtimeState) return;

    logger.debug('[SESSION_END_FLOW] Finish pressed', { sessionId, totalSetsLogged });
    setIsFinalizing(true);

    try {
      logger.debug('[SESSION_END_FLOW] Handler called', { sessionId });
      
      // STEP 1: Get exercise names for runtime.endSession
      const exerciseNames: Record<string, string> = {};
      for (const item of itemsWithOverrides) {
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
      
      for (const item of itemsWithOverrides) {
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
      logger.debug('[SESSION_END_FLOW] Session result computed', { endedAt: sessionResult.endedAt });
      
      // FIX: CRITICAL OPTIMISTIC STATE UPDATE
      // Set ended timestamp immediately so timer stops and UI updates BEFORE DB write completes.
      // This prevents the timer from continuing to run and prevents "Finishing..." from hanging.
      // The timer logic uses `isEnded` which is derived from `optimisticEndedAt || session.ended_at`,
      // so setting this immediately stops the timer even if the DB write or refetch is slow.
      setOptimisticEndedAt(sessionResult.endedAt);
      logger.debug('[SESSION_END_FLOW] Optimistic ended state set', { endedAt: sessionResult.endedAt });
      
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
        logger.debug('[SESSION_END_FLOW] DB write success', { sessionId, endedAt: sessionResult.endedAt });
        
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
        logger.debug('[SESSION_END_FLOW] Queued offline', { sessionId });
      }

      await qc.invalidateQueries({ queryKey: ['training:session', sessionId] });
      await qc.invalidateQueries({ queryKey: ['training:sessions'] });
      logger.debug('[SESSION_END_FLOW] Queries invalidated', { sessionId });

      setShowMoodPrompt(true);
    } catch (error: any) {
      logger.error('[SESSION_END_FLOW] Failed to complete session', error);
      // Revert optimistic ended state on error
      setOptimisticEndedAt(null);
      Alert.alert('Error', error?.message || 'Failed to complete session');
    } finally {
      // FIX: CRITICAL - Always clear loading state to prevent infinite "Finishing..."
      // This ensures that even if DB write fails or throws, the button returns to
      // "Finish session" state instead of staying stuck on "Finishing...".
      // Combined with optimistic ended state above, this guarantees UI always clears
      // loading on success OR failure (no infinite "Finishing...").
      setIsFinalizing(false);
      logger.debug('[SESSION_END_FLOW] Finalizing cleared', { sessionId });
    }
  }, [isEnded, isFinalizing, runtimeState, sessionId, itemsWithOverrides, qc, onComplete, totalSetsLogged]);

  const handleNext = useCallback(() => {
    if (currentExerciseIndex < itemsWithOverrides.length - 1) {
      // Clear autoregulation message when advancing to next exercise
      setLastAutoregulationMessage(null);
      setCurrentExerciseIndex(currentExerciseIndex + 1);
    } else {
      Alert.alert('Complete session?', 'Finish this training session? You can review it in History.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Complete', style: 'default', onPress: () => void handleComplete() },
      ]);
    }
  }, [currentExerciseIndex, itemsWithOverrides.length, handleComplete]);

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
  // FIX: Merge optimistic performed sets with prop state for instant UI updates
  // This ensures that when user presses "Done" -> confirm, the set is marked
  // as performed IMMEDIATELY (checkmark appears, next set highlights), even
  // before the DB write completes and the session data refetches.
  const performedSets = useMemo(() => {
    const optimistic = optimisticPerformedSets[currentItem.id] || [];
    const fromProp = currentItem.performed?.sets || [];
    // Use optimistic if available, otherwise use prop
    if (optimistic.length > 0) {
      return optimistic;
    }
    return fromProp;
  }, [currentItem.id, currentItem.performed?.sets, optimisticPerformedSets]);

  const isComplete = plannedSets.length > 0 ? performedSets.length >= plannedSets.length : performedSets.length > 0;

  const sessionAny = session as any;
  const sessionTypeLabel: string | undefined = (sessionAny.session_type_label ?? undefined) as string | undefined;
  const weekIndex: number | undefined = (sessionAny.week_index ?? undefined) as number | undefined;

  const sessionLabel = sessionTypeLabel ? `Week ${weekIndex ?? '?'} · ${sessionTypeLabel}` : 'Training Session';

  const plannedExercises = useMemo(() => {
    return itemsWithOverrides
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
  }, [itemsWithOverrides]);

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
              Exercise {currentExerciseIndex + 1} of {itemsWithOverrides.length}
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
                  Exercise {currentExerciseIndex + 1} of {itemsWithOverrides.length}
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

        {exercise && (() => {
          // Calculate current set index (first non-performed set)
          const firstPendingSet = plannedSets.find((planned) => {
            const performed = performedSets.find((s) => s.setIndex === planned.setIndex);
            return !performed;
          });
          const currentSetIdx = firstPendingSet?.setIndex ?? null;
          
          // Calculate previous sets from last session (not current session)
          const lastSessionSets = lastSessionSetsQ.data?.sets || [];
          const previousSetsData = lastSessionSets.length > 0 ? (() => {
            // Map planned sets to last session sets with fallback
            const mapped = plannedSets.map((planned) => {
              // Try to find set with matching index first
              const matchingSet = lastSessionSets.find((s) => s.setIndex === planned.setIndex);
              if (matchingSet) {
                return {
                  setIndex: planned.setIndex,
                  weight: matchingSet.weight || 0,
                  reps: matchingSet.reps,
                };
              }
              // Fallback: use last set from last session
              const lastSet = lastSessionSets[lastSessionSets.length - 1];
              if (lastSet) {
                return {
                  setIndex: planned.setIndex,
                  weight: lastSet.weight || 0,
                  reps: lastSet.reps,
                };
              }
              return null;
            }).filter((s): s is { setIndex: number; weight: number; reps: number } => s !== null);

            return mapped.length > 0 ? mapped : undefined;
          })() : undefined;
          
          return (
            <ExerciseCard
              exercise={exercise}
              plannedSets={plannedSets}
              performedSets={performedSets}
              decisionTrace={currentItem.planned?.decisionTrace as any}
              onSetComplete={handleSetComplete}
              onSetUpdate={handleSetUpdate}
              onSkip={handleSkip}
              onNext={handleNext}
              onReplaceExercise={handleReplaceExercise}
              isComplete={isComplete}
              lastPerformance={
                lastPerformanceQ.data
                  ? { weight: lastPerformanceQ.data.weight, reps: lastPerformanceQ.data.reps, date: lastPerformanceQ.data.session_date }
                  : undefined
              }
              adjustedSetParams={runtimeState && !isEnded ? (() => {
                // Get adjusted params for NEXT PENDING SET ONLY (first non-performed set)
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
              currentSetIndex={currentSetIdx}
              previousSets={previousSetsData && previousSetsData.length > 0 ? previousSetsData : undefined}
              onSetDoneShowOverlay={(setIndex) => {
                setFocusOverlaySetIndex(setIndex);
                setShowSetFocusOverlay(true);
              }}
            />
          );
        })()}

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
            {itemsWithOverrides.map((item, idx) => {
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
