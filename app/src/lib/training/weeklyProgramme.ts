/**
 * Pure weekly compiler. Accepted policy quantities are declared before allocation.
 * It owns neither persistence nor session completion. ROUTINE_AUDIT.md, balanced
 * week 2026-10-09 is retained as policy, not presented as a physiological law.
 */
import catalogData from './catalog/exercises.v1.json';
import { SESSION_SET_CAP, SESSION_MINUTE_CAP, blendedCount, blendedReps, setsForDose, type BalancedSlot } from './balancedHypertrophy';
import { evaluateExerciseEligibility } from './exerciseEligibility';
import { getExerciseLoadingProfile } from './exerciseLoadingProfile';
import { getPrimarySlotRoleTier, PrimarySlotRoleTier } from './exerciseSessionRole';
import { BALANCED_WEEKLY_OBJECTIVES } from './weeklyProgrammePolicy';
import { WEEKLY_POLICY_VERSION, type AllocatedSlot, type CompiledProgrammeWeek, type ProgrammeIssue, type WeeklyProgrammeInputDay, type WeeklyRequirement } from './weeklyProgrammeTypes';
import type { Exercise, TrainingProfileSnapshot } from './types';

const catalogue = catalogData as Exercise[];
const strategies: Record<number, string[]> = {
  2: ['twoA', 'twoB'],
  3: ['threeA', 'threeB', 'threeC'],
  4: ['fourUpperA', 'fourLowerA', 'fourUpperB', 'fourLowerB'],
  5: ['fiveUpper', 'fiveSquat', 'fivePush', 'fivePull', 'fiveDead'],
  6: ['sixPushA', 'sixPullA', 'sixLegsA', 'sixPushB', 'sixPullB', 'sixLegsB'],
};

export function balancedStrategyId(daysPerWeek: number, dayOrdinal: number): string | undefined {
  const key = strategies[daysPerWeek]?.[dayOrdinal];
  return key ? `balanced-v1:${key}` : undefined;
}

export function isBalancedDayStrategyId(strategyId: string): boolean {
  return Object.values(strategies).flat().some((key) => strategyId === `balanced-v1:${key}`);
}

function compatible(exercise: Exercise, slot: BalancedSlot, owner: string): boolean {
  if (!exercise.intents.includes(slot.intent)) return false;
  if (slot.candidates.includes(exercise.id)) return true;
  if (!exercise.musclesPrimary.includes(owner)) return false;
  const loading = getExerciseLoadingProfile(exercise);
  if (loading.defaultSelectionTier === 'avoid_default_progression' || loading.prescriptionType !== 'reps') return false;
  const reference = catalogue.find((item) => item.id === slot.candidates[0]);
  const isolation = reference && getExerciseLoadingProfile(reference).compoundClassification === 'isolation';
  if (isolation) return loading.compoundClassification === 'isolation';
  return getPrimarySlotRoleTier(exercise, slot.intent) <= PrimarySlotRoleTier.FallbackCompound;
}

function preferenceOrder(exercise: Exercise, profile: TrainingProfileSnapshot): number {
  const equipment = [...exercise.equipment, ...(exercise.equipmentAll ?? []), ...(exercise.equipmentAny ?? [])];
  const machine = equipment.some((token) => token.includes('machine') || token.includes('cable'));
  const free = equipment.some((token) => /barbell|dumbbell|kettlebell|ez_bar|trap_bar/.test(token));
  const preferences = profile.constraints?.preferences;
  return preferences?.prefersMachines && machine || preferences?.prefersFreeWeights && free ? 0 : 1;
}

/** Define the accepted weekly objectives without inspecting any calendar or exercise pool. */
export function defineWeeklyRequirements(daysPerWeek: number, profile: TrainingProfileSnapshot): WeeklyRequirement[] {
  return (BALANCED_WEEKLY_OBJECTIVES[daysPerWeek] ?? []).map((objective) => ({
    id: objective.id, owner: objective.owner, dose: objective.slot.dose,
    targetSets: objective.positions.length * setsForDose(profile.goals, objective.slot.dose),
    targetExposures: objective.positions.length,
    positions: objective.positions.map(([ordinal, index]) => [ordinal, index]),
    exposureSlotIds: objective.positions.map(([ordinal, index]) => `${ordinal}:${index}`),
    provenance: 'docs/training/ROUTINE_AUDIT.md: balanced week 2026-10-09; rules/rules.v1.json goal blend',
  }));
}

