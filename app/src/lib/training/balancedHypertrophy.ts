import { isQualifiedPerformance } from './performanceHistory';
/**
 * Balanced hypertrophy week. One owner per exercise.
 * Heavy and follow-up set counts are the goal blend. Supporting work is 3.
 * A missing rack tick does not remove an entered lift. A different implement
 * does not inherit that lift's kilograms.
 */
import exercisesData from './catalog/exercises.v1.json';
import rulesData from './rules/rules.v1.json';
import { getWeightStep } from './progression';
import { warmupSetsForWorkingWeight } from './warmupSets';
import { evaluateExerciseEligibility } from './exerciseEligibility';
import type {
  Exercise,
  ExercisePriority,
  GoalWeights,
  MovementIntent,
  PlannedExercise,
  PlannedSet,
  SessionPlan,
  SessionTemplate,
  TrainingGoal,
  TrainingProfileSnapshot,
} from './types';

const exercises = exercisesData as Exercise[];
const rules = rulesData as unknown as {
  goals: Record<string, {
    setsPerIntent: Record<ExercisePriority, number>;
    repRanges: Record<ExercisePriority, number[]>;
    restSeconds: Record<ExercisePriority, number>;
  }>;
};

const SUPPORTING_SETS = 3;
export const SESSION_SET_CAP = 24;
export const SESSION_MINUTE_CAP = 60;

export type Dose = 'heavy' | 'follow' | 'support';
export type LoadPolicy = 'own' | 'population' | 'none';

export type BalancedSlot = {
  candidates: string[];
  dose: Dose;
  intent: MovementIntent;
  priority: ExercisePriority;
  /** Compound minutes are 8. Isolation minutes are 3. */
  compound: boolean;
  load: LoadPolicy;
};

type Slot = BalancedSlot;

type DayKey = string;

function goalEntries(goals: GoalWeights): Array<{ weight: number; rules: (typeof rules.goals)[string] }> {
  const rows = (Object.entries(goals) as [TrainingGoal, number | undefined][])
    .filter(([, weight]) => (weight ?? 0) > 0)
    .map(([goal, weight]) => ({ weight: weight ?? 0, rules: rules.goals[goal] }))
    .filter((row) => row.rules);
  const sum = rows.reduce((total, row) => total + row.weight, 0);
  if (sum <= 0) return [];
  return rows.map((row) => ({ ...row, weight: row.weight / sum }));
}

export function blendedCount(goals: GoalWeights, priority: ExercisePriority, field: 'sets' | 'rest'): number | null {
  const rows = goalEntries(goals);
  if (rows.length === 0) return null;
  const raw = rows.reduce((total, row) => {
    const value = field === 'sets' ? row.rules.setsPerIntent[priority] : row.rules.restSeconds[priority];
    return total + row.weight * value;
  }, 0);
  if (field === 'rest') return Math.max(5, Math.round(raw / 5) * 5);
  return Math.max(1, Math.round(raw));
}

export function blendedReps(goals: GoalWeights, priority: ExercisePriority): number {
  const rows = goalEntries(goals);
  if (rows.length === 0) return priority === 'isolation' ? 12 : 8;
  const low = rows.reduce((total, row) => total + row.weight * row.rules.repRanges[priority][0], 0);
  const high = rows.reduce((total, row) => total + row.weight * row.rules.repRanges[priority][1], 0);
  return Math.max(1, Math.floor((Math.round(low) + Math.max(Math.round(low), Math.round(high))) / 2));
}

export function setsForDose(goals: GoalWeights, dose: Dose): number {
  if (dose === 'support') return SUPPORTING_SETS;
  const priority = dose === 'heavy' ? 'primary' : 'isolation';
  return blendedCount(goals, priority, 'sets') ?? (dose === 'heavy' ? 4 : 2);
}

function slot(candidates: string[], dose: Dose, intent: MovementIntent, compound: boolean, load: LoadPolicy, priority?: ExercisePriority): Slot {
  return {
    candidates,
    dose,
    intent,
    compound,
    load,
    priority: priority ?? (dose === 'heavy' ? 'primary' : dose === 'follow' ? 'accessory' : 'isolation'),
  };
}

