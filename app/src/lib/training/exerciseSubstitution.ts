import type { TrainingProfileRow, TrainingSessionItemRow } from '@/lib/api';
import { resolveExperienceLevel } from './experienceLevel';
import { getExerciseById, listExercises, suggestPrescription, getRepRange, getExerciseTargetReps, getRestSeconds, getExercisePrescriptionOverride } from './engine';
import { getExerciseLoadingProfile } from './exerciseLoadingProfile';
import { evaluateExerciseEligibility } from './exerciseEligibility';
import { isQualifiedPerformance } from './performanceHistory';
import { requiresLoadConfirmation } from './loadConfirmation';
import type { Exercise, ExercisePriority, MovementIntent, TrainingProfileSnapshot, UserState } from './types';

/** Current saved restrictions/preferences, not an older programme/session snapshot. */
export function replacementPlanningProfile(row: TrainingProfileRow | null | undefined): TrainingProfileSnapshot | null {
  if (!row) return null;
  return { goals: row.goals as TrainingProfileSnapshot['goals'], equipment_access: row.equipment_access,
    constraints: row.constraints, baselines: row.baselines, baselineUpdatedAt: row.constraints?.baselineUpdatedAt, experienceLevel: resolveExperienceLevel(row.constraints?.experienceLevel) };
}

function slotIntents(item: TrainingSessionItemRow): MovementIntent[] {
  const intents = item.planned.decisionTrace?.intent ?? item.planned.intents;
  return Array.isArray(intents) ? intents : [];
}

export function replacementEligibility(item: TrainingSessionItemRow, replacement: Exercise, profile: TrainingProfileSnapshot | null): string[] {
  if ((item.performed?.sets?.length ?? 0) > 0 || item.skipped) return ['Work already recorded for this exercise.'];
  if (!profile) return ['This session has no saved planning context for a replacement.'];
  const matching = slotIntents(item).filter(intent => replacement.intents.includes(intent));
  const reasons = [...evaluateExerciseEligibility(replacement, profile, { selectionIntent: matching[0] }).reasons];
  if (!getExerciseById(item.exercise_id) || !getExerciseById(replacement.id) || replacement.id === item.exercise_id) reasons.push('Choose a different known exercise.');
  if (!matching.length) reasons.push('The replacement does not match this slot.');
  if (item.planned.sets.length < (getExercisePrescriptionOverride(replacement).minSets ?? 1)) reasons.push('This slot cannot support the replacement prescription.');
  return reasons;
}

/** Ranked suggestions first, then eligible catalogue alternatives; filter before limiting. */
export function replacementCandidates(item: TrainingSessionItemRow, profile: TrainingProfileSnapshot | null): Exercise[] {
  const trace = item.planned.decisionTrace;
  const ranked = trace?.rankedAlternativeIds ?? trace?.rankedAlternatives ?? [];
  const all = listExercises();
  const ordered = [...ranked.flatMap((id: string) => all.filter(ex => ex.id === id || ex.name === id)), ...all];
  return ordered.filter((ex, index) => ordered.findIndex(other => other.id === ex.id) === index && !replacementEligibility(item, ex, profile).length);
}

/** The replaced item's planned rep range (its exposure), when it carries a valid one. */
function plannedRepRange(item: TrainingSessionItemRow): [number, number] | undefined {
  const range = item.planned.decisionTrace?.prescriptionContext?.repRange;
  return Array.isArray(range) && range.length === 2 && range.every(value => Number.isInteger(value) && value > 0) && range[0] <= range[1]
    ? [range[0], range[1]] : undefined;
}

/**
 * Explicit session-only replacement. Frozen set count stays. A rep-based
 * replacement inherits the replaced item's planned reps, rep range and rest
 * (its exposure, e.g. a strength day's 5 reps / 180 s); the load is resolved
 * for the new exercise at those reps. When the replacement has its own earned
 * progression decision inside that range, its reps/load pair is kept together
 * (2026-11-03 combined decision). Other prescription units keep the existing
 * engine targets.
 */
