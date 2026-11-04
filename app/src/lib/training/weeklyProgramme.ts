/**
 * Pure weekly compiler. Accepted policy quantities are declared before allocation.
 * It owns neither persistence nor session completion. ROUTINE_AUDIT.md, balanced
 * week 2026-10-09 is retained as policy, not presented as a physiological law.
 * Policy v4 (ROUTINE_AUDIT.md, mixed-goal exposures 2026-11-04) declares one dose
 * per exposure; saved v3 programmes replay the earlier even split unchanged.
 */
import catalogData from './catalog/exercises.v1.json';
import { SESSION_SET_CAP, SESSION_MINUTE_CAP, blendedCount, blendedReps, normaliseGoalWeights, setsForDose, setsForSlot, type BalancedSlot } from './balancedHypertrophy';
import { evaluateExerciseEligibility } from './exerciseEligibility';
import { getExerciseLoadingProfile } from './exerciseLoadingProfile';
import { getPrimarySlotRoleTier, PrimarySlotRoleTier } from './exerciseSessionRole';
import { getRepRange } from './progression';
import { BALANCED_WEEKLY_OBJECTIVES, type WeeklyObjectivePolicy } from './weeklyProgrammePolicy';
import {
  WEEKLY_POLICY_VERSION, usesExposureDosePolicy,
  type AllocatedSlot, type CompiledProgrammeWeek, type ExposureRole, type ProgrammeIssue, type WeeklyPolicyVersion, type WeeklyProgrammeInputDay, type WeeklyRequirement,
} from './weeklyProgrammeTypes';
import type { Exercise, ExercisePriority, GoalWeights, TrainingProfileSnapshot } from './types';

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

/** Both goals must hold at least this share before heavy exposures take separate roles. */
export const MIXED_GOAL_SHARE_FLOOR = 0.3;
/** Operator-approved exposure targets; ranges are the single-goal primary ranges in rules.v1.json. */
export const EXPOSURE_ROLE_POLICY: Record<ExposureRole, { goals: GoalWeights; targetReps: number }> = {
  strength: { goals: { build_strength: 1 }, targetReps: 5 },
  hypertrophy: { goals: { build_muscle: 1 }, targetReps: 8 },
};
const V3_PROVENANCE = 'docs/training/ROUTINE_AUDIT.md: balanced week 2026-10-09; rules/rules.v1.json goal blend';
const V4_PROVENANCE = 'docs/training/ROUTINE_AUDIT.md: balanced week 2026-10-09; mixed-goal exposures 2026-11-04; rules/rules.v1.json goal blend';

export type ExposureDose = {
  setCount: number;
  reps: number;
  restSeconds: number;
  priority: ExercisePriority;
  repRange?: [number, number];
  exposure?: ExposureRole;
};

/**
 * Role of one heavy exposure under a mixed strength + muscle goal (v4).
 * The first exposure of an own-load lift trains strength; a repeat exposure of
 * that lift and every no-inference heavy variant train hypertrophy.
 */
export function exposureRole(objective: WeeklyObjectivePolicy, position: number, shares: GoalWeights): ExposureRole | undefined {
  const slot = objective.slot;
  if (slot.dose !== 'heavy' || slot.priority !== 'primary') return undefined;
  if ((shares.build_strength ?? 0) < MIXED_GOAL_SHARE_FLOOR || (shares.build_muscle ?? 0) < MIXED_GOAL_SHARE_FLOOR) return undefined;
  const reference = catalogue.find((exercise) => exercise.id === slot.candidates[0]);
  if (!reference || getExerciseLoadingProfile(reference).prescriptionType !== 'reps') return undefined;
  const firstOrdinal = Math.min(...objective.positions.map(([ordinal]) => ordinal));
  return slot.load === 'own' && objective.positions[position][0] === firstOrdinal ? 'strength' : 'hypertrophy';
}

/** One declared dose for one exposure. Shared by the compiler and the R05 declaration. */
export function exposureDose(objective: WeeklyObjectivePolicy, position: number, goals: GoalWeights, policyVersion: WeeklyPolicyVersion | string = WEEKLY_POLICY_VERSION): ExposureDose {
  const slot = objective.slot;
  if (!usesExposureDosePolicy(policyVersion)) {
    // v3 and earlier: a follow dose took isolation sets, reps and rest.
    const blendPriority = slot.priority === 'primary' ? 'primary' : 'isolation';
    return { setCount: setsForDose(goals, slot.dose), reps: blendedReps(goals, blendPriority), restSeconds: blendedCount(goals, blendPriority, 'rest') ?? 90, priority: slot.priority };
  }
  const shares = normaliseGoalWeights(goals);
  const setCount = setsForSlot(shares, slot);
  const role = exposureRole(objective, position, shares);
  if (role) {
    const rule = EXPOSURE_ROLE_POLICY[role];
    return { setCount, reps: rule.targetReps, restSeconds: blendedCount(rule.goals, 'primary', 'rest') ?? 90, priority: slot.priority, repRange: getRepRange('primary', rule.goals), exposure: role };
  }
  return { setCount, reps: blendedReps(shares, slot.priority), restSeconds: blendedCount(shares, slot.priority, 'rest') ?? 90, priority: slot.priority, repRange: getRepRange(slot.priority, shares) };
}

