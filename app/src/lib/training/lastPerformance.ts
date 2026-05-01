// Last Performance Lookup - Find previous performance for exercises
import { supabase } from '../supabase';
import { logger } from '../logger';
import type { LastPerformance, MovementIntent } from './types';

/**
 * Get last performance for a specific exercise
 * @param userId - User ID
 * @param exerciseId - Exercise ID
 * @param beforeDate - Only consider sessions before this date (ISO string)
 * @param sessionTypeLabel - Optional: filter by session type for apples-to-apples comparison
 * @returns Last performance or null
 */
export async function getLastPerformanceForExercise(
  userId: string,
  exerciseId: string,
  beforeDate?: string,
  sessionTypeLabel?: string,
): Promise<LastPerformance | null> {
  try {
    // Query: find most recent session with this exercise
    let query = supabase
      .from('training_set_logs')
      .select(`
        set_index,
        weight,
        reps,
        rpe,
        completed_at,
        training_session_items!inner(
          exercise_id,
          training_sessions!inner(
            id,
            user_id,
            started_at,
            session_type_label
          )
        )
      `)
      .eq('training_session_items.exercise_id', exerciseId)
      .eq('training_session_items.training_sessions.user_id', userId)
      .order('completed_at', { ascending: false });

    if (beforeDate) {
      query = query.lt('training_session_items.training_sessions.started_at', beforeDate);
    }

    if (sessionTypeLabel) {
      query = query.eq('training_session_items.training_sessions.session_type_label', sessionTypeLabel);
    }

    const { data, error } = await query.limit(1).maybeSingle();

    if (error || !data) {
      return null;
    }

    // Extract nested data
    const item = (data as any).training_session_items;
    const session = item?.training_sessions;

    if (!session) return null;

    return {
      exercise_id: exerciseId,
      session_date: session.started_at,
      weight: data.weight || 0,
      reps: data.reps,
      rpe: data.rpe || undefined,
      session_type_label: session.session_type_label || undefined,
    };
  } catch (error: any) {
    logger.warn('Failed to get last performance for exercise', { exerciseId, error: error.message });
    return null;
  }
}

/**
 * Get last performance for an intent family within a session type
 * Used when exercise has changed but intent remains the same
 * @param userId - User ID
 * @param intent - Movement intent
 * @param sessionTypeLabel - Session type label (e.g., "Upper Strength")
 * @param beforeDate - Only consider sessions before this date
 * @returns Last performance or null
 */
export async function getLastPerformanceForIntent(
  userId: string,
  intent: MovementIntent,
  sessionTypeLabel: string,
  beforeDate?: string,
): Promise<LastPerformance | null> {
  try {
    // This is more complex: need to find exercises with this intent in previous sessions of same type
    // For now, return null and rely on exercise-specific lookup
    // TODO: Implement intent-based fallback if needed
    return null;
  } catch (error: any) {
    logger.warn('Failed to get last performance for intent', { intent, error: error.message });
    return null;
  }
}

/**
 * Get best performance for an exercise (all-time PR)
 * @param userId - User ID
 * @param exerciseId - Exercise ID
 * @returns Best performance or null
 */
export async function getBestPerformanceForExercise(
  userId: string,
  exerciseId: string,
): Promise<LastPerformance | null> {
  try {
    const { data, error } = await supabase
      .from('training_set_logs')
      .select(`
        set_index,
        weight,
        reps,
        rpe,
        completed_at,
        training_session_items!inner(
          exercise_id,
          training_sessions!inner(
            id,
            user_id,
            started_at,
            session_type_label
          )
        )
      `)
      .eq('training_session_items.exercise_id', exerciseId)
      .eq('training_session_items.training_sessions.user_id', userId)
      .order('weight', { ascending: false })
      .order('reps', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const item = (data as any).training_session_items;
    const session = item?.training_sessions;

    if (!session) return null;

    return {
      exercise_id: exerciseId,
      session_date: session.started_at,
      weight: data.weight || 0,
      reps: data.reps,
      rpe: data.rpe || undefined,
      session_type_label: session.session_type_label || undefined,
    };
  } catch (error: any) {
    logger.warn('Failed to get best performance for exercise', { exerciseId, error: error.message });
    return null;
  }
}

/**
 * Get last N performances for an exercise (for progression tracking)
 * @param userId - User ID
 * @param exerciseId - Exercise ID
 * @param limit - Number of performances to return
 * @returns Array of performances
 */
export async function getExerciseHistory(
  userId: string,
  exerciseId: string,
  limit = 10,
): Promise<LastPerformance[]> {
  try {
    const { data, error } = await supabase
      .from('training_set_logs')
      .select(`
        set_index,
        weight,
        reps,
        rpe,
        completed_at,
        training_session_items!inner(
          exercise_id,
          training_sessions!inner(
            id,
            user_id,
            started_at,
            session_type_label
          )
        )
      `)
      .eq('training_session_items.exercise_id', exerciseId)
      .eq('training_session_items.training_sessions.user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return data.map((row: any) => {
      const item = row.training_session_items;
      const session = item?.training_sessions;

      return {
        exercise_id: exerciseId,
        session_date: session?.started_at || row.completed_at,
        weight: row.weight || 0,
        reps: row.reps,
        rpe: row.rpe || undefined,
        session_type_label: session?.session_type_label || undefined,
      };
    });
  } catch (error: any) {
    logger.warn('Failed to get exercise history', { exerciseId, error: error.message });
    return [];
  }
}
