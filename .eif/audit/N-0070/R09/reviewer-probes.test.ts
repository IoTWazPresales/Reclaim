
import { buildFourWeekPlan, generateProgramDays } from '@/lib/training/programPlanner';
import { buildProgramDaySession, resolveProgramDayAllocation } from '@/lib/training/buildProgramDaySession';
import { programDayInput, frozenSessionProjection, weeklyProgrammeSummary } from '@/lib/training/programmeProjection';
import { prepareTrainingSetup } from '@/lib/training/setupDraft';
import { dryRunTrainingGeneration } from '@/lib/training/preview';
import { listExercises } from '@/lib/training/engine';
import { programmeWeekProposal } from '@/lib/training/programmeWeekProposal';
import { computeWeeklyMuscleSessionCounts } from '@/lib/training/weeklyVolumeSummary';

const draft = {
  goals: { build_muscle: .46, build_strength: .46, lose_fat: .08, get_fitter: 0 },
  selectedWeekdays: [1, 2, 3, 4, 5],
  equipment: [...new Set(listExercises().flatMap(ex => [...ex.equipment, ...(ex.equipmentAll ?? []), ...(ex.equipmentAny ?? [])]))],
  constraints: [], baselines: { squat: 100, overhead_press: 80 },
  muscleFrequency: 'twice' as const, experienceLevel: 'advanced' as const,
};
const setup = prepareTrainingSetup(draft);
const make = () => buildFourWeekPlan(setup.profile, setup.selectedWeekdaysJs, new Date(2026, 9, 12));
const signature = (plan: ReturnType<typeof buildProgramDaySession>) => plan.exercises.map(ex => ({ id: ex.exerciseId, sets: ex.plannedSets }));
const row = (order_index = 0) => ({ id: 'frozen-item', session_id: 'frozen', exercise_id: 'squat', order_index, skipped: false,
  planned: { priority: 'primary', sets: [1,2,3].map(setIndex => ({setIndex, targetReps: 5, suggestedWeight: 100, restSeconds: 120})) },
  performed: {sets: [{setIndex: 1, reps: 5, weight: 100, completedAt: '2026-10-15T09:00:00Z'}]},
}) as any;