const bench = () => slot(['barbell_bench_press', 'dumbbell_bench_press', 'chest_press_machine'], 'heavy', 'horizontal_press', true, 'own');
const fly = () => slot(['dumbbell_flyes', 'cable_chest_flyes'], 'follow', 'horizontal_press', false, 'none', 'isolation');
const row = (dose: Dose) => slot(['barbell_row', 't_bar_row', 'cable_row'], dose, 'horizontal_pull', true, 'own');
const pulldown = () => slot(['lat_pulldown', 'pull_ups'], 'follow', 'vertical_pull', true, 'none');
const pullUp = () => slot(['pull_ups', 'lat_pulldown'], 'heavy', 'vertical_pull', true, 'own');
const squat = () => slot(['squat', 'hack_squat', 'leg_press'], 'heavy', 'knee_dominant', true, 'own');
const quadFollow = () => slot(['leg_extensions', 'hack_squat', 'leg_press', 'lunges'], 'follow', 'knee_dominant', true, 'none');
const quadHeavy = () => slot(['hack_squat', 'leg_press', 'lunges'], 'heavy', 'knee_dominant', true, 'none');
const deadlift = () => slot(['deadlift', 'romanian_deadlift'], 'heavy', 'hip_hinge', true, 'own');
const hingeHeavy = () => slot(['romanian_deadlift', 'leg_curls'], 'heavy', 'hip_hinge', true, 'none');
const hingeFollow = () => slot(['leg_curls', 'romanian_deadlift'], 'follow', 'hip_hinge', true, 'none');
const ohp = () => slot(['overhead_press', 'dumbbell_shoulder_press'], 'heavy', 'vertical_press', true, 'own');
const lateral = () => slot(['lateral_raises'], 'support', 'shoulder_isolation', false, 'population');
const pushdown = () => slot(['tricep_pushdown', 'overhead_tricep_extension'], 'support', 'elbow_extension', false, 'population');
const curl = () => slot(['barbell_curl', 'dumbbell_curl'], 'support', 'elbow_flexion', false, 'population');
const face = () => slot(['face_pulls', 'rear_delt_flyes'], 'support', 'shoulder_isolation', false, 'none');
const shrug = () => slot(['shrugs'], 'support', 'vertical_pull', false, 'none');
const calf = () => slot(['calf_raises'], 'support', 'knee_dominant', false, 'none');
const incline = () => slot(['incline_bench_press', 'barbell_bench_press'], 'heavy', 'horizontal_press', true, 'none');

/** Stable accepted dose/slot identities shared by weekly policy and historical days. */
export const BALANCED_SLOT_POLICIES: Record<string, BalancedSlot> = {
  'bench': bench(),
  'fly': fly(),
  'squat': squat(),
  'quadFollow': quadFollow(),
  'lateral': lateral(),
  'pushdown': pushdown(),
  'row-heavy': row('heavy'),
  'pulldown': pulldown(),
  'deadlift': deadlift(),
  'hingeFollow': hingeFollow(),
  'curl': curl(),
  'ohp': ohp(),
  'calf': calf(),
  'pullUp': pullUp(),
  'hingeHeavy': hingeHeavy(),
  'face': face(),
  'row-follow': row('follow'),
  'quadHeavy': quadHeavy(),
  'shrug': shrug(),
  'incline': incline(),
};

export const BALANCED_DAY_POLICIES: Record<DayKey, Slot[]> = {
  twoA: [bench(), fly(), squat(), quadFollow(), lateral(), pushdown()],
  twoB: [row('heavy'), pulldown(), deadlift(), hingeFollow(), curl(), ohp()],
  threeA: [bench(), fly(), squat(), quadFollow(), lateral(), pushdown()],
  threeB: [row('heavy'), pulldown(), deadlift(), hingeFollow(), curl(), calf()],
  threeC: [bench(), pullUp(), squat(), hingeHeavy(), ohp(), face()],
  fourUpperA: [bench(), fly(), row('heavy'), pulldown(), lateral(), pushdown()],
  fourLowerA: [squat(), quadFollow(), hingeHeavy(), hingeFollow(), calf()],
  fourUpperB: [bench(), fly(), ohp(), pullUp(), row('follow'), curl(), face()],
  fourLowerB: [deadlift(), hingeFollow(), quadHeavy(), quadFollow(), calf()],
  fiveUpper: [bench(), fly(), row('heavy'), pulldown(), lateral(), curl()],
  fiveSquat: [squat(), quadFollow(), hingeHeavy(), hingeFollow(), calf()],
  fivePush: [bench(), fly(), ohp(), lateral(), pushdown(), face()],
  fivePull: [pullUp(), row('follow'), curl(), face(), shrug()],
  fiveDead: [deadlift(), hingeFollow(), quadHeavy(), quadFollow(), calf(), pushdown()],
  sixPushA: [bench(), fly(), ohp(), lateral(), pushdown()],
  sixPullA: [row('heavy'), pulldown(), curl(), face(), shrug()],
  sixLegsA: [squat(), quadFollow(), hingeHeavy(), hingeFollow(), calf()],
  sixPushB: [incline(), fly(), lateral(), pushdown()],
  sixPullB: [pullUp(), row('follow'), curl(), face()],
  sixLegsB: [deadlift(), hingeFollow(), quadHeavy(), quadFollow(), calf()],
};