/** Trusted per-exposure prescription fields for the independent R05 declaration. */
export type DeclaredExposurePolicy = {
  intent: AllocatedSlot['intent']; priority: ExercisePriority; loadPolicy: AllocatedSlot['loadPolicy'];
  approvedExerciseIds: string[]; selectionKind: 'primary_role' | 'isolation';
  reps: number; restSeconds: number; setCount?: number; repRange?: [number, number]; exposure?: ExposureRole;
};

export function declareExposurePolicies(daysPerWeek: number, profile: TrainingProfileSnapshot, policyVersion: WeeklyPolicyVersion | string = WEEKLY_POLICY_VERSION): Record<string, DeclaredExposurePolicy> {
  const v4 = usesExposureDosePolicy(policyVersion);
  return Object.fromEntries((BALANCED_WEEKLY_OBJECTIVES[daysPerWeek] ?? []).flatMap((objective) => objective.positions.map(([ordinal, index], position) => {
    const slot = objective.slot;
    const reference = catalogue.find((exercise) => exercise.id === slot.candidates[0]) as Exercise;
    const dose = exposureDose(objective, position, profile.goals, policyVersion);
    const policy: DeclaredExposurePolicy = {
      intent: slot.intent, priority: slot.priority, loadPolicy: slot.load, approvedExerciseIds: [...slot.candidates],
      selectionKind: getExerciseLoadingProfile(reference).compoundClassification === 'isolation' ? 'isolation' : 'primary_role',
      reps: dose.reps, restSeconds: dose.restSeconds,
      ...(v4 ? { setCount: dose.setCount, repRange: dose.repRange } : {}),
      ...(dose.exposure ? { exposure: dose.exposure } : {}),
    };
    return [`${ordinal}:${index}`, policy];
  })));
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
export function defineWeeklyRequirements(daysPerWeek: number, profile: TrainingProfileSnapshot, policyVersion: WeeklyPolicyVersion | string = WEEKLY_POLICY_VERSION): WeeklyRequirement[] {
  const v4 = usesExposureDosePolicy(policyVersion);
  return (BALANCED_WEEKLY_OBJECTIVES[daysPerWeek] ?? []).map((objective) => {
    const counts = objective.positions.map((_, position) => exposureDose(objective, position, profile.goals, policyVersion).setCount);
    return {
      id: objective.id, owner: objective.owner, dose: objective.slot.dose,
      // v4: the sum of declared exposures, never an assumed even split.
      targetSets: v4 ? counts.reduce((total, count) => total + count, 0) : objective.positions.length * setsForDose(profile.goals, objective.slot.dose),
      targetExposures: objective.positions.length,
      positions: objective.positions.map(([ordinal, index]) => [ordinal, index]),
      exposureSlotIds: objective.positions.map(([ordinal, index]) => `${ordinal}:${index}`),
      ...(v4 ? { exposureSetCounts: counts } : {}),
      provenance: v4 ? V4_PROVENANCE : V3_PROVENANCE,
    };
  });
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
  const listedByOtherRequirement = (requirementId: string, exerciseId: string) => (BALANCED_WEEKLY_OBJECTIVES[daysPerWeek] ?? [])
    .some((objective) => objective.id !== requirementId && objective.slot.candidates.includes(exerciseId));
  for (const requirement of requirements) {
    const objective = BALANCED_WEEKLY_OBJECTIVES[daysPerWeek].find((entry) => entry.id === requirement.id)!;
    const slot = objective.slot;
    requirement.positions.forEach(([ordinal, index], position) => {
      const day = calendar.find((entry) => entry.strategyId === balancedStrategyId(daysPerWeek, ordinal));
      const slotId = `${ordinal}:${index}`;
      if (!day || day.template === 'run') {
        issues.push({ code: 'missing_exposure_day', severity: 'error', message: `No selected strength day can hold ${requirement.id} exposure ${slotId}.`, slotId });
        return;
      }
      const candidates = catalogue.filter((exercise) => compatible(exercise, slot, requirement.owner) &&
        evaluateExerciseEligibility(exercise, profile, { allowEnteredRackException: true, selectionIntent: slot.intent }).eligible);
      // The slot's own candidate order is the policy. A baseline only breaks
      // ties inside one tier; it never lifts an off-list lift above the list.
      // Off-list fills rank by movement role, and a lift that another
      // requirement this week names itself (e.g. the deadlift) comes last.
      const tier = (exercise: Exercise) => { const at = slot.candidates.indexOf(exercise.id); return at < 0 ? slot.candidates.length : at; };
      const offList = (exercise: Exercise) => !slot.candidates.includes(exercise.id);
      const reserved = (exercise: Exercise) => Number(offList(exercise) && listedByOtherRequirement(requirement.id, exercise.id));
      const role = (exercise: Exercise) => offList(exercise) ? getPrimarySlotRoleTier(exercise, slot.intent) : 0;
      // An off-list fill should lead with the slot's owner (hamstrings before glutes).
      const ownerLed = (exercise: Exercise) => Number(offList(exercise) && exercise.musclesPrimary[0] !== requirement.owner);
      const hasBaseline = (exercise: Exercise) => Number((profile.baselines?.[exercise.id] ?? 0) > 0);
      candidates.sort((a, b) => preferenceOrder(a, profile) - preferenceOrder(b, profile) || tier(a) - tier(b) ||
        reserved(a) - reserved(b) || ownerLed(a) - ownerLed(b) || role(a) - role(b) || hasBaseline(b) - hasBaseline(a) || a.id.localeCompare(b.id));
      const dose = exposureDose(objective, position, profile.goals);
      const allocation: AllocatedSlot = {
        slotId, requirementId: requirement.id, intent: slot.intent,
        owner: requirement.owner, dose: slot.dose, setCount: dose.setCount,
        reps: dose.reps, restSeconds: dose.restSeconds,
        priority: slot.priority, loadPolicy: slot.load, compound: slot.compound, exerciseId: null,
        candidateExerciseIds: candidates.map((exercise) => exercise.id),
        ...(dose.repRange ? { repRange: dose.repRange } : {}),
        ...(dose.exposure ? { exposure: dose.exposure } : {}),
      };
      days[day.weekday].slots.push(allocation);
    });
  }
  /** exerciseId -> requirements that already hold it this week. */
  const usedThisWeek = new Map<string, Set<string>>();
  for (const day of Object.values(days)) {
    for (const slot of day.slots) if (!Number.isInteger(slot.setCount) || slot.setCount <= 0 || !Number.isFinite(slot.reps) || slot.reps <= 0 || !Number.isFinite(slot.restSeconds) || slot.restSeconds < 0) issues.push({ code: 'invalid_prescription', severity: 'error', message: 'Weekly dose contains invalid sets, reps or rest.', dayKey: day.dayKey, slotId: slot.slotId });
    day.slots.sort((a, b) => Number(a.slotId.split(':')[1]) - Number(b.slotId.split(':')[1]));
    // Bipartite matching preserves scarce eligible exercises for their slots.
    // A simple greedy picker can consume the only candidate of a later slot.
    const exerciseToSlot = new Map<string, AllocatedSlot>();
    // 0 unused; 1 repeat of this requirement on a no-own-load slot (keeps
    // accessory variety); 2 already held by a different requirement this week.
    // An own-load lift repeats freely for its own requirement.
    const reuse = (slot: AllocatedSlot, id: string) => {
      const holders = usedThisWeek.get(id);
      if (!holders?.size) return 0;
      if ([...holders].some((requirementId) => requirementId !== slot.requirementId)) return 2;
      return slot.loadPolicy === 'own' ? 0 : 1;
    };
    const listed = (slot: AllocatedSlot, id: string) => Number(!(BALANCED_WEEKLY_OBJECTIVES[daysPerWeek]
      ?.find((objective) => objective.id === slot.requirementId)?.slot.candidates.includes(id)));
    const assign = (slot: AllocatedSlot, visited: Set<string>): boolean => {
      // Reuse only reorders the slot's own listed candidates; an off-list fill
      // never outranks the list. Stable sort keeps candidate order per tier.
      const ordered = [...slot.candidateExerciseIds].sort((a, b) => listed(slot, a) - listed(slot, b) || reuse(slot, a) - reuse(slot, b));
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
    day.slots.forEach((slot) => {
      if (!slot.exerciseId) return;
      const holders = usedThisWeek.get(slot.exerciseId) ?? new Set<string>();
      holders.add(slot.requirementId);
      usedThisWeek.set(slot.exerciseId, holders);
    });
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