describe('R09 independent saved programme adversarial probes', () => {
  it('preserves legacy muscle session counts through the shared adapter', () => {
    for (const daysPerWeek of [2,3,4,5,6]) for (const primary of ['build_muscle','build_strength','lose_fat','get_fitter'] as const) for (const frequency of ['once','auto'] as const) {
    const legacySetup = prepareTrainingSetup({...draft, selectedWeekdays:Array.from({length:daysPerWeek},(_,i)=>i+1), goals:{build_muscle:0,build_strength:0,lose_fat:0,get_fitter:0,[primary]:1}, muscleFrequency:frequency});
    const plan = buildFourWeekPlan(legacySetup.profile, legacySetup.selectedWeekdaysJs);
    if (plan.weeks[0].compilation?.policyStatus !== 'legacy_pending_review') continue;
    const days = Object.entries(plan.weeks[0].days);
    const build = (key: string, day: any, counts?: Record<string,number>, avoidExerciseIds?: string[]) => buildProgramDaySession(programDayInput({...day,template_key:day.template,week_index:1,day_index:Number(key)},plan),legacySetup.snapshot,{weeklyMuscleSessionCounts:counts,avoidExerciseIds});
    const counts = computeWeeklyMuscleSessionCounts(days.map(([key,day]) => build(key,day)));
    const usedIds: string[] = [];
    const expected = days.map(([key,day]) => {const result = build(key,day,counts,[...usedIds]); usedIds.push(...result.exercises.map(ex=>ex.exerciseId)); return signature(result);});
    expect([...programmeWeekProposal(plan,1,legacySetup.snapshot).values()].map(signature), `${primary}/${daysPerWeek}/${frequency}`).toEqual(expected);
    }
  });
  it('whole-week adapter rejects missing validation context and tampered prescriptions', () => {
    const missing = make(); delete missing.weeks[0].compilation;
    expect([...programmeWeekProposal(missing, 1, setup.snapshot).values()].every(proposal => proposal.programmeValidation?.status === 'infeasible')).toBe(true);
    const tampered = make();
    tampered.weeks[0].days[1].allocation!.slots[0].reps += 1;
    expect([...programmeWeekProposal(tampered, 1, setup.snapshot).values()].every(proposal => proposal.programmeValidation?.status === 'infeasible')).toBe(true);
    expect([...programmeWeekProposal(make(), 1, setup.snapshot).values()].every(proposal => proposal.programmeValidation?.status === 'feasible')).toBe(true);
  });
  it('all setup days match JSON persisted allocation decisions after translated/duplicate labels', () => {
    const plan = JSON.parse(JSON.stringify(make()));
    const days = generateProgramDays('fixture-program', 'fixture-user', plan, new Date(2026, 9, 12));
    for (const day of days) {
      const preview = dryRunTrainingGeneration(draft, { targetWeekday: day.day_index, weekIndex: day.week_index });
      const loaded = buildProgramDaySession(programDayInput({...day, label: 'Entraînement'}, plan), setup.snapshot);
      expect(signature(loaded)).toEqual(signature(preview!));
    }
  });
  it('explicit week identity survives reordered serialized week arrays', () => {
    const plan = make();
    plan.weeks[1].days[1].allocation!.slots[0].reps = 17;
    plan.weeks.reverse();
    expect(resolveProgramDayAllocation(plan, {week_index: 2, day_index: 1})!.slots[0].reps).toBe(17);
  });
  it('missing allocation, policy mismatch and wrong day identity fail closed', () => {
    for (const mutate of [
      (plan: any) => { delete plan.weeks[0].days[1].allocation; },
      (plan: any) => { plan.programme.policyVersion = 'unsupported'; },
      (plan: any) => { plan.weeks[0].days[1].allocation.dayKey = '7'; },
    ]) {
      const plan = make(); mutate(plan);
      const day = generateProgramDays('fixture', 'user', plan, new Date(2026,9,12))[0];
      expect(() => resolveProgramDayAllocation(plan, day)).toThrow();
      expect(buildProgramDaySession(programDayInput(day, plan), setup.snapshot).programmeValidation?.status).toBe('infeasible');
    }
  });
  it('empty frozen sessions remain empty and frozen sets survive changed future proposals', () => {
    const plan = make(), day = generateProgramDays('fixture', 'user', plan, new Date(2026,9,12))[0];
    const proposal = buildProgramDaySession(programDayInput(day, plan), setup.snapshot);
    expect(frozenSessionProjection(proposal, []).exercises).toEqual([]);
    const frozen = row(); const before = JSON.stringify(frozen);
    const projected = frozenSessionProjection(proposal, [frozen]);
    expect(projected.exercises[0].plannedSets).toEqual(frozen.planned.sets);
    expect(JSON.stringify(frozen)).toBe(before);
    const summary = weeklyProgrammeSummary([{proposal, frozen: [frozen]}, {proposal}]);
    expect(summary).toContain('Completed:'); expect(summary).toContain('Frozen planned:'); expect(summary).toContain('Provisional future:');
  });
  it('infeasible future programmes are flagged rather than included as valid future volume', () => {
    const plan = make(), day = generateProgramDays('fixture', 'user', plan, new Date(2026,9,12))[0];
    const proposal = buildProgramDaySession(programDayInput(day, plan), setup.snapshot);
    proposal.programmeValidation = {...proposal.programmeValidation!, status: 'infeasible'};
    expect(weeklyProgrammeSummary([{proposal}])).toContain('Provisional future: 0 sets');
    expect(weeklyProgrammeSummary([{proposal}])).toContain('Programme needs review');
  });
});
