import catalogData from './catalog/exercises.v1.json';
import { SESSION_SET_CAP, SESSION_MINUTE_CAP } from './balancedHypertrophy';
import { evaluateExerciseEligibility } from './exerciseEligibility';
import { getExerciseLoadingProfile } from './exerciseLoadingProfile';
import { isQualifiedPerformance, PERFORMANCE_HISTORY_SOURCE } from './performanceHistory';
import { getPrimarySlotRoleTier, PrimarySlotRoleTier } from './exerciseSessionRole';
import { epleyWorkingWeightCeiling, getWeightStep } from './progression';
import { isNonLegTrainingTemplate } from './trainingMode';
import { WEEKLY_POLICY_VERSION } from './weeklyProgrammeTypes';
import type { Exercise, ExercisePerformance, PlannedExercise, PlannedSet, SessionPlan, TrainingProfileSnapshot } from './types';
import type { AllocatedSlot, CompiledProgrammeWeek, ProgrammeIssue, WeeklyProgrammeInputDay, WeeklyRequirement } from './weeklyProgrammeTypes';

const catalogue = new Map((catalogData as Exercise[]).map((exercise) => [exercise.id, exercise]));
const routine = 'docs/training/ROUTINE_AUDIT.md: balanced week 2026-10-09';
const running = 'docs/training/RUNNING_DESIGN.md: RD-004/RD-006';

/** A well-formed rejected timeline entry is a barrier, never a load anchor.
 * Invalid rows/identities cannot be excused by labelling them incomplete. */
function hasValidHistoryStructure(exercise: Exercise, history?: ExercisePerformance): history is ExercisePerformance {
  const evidence = history?.evidence;
  const loading = getExerciseLoadingProfile(exercise);
  if (!evidence || evidence.source !== PERFORMANCE_HISTORY_SOURCE || history.exerciseId !== exercise.id ||
      typeof evidence.sessionId !== 'string' || !evidence.sessionId.trim() ||
      typeof evidence.itemId !== 'string' || !evidence.itemId.trim() ||
      typeof history.date !== 'string' || !Number.isFinite(Date.parse(history.date)) ||
      typeof history.sessionComplete !== 'boolean' || evidence.loadUnit !== 'kg' ||
      evidence.loadDisplayMode !== loading.loadDisplayMode || evidence.prescriptionType !== loading.prescriptionType ||
      !positiveInteger(history.plannedSetCount ?? 0) || !Array.isArray(evidence.plannedSetIndices) ||
      evidence.plannedSetIndices.length !== history.plannedSetCount ||
      !Array.from(evidence.plannedSetIndices).every(positiveInteger) || new Set(evidence.plannedSetIndices).size !== history.plannedSetCount ||
      !Array.isArray(history.sets) || history.sets.length > history.plannedSetCount! ||
      new Set(history.sets.map(row => row?.setIndex)).size !== history.sets.length ||
      !Array.from(history.sets).every(row => !!row && evidence.plannedSetIndices.includes(row.setIndex) &&
        nonnegative(row.weight) && positiveInteger(row.reps) && typeof row.completedAt === 'string' &&
        Number.isFinite(Date.parse(row.completedAt)) && Date.parse(row.completedAt) >= Date.parse(history.date) &&
        (row.rpe == null || (Number.isFinite(row.rpe) && row.rpe >= 1 && row.rpe <= 10))) ||
      !Array.isArray(evidence.reasons) || !evidence.reasons.every(reason => typeof reason === 'string') ||
      new Set(evidence.reasons).size !== evidence.reasons.length) return false;
  return true;
}

function isUnqualifiedHistory(exercise: Exercise, history: ExercisePerformance): boolean {
  const evidence = history.evidence!;
  const loading = getExerciseLoadingProfile(exercise);
  if (!evidence.reasons.length) return false;
  // Reconstruct the reasons we can verify from the projection. Skipped status
  // has no separate projected field; its explicit canonical reason is retained.
  const reasons: string[] = [];
  if (!history.sessionComplete) reasons.push('session_unfinished');
  if (evidence.reasons.includes('exercise_skipped_or_unknown')) reasons.push('exercise_skipped_or_unknown');
  if (history.sets.length < history.plannedSetCount!) reasons.push('incomplete_or_invalid_sets');
  const incomplete = reasons.length > 0;
  if (loading.prescriptionType !== 'reps') reasons.push('unsupported_prescription_unit');
  if (['assisted_bodyweight', 'unspecified'].includes(loading.loadDisplayMode)) reasons.push('unsupported_load_mode');
  if (loading.loadDisplayMode === 'bodyweight' && history.sets.some(row => row.weight > 0)) reasons.push('external_load_on_bodyweight');
  if (history.sets.some(row => row.weight !== history.sets[0].weight)) reasons.push('mixed_loads');
  if (!['bodyweight', 'added_bodyweight'].includes(loading.loadDisplayMode) && history.sets.some(row => row.weight === 0)) reasons.push('uncalibrated_external_zero');
  const duplicate = evidence.reasons.includes('duplicate_exercise_in_session');
  if (duplicate) reasons.push('duplicate_exercise_in_session');
  return evidence.status === (duplicate ? 'unsupported' : incomplete ? 'incomplete' : 'unsupported') &&
    reasons.length === evidence.reasons.length && reasons.every(reason => evidence.reasons.includes(reason));
}

