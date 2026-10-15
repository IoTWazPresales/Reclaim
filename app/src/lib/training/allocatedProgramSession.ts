import { isQualifiedPerformance } from './performanceHistory';
import catalogData from './catalog/exercises.v1.json';
import { SESSION_MINUTE_CAP, SESSION_SET_CAP } from './balancedHypertrophy';
import { evaluateExerciseEligibility } from './exerciseEligibility';
import { getWeightStep } from './progression';
import { warmupSetsForWorkingWeight } from './warmupSets';
import type { AllocatedProgrammeDay, ProgrammeIssue } from './weeklyProgrammeTypes';
import { WEEKLY_POLICY_VERSION } from './weeklyProgrammeTypes';
import { isBalancedDayStrategyId } from './weeklyProgramme';
import type { Exercise, ExercisePriority, PlannedExercise, SessionPlan, SessionTemplate, TrainingProfileSnapshot } from './types';

/** Materialize an already allocated day. It cannot add, trim or reallocate dose. */
export function buildAllocatedProgramSession(input: {
  allocation: AllocatedProgrammeDay;
  label: string;
  template: SessionTemplate;
  weekIndex?: number;
  profile: TrainingProfileSnapshot;
  loading: (exercise: Exercise, reps: number, priority: ExercisePriority) => { weight: number; reason?: string };
}): SessionPlan {
  const catalog = catalogData as Exercise[];
  const { profile, allocation } = input;
  const issues: ProgrammeIssue[] = [...allocation.issues];
  const exercises: PlannedExercise[] = [];
  if (allocation.policyVersion !== WEEKLY_POLICY_VERSION) issues.push({ code: 'unsupported_policy_version', severity: 'error', message: 'This programme policy version is not supported by this build.' });
  if (!isBalancedDayStrategyId(allocation.strategyId)) issues.push({ code: 'unsupported_day_strategy', severity: 'error', message: 'No approved daily placement exists for this strategy identifier.' });
  for (const slot of allocation.slots) {
    if (!Number.isInteger(slot.setCount) || slot.setCount <= 0 || slot.setCount > SESSION_SET_CAP || !Number.isFinite(slot.reps) || slot.reps <= 0 || !Number.isFinite(slot.restSeconds) || slot.restSeconds < 0) {
      issues.push({ code: 'invalid_prescription', severity: 'error', message: 'The saved allocation contains invalid prescription values.', slotId: slot.slotId });
      continue;
    }
    const exercise = catalog.find((entry) => entry.id === slot.exerciseId);
    if (!exercise) {
      issues.push({ code: 'unavailable_slot', severity: 'error', message: `No saved exercise for requirement ${slot.requirementId}.`, slotId: slot.slotId });
      continue;
    }
    const eligibility = evaluateExerciseEligibility(exercise, profile, { allowEnteredRackException: true, selectionIntent: slot.intent });
    if (!eligibility.eligible || !exercise.intents.includes(slot.intent) || !slot.candidateExerciseIds.includes(exercise.id)) {
      issues.push({ code: 'allocation_profile_changed', severity: 'error', message: `${exercise.name} is no longer eligible; rebuild the programme before starting.`, slotId: slot.slotId });
      continue;
    }
    const ownBaseline = (profile.baselines?.[exercise.id] ?? 0) > 0;
    const ownHistory = isQualifiedPerformance(exercise, profile.lastSessionPerformance?.[exercise.id]) &&
      (!profile.performanceHistory || (profile.performanceHistory.status === 'available' && profile.performanceHistory.requestedExerciseIds.includes(exercise.id)));
    const unknownLoad = slot.loadPolicy === 'none' && !ownBaseline && !ownHistory;
    const loading = unknownLoad ? { weight: 0, reason: 'Choose a load for this exercise; no load is inferred from another implement.' } : input.loading(exercise, slot.reps, slot.priority);
    const warmup = exercises.length === 0 && slot.compound ? warmupSetsForWorkingWeight(loading.weight, getWeightStep(exercise)) : [];
    const alternatives = slot.candidateExerciseIds.filter((id) => id !== exercise.id && (() => {
      const candidate = catalog.find((entry) => entry.id === id);
      return candidate && candidate.intents.includes(slot.intent) && evaluateExerciseEligibility(candidate, profile, { allowEnteredRackException: true, selectionIntent: slot.intent }).eligible;
    })());
    exercises.push({
      exerciseId: exercise.id, exercise, orderIndex: exercises.length, priority: slot.priority, intents: exercise.intents,
      plannedSets: Array.from({ length: slot.setCount }, (_, index) => ({ setIndex: index + 1, targetReps: slot.reps, suggestedWeight: loading.weight, restSeconds: slot.restSeconds })),
      ...(warmup.length ? { warmupSets: warmup } : {}),
      decisionTrace: {
        intent: [slot.intent], goalBias: profile.goals,
        constraintsApplied: [`policy:${allocation.policyVersion}`, `weekly_requirement:${slot.requirementId}`, ...eligibility.warnings],
        selectionReason: `${slot.setCount} sets allocated from the week's ${slot.owner} ${slot.dose} requirement.`,
        rankedAlternatives: alternatives, rankedAlternativeIds: alternatives,
        progressionReason: loading.reason, confidence: 0.8, selectionPhase: 'required',
      },
    });
  }
  if (allocation.slots.reduce((total, slot) => total + slot.setCount, 0) > SESSION_SET_CAP ||
      10 + allocation.slots.reduce((total, slot) => total + (slot.compound ? 8 : 3), 0) > SESSION_MINUTE_CAP) {
    issues.push({ code: 'allocation_budget_exceeded', severity: 'error', message: 'Saved weekly requirements exceed the accepted session budget; no sets were silently trimmed.' });
  }
  return {
    id: `session_${Date.now()}`, template: input.template, goals: profile.goals,
    constraints: { availableEquipment: profile.equipment_access, injuries: profile.constraints?.injuries ?? [], forbiddenMovements: (profile.constraints?.forbiddenMovements ?? []) as SessionPlan['constraints']['forbiddenMovements'], preferences: profile.constraints?.preferences, timeBudgetMinutes: SESSION_MINUTE_CAP },
    userState: { experienceLevel: profile.experienceLevel ?? 'beginner', estimated1RM: profile.baselines, performanceHistory: profile.performanceHistory, lastSessionPerformance: profile.lastSessionPerformance, recentSessionPerformance: profile.recentSessionPerformance },
    exercises,
    // Existing estimate retained; not a proof of actual completion time.
    estimatedDurationMinutes: 10 + allocation.slots.filter((slot) => slot.exerciseId).reduce((sum, slot) => sum + (slot.compound ? 8 : 3), 0),
    createdAt: new Date().toISOString(), sessionLabel: input.label, weekIndex: input.weekIndex,
    programmeValidation: { policyVersion: allocation.policyVersion, status: issues.some((issue) => issue.severity === 'error') ? 'infeasible' : 'feasible', issues },
  };
}
