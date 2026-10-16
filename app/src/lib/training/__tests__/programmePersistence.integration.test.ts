import { describe, expect, it } from 'vitest';
import { prepareTrainingSetup, type TrainingSetupDraft } from '../setupDraft';
import { dryRunTrainingGeneration } from '../preview';
import { buildFourWeekPlan, generateProgramDays } from '../programPlanner';
import { programmeWeekProposal } from '../programmeWeekProposal';
import { frozenSessionProjection, programDayInput, weeklyProgrammeSummary } from '../programmeProjection';
import { assertStartableProgramme, buildProgramDaySession, materializePlannedSessionItems, plannedItemsForSession, resolveProgramDayAllocation } from '../buildProgramDaySession';
import { completedPerformanceHistory, PERFORMANCE_HISTORY_SOURCE } from '../performanceHistory';
import { withTrainingPerformanceSeed, type TrainingPerformanceSeed } from '../trainingProgramPerformanceSeed';
import { buildNotificationWorkChain } from '../trainingSessionProgression';
import { getAdjustedSetParams } from '../sessionDerivedState';
import { mergePerformedSetSlices } from '../trainingSetCompletionMerge';
import type { TrainingSessionItemRow } from '../../api';
import type { SessionPlan } from '../types';

const fiveDayAccount: TrainingSetupDraft = {
  goals: { build_muscle: 46, build_strength: 46, lose_fat: 8, get_fitter: 0 },
  selectedWeekdays: [1, 2, 3, 4, 5],
  equipment: ['barbell', 'dumbbells', 'bench', 'rack', 'floor', 'cable_machine', 'pull_up_bar', 'leg_press_machine', 'hack_squat_machine', 'chest_press_machine', 't_bar_row_machine', 'dip_station', 'ez_bar'],
  constraints: [], baselines: { bench_press: 80, squat: 100, deadlift: 120, overhead_press: 50, row: 70 },
  baselineReps: { bench_press: 8, squat: 5, deadlift: 5, overhead_press: 8, row: 8 },
  muscleFrequency: 'twice', experienceLevel: 'advanced', includeSkillWork: false, trainingMode: 'strength',
};
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const decisions = (plan: SessionPlan) => ({ exercises: plan.exercises, validation: plan.programmeValidation, goals: plan.goals, template: plan.template });
const fixture = (draft = fiveDayAccount) => {
  const setup = prepareTrainingSetup(draft);
  const programme = buildFourWeekPlan(setup.profile, setup.selectedWeekdaysJs, new Date(2026, 9, 12));
  return { ...setup, programme };
};
const dbItems = (proposal: SessionPlan): TrainingSessionItemRow[] => materializePlannedSessionItems('synthetic-r09', proposal).map(item => ({
  id: item.id, session_id: 'synthetic-r09', exercise_id: item.exerciseId, order_index: item.orderIndex, planned: item.planned,
  performed: null, skipped: false, autoregulation_adjustments: null, created_at: '2026-10-12T10:00:00Z',
}));