// Compare the contract fields, independent of object-property insertion order.
// Never search recent history for an older success when the first entry differs.
function historySignature(history: ExercisePerformance): unknown[] {
  const evidence = history.evidence!;
  return [history.exerciseId, history.date, history.plannedSetCount, history.sessionComplete,
    history.sets.map(row => [row.setIndex, row.weight, row.reps, row.rpe ?? null, row.completedAt]),
    evidence.source, evidence.status, [...evidence.reasons].sort(), evidence.sessionId, evidence.itemId,
    evidence.loadUnit, evidence.loadDisplayMode, evidence.prescriptionType, [...evidence.plannedSetIndices].sort((a, b) => a - b)];
}

/** Trusted requirements captured before generation. Never reconstruct this input
 * from the final output being checked. No planner/compiler/builder is invoked. */
export type ProgrammeWeekDeclaration = {
  weekIndex: number;
  policyVersion: string;
  strategyId: string;
  policyStatus: 'accepted' | 'legacy_pending_review';
  requirements: readonly WeeklyRequirement[];
  /** Approved prescription fields, independent of selected exercises/output. */
  exposurePolicies: Readonly<Record<string, Pick<AllocatedSlot, 'intent' | 'reps' | 'restSeconds' | 'priority' | 'loadPolicy'> & { approvedExerciseIds: readonly string[]; selectionKind: 'primary_role' | 'isolation' }>>;
  runRequirement?: CompiledProgrammeWeek['runRequirement'];
  calendar: readonly WeeklyProgrammeInputDay[];
  provenance: string;
};
export type GeneratedProgrammeSession = { dayKey: string; kind: 'strength' | 'run'; plan: SessionPlan };
export type GeneratedProgrammeWeek = { weekIndex: number; allocation: CompiledProgrammeWeek; sessions: readonly GeneratedProgrammeSession[] };
export type ProgrammeValidationIssue = ProgrammeIssue & { provenance: string; weekIndex?: number; requirementId?: string; exerciseId?: string };
export type ProgrammeValidationResult = {
  status: 'valid' | 'invalid' | 'unresolved';
  issues: ProgrammeValidationIssue[];
  coverage: Array<{ weekIndex: number; requirementId: string; expectedSets: number; actualSets: number; expectedExposures: number; actualExposures: number }>;
};
const positiveInteger = (value: number) => Number.isFinite(value) && Number.isInteger(value) && value > 0;
const nonnegative = (value: number) => Number.isFinite(value) && value >= 0;
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
const requirementSignature = (row: WeeklyRequirement | undefined) => row && [row.id, row.owner, row.dose, row.targetSets, row.targetExposures, row.positions, row.exposureSlotIds, row.provenance];
const runSignature = (row: CompiledProgrammeWeek['runRequirement']) => row && [row.id, row.targetExposures, [...row.dayKeys].sort(), row.provenance];
const exerciseSignature = (row: Exercise) => [row.id, row.intents, row.equipment, row.equipmentAll, row.equipmentAny, row.musclesPrimary, row.contraindications, row.difficulty];
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === 'string');
/** Missing arrays/records from persisted JSON are invalid, never an empty valid plan. */
function completeShape(declaration: ProgrammeWeekDeclaration, generated: GeneratedProgrammeWeek, profile: TrainingProfileSnapshot): boolean {
  const week = generated?.allocation;
  return !!declaration && !!week && !!profile && strings(profile.equipment_access) &&
    typeof declaration.strategyId === 'string' && typeof declaration.policyVersion === 'string' && typeof week.strategyId === 'string' && typeof week.policyVersion === 'string' &&
    (profile.constraints?.injuries === undefined || strings(profile.constraints.injuries)) &&
    (profile.constraints?.forbiddenMovements === undefined || strings(profile.constraints.forbiddenMovements)) &&
    (profile.constraints?.preferences?.hatesExercises === undefined || strings(profile.constraints.preferences.hatesExercises)) &&
    Array.isArray(declaration.calendar) && declaration.calendar.every((day: WeeklyProgrammeInputDay) => !!day && Array.isArray(day.intents)) &&
    !!declaration.exposurePolicies && typeof declaration.exposurePolicies === 'object' && Object.values(declaration.exposurePolicies).every((policy) => !!policy && typeof policy === 'object') &&
    Array.isArray(declaration.requirements) && declaration.requirements.every((row: WeeklyRequirement) => !!row && strings(row.exposureSlotIds) && Array.isArray(row.positions) && row.positions.every((position: number[]) => Array.isArray(position) && position.length === 2)) &&
    Array.isArray(week.requirements) && week.requirements.every((row) => !!row && Array.isArray(row.positions) && Array.isArray(row.exposureSlotIds)) &&
    !!week.days && typeof week.days === 'object' && Array.isArray(week.issues) && week.issues.every((issue) => !!issue && typeof issue.code === 'string' && typeof issue.message === 'string' && ['error', 'warning'].includes(issue.severity)) &&
    Object.values(week.days).every((day) => !!day && Array.isArray(day.issues) && day.issues.every((issue: ProgrammeIssue) => !!issue && typeof issue.code === 'string' && typeof issue.message === 'string' && ['error', 'warning'].includes(issue.severity)) && Array.isArray(day.slots) && day.slots.every((slot: AllocatedSlot) => !!slot && strings(slot.candidateExerciseIds))) &&
    (!declaration.runRequirement || strings(declaration.runRequirement.dayKeys)) && (!week.runRequirement || strings(week.runRequirement.dayKeys)) &&
    Array.isArray(generated.sessions) && generated.sessions.every((session: GeneratedProgrammeSession) => !!session?.plan && !!session.plan.constraints && !!session.plan.userState &&
      (session.plan.programmeValidation === undefined || !!session.plan.programmeValidation && ['feasible', 'infeasible', 'legacy'].includes(session.plan.programmeValidation.status) && Array.isArray(session.plan.programmeValidation.issues) && session.plan.programmeValidation.issues.every((issue: ProgrammeIssue) => !!issue && typeof issue.code === 'string' && typeof issue.message === 'string' && ['error', 'warning'].includes(issue.severity))) &&
      Array.isArray(session.plan.exercises) && session.plan.exercises.every((item: PlannedExercise) => !!item?.exercise && Array.isArray(item.plannedSets) && item.plannedSets.every((set: PlannedSet) => !!set) && !!item.decisionTrace && strings(item.intents) && strings(item.decisionTrace.intent) && strings(item.decisionTrace.constraintsApplied) && strings(item.decisionTrace.rankedAlternatives) && (item.decisionTrace.rankedAlternativeIds === undefined || strings(item.decisionTrace.rankedAlternativeIds)) && (item.warmupSets === undefined || Array.isArray(item.warmupSets) && item.warmupSets.every((row: { weight: number; reps: number }) => !!row))));
}
const finish = (issues: ProgrammeValidationIssue[], coverage: ProgrammeValidationResult['coverage']): ProgrammeValidationResult => ({
  status: issues.some((issue) => issue.severity === 'error') ? 'invalid' : issues.some((issue) => issue.severity === 'warning') ? 'unresolved' : 'valid', issues, coverage,
});
/** Use catalogue semantics, not the allocation's potentially corrupted flag. */
function compound(exercise: Exercise): boolean {
  const classification = getExerciseLoadingProfile(exercise).compoundClassification;
  if (classification !== 'infer') return classification === 'compound';
  return exercise.intents.some((intent) => ['horizontal_press', 'vertical_press', 'horizontal_pull', 'vertical_pull', 'knee_dominant', 'hip_hinge'].includes(intent));
}