function has(intents: MovementIntent[], intent: MovementIntent): boolean {
  return intents.includes(intent);
}

export function balancedDayKey(label: string, intents: MovementIntent[]): DayKey | null {
  if (label === 'Upper (Chest/Back)') return has(intents, 'elbow_flexion') ? 'fiveUpper' : 'fourUpperA';
  if (label === 'Lower (Squat)' || label === 'Legs A (Squat)') return label.startsWith('Legs') ? 'sixLegsA' : 'fiveSquat';
  if (label === 'Push (Chest/Shoulders)') return 'fivePush';
  if (label === 'Pull (Back/Arms)') return 'fivePull';
  if (label === 'Lower (Deadlift)') return 'fiveDead';
  if (label === 'Upper (Shoulders/Back)') return 'fourUpperB';
  if (label === 'Lower B (Deadlift)') return 'fourLowerB';
  if (label === 'Full Body (Squat/Bench)') return has(intents, 'shoulder_isolation') ? 'threeA' : 'twoA';
  if (label === 'Full Body (Hinge/Press)') return 'twoB';
  if (label === 'Full Body (Hinge/Shoulders)') return 'threeB';
  if (label === 'Full Body (Squat/Chest)') return 'threeC';
  if (label === 'Push A') return 'sixPushA';
  if (label === 'Pull A') return 'sixPullA';
  if (label === 'Push B') return 'sixPushB';
  if (label === 'Pull B') return 'sixPullB';
  if (label === 'Legs B (Deadlift)') return 'sixLegsB';
  return null;
}

function catalog(id: string): Exercise | null {
  return exercises.find((exercise) => exercise.id === id) ?? null;
}

function pickExercise(
  candidates: string[],
  available: Set<string>,
  baselines: Record<string, number>,
  sessionUsed: Set<string>,
  weekAvoid: Set<string>,
  profile: TrainingProfileSnapshot,
  selectionIntent: MovementIntent,
): { exercise: Exercise; waivedRack: boolean } | null {
  const ordered = [
    ...candidates.filter((id) => (baselines[id] ?? 0) > 0),
    ...candidates.filter((id) => !((baselines[id] ?? 0) > 0)),
  ];
  const eligible: Exercise[] = [];
  const seen = new Set<string>();
  for (const id of ordered) {
    if (seen.has(id) || sessionUsed.has(id)) continue;
    seen.add(id);
    const exercise = catalog(id);
    if (!exercise || !evaluateExerciseEligibility(exercise, profile, { allowEnteredRackException: true, selectionIntent }).eligible) continue;
    eligible.push(exercise);
  }
  const entered = eligible.find((exercise) => (baselines[exercise.id] ?? 0) > 0);
  const fresh = eligible.find((exercise) => !weekAvoid.has(exercise.id));
  const choice = entered ?? fresh ?? eligible[0];
  if (!choice) return null;
  sessionUsed.add(choice.id);
  const missingRack = (choice.equipmentAll ?? []).some((item) => item.toLowerCase() === 'rack') && !available.has('rack');
  return { exercise: choice, waivedRack: missingRack && (baselines[choice.id] ?? 0) > 0 };
}

function estimateMinutes(slots: Array<{ compound: boolean }>): number {
  return 10 + slots.reduce((total, item) => total + (item.compound ? 8 : 3), 0);
}

