import type { TrainingSessionItemRow } from '@/lib/api';
import { getExerciseById } from './engine';
import { resolveProgramDayAllocation, type ProgramDayForSession } from './buildProgramDaySession';
import type { SessionPlan } from './types';
import type { AllocatedProgrammeDay } from './weeklyProgrammeTypes';
import { WEEKLY_POLICY_VERSION } from './weeklyProgrammeTypes';
import { formatWeeklyMuscleSetLine } from './weeklyVolumeSummary';

type StoredPlan = { programme?: { policyVersion: string }; weeks?: Array<{ weekIndex: number; days: Record<string, { allocation?: AllocatedProgrammeDay }> }> };

/** One programme's current future-week diagnostics, never counts per-day copies.
 * Frozen entries are historical prescriptions, not current validation subjects.
 * Missing diagnostics mean unknown (legacy), never an inferred valid result.
 */
export function weeklyProgrammeDiagnostics(entries: Array<{ proposal: SessionPlan; frozen?: TrainingSessionItemRow[] }>): NonNullable<SessionPlan['weeklyValidation']>[] {
  const weeks = new Map<string, NonNullable<SessionPlan['weeklyValidation']>>();
  for (const { proposal, frozen } of entries) {
    const validation = proposal.weeklyValidation;
    if (frozen !== undefined || !validation) continue;
    const key = JSON.stringify([validation.weekIndex, validation.policyVersion, validation.strategyId]);
    if (!weeks.has(key)) weeks.set(key, validation);
  }
  return [...weeks.values()];
}

export function programDayInput(day: { label: string; intents: ProgramDayForSession['intents']; template_key: ProgramDayForSession['template_key']; week_index: number; day_index: number }, plan: StoredPlan): ProgramDayForSession {
  let allocation: AllocatedProgrammeDay | undefined;
  try {
    allocation = resolveProgramDayAllocation(plan, day);
  } catch (error) {
    allocation = { policyVersion: WEEKLY_POLICY_VERSION, strategyId: 'balanced-v1:invalid', dayKey: String(day.day_index), slots: [],
      issues: [{ code: 'allocation_resolution_failed', severity: 'error', message: error instanceof Error ? error.message : 'Saved weekly allocation is invalid.' }] };
  }
  return { label: day.label, intents: day.intents, template_key: day.template_key, weekIndex: day.week_index, allocation };
}

/** Actual sets use canonical recorded work; frozen plans and future proposals stay separate. */
export function weeklyProgrammeSummary(entries: Array<{ proposal: SessionPlan; frozen?: TrainingSessionItemRow[] }>): string | null {
  const actual: SessionPlan[] = [], frozen: SessionPlan[] = [], future: SessionPlan[] = [];
  for (const entry of entries) {
    if (!entry.frozen) {
      if (entry.proposal.programmeValidation?.status !== 'infeasible') future.push(entry.proposal);
      continue;
    }
    const snapshot = frozenSessionProjection(entry.proposal, entry.frozen);
    frozen.push(snapshot);
    actual.push({ ...snapshot, exercises: snapshot.exercises.map(exercise => {
      const item = entry.frozen!.find(row => row.order_index === exercise.orderIndex);
      const completed = new Set((item?.performed?.sets ?? []).filter(set => !!set.completedAt).map(set => set.setIndex));
      return { ...exercise, plannedSets: [...completed].map(setIndex => ({ setIndex, suggestedWeight: 0, targetReps: 0, restSeconds: 0 })) };
    }) });
  }
  if (!entries.length) return null;
  const line = (plans: SessionPlan[]) => formatWeeklyMuscleSetLine(plans) ?? '0 sets';
  return `Completed: ${line(actual)} · Frozen planned: ${line(frozen)} · Provisional future: ${line(future)}${entries.some(entry => !entry.frozen && entry.proposal.programmeValidation?.status === 'infeasible') ? ' · Programme needs review' : ''} · Muscle sets by primary region`;
}

/** Weekly planned-volume projection uses the frozen snapshot once a day has started. */
export function frozenSessionProjection(plan: SessionPlan, items: TrainingSessionItemRow[] | undefined): SessionPlan {
  if (!items) return plan;
  return {
    ...plan,
    // Current-profile diagnostics are not historical validation of frozen work.
    weeklyValidation: undefined,
    exercises: [...items].sort((a, b) => a.order_index - b.order_index).flatMap(item => {
      const exercise = getExerciseById(item.exercise_id);
      if (!exercise) return [];
      return [{ exerciseId: exercise.id, exercise, orderIndex: item.order_index,
        priority: item.planned.priority as SessionPlan['exercises'][number]['priority'],
        intents: exercise.intents, plannedSets: item.planned.sets,
        decisionTrace: item.planned.decisionTrace as SessionPlan['exercises'][number]['decisionTrace'] }];
    }),
  };
}