/** Validate actual materialized work against independently supplied objectives. */
export function validateProgrammeWeek(declaration: ProgrammeWeekDeclaration, generated: GeneratedProgrammeWeek, profile: TrainingProfileSnapshot): ProgrammeValidationResult {
  const issues: ProgrammeValidationIssue[] = [];
  const coverage: ProgrammeValidationResult['coverage'] = [];
  const add = (code: string, message: string, location: Partial<ProgrammeValidationIssue> = {}) => {
    const provenance = typeof location.provenance === 'string' && location.provenance.trim() ? location.provenance : typeof declaration.provenance === 'string' && declaration.provenance.trim() ? declaration.provenance : routine;
    issues.push({ code, severity: 'error', message, weekIndex: declaration.weekIndex, ...location, provenance });
  };
  const warning = (code: string, message: string, location: Partial<ProgrammeValidationIssue> = {}) => add(code, message, { severity: 'warning', ...location });
  if (!completeShape(declaration, generated, profile)) {
    issues.push({ code: 'invalid_payload', severity: 'error', message: 'Declaration/allocation/final sessions lack required records or arrays.', provenance: routine });
    return finish(issues, coverage);
  }
  const week = generated.allocation;
  if (week.status !== 'feasible' && week.status !== 'infeasible') add('invalid_allocation_status', 'Allocation status is not supported.');
  if (![declaration.policyStatus, week.policyStatus].every((status) => status === 'accepted' || status === 'legacy_pending_review')) add('invalid_policy_status', 'Policy status is not a supported accepted/unresolved state.');
  if (!/^balanced-v1:[2-6]$/.test(declaration.strategyId) && declaration.strategyId !== 'running-v1' && !(declaration.strategyId === 'legacy-intents-v1' && declaration.policyStatus === 'legacy_pending_review')) add('unsupported_strategy', 'No approved weekly strategy exists for this identifier.');
  if (!positiveInteger(declaration.weekIndex) || declaration.weekIndex > 4 || generated.weekIndex !== declaration.weekIndex) add('week_identity_mismatch', 'Generated week does not match a declared week 1–4.');
  if (declaration.policyVersion !== WEEKLY_POLICY_VERSION || week.policyVersion !== declaration.policyVersion || week.strategyId !== declaration.strategyId) add('policy_identity_mismatch', 'Policy/version differs from the approved declaration.');
  if (typeof declaration.provenance !== 'string' || !declaration.provenance.trim()) add('declaration_provenance_missing', 'Approved requirements need explicit provenance.');
  if (declaration.policyStatus !== 'accepted' || week.policyStatus !== 'accepted') warning('policy_unresolved', 'Legacy weekly targets remain pending review; structural checks cannot validate their scientific target.');
  if (week.status === 'infeasible') add('compiler_infeasible', 'Allocation is marked infeasible; final sessions cannot make it valid.');
  for (const issue of week.issues) if (issue.severity === 'error') add('allocation_issue', issue.message, { dayKey: issue.dayKey, slotId: issue.slotId });

  const orderedCalendar = [...declaration.calendar].sort((a, b) => a.weekday - b.weekday);
  const expectedDays = new Map<string, WeeklyProgrammeInputDay>();
  for (const day of orderedCalendar) {
    const dayKey = String(day.weekday);
    if (!positiveInteger(day.weekday) || day.weekday > 7 || expectedDays.has(dayKey)) add('invalid_calendar', 'Declared weekdays must be unique and within 1–7.', { dayKey });
    expectedDays.set(dayKey, day);
  }
  if (!expectedDays.size) add('calendar_missing', 'A programme without selected days cannot be validated.');
  const requirements = new Map<string, WeeklyRequirement>();
  const declaredSlotIds = new Set<string>();
  for (const row of declaration.requirements) {
    if (!row.id || requirements.has(row.id)) add('duplicate_requirement', 'Declared requirement IDs must be nonempty and unique.', { requirementId: row.id });
    requirements.set(row.id, row);
    if (!positiveInteger(row.targetSets) || !positiveInteger(row.targetExposures) || row.targetSets % row.targetExposures !== 0 || row.exposureSlotIds.length !== row.targetExposures || row.positions.length !== row.targetExposures || !row.owner || !row.provenance) add('invalid_requirement', 'Requirement dose, ownership, exposures and provenance must be explicit and consistent.', { requirementId: row.id });
    row.positions.forEach(([ordinal, index], position) => {
      const slotId = row.exposureSlotIds[position];
      if (!Number.isInteger(ordinal) || ordinal < 0 || ordinal >= orderedCalendar.length || !Number.isInteger(index) || index < 0 || slotId !== `${ordinal}:${index}`) add('invalid_exposure_position', 'Declared exposure positions do not identify selected calendar slots.', { requirementId: row.id });
      if (declaredSlotIds.has(slotId)) add('duplicate_exposure', 'Declared exposure ID is duplicated.', { requirementId: row.id, slotId });
      declaredSlotIds.add(slotId);
      const policy = declaration.exposurePolicies[slotId];
      if (!policy || !strings(policy.approvedExerciseIds) || !['isolation', 'primary_role'].includes(policy.selectionKind) || !positiveInteger(policy.reps) || !nonnegative(policy.restSeconds) || !['primary', 'accessory', 'isolation'].includes(policy.priority) || !['own', 'population', 'none'].includes(policy.loadPolicy)) add('exposure_policy_missing', 'Exposure needs a complete trusted reps/rest/load policy.', { requirementId: row.id, slotId });
    });
  }
  const mode = profile.trainingMode ?? 'strength';
  const coverageUnresolved = declaration.policyStatus === 'legacy_pending_review' && requirements.size === 0;
  for (const [exerciseId, baseline] of Object.entries(profile.baselines ?? {})) if (!nonnegative(baseline)) add('invalid_load_evidence', 'Entered baseline contains invalid load values.', { exerciseId });
  if (mode !== 'running' && !requirements.size && declaration.policyStatus === 'accepted') add('requirements_missing', 'Accepted strength programmes need declared weekly requirements.');
  const generatedRequirements = new Set<string>();
  for (const row of week.requirements) {
    if (generatedRequirements.has(row.id)) add('duplicate_requirement', 'Generated requirement IDs are duplicated.', { requirementId: row.id });
    generatedRequirements.add(row.id);
    if (!same(requirementSignature(row), requirementSignature(requirements.get(row.id)))) add('requirement_declaration_mismatch', 'Generated targets differ from the separately approved requirement.', { requirementId: row.id });
  }
  for (const id of requirements.keys()) if (!generatedRequirements.has(id)) add('requirement_declaration_mismatch', 'An approved requirement is absent from generated output.', { requirementId: id });

  const delivered = new Map<string, GeneratedProgrammeSession>();
  for (const session of generated.sessions) {
    if (session.kind !== 'strength' && session.kind !== 'run') add('invalid_session_kind', 'Session transport has an unsupported kind.', { dayKey: session.dayKey });
    const key = `${session.dayKey}:${session.kind}`;
    if (delivered.has(key)) add('duplicate_session', 'Multiple final sessions occupy the same day/type.', { dayKey: session.dayKey });
    delivered.set(key, session);
    const expectedDay = expectedDays.get(session.dayKey);
    if (!expectedDay) add('unexpected_session', 'Final session is outside the declared selected days.', { dayKey: session.dayKey });
    if (session.plan.weekIndex !== undefined && session.plan.weekIndex !== declaration.weekIndex) add('week_identity_mismatch', 'Final session belongs to a different week.', { dayKey: session.dayKey });
    if ((session.kind === 'run') !== (session.plan.template === 'run') || session.kind === 'strength' && expectedDay?.template !== session.plan.template) add('session_template_mismatch', 'Actual session type differs from its declared placement.', { dayKey: session.dayKey });
    if (session.plan.programmeValidation?.status === 'infeasible' || session.plan.programmeValidation?.issues.some((issue) => issue.severity === 'error')) add('session_infeasible', 'Final session carries an allocation error.', { dayKey: session.dayKey });
  }

  const slots: Array<{ dayKey: string; slot: AllocatedSlot }> = [];
  const usedSlotIds = new Set<string>();
  const eligibilityOptions = (slot: AllocatedSlot) => ({ allowEnteredRackException: declaration.strategyId.startsWith('balanced-v1:'), selectionIntent: slot.intent });
  const approvedForSlot = (exercise: Exercise, slot: AllocatedSlot) => {
    const approved = declaration.exposurePolicies[slot.slotId]?.approvedExerciseIds;
    return strings(approved) && approved.includes(exercise.id);
  };
  const ownsSlot = (exercise: Exercise, slot: AllocatedSlot) => exercise.musclesPrimary.includes(slot.owner) || approvedForSlot(exercise, slot);
  const fitsPrescription = (exercise: Exercise, slot: AllocatedSlot) => {
    const loading = getExerciseLoadingProfile(exercise);
    const policy = declaration.exposurePolicies[slot.slotId];
    return loading.prescriptionType === 'reps' && loading.defaultSelectionTier !== 'avoid_default_progression' && (approvedForSlot(exercise, slot) || policy?.selectionKind === 'isolation' && loading.compoundClassification === 'isolation' || policy?.selectionKind === 'primary_role' && getPrimarySlotRoleTier(exercise, slot.intent) <= PrimarySlotRoleTier.FallbackCompound);
  };
  function checkEligibility(exercise: Exercise, slot: AllocatedSlot, dayKey: string) {
    const eligibility = evaluateExerciseEligibility(exercise, profile, eligibilityOptions(slot));
    if (!eligibility.eligible || !exercise.intents.includes(slot.intent) || !ownsSlot(exercise, slot) || !fitsPrescription(exercise, slot)) add('ineligible_exercise', `Exercise violates slot/user constraints: ${eligibility.reasons.join(', ') || 'intent/owner/prescription mismatch'}.`, { dayKey, slotId: slot.slotId, exerciseId: exercise.id });
    for (const exception of eligibility.policyExceptions) warning('policy_exception', 'Accepted entered-lift rack exception remains pending D-P2-06 review.', { dayKey, slotId: slot.slotId, exerciseId: exercise.id, provenance: exception.provenance });
  }
  for (const [dayKey, day] of Object.entries(week.days)) {
    for (const issue of day.issues) if (issue.severity === 'error') add('allocation_day_issue', issue.message, { dayKey, slotId: issue.slotId });
    const expectedDay = expectedDays.get(dayKey);
    if (!expectedDay || day.dayKey !== dayKey || day.strategyId !== (expectedDay.strategyId ?? declaration.strategyId) || day.policyVersion !== declaration.policyVersion) add('allocation_day_mismatch', 'Allocation day identity/strategy differs from the declaration.', { dayKey });
    for (const slot of day.slots) {
      slots.push({ dayKey, slot });
      if (usedSlotIds.has(slot.slotId)) add('duplicate_exposure', 'Allocated exposure ID is duplicated.', { dayKey, slotId: slot.slotId });
      usedSlotIds.add(slot.slotId);
      const row = requirements.get(slot.requirementId);
      if (!row || !row.exposureSlotIds.includes(slot.slotId) || slot.owner !== row.owner || slot.dose !== row.dose) add('unknown_allocation', 'Allocation does not belong to its approved weekly requirement.', { dayKey, slotId: slot.slotId, requirementId: slot.requirementId });
      const policy = declaration.exposurePolicies[slot.slotId];
      if (!policy || slot.intent !== policy.intent || slot.reps !== policy.reps || slot.restSeconds !== policy.restSeconds || slot.priority !== policy.priority || slot.loadPolicy !== policy.loadPolicy) add('exposure_policy_mismatch', 'Allocated prescription differs from independently declared exposure policy.', { dayKey, slotId: slot.slotId });
      if (!positiveInteger(slot.setCount) || !positiveInteger(slot.reps) || !nonnegative(slot.restSeconds)) add('invalid_prescription', 'Allocated sets/reps/rest contain invalid values.', { dayKey, slotId: slot.slotId });
      if (row && slot.setCount !== row.targetSets / row.targetExposures) add('set_allocation_mismatch', 'Exposure dose differs from approved weekly distribution.', { dayKey, slotId: slot.slotId, requirementId: slot.requirementId });
      const exercise = slot.exerciseId ? catalogue.get(slot.exerciseId) : undefined;
      if (!exercise) add('unavailable_slot', 'Required allocation has no catalogue exercise.', { dayKey, slotId: slot.slotId });
      else checkEligibility(exercise, slot, dayKey);
      for (const id of slot.candidateExerciseIds) {
        const alternative = catalogue.get(id);
        if (!alternative || !evaluateExerciseEligibility(alternative, profile, eligibilityOptions(slot)).eligible || !alternative.intents.includes(slot.intent) || !ownsSlot(alternative, slot) || !fitsPrescription(alternative, slot)) add('ineligible_alternative', 'Offered alternative violates slot/user/prescription constraints.', { dayKey, slotId: slot.slotId, exerciseId: id });
      }
      if (slot.exerciseId && !slot.candidateExerciseIds.includes(slot.exerciseId)) add('incomplete_allocation', 'Selected exercise is absent from candidate allocation.', { dayKey, slotId: slot.slotId });
    }
  }
  for (const [dayKey, day] of expectedDays) {
    const allocation = week.days[Number(dayKey)];
    if (!allocation) add('missing_allocation_day', 'Selected day has no allocation.', { dayKey });
    if (day.template !== 'run' && !delivered.has(`${dayKey}:strength`)) add('missing_strength_session', 'Selected lifting exposure has no final session.', { dayKey });
    if (day.template === 'run' && allocation?.slots.length) add('run_contains_strength', 'Run-only day contains lifting allocations.', { dayKey, provenance: running });
  }

  const actualBySlot = new Map<string, { dayKey: string; item: PlannedExercise }>();
  for (const session of generated.sessions) {
    const { plan, dayKey } = session;
    if (session.kind === 'run') {
      if (plan.exercises.length) add('run_contains_strength', 'Actual run contains lifting work.', { dayKey, provenance: running });
      const minutes = declaration.weekIndex >= 3 ? 30 : 20; // Accepted RD-006; no new progression policy.
      if (plan.estimatedDurationMinutes !== minutes || plan.constraints.timeBudgetMinutes !== minutes) add('invalid_run_prescription', 'Actual run duration differs from accepted calendar-week policy.', { dayKey, provenance: running });
      continue;
    }
    const usedExercises = new Set<string>();
    let workingSets = 0;
    let restSeconds = 0;
    let estimateMinutes = 10; // Existing 10 + 8 compound / 3 isolation estimate; not measured duration.
    for (const item of plan.exercises) {
      if (usedExercises.has(item.exerciseId)) add('duplicate_exercise', 'Final session repeats an exercise ID.', { dayKey, exerciseId: item.exerciseId });
      usedExercises.add(item.exerciseId);
      const exercise = catalogue.get(item.exerciseId);
      const slot = slots.find((entry) => entry.dayKey === dayKey && entry.slot.exerciseId === item.exerciseId)?.slot;
      if (!exercise || item.exercise.id !== item.exerciseId) { add('unknown_exercise', 'Final exercise identity is not a catalogue exercise.', { dayKey, exerciseId: item.exerciseId }); continue; }
      if (!same(exerciseSignature(item.exercise), exerciseSignature(exercise))) add('catalogue_metadata_mismatch', 'Embedded exercise eligibility/loading metadata differs from the canonical catalogue.', { dayKey, exerciseId: item.exerciseId });
      if (!coverageUnresolved && (getExerciseLoadingProfile(exercise).prescriptionType !== 'reps' || getExerciseLoadingProfile(exercise).defaultSelectionTier === 'avoid_default_progression')) add('incompatible_prescription', 'Final exercise does not support this repetition prescription.', { dayKey, exerciseId: item.exerciseId });
      estimateMinutes += compound(exercise) ? 8 : 3;
      if (!slot) {
        if (!coverageUnresolved) add('unexpected_exercise', 'Final exercise is outside selected weekly allocation.', { dayKey, exerciseId: item.exerciseId });
        else {
          const intent = item.decisionTrace.intent[0] ?? exercise.intents[0];
          const eligibility = evaluateExerciseEligibility(exercise, profile, { selectionIntent: intent });
          if (!eligibility.eligible || !exercise.intents.includes(intent)) add('ineligible_exercise', 'Legacy work violates user constraints or its selected intent.', { dayKey, exerciseId: item.exerciseId });
          // Legacy generic traces carry display names plus stable IDs. IDs
          // remain authoritative; name-only traces are never fuzzily matched.
          const ids = item.decisionTrace.rankedAlternativeIds;
          const alternatives = ids?.length ? ids : item.decisionTrace.rankedAlternatives;
          for (const reference of new Set(alternatives)) {
            const exactNames = [...catalogue.values()].filter((candidate) => candidate.name === reference);
            const alternative = ids?.length ? catalogue.get(reference) : catalogue.get(reference) ?? (exactNames.length === 1 ? exactNames[0] : undefined);
            if (!alternative && !ids?.length) warning('legacy_alternative_identity_unresolved', 'A legacy display-only alternative lacks a resolvable stable identity.', { dayKey });
            else if (!alternative || !alternative.intents.includes(intent) || !evaluateExerciseEligibility(alternative, profile, { selectionIntent: intent }).eligible) add('ineligible_final_alternative', 'Legacy offered alternative violates user/intent constraints.', { dayKey, exerciseId: alternative?.id ?? reference });
          }
        }
      }
      else {
        checkEligibility(exercise, slot, dayKey);
        actualBySlot.set(slot.slotId, { dayKey, item });
        if (item.plannedSets.length !== slot.setCount || item.priority !== slot.priority) add('prescription_mismatch', 'Actual working-set count/priority differs from allocation.', { dayKey, slotId: slot.slotId });
        if (!item.decisionTrace.constraintsApplied.includes(`weekly_requirement:${slot.requirementId}`) || !item.decisionTrace.constraintsApplied.includes(`policy:${declaration.policyVersion}`)) add('requirement_trace_missing', 'Final work lacks its declared policy/requirement trace.', { dayKey, slotId: slot.slotId });
        for (const id of new Set([...item.decisionTrace.rankedAlternatives, ...(item.decisionTrace.rankedAlternativeIds ?? [])])) {
          const alternative = catalogue.get(id);
          if (!alternative || !slot.candidateExerciseIds.includes(id) || !evaluateExerciseEligibility(alternative, profile, eligibilityOptions(slot)).eligible || !alternative.intents.includes(slot.intent) || !ownsSlot(alternative, slot) || !fitsPrescription(alternative, slot)) add('ineligible_final_alternative', 'Final offered alternative violates the selected slot or user constraints.', { dayKey, slotId: slot.slotId, exerciseId: id });
        }
      }
      if (!item.plannedSets.length) add('invalid_prescription', 'Final exercise has no working sets.', { dayKey, exerciseId: item.exerciseId });
      item.plannedSets.forEach((set, index) => {
        workingSets++;
        if (!positiveInteger(set.targetReps) || !nonnegative(set.restSeconds) || set.setIndex !== index + 1) add('invalid_prescription', 'Actual reps/rest/set indices are invalid.', { dayKey, exerciseId: item.exerciseId });
        if (slot && (set.targetReps !== slot.reps || set.restSeconds !== slot.restSeconds)) add('prescription_mismatch', 'Actual reps/rest differ from allocated prescription.', { dayKey, slotId: slot.slotId });
        if (index < item.plannedSets.length - 1 && nonnegative(set.restSeconds)) restSeconds += set.restSeconds;
        if (!nonnegative(set.suggestedWeight)) add('invalid_load', 'Actual load must be finite and nonnegative.', { dayKey, exerciseId: item.exerciseId });
        else {
          const loading = getExerciseLoadingProfile(exercise);
          const baseline = profile.baselines?.[exercise.id] ?? 0;
          const ownBaseline = Number.isFinite(baseline) && baseline > 0;
          const history = profile.lastSessionPerformance?.[exercise.id];
          const validHistoryStructure = hasValidHistoryStructure(exercise, history);
          const recent = profile.recentSessionPerformance?.[exercise.id];
          const consistentHistory = validHistoryStructure && (recent === undefined ||
            (Array.isArray(recent) && hasValidHistoryStructure(exercise, recent[0]) && same(historySignature(history), historySignature(recent[0]))));
          const qualifiedHistory = consistentHistory && isQualifiedPerformance(exercise, history);
          const ownEvidence = ownBaseline || qualifiedHistory;
          if (history !== undefined && index === 0) {
            if (!consistentHistory || (!qualifiedHistory && !isUnqualifiedHistory(exercise, history))) add('invalid_load_evidence', 'Exercise history has invalid numeric values, identity, qualification metadata or last/recent consistency.', { dayKey, exerciseId: exercise.id });
            else if (!qualifiedHistory && !ownBaseline) warning('history_evidence_unverified', 'Incomplete or unsupported history is a progression barrier, not qualified load evidence.', { dayKey, exerciseId: exercise.id });
          }
          if (loading.loadDisplayMode === 'bodyweight' && set.suggestedWeight !== 0) add('invalid_load_state', 'Pure bodyweight prescription carries external load.', { dayKey, exerciseId: item.exerciseId });
          if (slot && declaration.exposurePolicies[slot.slotId]?.loadPolicy === 'none' && !ownEvidence && loading.loadDisplayMode !== 'bodyweight' && set.suggestedWeight > 0) add('unanchored_external_load', 'No-inference exercise receives kilograms without its own evidence.', { dayKey, slotId: slot.slotId, exerciseId: item.exerciseId });
          if (loading.loadDisplayMode !== 'bodyweight' && !['added_bodyweight', 'assisted_bodyweight'].includes(loading.loadDisplayMode) && set.suggestedWeight === 0) warning('load_requires_confirmation', 'External-load zero is unspecified load, not validated bodyweight work.', { dayKey, exerciseId: item.exerciseId });
          if (baseline > 0 && Number.isFinite(baseline) && positiveInteger(set.targetReps) && set.suggestedWeight > epleyWorkingWeightCeiling(baseline, set.targetReps, getWeightStep(exercise))) add('baseline_ceiling_exceeded', 'Actual load exceeds accepted exercise-specific baseline ceiling; D-P2-01 remains pending.', { dayKey, exerciseId: item.exerciseId, provenance: routine });
        }
      });
      // Existing ROUTINE_AUDIT warm-up policy, independently evaluated from
      // final working weight: 40/60/80%, rounded to step, five repetitions.
      const step = getWeightStep(exercise);
      const workingWeight = item.plannedSets[0]?.suggestedWeight ?? 0;
      const allowedWarmupLoads = new Set([0.4, 0.6, 0.8].map((fraction) => Math.round(workingWeight * fraction / step) * step).filter((weight) => weight > 0));
      const seenWarmups = new Set<number>();
      for (const warmup of item.warmupSets ?? []) {
        if (!nonnegative(warmup.weight) || warmup.reps !== 5 || !allowedWarmupLoads.has(warmup.weight) || seenWarmups.has(warmup.weight)) add('invalid_warmup', 'Warm-up load/reps differ from the accepted exercise-specific working-weight policy; these rows are not working sets.', { dayKey, exerciseId: item.exerciseId, provenance: routine });
        seenWarmups.add(warmup.weight);
      }
    }
    if (workingSets > SESSION_SET_CAP) add('session_set_budget', 'Actual working sets exceed accepted session cap.', { dayKey, provenance: routine });
    const budget = plan.constraints.timeBudgetMinutes;
    if (!Number.isFinite(budget) || budget <= 0 || !Number.isFinite(plan.estimatedDurationMinutes) || plan.estimatedDurationMinutes <= 0) add('invalid_time_budget', 'Session duration/budget must be finite and positive.', { dayKey });
    const cap = Math.min(SESSION_MINUTE_CAP, budget);
    if (coverageUnresolved && !plan.exercises.length) add('missing_training_exposure', 'Selected legacy strength day contains no work; its scientific quota remains unresolved.', { dayKey });
    if (estimateMinutes > cap || plan.estimatedDurationMinutes > cap || restSeconds / 60 > cap) add('session_time_budget', 'Actual work, reported duration or between-set rest exceed accepted budget.', { dayKey, provenance: routine });
    if (restSeconds / 60 > plan.estimatedDurationMinutes) add('understated_duration', 'Between-set rest alone exceeds reported duration.', { dayKey });
  }

  for (const row of declaration.requirements) {
    const entries = slots.filter((entry) => entry.slot.requirementId === row.id);
    let actualSets = 0;
    let actualExposures = 0;
    row.positions.forEach(([ordinal, index]) => {
      const slotId = `${ordinal}:${index}`;
      const dayKey = String(orderedCalendar[ordinal]?.weekday);
      const matches = entries.filter((entry) => entry.slot.slotId === slotId && entry.dayKey === dayKey);
      if (matches.length !== 1) add('missing_training_exposure', 'Declared exposure is absent, duplicated or on the wrong day.', { requirementId: row.id, slotId, dayKey, provenance: row.provenance });
      const actual = actualBySlot.get(slotId);
      if (matches.length === 1 && actual?.dayKey === dayKey) { actualExposures++; actualSets += actual.item.plannedSets.length; }
      else add('incomplete_allocation', 'Declared exposure has no corresponding final work.', { requirementId: row.id, slotId, dayKey });
    });
    if (entries.reduce((total, entry) => total + entry.slot.setCount, 0) !== row.targetSets || actualSets !== row.targetSets || actualExposures !== row.targetExposures) add('weekly_requirement_unmet', `Actual ${actualSets}/${row.targetSets} sets and ${actualExposures}/${row.targetExposures} exposures fail the declaration.`, { requirementId: row.id, provenance: row.provenance });
    coverage.push({ weekIndex: declaration.weekIndex, requirementId: row.id, expectedSets: row.targetSets, actualSets, expectedExposures: row.targetExposures, actualExposures });
  }
  const runs = declaration.runRequirement;
  if (!same(runSignature(week.runRequirement), runSignature(runs))) add('run_declaration_mismatch', 'Run targets differ from the approved declaration.', { provenance: running });
  const actualRuns = generated.sessions.filter((session) => session.kind === 'run' && session.plan.template === 'run' && !session.plan.exercises.length);
  if (mode !== 'strength' && !runs) add('run_requirement_missing', 'Running/hybrid needs explicit run exposures.', { provenance: running });
  if (mode === 'strength' && runs || mode === 'running' && (requirements.size || orderedCalendar.some((day) => day.template !== 'run'))) add('mode_requirements_mismatch', 'Declared work contradicts the user training mode.', { provenance: running });
  if (runs) {
    if (!positiveInteger(runs.targetExposures) || new Set(runs.dayKeys).size !== runs.dayKeys.length) add('invalid_run_requirement', 'Run exposures must be positive and selected days unique.', { provenance: running });
    if (runs.dayKeys.length !== runs.targetExposures || actualRuns.length !== runs.targetExposures || runs.dayKeys.some((key) => !actualRuns.some((session) => session.dayKey === key))) add('missing_run_exposure', 'Actual runs do not meet declared weekly exposures.', { provenance: running });
    const calendarRunKeys = orderedCalendar.filter((day) => day.template === 'run' || day.scheduledRun).map((day) => String(day.weekday)).sort();
    if (!same(calendarRunKeys, [...runs.dayKeys].sort())) add('run_calendar_mismatch', 'Run declaration omits or adds selected run placements.', { provenance: running });
    for (const dayKey of runs.dayKeys) {
      const day = expectedDays.get(dayKey);
      if (!day || !(day.template === 'run' || day.scheduledRun) || mode === 'hybrid' && day.template !== 'run' && !isNonLegTrainingTemplate(day.template)) add('unauthorized_run_placement', 'Run placement violates accepted selected-day/hybrid policy.', { dayKey, provenance: running });
    }
  } else if (actualRuns.length) add('unexpected_run', 'Actual run is outside declared requirements.', { provenance: running });
  if (mode === 'hybrid' && !actualRuns.length) add('hybrid_has_no_run', 'Hybrid lacks delivered authorized running work; D-P2-03 remains pending.', { provenance: running });
  if (mode === 'hybrid' && !generated.sessions.some((session) => session.kind === 'strength' && session.plan.template !== 'run' && session.plan.exercises.length > 0)) add('hybrid_has_no_strength', 'Hybrid lacks delivered lifting work.', { provenance: running });
  if (mode === 'running' && generated.sessions.some((session) => session.kind !== 'run')) add('running_contains_strength', 'Run-only programme contains lifting sessions.', { provenance: running });
  return finish(issues, coverage);
}

