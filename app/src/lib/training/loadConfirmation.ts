import { getExerciseLoadingProfile } from './exerciseLoadingProfile';
import { isQualifiedPerformance } from './performanceHistory';
import type { Exercise, SessionPlan, UserState } from './types';

/** Zero is the existing storage sentinel, never an inferred external kilogram. */
export function requiresLoadConfirmation(exercise: Exercise, weight: number, state?: UserState): boolean {
  if (weight !== 0) return false;
  const loading = getExerciseLoadingProfile(exercise);
  const mode = loading.loadDisplayMode;
  if (mode === 'bodyweight' && loading.prescriptionType !== 'carry_distance') return false;
  // A qualified own added-load history can explicitly prescribe zero added kg.
  if (mode === 'added_bodyweight' && state &&
      (!state.performanceHistory || state.performanceHistory.status === 'available' && state.performanceHistory.requestedExerciseIds.includes(exercise.id)) &&
      isQualifiedPerformance(exercise, state.lastSessionPerformance?.[exercise.id])) return false;
  return true;
}

/** Only new builder output is annotated. Persisted/frozen items never pass here. */
export function annotateLoadConfirmation(plan: SessionPlan): SessionPlan {
  const issues = [...(plan.programmeValidation?.issues ?? [])];
  for (const item of plan.exercises) {
    let unknown = false;
    for (const set of item.plannedSets) {
      if (requiresLoadConfirmation(item.exercise, set.suggestedWeight, plan.userState)) {
        set.loadRequiresConfirmation = true;
        unknown = true;
      }
    }
    if (unknown) {
      const history = plan.userState.lastSessionPerformance?.[item.exerciseId];
      const context = plan.userState.performanceHistory?.status === 'unavailable'
        ? 'Performance history unavailable. '
        : history && !isQualifiedPerformance(item.exercise, history)
          ? 'Recent work is not qualified for progression. ' : '';
      item.decisionTrace.progressionReason = `${context}Choose a load and confirm it for this exercise; no load has been prescribed in its unit.`;
    }
    if (unknown && !issues.some(issue => issue.code === 'load_requires_confirmation' && issue.exerciseId === item.exerciseId)) {
      issues.push({ code: 'load_requires_confirmation', severity: 'warning', exerciseId: item.exerciseId,
        message: 'Choose a load and confirm it for this exercise; no load has been prescribed in its unit.' });
    }
  }
  if (issues.length) plan.programmeValidation = {
    policyVersion: plan.programmeValidation?.policyVersion ?? 'legacy-load-confirmation',
    status: plan.programmeValidation?.status ?? 'legacy', issues,
  };
  return plan;
}
