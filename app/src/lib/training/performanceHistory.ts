import catalog from './catalog/exercises.v1.json';
import { getExerciseLoadingProfile } from './exerciseLoadingProfile';
import type { Exercise, ExercisePerformance } from './types';

export const PERFORMANCE_HISTORY_SOURCE = 'training_session_items.performed.sets' as const;

export type PerformanceHistoryItem = {
  id: string;
  session_id: string;
  exercise_id: string;
  skipped?: boolean;
  planned?: { sets?: Array<{ setIndex: number }> } | null;
  performed?: { sets?: ExercisePerformance['sets'] } | null;
  training_sessions: { started_at: string | null; ended_at: string | null } | null;
};

function validSets(sets: ExercisePerformance['sets']): boolean {
  return sets.length > 0 && new Set(sets.map(set => set?.setIndex)).size === sets.length &&
    sets.every(set => !!set && Number.isInteger(set.setIndex) && set.setIndex > 0 &&
      Number.isFinite(set.weight) && set.weight >= 0 && Number.isInteger(set.reps) && set.reps > 0 &&
      typeof set.completedAt === 'string' && Number.isFinite(Date.parse(set.completedAt)) &&
      (set.rpe == null || (Number.isFinite(set.rpe) && set.rpe >= 1 && set.rpe <= 10)));
}

/** Read projection only. Rejected recent work stays in the timeline as a streak barrier. */
export function completedPerformanceHistory(items: PerformanceHistoryItem[], limit: number): Record<string, ExercisePerformance[]> {
  const result: Record<string, ExercisePerformance[]> = {};
  if (!Number.isInteger(limit) || limit < 1) throw new Error('Invalid history session limit');
  for (const item of items) {
    const exercise = (catalog as Exercise[]).find(entry => entry.id === item.exercise_id);
    const session = item.training_sessions;
    // No start means a preview, not performed training. Unknown IDs cannot be compared.
    if (!exercise || !session?.started_at) continue;
    const profile = getExerciseLoadingProfile(exercise);
    const planned = Array.isArray(item.planned?.sets) ? item.planned.sets.filter(Boolean) : [];
    const sets = Array.isArray(item.performed?.sets) ? item.performed.sets.filter(Boolean) : [];
    const indices = planned.map(set => set.setIndex);
    const reasons: string[] = [];
    if (planned.length !== (item.planned?.sets?.length ?? 0) || sets.length !== (item.performed?.sets?.length ?? 0)) reasons.push('malformed_set_entries');
    const ended = Number.isFinite(Date.parse(session.ended_at ?? '')) &&
      Number.isFinite(Date.parse(session.started_at)) && Date.parse(session.ended_at!) >= Date.parse(session.started_at);
    if (!ended) reasons.push('session_unfinished');
    if (item.skipped !== false) reasons.push('exercise_skipped_or_unknown');
    if (!item.id || !item.session_id) reasons.push('missing_identity');
    if (!indices.length || new Set(indices).size !== indices.length ||
        indices.some(index => !Number.isInteger(index) || index < 1)) reasons.push('missing_or_invalid_plan');
    if (!validSets(sets) || sets.length !== indices.length ||
        !indices.every(index => sets.some(set => set.setIndex === index))) reasons.push('incomplete_or_invalid_sets');
    if (sets.some(set => Date.parse(set.completedAt) < Date.parse(session.started_at!) ||
        (ended && Date.parse(set.completedAt) > Date.parse(session.ended_at!)))) reasons.push('completion_outside_session');
    const incomplete = reasons.length > 0;
    if (profile.prescriptionType !== 'reps') reasons.push('unsupported_prescription_unit');
    if (profile.loadDisplayMode === 'assisted_bodyweight' || profile.loadDisplayMode === 'unspecified') reasons.push('unsupported_load_mode');
    if (profile.loadDisplayMode === 'bodyweight' && sets.some(set => set.weight > 0)) reasons.push('external_load_on_bodyweight');
    if (sets.length && !sets.every(set => set.weight === sets[0].weight)) reasons.push('mixed_loads');
    if (sets.some(set => set.weight === 0) && !['bodyweight', 'added_bodyweight'].includes(profile.loadDisplayMode)) reasons.push('uncalibrated_external_zero');
    (result[item.exercise_id] ??= []).push({
      exerciseId: item.exercise_id, date: session.started_at, sets: [...sets].sort((a, b) => a.setIndex - b.setIndex),
      plannedSetCount: indices.length, sessionComplete: ended,
      evidence: {
        source: PERFORMANCE_HISTORY_SOURCE, status: incomplete ? 'incomplete' : reasons.length ? 'unsupported' : 'qualified', reasons,
        sessionId: item.session_id, itemId: item.id, loadUnit: 'kg',
        loadDisplayMode: profile.loadDisplayMode, prescriptionType: profile.prescriptionType, plannedSetIndices: indices,
      },
    });
  }
  for (const id of Object.keys(result)) {
    result[id].sort((a, b) => Date.parse(b.date) - Date.parse(a.date) || a.evidence!.itemId.localeCompare(b.evidence!.itemId));
    // Multiple items of the same exercise in one session cannot count as two sessions.
    const sessions = new Set<string>();
    result[id] = result[id].filter(entry => {
      if (sessions.has(entry.evidence!.sessionId)) {
        const first = result[id].find(other => other.evidence!.sessionId === entry.evidence!.sessionId)!;
        first.evidence!.status = 'unsupported';
        first.evidence!.reasons.push('duplicate_exercise_in_session');
        return false;
      }
      sessions.add(entry.evidence!.sessionId);
      return true;
    }).slice(0, limit);
  }
  return result;
}

/** The engine accepts qualified canonical evidence, never legacy numeric maps alone. */
export function isQualifiedPerformance(exercise: Exercise, performance?: ExercisePerformance): performance is ExercisePerformance {
  const evidence = performance?.evidence;
  const profile = getExerciseLoadingProfile(exercise);
  return !!performance && !!evidence && evidence.source === PERFORMANCE_HISTORY_SOURCE &&
    evidence.status === 'qualified' && Array.isArray(evidence.reasons) && evidence.reasons.length === 0 &&
    performance.exerciseId === exercise.id && performance.sessionComplete === true &&
    !!evidence.sessionId && !!evidence.itemId && Number.isFinite(Date.parse(performance.date)) &&
    evidence.loadUnit === 'kg' && evidence.loadDisplayMode === profile.loadDisplayMode &&
    evidence.prescriptionType === 'reps' && profile.prescriptionType === 'reps' &&
    profile.loadDisplayMode !== 'assisted_bodyweight' && profile.loadDisplayMode !== 'unspecified' &&
    Array.isArray(performance.sets) && Array.isArray(evidence.plannedSetIndices) && validSets(performance.sets) && performance.plannedSetCount === performance.sets.length &&
    evidence.plannedSetIndices.length === performance.sets.length &&
    new Set(evidence.plannedSetIndices).size === performance.sets.length &&
    performance.sets.every(set => evidence.plannedSetIndices.includes(set.setIndex) && set.weight === performance.sets[0].weight &&
      (profile.loadDisplayMode !== 'bodyweight' || set.weight === 0) &&
      (set.weight > 0 || ['bodyweight', 'added_bodyweight'].includes(profile.loadDisplayMode)));
}