/** Separate declaration list prevents omitted entire weeks disappearing. */
export function validateTrainingProgramme(input: { declarations: readonly ProgrammeWeekDeclaration[]; weeks: readonly GeneratedProgrammeWeek[]; profile: TrainingProfileSnapshot }): ProgrammeValidationResult {
  const issues: ProgrammeValidationIssue[] = [];
  const coverage: ProgrammeValidationResult['coverage'] = [];
  if (!input || !Array.isArray(input.declarations) || !Array.isArray(input.weeks) || !input.profile || input.declarations.some((row) => !row) || input.weeks.some((week) => !week)) return finish([{ code: 'invalid_payload', severity: 'error', message: 'Programme lacks required declaration/week/profile records.', provenance: routine }], coverage);
  const declaredIndices = new Set<number>();
  if (!input.declarations.length) issues.push({ code: 'programme_declaration_missing', severity: 'error', message: 'Programme needs independently declared weeks.', provenance: routine });
  for (const declaration of input.declarations) {
    if (declaredIndices.has(declaration.weekIndex)) issues.push({ code: 'duplicate_week', severity: 'error', message: 'Declared week is duplicated.', weekIndex: declaration.weekIndex, provenance: declaration.provenance });
    declaredIndices.add(declaration.weekIndex);
    const generated = input.weeks.filter((week) => week.weekIndex === declaration.weekIndex);
    if (generated.length !== 1) issues.push({ code: generated.length ? 'duplicate_week' : 'missing_week', severity: 'error', message: 'Each declared week requires exactly one generated week.', weekIndex: declaration.weekIndex, provenance: declaration.provenance });
    for (const week of generated) { const result = validateProgrammeWeek(declaration, week, input.profile); issues.push(...result.issues); coverage.push(...result.coverage); }
  }
  for (const week of input.weeks) if (!declaredIndices.has(week.weekIndex)) issues.push({ code: 'unexpected_week', severity: 'error', message: 'Generated week was not declared.', weekIndex: week.weekIndex, provenance: routine });
  if (declaredIndices.size !== 4 || ![1, 2, 3, 4].every((index) => declaredIndices.has(index))) issues.push({ code: 'programme_declaration_incomplete', severity: 'error', message: 'The existing four-week programme contract needs declarations for weeks 1–4.', provenance: routine });
  return finish(issues, coverage);
}