export function buildBalancedProgramSession(input: {
  label: string;
  intents: MovementIntent[];
  template: SessionTemplate;
  weekIndex?: 1 | 2 | 3 | 4;
  profile: TrainingProfileSnapshot;
  avoidExerciseIds?: string[];
  explainLoading?: (exercise: Exercise, reps: number, priority: ExercisePriority, weight: number) => string | undefined;
  suggestLoading: (exercise: Exercise, plannedReps: number, priority: ExercisePriority) => number;
}): SessionPlan | null {
  const key = balancedDayKey(input.label, input.intents);
  if (!key) return null;
  const goals = input.profile.goals;
  const available = new Set((input.profile.equipment_access ?? []).map((item) => item.toLowerCase()));
  const baselines = input.profile.baselines ?? {};
  const weekAvoid = new Set(input.avoidExerciseIds ?? []);
  const sessionUsed = new Set<string>();
  const chosen: Array<{ slot: Slot; exercise: Exercise; waivedRack: boolean }> = [];
  const issues: import('./weeklyProgrammeTypes').ProgrammeIssue[] = [];

  let pending = BALANCED_DAY_POLICIES[key].map((item) => item);
  while (pending.length > 0 && (pending.reduce((total, item) => total + setsForDose(goals, item.dose), 0) > SESSION_SET_CAP || estimateMinutes(pending) > SESSION_MINUTE_CAP)) {
    issues.push({ code: 'legacy_budget_trim', severity: 'warning', message: 'Historical prescription retains its accepted cap trimming; weekly-policy review requires a new build.' });
    pending = pending.slice(0, -1);
  }

  for (const item of pending) {
    const picked = pickExercise(item.candidates, available, baselines, sessionUsed, weekAvoid, input.profile, item.intent);
    if (picked) chosen.push({ slot: item, ...picked });
    else issues.push({ code: 'unavailable_slot', severity: 'error', message: `No eligible historical candidate for ${item.intent}.` });
  }

  const exercises: PlannedExercise[] = chosen.map((item, index) => {
    const priority = item.slot.priority;
    const reps = blendedReps(goals, priority === 'primary' ? 'primary' : 'isolation');
    const rest = blendedCount(goals, priority === 'primary' ? 'primary' : 'isolation', 'rest') ?? 90;
    const setCount = setsForDose(goals, item.slot.dose);
    const ownBaseline = (baselines[item.exercise.id] ?? 0) > 0;
    const ownHistory = isQualifiedPerformance(item.exercise, input.profile.lastSessionPerformance?.[item.exercise.id]) &&
      (!input.profile.performanceHistory || (input.profile.performanceHistory.status === 'available' && input.profile.performanceHistory.requestedExerciseIds.includes(item.exercise.id)));
    const weight = item.slot.load === 'none' && !ownBaseline && !ownHistory
      ? 0
      : input.suggestLoading(item.exercise, reps, priority);
    const plannedSets: PlannedSet[] = Array.from({ length: setCount }, (_, setIndex) => ({
      setIndex: setIndex + 1,
      targetReps: reps,
      suggestedWeight: weight,
      restSeconds: rest,
    }));
    const warmup = index === 0 && item.slot.compound
      ? warmupSetsForWorkingWeight(weight, getWeightStep(item.exercise))
      : undefined;
    const notes = [
      'balanced hypertrophy',
      `${item.slot.dose} dose`,
      item.waivedRack ? 'rack was not selected; the entered lift stays' : '',
      weight === 0 && item.slot.load === 'none' ? 'no copied kilogram' : '',
    ].filter(Boolean);
    return {
      exerciseId: item.exercise.id,
      exercise: item.exercise,
      orderIndex: index,
      priority,
      intents: item.exercise.intents,
      plannedSets,
      ...(warmup && warmup.length > 0 ? { warmupSets: warmup } : {}),
      decisionTrace: {
        intent: [item.slot.intent],
        goalBias: goals,
        constraintsApplied: notes,
        selectionReason: notes.join('. '),
        rankedAlternatives: item.slot.candidates.filter((id) => id !== item.exercise.id && (() => { const alternative = catalog(id); return alternative && evaluateExerciseEligibility(alternative, input.profile, { allowEnteredRackException: true, selectionIntent: item.slot.intent }).eligible; })()),
        rankedAlternativeIds: item.slot.candidates.filter((id) => id !== item.exercise.id && (() => { const alternative = catalog(id); return alternative && evaluateExerciseEligibility(alternative, input.profile, { allowEnteredRackException: true, selectionIntent: item.slot.intent }).eligible; })()),
        progressionReason: input.explainLoading?.(item.exercise, reps, priority, weight),
        confidence: 0.8,
        selectionPhase: 'required',
      },
    };
  });

  return {
    id: `session_${Date.now()}`,
    template: input.template,
    goals,
    constraints: {
      availableEquipment: input.profile.equipment_access ?? [],
      injuries: input.profile.constraints?.injuries ?? [],
      forbiddenMovements: (input.profile.constraints?.forbiddenMovements ?? []) as MovementIntent[],
      timeBudgetMinutes: SESSION_MINUTE_CAP,
    },
    userState: {
      experienceLevel: input.profile.experienceLevel ?? 'beginner',
      estimated1RM: baselines,
      performanceHistory: input.profile.performanceHistory,
      lastSessionPerformance: input.profile.lastSessionPerformance,
      recentSessionPerformance: input.profile.recentSessionPerformance,
    },
    exercises,
    estimatedDurationMinutes: estimateMinutes(chosen.map((item) => item.slot)),
    createdAt: new Date().toISOString(),
    sessionLabel: input.label,
    programmeValidation: { policyVersion: 'legacy-balanced-v1', status: issues.some((issue) => issue.severity === 'error') ? 'infeasible' : 'legacy', issues },
    ...(input.weekIndex !== undefined ? { weekIndex: input.weekIndex } : {}),
  };
}