export function prescribeReplacement(item: TrainingSessionItemRow, replacement: Exercise, profile: TrainingProfileSnapshot): TrainingSessionItemRow['planned'] {
  const reasons = replacementEligibility(item, replacement, profile);
  if (reasons.length) throw new Error(reasons.join(' '));
  const priority = (['primary', 'accessory', 'isolation'].includes(item.planned.priority) ? item.planned.priority : 'accessory') as ExercisePriority;
  const loading = getExerciseLoadingProfile(replacement);
  const baseline = profile.baselines?.[replacement.id];
  const supportedLoad = loading.prescriptionType === 'reps' && !['assisted_bodyweight', 'unspecified'].includes(loading.loadDisplayMode);
  const hasBaseline = supportedLoad && Number.isFinite(baseline) && (baseline ?? 0) > 0;
  const userState: UserState = {
    experienceLevel: profile.experienceLevel ?? 'beginner',
    baselineUpdatedAt: profile.baselineUpdatedAt,
    // No cross-exercise anchor inference during substitution.
    estimated1RM: hasBaseline ? { [replacement.id]: baseline! } : {},
    performanceHistory: profile.performanceHistory,
    lastSessionPerformance: profile.lastSessionPerformance,
    recentSessionPerformance: profile.recentSessionPerformance,
  };
  const inherit = loading.prescriptionType === 'reps' && item.planned.sets.length > 0 &&
    item.planned.sets.every(set => Number.isInteger(set.targetReps) && set.targetReps > 0 && Number.isFinite(set.restSeconds) && set.restSeconds >= 0);
  const repRange = (inherit ? plannedRepRange(item) : undefined) ?? getRepRange(priority, profile.goals);
  const plannedReps = inherit ? item.planned.sets[0].targetReps : getExerciseTargetReps(replacement, repRange);
  const resolved = suggestPrescription({ exercise: replacement, plannedReps, priority, repRange,
    goalWeights: profile.goals, userState, plannedSetCount: item.planned.sets.length });
  const hasHistory = !!resolved.progression || isQualifiedPerformance(replacement, profile.lastSessionPerformance?.[replacement.id]) &&
    profile.performanceHistory?.status === 'available' && profile.performanceHistory.requestedExerciseIds.includes(replacement.id);
  // N-0074 (A3): zero on an added-bodyweight lift is bodyweight; its own evidence may prescribe added kg.
  const bodyweight = loading.loadDisplayMode === 'bodyweight' || loading.loadDisplayMode === 'added_bodyweight' && !hasBaseline && !hasHistory;
  const calibrated = bodyweight || hasBaseline || hasHistory;
  const targetReps = resolved.reps;
  const suggestedWeight = bodyweight || !calibrated ? 0 : resolved.weight;
  const progressionReason = !calibrated
    ? 'Uncalibrated replacement: enter a load for this exercise. No weight was transferred from the previous exercise.'
    : resolved.reason ?? (bodyweight ? 'Bodyweight replacement; no external load transferred.' : 'Uses this replacement exercise own baseline.');
  return {
    sets: item.planned.sets.map(set => ({ setIndex: set.setIndex, targetReps: inherit && !resolved.progression ? set.targetReps : targetReps, suggestedWeight,
      ...(requiresLoadConfirmation(replacement, suggestedWeight, userState) ? { loadRequiresConfirmation: true } : {}),
      restSeconds: inherit ? set.restSeconds : getRestSeconds(priority, profile.goals) })),
    priority, intents: [...replacement.intents],
    decisionTrace: {
      intent: slotIntents(item), selectionReason: 'User selected an eligible replacement for this session.',
      replacementScope: 'session', replacedFrom: item.exercise_id, originalPlanned: item.planned,
      replacedAt: new Date().toISOString(), loadCalibration: calibrated ? bodyweight ? 'bodyweight' : 'exercise_specific' : 'uncalibrated',
      loadDisplayMode: loading.loadDisplayMode, prescriptionType: loading.prescriptionType, progressionReason,
      performanceHistory: profile.performanceHistory,
      ...(resolved.prescriptionContext ? { prescriptionContext: resolved.prescriptionContext } : {}),
    },
  };
}