/** Allocate a declared weekly strategy; absent calendar days never lower its objectives. */
export function compileProgrammeWeek(
  calendar: WeeklyProgrammeInputDay[], profile: TrainingProfileSnapshot,
  specification?: { daysPerWeek: number; strategyId: string },
): CompiledProgrammeWeek {
  const issues: ProgrammeIssue[] = [];
  const balanced = specification?.strategyId.startsWith('balanced-v1:') ?? calendar.some((day) => day.strategyId?.startsWith('balanced-v1:'));
  const daysPerWeek = specification?.daysPerWeek ?? calendar.length;
  const strategyId = specification?.strategyId ?? (balanced ? `balanced-v1:${daysPerWeek}` : 'legacy-intents-v1');
  // This is the authority. Calendar/day templates do not create requirements.
  const requirements = balanced ? defineWeeklyRequirements(daysPerWeek, profile) : [];
  const days: CompiledProgrammeWeek['days'] = {};
  if (balanced && strategyId !== `balanced-v1:${daysPerWeek}`) issues.push({ code: 'unsupported_weekly_strategy', severity: 'error', message: 'The weekly strategy identifier does not match an approved policy.' });
  for (const day of calendar) {
    const dayKey = String(day.weekday);
    if (days[day.weekday]) issues.push({ code: 'duplicate_calendar_day', severity: 'error', message: 'A selected weekday occurs more than once.', dayKey });
    days[day.weekday] = { policyVersion: WEEKLY_POLICY_VERSION, strategyId: day.strategyId ?? strategyId, dayKey, slots: [], issues: [] };
  }
  if (balanced && !requirements.length) issues.push({ code: 'unsupported_weekly_strategy', severity: 'error', message: 'No approved weekly objectives exist for this strategy.' });
  if (!balanced && profile.trainingMode !== 'running') issues.push({ code: 'legacy_policy_review', severity: 'warning', message: 'Once-frequency/fat/fitter intent prescriptions retain accepted legacy behavior pending weekly-policy review.' });
  for (const requirement of requirements) {
    const objective = BALANCED_WEEKLY_OBJECTIVES[daysPerWeek].find((entry) => entry.id === requirement.id)!;
    const slot = objective.slot;
    const priority = slot.priority === 'primary' ? 'primary' : 'isolation';
    for (const [ordinal, index] of requirement.positions) {
      const day = calendar.find((entry) => entry.strategyId === balancedStrategyId(daysPerWeek, ordinal));
      const slotId = `${ordinal}:${index}`;
      if (!day || day.template === 'run') {
        issues.push({ code: 'missing_exposure_day', severity: 'error', message: `No selected strength day can hold ${requirement.id} exposure ${slotId}.`, slotId });
        continue;
      }
      const candidates = catalogue.filter((exercise) => compatible(exercise, slot, requirement.owner) &&
        evaluateExerciseEligibility(exercise, profile, { allowEnteredRackException: true, selectionIntent: slot.intent }).eligible);
      candidates.sort((a, b) => {
        const baseline = Number((profile.baselines?.[b.id] ?? 0) > 0) - Number((profile.baselines?.[a.id] ?? 0) > 0);
        if (baseline) return baseline;
        const preference = preferenceOrder(a, profile) - preferenceOrder(b, profile);
        if (preference) return preference;
        const ai = slot.candidates.indexOf(a.id), bi = slot.candidates.indexOf(b.id);
        return (ai < 0 ? slot.candidates.length : ai) - (bi < 0 ? slot.candidates.length : bi) || a.id.localeCompare(b.id);
      });
      const allocation: AllocatedSlot = {
        slotId, requirementId: requirement.id, intent: slot.intent,
        owner: requirement.owner, dose: slot.dose, setCount: requirement.targetSets / requirement.targetExposures,
        reps: blendedReps(profile.goals, priority), restSeconds: blendedCount(profile.goals, priority, 'rest') ?? 90,
        priority: slot.priority, loadPolicy: slot.load, compound: slot.compound, exerciseId: null,
        candidateExerciseIds: candidates.map((exercise) => exercise.id),
      };
      days[day.weekday].slots.push(allocation);
    }
  }
  const usedThisWeek = new Set<string>();
  for (const day of Object.values(days)) {
    for (const slot of day.slots) if (!Number.isInteger(slot.setCount) || slot.setCount <= 0 || !Number.isFinite(slot.reps) || slot.reps <= 0 || !Number.isFinite(slot.restSeconds) || slot.restSeconds < 0) issues.push({ code: 'invalid_prescription', severity: 'error', message: 'Weekly dose contains invalid sets, reps or rest.', dayKey: day.dayKey, slotId: slot.slotId });
    day.slots.sort((a, b) => Number(a.slotId.split(':')[1]) - Number(b.slotId.split(':')[1]));
    // Bipartite matching preserves scarce eligible exercises for their slots.
    // A simple greedy picker can consume the only candidate of a later slot.
    const exerciseToSlot = new Map<string, AllocatedSlot>();
    const assign = (slot: AllocatedSlot, visited: Set<string>): boolean => {
      const ordered = [...slot.candidateExerciseIds].sort((a, b) => {
        const ownA = (profile.baselines?.[a] ?? 0) > 0, ownB = (profile.baselines?.[b] ?? 0) > 0;
        return Number(ownB) - Number(ownA) || Number(usedThisWeek.has(a)) - Number(usedThisWeek.has(b));
      });
      for (const id of ordered) {
        if (visited.has(id)) continue;
        visited.add(id);
        const previous = exerciseToSlot.get(id);
        if (!previous || assign(previous, visited)) {
          exerciseToSlot.set(id, slot);
          slot.exerciseId = id;
          return true;
        }
      }
      return false;
    };
    [...day.slots].sort((a, b) => a.candidateExerciseIds.length - b.candidateExerciseIds.length).forEach((slot) => assign(slot, new Set()));
    day.slots.forEach((slot) => { if (slot.exerciseId) usedThisWeek.add(slot.exerciseId); });
  }
  // Compiler diagnostics are not the independent whole-programme validator (R05).
  for (const requirement of requirements) {
    const slots = Object.values(days).flatMap((day) => day.slots).filter((slot) => slot.requirementId === requirement.id && slot.exerciseId);
    const delivered = slots.reduce((total, slot) => total + slot.setCount, 0);
    if (slots.length !== requirement.targetExposures || delivered !== requirement.targetSets) issues.push({ code: 'weekly_requirement_unmet', severity: 'error', message: `${requirement.id}: ${slots.length}/${requirement.targetExposures} exposures, ${delivered}/${requirement.targetSets} sets can be delivered.` });
  }
  for (const day of Object.values(days)) {
    for (const slot of day.slots) if (!slot.exerciseId) issues.push({ code: 'unavailable_slot', severity: 'error', message: `No unique eligible exercise for ${slot.owner} (${slot.intent}).`, dayKey: day.dayKey, slotId: slot.slotId });
    const sets = day.slots.reduce((total, slot) => total + slot.setCount, 0);
    const minutes = 10 + day.slots.reduce((total, slot) => total + (slot.compound ? 8 : 3), 0);
    if (sets > SESSION_SET_CAP) issues.push({ code: 'session_set_budget', severity: 'error', message: `Weekly requirements exceed the accepted ${SESSION_SET_CAP}-set cap (${sets}).`, dayKey: day.dayKey });
    if (minutes > SESSION_MINUTE_CAP) issues.push({ code: 'session_minute_budget', severity: 'error', message: `Weekly requirements exceed the accepted ${SESSION_MINUTE_CAP}-minute estimate (${minutes}).`, dayKey: day.dayKey });
  }
  if (profile.trainingMode === 'hybrid' && !calendar.some((day) => day.scheduledRun || day.template === 'run')) issues.push({ code: 'hybrid_has_no_run', severity: 'error', message: 'No authorized run placement exists under the accepted hybrid policy; D-P2-03 requires approval.' });
  if (profile.trainingMode === 'hybrid' && !calendar.some((day) => day.template !== 'run')) issues.push({ code: 'hybrid_has_no_strength', severity: 'error', message: 'The hybrid schedule contains no strength exposure.' });
  const result: CompiledProgrammeWeek = { policyVersion: WEEKLY_POLICY_VERSION, strategyId, policyStatus: balanced || profile.trainingMode === 'running' ? 'accepted' : 'legacy_pending_review', requirements, days, issues, status: issues.some((issue) => issue.severity === 'error') ? 'infeasible' : 'feasible' };
  if (profile.trainingMode === 'running' || profile.trainingMode === 'hybrid') {
    const dayKeys = calendar.filter((day) => day.template === 'run' || day.scheduledRun).map((day) => String(day.weekday));
    result.runRequirement = { id: 'run', targetExposures: profile.trainingMode === 'running' ? daysPerWeek : Math.max(1, dayKeys.length), dayKeys, provenance: 'docs/training/RUNNING_DESIGN.md: RD-004/RD-006; D-P2-03 unresolved for hybrid 2/3 days' };
    if (dayKeys.length !== result.runRequirement.targetExposures && !issues.some((issue) => issue.code === 'hybrid_has_no_run')) {
      issues.push({ code: 'running_requirement_unmet', severity: 'error', message: 'Selected run exposures are missing from the calendar.' });
      result.status = 'infeasible';
    }
  }
  for (const day of Object.values(days)) day.issues = result.issues.filter((issue) => !issue.dayKey || issue.dayKey === day.dayKey);
  return result;
}