describe('R09 weekly programme persistence integration', () => {
  it('five-day account: setup → weekly programme → saved plan → start → history update → reload → future proposal', () => {
    const { snapshot, programSnapshot, programme } = fixture();
    const saved = clone({ plan: programme, profile_snapshot: programSnapshot });
    expect(saved.plan.programme?.input.goals).toEqual(snapshot.goals);
    expect(saved.plan.programme?.input.baselines).toEqual(snapshot.baselines);
    expect(saved.plan.programme?.policyVersion).toBe(saved.plan.weeks[0].compilation?.policyVersion);
    const days = generateProgramDays('synthetic-programme', 'synthetic-account', saved.plan, new Date(2026, 9, 12));
    const weekly = programmeWeekProposal(saved.plan, 1, snapshot);
    for (const row of days.filter(day => day.week_index === 1)) {
      const preview = dryRunTrainingGeneration(fiveDayAccount, { targetWeekday: row.day_index, weekIndex: 1 })!;
      const day = buildProgramDaySession(programDayInput({ ...row, label: 'Translated display title' }, saved.plan), snapshot);
      expect(decisions(preview)).toEqual(decisions(weekly.get(row.day_index)!));
      expect(decisions(day)).toEqual(decisions(preview));
    }
    const first = weekly.get(1)!;
    expect(first.programmeValidation?.status).toBe('feasible');
    assertStartableProgramme(first);
    const items = dbItems(first);
    const plannedBefore = clone(items.map(item => item.planned));
    const firstItem = items[0];
    const target = firstItem.planned.sets[0];
    firstItem.performed = { sets: mergePerformedSetSlices([], [{ setIndex: target.setIndex, weight: target.suggestedWeight, reps: target.targetReps + 1, rpe: 7, completedAt: '2026-10-12T10:01:00Z' }]) };
    const partialLine = weeklyProgrammeSummary([...weekly.values()].map((proposal, index) => ({ proposal, ...(index === 0 ? { frozen: items } : {}) })))!;
    expect(partialLine).toContain('Completed:'); expect(partialLine).toContain('Frozen planned:'); expect(partialLine).toContain('Provisional future:');
    // Complete canonical recorded sets; qualification uses R06, never set-log guesses.
    firstItem.performed.sets = firstItem.planned.sets.map(set => ({ setIndex: set.setIndex, weight: set.suggestedWeight, reps: set.targetReps + 1, rpe: 7, completedAt: '2026-10-12T10:01:00Z' }));
    const history = completedPerformanceHistory([{ ...firstItem, training_sessions: { started_at: '2026-10-12T10:00:00Z', ended_at: '2026-10-12T11:00:00Z' } }], 3);
    expect(history[firstItem.exercise_id][0].evidence?.status).toBe('qualified');
    const performanceHistory = { source: PERFORMANCE_HISTORY_SOURCE, status: 'available' as const, requestedExerciseIds: [firstItem.exercise_id] };
    const seed: TrainingPerformanceSeed = { ...performanceHistory, performanceHistory, recentSessionPerformance: history, lastSessionPerformance: { [firstItem.exercise_id]: history[firstItem.exercise_id][0] } };
    const reloaded = clone({ ...saved, items });
    const futureSnapshot = withTrainingPerformanceSeed(reloaded.profile_snapshot, seed);
    const future = programmeWeekProposal(reloaded.plan, 2, futureSnapshot).get(1)!;
    expect(future.exercises.map(ex => ex.exerciseId)).toEqual(first.exercises.map(ex => ex.exerciseId));
    expect(future.userState.performanceHistory?.status).toBe('available');
    const frozen = frozenSessionProjection(future, reloaded.items);
    expect(frozen.exercises.map(ex => ex.plannedSets)).toEqual(plannedBefore.map(item => item.sets));
    const persisted = materializePlannedSessionItems('frozen', first);
    expect(plannedItemsForSession({ startedAt: '2026-10-12T10:00:00Z', notificationMode: 'guided', frozenItems: persisted, rebuiltPlan: future, sessionId: 'frozen' })).toBe(persisted);
    // Pending guidance consumes R07 effective authority after reload.
    const pending = reloaded.items[1];
    pending.autoregulation_adjustments = { 1: { weightDelta: 0, repsDelta: 1, reason: 'Synthetic saved overlay', appliedAt: '2026-10-12T10:02:00Z' } };
    const next = buildNotificationWorkChain(reloaded.items).next!;
    expect(next.sessionItemId).toBe(pending.id);
    expect(next.targetReps).toBe(getAdjustedSetParams(pending, next.setIndex, {}).reps);
    expect(next.suggestedWeight).toBe(getAdjustedSetParams(pending, next.setIndex, {}).weight);
    expect(reloaded.items.map(item => item.planned)).toEqual(plannedBefore);
    expect(items.map(item => item.planned)).toEqual(plannedBefore);
  });

  it('resolves explicit week/day identity, handles reordered weeks and rejects missing versioned references', () => {
    const { programme, snapshot } = fixture();
    programme.weeks.reverse();
    const day = { label: 'Anything', intents: [], template_key: 'upper' as const, week_index: 1, day_index: 1 };
    expect(resolveProgramDayAllocation(programme, day)).toEqual(programme.weeks.find(week => week.weekIndex === 1)!.days[1].allocation);
    delete programme.weeks.find(week => week.weekIndex === 1)!.days[1].allocation;
    expect(() => resolveProgramDayAllocation(programme, day)).toThrow();
    const invalid = buildProgramDaySession(programDayInput(day, programme), snapshot);
    expect(() => materializePlannedSessionItems('invalid', invalid)).toThrow();
    expect(() => assertStartableProgramme(invalid)).toThrow();
  });

  it.each(['strength', 'hybrid'] as const)('never materializes an infeasible %s programme', trainingMode => {
    const { programme, snapshot } = fixture({ ...fiveDayAccount, equipment: ['floor'], trainingMode });
    const proposals = programmeWeekProposal(programme, 1, snapshot);
    for (const plan of proposals.values()) {
      expect(plan.programmeValidation?.status).toBe('infeasible');
      expect(() => materializePlannedSessionItems('invalid', plan)).toThrow();
    }
    expect(weeklyProgrammeSummary([...proposals.values()].map(proposal => ({ proposal })))).toContain('Programme needs review');
  });

  it('freezes empty started/guided items and separates actual counts from full frozen prescription', () => {
    const { programme, snapshot } = fixture();
    const proposal = programmeWeekProposal(programme, 1, snapshot).get(1)!;
    expect(frozenSessionProjection(proposal, []).exercises).toEqual([]);
    const items = dbItems(proposal);
    const full = weeklyProgrammeSummary([{ proposal, frozen: items }])!;
    expect(full).toMatch(/^Completed: 0 sets/);
    items[0].performed = { sets: [{ setIndex: 1, weight: 1, reps: 1, completedAt: '2026-10-12T10:01:00Z' }] };
    const partial = weeklyProgrammeSummary([{ proposal, frozen: items }])!;
    expect(partial).not.toMatch(/^Completed: 0 sets/);
    expect(partial.split('Frozen planned:')[1]).toBe(full.split('Frozen planned:')[1]);
    const frozen = materializePlannedSessionItems('s', proposal);
    expect(plannedItemsForSession({ startedAt: null, notificationMode: 'guided', frozenItems: frozen, rebuiltPlan: proposal, sessionId: 's' })).toBe(frozen);
  });

  it('blocks corrupted whole-week contracts and changed dose, but preserves unversioned historical generation', () => {
    const { programme, snapshot } = fixture();
    const missing = clone(programme); delete missing.weeks[0].compilation;
    expect(programmeWeekProposal(missing, 1, snapshot).get(1)!.programmeValidation?.status).toBe('infeasible');
    const changed = clone(programme); changed.weeks[0].days[1].allocation!.slots[0].setCount -= 1;
    expect(programmeWeekProposal(changed, 1, snapshot).get(1)!.programmeValidation?.status).toBe('infeasible');
    expect(resolveProgramDayAllocation({ weeks: [] }, { week_index: 1, day_index: 1 })).toBeUndefined();
    expect(buildProgramDaySession({ label: 'Upper', intents: ['horizontal_press'], template_key: 'upper' }, snapshot).exercises.length).toBeGreaterThan(0);
  });
});
